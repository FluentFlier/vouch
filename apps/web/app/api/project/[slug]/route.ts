import { NextRequest, NextResponse } from 'next/server';
import { fetchProjectStats } from '@/lib/fetcher';

export const revalidate = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const data = await fetchProjectStats(params.slug);

  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
