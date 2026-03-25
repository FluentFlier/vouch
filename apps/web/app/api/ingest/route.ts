import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_BODY_BYTES = 65536;
const RATE_LIMIT_PER_MINUTE = 300;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const ActionLogSchema = z.object({
  id: z.string().uuid(),
  projectSlug: z.string().min(1).max(64),
  actionType: z.string().min(1).max(256),
  verdict: z.enum(['PASS', 'BLOCK', 'CONFIRM']),
  userDecision: z.enum(['CONFIRMED', 'CANCELLED']).nullable().optional(),
  policyTriggered: z.string().min(1).max(128),
  blockReason: z.string().max(64).nullable().optional(),
  durationMs: z.number().int().min(0),
  timestamp: z.string(),
});

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ingestKey = process.env.VOUCH_INGEST_KEY;
  if (!ingestKey) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' });
  }

  // Validate API key with constant-time comparison
  const apiKey = req.headers.get('x-vouch-key') ?? '';
  if (!safeCompare(apiKey, ingestKey)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' });
  }

  // Content-Type check
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'invalid_content_type' });
  }

  // Rate limit per API key
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' });
  }

  // Body size limit
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' });
  }

  try {
    const body = await req.json();
    const parsed = ActionLogSchema.parse(body);

    const db = supabaseAdmin.database;

    // Upsert project
    const { data: project, error: projectError } = await db
      .from('vouch_projects')
      .upsert(
        { slug: parsed.projectSlug, name: parsed.projectSlug },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (projectError || !project) {
      return NextResponse.json({ ok: false, error: 'project_upsert_failed' });
    }

    // Insert log entry (no actionPayload - only behavioral metadata)
    const { error: insertError } = await db
      .from('vouch_action_logs')
      .insert({
        id: parsed.id,
        project_id: project.id,
        action_type: parsed.actionType,
        verdict: parsed.verdict,
        user_decision: parsed.userDecision ?? null,
        policy_triggered: parsed.policyTriggered,
        block_reason: parsed.blockReason ?? null,
        duration_ms: parsed.durationMs,
      });

    if (insertError) {
      return NextResponse.json({ ok: false, error: 'insert_failed' });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' });
  }
}
