import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { withOwner } from '@/lib/api';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];
const MAX_BYTES = 4_000_000;

// Brand assets go to Vercel Blob; the brand book stores the returned URL.
export const POST = withOwner(async (owner, req) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: 'Upload a PNG, JPEG, WebP, GIF, SVG or PDF.' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'That file is over 4 MB.' }, { status: 413 });
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const blob = await put(`${encodeURIComponent(owner)}/${safe}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type });
  return NextResponse.json({ url: blob.url, name: file.name, type: file.type });
});
