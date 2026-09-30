import { importAny } from '@dsvault/converters';
import { NextResponse } from 'next/server';
import { withOwner } from '@/lib/api';
import { createSystem } from '@/lib/systems';

const MAX_BYTES = 2_000_000;

// Parse a tokens file. With `create`, also save it as a new system.
export const POST = withOwner(async (owner, req) => {
  // Text formats arrive as `text`; binary ones (.sketch) as base64 in `base64`.
  const { filename, text = '', base64, create } = await req.json();
  if (typeof filename !== 'string' || (typeof text !== 'string' && typeof base64 !== 'string')) return NextResponse.json({ error: 'Send a filename and its contents.' }, { status: 400 });
  if (text.length > MAX_BYTES || (base64?.length ?? 0) > MAX_BYTES * 1.4) return NextResponse.json({ error: 'That file is over 2 MB.' }, { status: 413 });
  const bytes = typeof base64 === 'string' ? new Uint8Array(Buffer.from(base64, 'base64')) : undefined;
  let result;
  try {
    result = await importAny(filename, text, bytes);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!create) return NextResponse.json(result);
  const row = await createSystem(owner, result.content);
  return NextResponse.json({ id: row.id, kind: result.kind, warnings: result.warnings }, { status: 201 });
});
