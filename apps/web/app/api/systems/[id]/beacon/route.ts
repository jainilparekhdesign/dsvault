import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { saveSystem } from '@/lib/systems';

// sendBeacon posts text/plain; this saves the last edits when a tab closes.
export const POST = withOwner<{ id: string }>(async (owner, req, { params }) => {
  const body = JSON.parse(await req.text());
  const row = await saveSystem(owner, params.id, body?.content);
  return row ? NextResponse.json(row) : notFound();
});
