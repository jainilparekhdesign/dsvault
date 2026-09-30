import { NextResponse } from 'next/server';
import { currentOwner } from '@/lib/owner';
import { createToken, listTokens } from '@/lib/tokens';

// Token management needs a browser session: a token can't mint more tokens.
export async function GET() {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json(await listTokens(owner));
}

export async function POST(req: Request) {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  return NextResponse.json(await createToken(owner, String(name ?? '')), { status: 201 });
}
