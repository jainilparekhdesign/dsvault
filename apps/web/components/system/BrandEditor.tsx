'use client';

import { BRAND_SECTIONS } from '@dsvault/schema';
import { useState } from 'react';
import { useSystem } from './SystemProvider';
import { Block, PageHead } from './ui';

const IMAGE = /!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g;

function Section({ k, title, hint }: { k: string; title: string; hint: string }) {
  const { content, update } = useSystem();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const value = content.brand[k] ?? '';
  const images = [...value.matchAll(IMAGE)];
  const set = (v: string) => update((d) => { if (v.trim()) d.brand[k] = v; else delete d.brand[k]; });

  async function upload(file: File) {
    setBusy(true); setNote(`Uploading ${file.name}…`);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNote(body.error ?? 'Upload failed.'); return; }
    const alt = file.name.replace(/\.[^.]+$/, '');
    const md = body.type === 'application/pdf' ? `[${file.name}](${body.url})` : `![${alt}](${body.url})`;
    set(`${value.trimEnd()}${value.trim() ? '\n\n' : ''}${md}\n`);
    setNote(`Added ${file.name}.`);
  }

  const id = `brand-${k}`;
  return (
    <Block id={k} title={title} intro={hint}>
      <label className="sr-only" htmlFor={id}>{title}</label>
      <textarea id={id} className="textarea" value={value} placeholder={`[${hint}]`} onChange={(e) => set(e.target.value)}
        style={{ minHeight: Math.min(480, Math.max(120, value.split('\n').length * 22 + 24)) }} />
      {images.length > 0 && (
        <ul className="mt-3 flex list-none flex-wrap gap-3 p-0">
          {images.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <li key={m[2]}><img src={m[2]} alt={m[1]} className="h-20 max-w-[160px] rounded-sm border border-line bg-surface object-contain" /></li>
          ))}
        </ul>
      )}
      <div className="actions mt-3">
        <label className="btn">
          {busy ? 'Uploading…' : 'Upload image or PDF'}
          <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
        </label>
        <span className="note" aria-live="polite">{note || 'Markdown works: headings, lists, links, **bold**.'}</span>
      </div>
    </Block>
  );
}

export function BrandEditor() {
  const groups = [...new Set(BRAND_SECTIONS.map((s) => s.group))];
  return (
    <>
      <PageHead title="Brand book" intro="The words around the tokens: who the system is for, how it sounds, and how to use it. Filled sections tick their checklist items." />
      {groups.map((g) => (
        <div key={g}>
          <h2 className="mt-14 text-xl font-semibold leading-7">{g}</h2>
          {BRAND_SECTIONS.filter((s) => s.group === g).map((s) => <Section key={s.key} k={s.key} title={s.title} hint={s.hint} />)}
        </div>
      ))}
    </>
  );
}
