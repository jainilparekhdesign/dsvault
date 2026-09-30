'use client';

import { a11yReport, evaluateChecklist } from '@dsvault/a11y';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SaveStatus, useSystem } from './SystemProvider';
import { SharingPanel } from './SharingPanel';
import { Block } from './ui';

export function Overview() {
  const { id, content, update, role } = useSystem();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const report = useMemo(() => a11yReport(content), [content]);
  const score = useMemo(() => evaluateChecklist(content, report), [content, report]);
  const t = content.tokens;
  const passing = report.pairs.filter((p) => p.pass).length;
  const base = `/systems/${id}`;

  async function remove() {
    const res = await fetch(`/api/systems/${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Couldn’t delete the system. Try again.'); return; }
    router.push('/');
    router.refresh();
  }

  const stats = [
    { label: 'Checklist', value: `${score.score}%`, detail: `${score.done} of ${score.total} items`, href: `${base}/checklist` },
    { label: 'Contrast', value: report.pairs.length ? `${passing}/${report.pairs.length}` : '—', detail: report.pairs.length ? 'pairs pass in both themes' : 'no pairs declared', href: `${base}/accessibility` },
    { label: 'Colors', value: String(t.colors.length), detail: 'light and dark', href: `${base}/tokens#colors` },
    { label: 'Type styles', value: String(t.type.length), detail: `${t.spacing.length} spacing steps`, href: `${base}/tokens#type` },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="sys-name">Design system</label>
          <input id="sys-name" className="name-input mt-2" placeholder="Name your system" autoComplete="off" value={content.name}
            onChange={(e) => update((d) => { d.name = e.target.value; })} />
        </div>
        <SaveStatus />
      </div>

      <Block title="Summary" intro="Everything here updates as you edit.">
        <ul className="grid list-none grid-cols-2 border-l border-t border-line p-0 md:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="border-b border-r border-line">
              <Link href={s.href} className="flex h-full flex-col gap-1 p-3 text-graphite no-underline hover:bg-surface">
                <span className="label">{s.label}</span>
                <span className="mono text-2xl leading-8">{s.value}</span>
                <span className="note">{s.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Description" intro="One or two sentences on what this system is for. Exported with the brand book.">
        <label className="sr-only" htmlFor="sys-desc">Description</label>
        <textarea id="sys-desc" className="textarea" style={{ minHeight: 96 }} value={content.description} placeholder="[What this system is for, and where it’s used]"
          onChange={(e) => update((d) => { d.description = e.target.value; })} />
      </Block>

      <SharingPanel />

      {role === 'owner' && <Block title="Delete" intro="Removes this system and its versions for good.">
        <div className="actions">
          {!confirming ? (
            <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>Delete system</button>
          ) : (
            <>
              <button type="button" className="btn btn-danger" onClick={remove}>Delete for good</button>
              <button type="button" className="btn" autoFocus onClick={() => setConfirming(false)}>Keep it</button>
            </>
          )}
          {error && <span className="note text-rust" role="alert">{error}</span>}
        </div>
      </Block>}
    </>
  );
}
