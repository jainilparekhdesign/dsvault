'use client';

import { type ContentDiff, type SystemContent, TOKEN_GROUPS, diffContent } from '@dsvault/schema';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSystem } from './SystemProvider';
import { Block, PageHead } from './ui';

type Version = { id: string; number: number; label: string; createdAt: string; content: SystemContent };
const CURRENT = 'current';
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const show = (v: unknown) => (v == null ? 'none' : typeof v === 'string' ? (v.length > 60 ? `${v.slice(0, 60)}…` : v || '(empty)') : JSON.stringify(v));

export function VersionsView() {
  const { id, content, saveNow, reset } = useSystem();
  const router = useRouter();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>(CURRENT);
  const [confirm, setConfirm] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/systems/${id}/versions`);
    if (!res.ok) { setNote('Couldn’t load versions.'); setVersions([]); return; }
    const list: Version[] = await res.json();
    setVersions(list);
    setFrom((f) => f || (list[0] ? String(list[0].number) : ''));
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const pick = (key: string) => (key === CURRENT ? content : versions?.find((v) => String(v.number) === key)?.content);
  const diff = useMemo(() => {
    const a = pick(from), b = pick(to);
    return a && b ? diffContent(a, b) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, versions, content]);

  async function saveVersion() {
    await saveNow();
    const res = await fetch(`/api/systems/${id}/versions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label }) });
    if (!res.ok) { setNote('Couldn’t save the version.'); return; }
    const v = await res.json();
    setLabel(''); setNote(`Saved version ${v.number}.`);
    setFrom(String(v.number)); setTo(CURRENT);
    await load();
  }

  async function restore(n: number) {
    await saveNow();
    const res = await fetch(`/api/systems/${id}/versions/${n}`, { method: 'POST' });
    if (!res.ok) { setNote('Couldn’t restore that version.'); return; }
    const body = await res.json();
    reset(body.content);
    setConfirm(null);
    setNote(`Restored version ${n}. Save a new version first next time if you want to keep the current state.`);
    router.refresh();
  }

  const options = [{ key: CURRENT, label: 'Current' }, ...(versions ?? []).map((v) => ({ key: String(v.number), label: `v${v.number}${v.label ? ` · ${v.label}` : ''}` }))];

  return (
    <>
      <PageHead title="Versions" intro="A version is a snapshot of the whole system. Save one before big changes; compare any two, or restore one." />

      <Block title="Save a version" intro="Snapshots tokens, brand book and checklist ticks as they are now.">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void saveVersion(); }}>
          <label className="field min-w-[220px] flex-1"><span>Label</span><input className="input" value={label} maxLength={200} placeholder="e.g. Dark theme pass" onChange={(e) => setLabel(e.target.value)} /></label>
          <button type="submit" className="btn btn-primary">Save version</button>
        </form>
        <p className="note mt-2" aria-live="polite">{note}</p>
      </Block>

      <Block title="History" intro="Newest first.">
        {versions === null ? <p className="note">Loading…</p> : versions.length === 0 ? (
          <p className="empty">No versions yet. Save one above.</p>
        ) : (
          <ul className="rows">
            {versions.map((v) => (
              <li key={v.id} className="row !grid-cols-[auto_minmax(0,1fr)_auto] !items-center">
                <span className="mono">v{v.number}</span>
                <span className="min-w-0"><span className="font-medium">{v.label || 'Untitled version'}</span><span className="note block">{fmt.format(new Date(v.createdAt))}</span></span>
                <span className="actions justify-end">
                  <button type="button" className="btn" onClick={() => { setFrom(String(v.number)); setTo(CURRENT); document.getElementById('compare')?.scrollIntoView({ block: 'start' }); }}>Compare</button>
                  {confirm === v.number ? (
                    <>
                      <button type="button" className="btn btn-danger" onClick={() => restore(v.number)}>Replace current</button>
                      <button type="button" className="btn" autoFocus onClick={() => setConfirm(null)}>Cancel</button>
                    </>
                  ) : <button type="button" className="btn" onClick={() => setConfirm(v.number)}>Restore</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="compare" title="Compare" intro="What changed going from the first to the second.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field"><span>From</span>
            <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
          </label>
          <label className="field"><span>To</span>
            <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
          </label>
        </div>
        <div className="mt-4">{diff ? <DiffList diff={diff} /> : <p className="note">Save a version to compare against.</p>}</div>
      </Block>
    </>
  );
}

function DiffList({ diff }: { diff: ContentDiff }) {
  if (diff.empty) return <p className="note">No differences.</p>;
  const title = (g: string) => TOKEN_GROUPS.find((x) => x.key === g)?.title ?? g;
  const sign = { added: '+', removed: '−', changed: '~' } as const;
  return (
    <ul className="rows">
      {diff.meta.map((m) => <li key={m.field} className="row !grid-cols-[24px_minmax(0,1fr)]"><span className="mono">~</span><span>{m.field === 'name' ? 'Name' : 'Description'}: <span className="mono">{show(m.from)}</span> → <span className="mono">{show(m.to)}</span></span></li>)}
      {diff.tokens.map((t) => (
        <li key={`${t.group}-${t.id}-${t.kind}`} className="row !grid-cols-[24px_minmax(0,1fr)] !items-start">
          <span className="mono" aria-label={t.kind}>{sign[t.kind]}</span>
          <span className="min-w-0">
            <span className="label mr-2">{title(t.group)}</span><span className="mono">{t.name}</span>{t.kind !== 'changed' && <span className="note"> {t.kind}</span>}
            {t.kind === 'changed' && (
              <span className="block">{t.fields.map((f) => <span key={f.field} className="note block"><span className="mono">{f.field}</span>: <span className="mono">{show(f.from)}</span> → <span className="mono">{show(f.to)}</span></span>)}</span>
            )}
          </span>
        </li>
      ))}
      {diff.brand.map((b) => <li key={b.key} className="row !grid-cols-[24px_minmax(0,1fr)]"><span className="mono">{sign[b.kind]}</span><span><span className="label mr-2">Brand book</span>{b.title} {b.kind}</span></li>)}
      {diff.checklist.length > 0 && <li className="row !grid-cols-[24px_minmax(0,1fr)]"><span className="mono">~</span><span><span className="label mr-2">Checklist</span>{diff.checklist.filter((c) => c.to).length} ticked, {diff.checklist.filter((c) => !c.to).length} unticked</span></li>}
    </ul>
  );
}
