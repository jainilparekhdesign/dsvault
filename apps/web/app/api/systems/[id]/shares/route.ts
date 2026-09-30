import { NextResponse } from 'next/server';
import { notFound, withOwner } from '@/lib/api';
import { listShares, share, unshare } from '@/lib/systems';

type P = { id: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = withOwner<P>(async (user, _req, { params }) => {
  const s = await listShares(user, params.id);
  return s ? NextResponse.json(s) : notFound();
});

// Invite or change a role.
export const POST = withOwner<P>(async (user, req, { params }) => {
  const { email, role } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !EMAIL.test(email.trim())) return NextResponse.json({ error: 'Enter an email address.' }, { status: 400 });
  const r = await share(user, params.id, email, role === 'editor' ? 'editor' : 'viewer');
  return r ? NextResponse.json({ ok: true }, { status: 201 }) : notFound();
});

export const DELETE = withOwner<P>(async (user, req, { params }) => {
  const email = new URL(req.url).searchParams.get('email') ?? '';
  return (await unshare(user, params.id, email)) ? new NextResponse(null, { status: 204 }) : notFound();
});
