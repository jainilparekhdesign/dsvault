'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PlusIcon } from './icons';

export function LibraryActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);

  async function create() {
    setBusy(true);
    const res = await fetch('/api/systems', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '' }) });
    setBusy(false);
    if (res.ok) { router.push(`/systems/${(await res.json()).id}`); router.refresh(); }
    else setNote('Couldn’t create a system. Try again.');
  }

  async function importFile(f: File) {
    setBusy(true); setNote(`Reading ${f.name}…`);
    const res = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: f.name, ...(/\.sketch$/i.test(f.name) ? { base64: btoa(Array.from(new Uint8Array(await f.arrayBuffer()), (b) => String.fromCharCode(b)).join('')) } : { text: await f.text() }), create: true }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNote(body.error ?? 'Couldn’t import that file.'); return; }
    router.push(`/systems/${body.id}`);
    router.refresh();
  }

  return (
    <div className="actions mt-4">
      <button type="button" className="add mt-0" onClick={create} disabled={busy}><PlusIcon />New system</button>
      <label className="btn">
        Import a file
        <input ref={file} type="file" className="sr-only" accept=".json,.css,.js,.cjs,.mjs,.ts,.sketch" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f); }} />
      </label>
      <span className="note" aria-live="polite">{note}</span>
    </div>
  );
}
