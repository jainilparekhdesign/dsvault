import { EXPORTS } from '@dsvault/converters';
import { NextResponse } from 'next/server';
import { getPublicSystem } from '@/lib/systems';

// Public downloads for a shared system: ?format=<export id>&file=<n>.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const s = await getPublicSystem(params.token);
  if (!s) return NextResponse.json({ error: 'This link is off or doesn’t exist.' }, { status: 404 });
  const url = new URL(req.url);
  const f = EXPORTS.find((e) => e.id === (url.searchParams.get('format') ?? 'css'));
  if (!f) return NextResponse.json({ error: 'Unknown format.' }, { status: 400 });
  const files = await f.run(s.content);
  const file = files[Number(url.searchParams.get('file') ?? 0)] ?? files[0]!;
  const body = file.bytes ? Buffer.from(file.bytes) : file.text ?? '';
  return new NextResponse(body, {
    headers: { 'content-type': file.mime, 'content-disposition': `attachment; filename="${file.filename}"`, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' },
  });
}
