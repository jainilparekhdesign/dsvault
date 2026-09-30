import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { deleteSystem, getSystem, saveSystem } from '@/lib/systems';

type P = { id: string };

export const GET = withOwner<P>(async (owner, _req, { params }) => {
  const s = await getSystem(owner, params.id);
  return s ? NextResponse.json({ id: s.id, content: s.content, updatedAt: s.updatedAt }) : notFound();
});

export const PUT = withOwner<P>(async (owner, req, { params }) => {
  const body = await req.json();
  const row = await saveSystem(owner, params.id, body?.content);
  return row ? NextResponse.json(row) : notFound();
});

export const DELETE = withOwner<P>(async (owner, _req, { params }) => {
  return (await deleteSystem(owner, params.id)) ? new NextResponse(null, { status: 204 }) : notFound();
});
