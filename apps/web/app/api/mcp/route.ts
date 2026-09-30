import { handleMcp } from '@dsvault/mcp';
import { NextResponse } from 'next/server';
import { withOwner } from '@/lib/api';
import { getSystem, listSystems } from '@/lib/systems';

// Model Context Protocol over Streamable HTTP, stateless: each POST carries one
// JSON-RPC message (or a batch) and gets a JSON reply. Read-only; authorized
// with a personal access token in the Authorization header.
export const POST = withOwner(async (owner, req) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  const ctx = {
    listSystems: () => listSystems(owner),
    getSystem: async (id: string) => {
      const s = await getSystem(owner, id);
      return s ? { id: s.id, name: s.name, updatedAt: s.updatedAt, content: s.content } : null;
    },
  };
  const messages = Array.isArray(body) ? body : [body];
  const replies = (await Promise.all(messages.map((m) => handleMcp(m, ctx)))).filter(Boolean);
  if (!replies.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? replies : replies[0]);
});

// No server-initiated stream and no sessions.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { allow: 'POST' } });
}
export const DELETE = GET;
