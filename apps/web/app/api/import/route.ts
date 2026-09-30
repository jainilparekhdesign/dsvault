import { importAny } from '@dsvault/converters';
import { NextResponse } from 'next/server';
import { withOwner } from '@/lib/api';
import { createSystem } from '@/lib/systems';

const MAX_BYTES = 2_000_000;

// Parse a tokens file. With `create`, also save it as a new system.
export const POST = withOwner(async (owner, req) => {
  const { filename, text, create } = await req.json();
  if (typeof text !== 'string' || typeof filename !== 'string') return NextResponse.json({ error: 'Send a filename and its text.' }, { status: 400 });
  if (text.length > MAX_BYTES) return NextResponse.json({ error: 'That file is over 2 MB.' }, { status: 413 });
  let result;
  try {
    result = importAny(filename, text);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!create) return NextResponse.json(result);
  const row = await createSystem(owner, result.content);
  return NextResponse.json({ id: row.id, kind: result.kind, warnings: result.warnings }, { status: 201 });
});
