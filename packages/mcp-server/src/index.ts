#!/usr/bin/env node

/**
 * Vouch MCP Server
 *
 * Exposes security scanning tools to AI coding agents via the
 * Model Context Protocol (MCP). The AI can check proposed code
 * for secrets, PII, and unsafe patterns BEFORE writing to disk.
 *
 * Tools:
 *   scan_content   - Scan code content for security issues
 *   check_secret   - Check if a string looks like a secret/credential
 *   check_safety   - Check code for unsafe patterns (eval, innerHTML, etc.)
 *   get_policy     - Get the verdict for an action type
 *
 * Setup in Claude Code / .mcp.json:
 *   { "command": "npx", "args": ["vouch-mcp"], "type": "stdio" }
 */

import { detectSecrets } from '@vouch/core';
import { checkCodeSafety } from '@vouch/core';
import { scanForInjection } from '@vouch/core';
import { scanPayload } from '@vouch/core';

// ── MCP Protocol Types ───────────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

// ── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'scan_content',
    description: 'Scan code content for secrets, PII, injection patterns, and unsafe code. Call this before writing any file to check for security issues.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The code content to scan' },
        filename: { type: 'string', description: 'The filename (used to determine scan rules)' },
      },
      required: ['content', 'filename'],
    },
  },
  {
    name: 'check_secret',
    description: 'Check if a string value looks like a secret, API key, token, or credential. Use this before hardcoding any string value.',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'The string value to check' },
      },
      required: ['value'],
    },
  },
  {
    name: 'check_safety',
    description: 'Check code for unsafe patterns like eval(), innerHTML, SQL injection, command injection, disabled SSL, wildcard CORS.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The code to check' },
        filename: { type: 'string', description: 'The filename' },
      },
      required: ['content', 'filename'],
    },
  },
  {
    name: 'check_injection',
    description: 'Scan text content for prompt injection patterns. Use this before including any external content in LLM context.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to scan' },
        source: { type: 'string', description: 'Where this content came from' },
      },
      required: ['content'],
    },
  },
];

// ── Tool Handlers ────────────────────────────────────────────────────────────

function handleToolCall(name: string, args: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
  switch (name) {
    case 'scan_content': {
      const content = String(args.content ?? '');
      const filename = String(args.filename ?? 'unknown');

      const secrets = detectSecrets(content, filename);
      const safety = checkCodeSafety(content, filename);
      const pii = scanPayload(content);

      const issues = [
        ...secrets.map((s) => ({
          severity: s.severity,
          type: s.type,
          line: s.line,
          message: s.message,
          isAiPattern: s.isAiPattern,
        })),
        ...safety.map((s) => ({
          severity: s.severity,
          type: s.rule,
          line: s.line,
          message: s.message,
          isAiPattern: false,
        })),
        ...(pii.hasPii ? pii.matches.map((m) => ({
          severity: 'WARNING' as const,
          type: `PII: ${m.type}`,
          line: 0,
          message: `${m.type} found in content`,
          isAiPattern: false,
        })) : []),
      ];

      const clean = issues.length === 0;
      const text = clean
        ? `CLEAN: No security issues found in ${filename}.`
        : `FOUND ${issues.length} issue(s) in ${filename}:\n${issues.map((i) => `  [${i.severity}] ${i.message}${i.isAiPattern ? ' (AI pattern)' : ''}`).join('\n')}`;

      return { content: [{ type: 'text', text }] };
    }

    case 'check_secret': {
      const value = String(args.value ?? '');
      const findings = detectSecrets(`const x = "${value}";`, 'check.ts');
      const isSecret = findings.length > 0;

      return {
        content: [{
          type: 'text',
          text: isSecret
            ? `WARNING: This looks like a ${findings[0].type}. Do NOT hardcode this value. Use an environment variable instead.`
            : `OK: This value does not match known secret patterns.`,
        }],
      };
    }

    case 'check_safety': {
      const content = String(args.content ?? '');
      const filename = String(args.filename ?? 'unknown');
      const findings = checkCodeSafety(content, filename);

      if (findings.length === 0) {
        return { content: [{ type: 'text', text: 'SAFE: No unsafe code patterns found.' }] };
      }

      return {
        content: [{
          type: 'text',
          text: `FOUND ${findings.length} unsafe pattern(s):\n${findings.map((f) => `  [${f.severity}] ${f.message}\n    Fix: ${f.suggestion}`).join('\n')}`,
        }],
      };
    }

    case 'check_injection': {
      const content = String(args.content ?? '');
      const source = String(args.source ?? 'unknown');
      const result = scanForInjection(content, source);

      return {
        content: [{
          type: 'text',
          text: result.severity === 'CLEAN'
            ? 'CLEAN: No injection patterns found.'
            : `${result.severity}: ${result.message}`,
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
}

// ── MCP stdio transport ──────────────────────────────────────────────────────

function sendResponse(response: McpResponse): void {
  const json = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}

function handleRequest(request: McpRequest): void {
  switch (request.method) {
    case 'initialize':
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'vouch-mcp', version: '0.1.0' },
        },
      });
      break;

    case 'tools/list':
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: { tools: TOOLS },
      });
      break;

    case 'tools/call': {
      const params = request.params as { name: string; arguments?: Record<string, unknown> };
      const result = handleToolCall(params.name, params.arguments ?? {});
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result,
      });
      break;
    }

    case 'notifications/initialized':
      // No response needed for notifications
      break;

    default:
      sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      });
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

let buffer = '';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;

  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;

    if (buffer.length < bodyStart + contentLength) break;

    const body = buffer.slice(bodyStart, bodyStart + contentLength);
    buffer = buffer.slice(bodyStart + contentLength);

    try {
      const request = JSON.parse(body) as McpRequest;
      handleRequest(request);
    } catch {
      // Invalid JSON, skip
    }
  }
});

process.stderr.write('[vouch-mcp] Server started\n');
