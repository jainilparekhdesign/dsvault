import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { getVersion, saveSystem } from '@/lib/systems';

type P = { id: string; number: string };

export const GET = withOwner<P>(async (owner, _req, { params }) => {
  const v = await getVersion(owner, params.id, Number(params.number));
  return v ? NextResponse.json(v) : notFound();
});

// Restore: the system's content becomes this version's content.
export const POST = withOwner<P>(async (owner, _req, { params }) => {
  const v = await getVersion(owner, params.id, Number(params.number));
  if (!v) return notFound();
  const row = await saveSystem(owner, params.id, v.content);
  return row ? NextResponse.json({ content: v.content, updatedAt: row.updatedAt }) : notFound();
});
