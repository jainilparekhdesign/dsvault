import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { setPublic } from '@/lib/systems';

type P = { id: string };

export const POST = withOwner<P>(async (user, _req, { params }) => {
  const r = await setPublic(user, params.id, true);
  return r ? NextResponse.json(r) : notFound();
});

export const DELETE = withOwner<P>(async (user, _req, { params }) => {
  return (await setPublic(user, params.id, false)) ? new NextResponse(null, { status: 204 }) : notFound();
});
