import { NextResponse } from 'next/server';
import { currentOwner } from '@/lib/owner';
import { revokeToken } from '@/lib/tokens';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return (await revokeToken(owner, params.id)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Not found.' }, { status: 404 });
}
