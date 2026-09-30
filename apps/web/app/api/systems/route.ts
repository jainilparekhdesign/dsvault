import { NextResponse } from 'next/server';
import { withOwner } from '@/lib/api';
import { createSystem, listSystems } from '@/lib/systems';

export const GET = withOwner(async (owner) => {
  const list = await listSystems(owner);
  return NextResponse.json(list.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })));
});

export const POST = withOwner(async (owner, req) => {
  const body = await req.json().catch(() => ({}));
  const row = await createSystem(owner, body?.content ?? { name: String(body?.name ?? '') });
  return NextResponse.json({ id: row.id }, { status: 201 });
});
