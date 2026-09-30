import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { createVersion, listVersions } from '@/lib/systems';

type P = { id: string };

export const GET = withOwner<P>(async (owner, _req, { params }) => NextResponse.json(await listVersions(owner, params.id)));

export const POST = withOwner<P>(async (owner, req, { params }) => {
  const body = await req.json().catch(() => ({}));
  const row = await createVersion(owner, params.id, String(body?.label ?? ''));
  return row ? NextResponse.json(row, { status: 201 }) : notFound();
});
