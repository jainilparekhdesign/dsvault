'use client';

import { type Component, criteriaFor } from '@dsvault/schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type AxeViolation, type Theme, previewDoc } from '@/lib/preview';
import { BackIcon } from '../icons';
import { SaveStatus, useSystem } from './SystemProvider';
import { AddButton, Block, DeleteButton, Field } from './ui';

const THEMES: Theme[] = ['light', 'dark'];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function ComponentEditor({ cid }: { cid: string }) {
  const { id, content, update } = useSystem();
  const router = useRouter();
  const comp = content.components.find((c) => c.id === cid);
  const [confirm, setConfirm] = useState(false);
  if (!comp) return <p className="empty">This component doesn’t exist. <Link href={`/systems/${id}/components`}>Back to components</Link></p>;

  const edit = (patch: Partial<Component>) => update((d) => { const x = d.components.find((c) => c.id === cid); if (x) Object.assign(x, patch); });
  const crit = criteriaFor(comp.kind);

  return (
    <>
      <Link href={`/systems/${id}/components`} className="note inline-flex items-center gap-1 whitespace-nowrap text-graphite-muted no-underline hover:text-graphite"><BackIcon />All components</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="comp-name">{comp.kind ? `Component · ${comp.kind}` : 'Custom component'}</label>
          <input id="comp-name" className="name-input mt-2" value={comp.name} placeholder="Name" onChange={(e) => edit({ name: e.target.value })} />
        </div>
        <SaveStatus />
      </div>

      <Preview comp={comp} onAxe={(axe) => edit({ axe })} />

      <Block title="Markup and styles" intro="HTML and CSS for the preview. Use your tokens as CSS variables, or the role aliases: --ds-bg, --ds-surface, --ds-text, --ds-muted, --ds-border, --ds-brand, --ds-on-brand, --ds-error, --ds-radius.">
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="HTML"><textarea className="textarea mono text-[13px]" spellCheck={false} style={{ minHeight: 240 }} value={comp.html} onChange={(e) => edit({ html: e.target.value })} /></Field>
          <Field label="CSS"><textarea className="textarea mono text-[13px]" spellCheck={false} style={{ minHeight: 240 }} value={comp.css} onChange={(e) => edit({ css: e.target.value })} /></Field>
        </div>
      </Block>

      <Block title="Checks" intro={`${crit.filter((k) => comp.checks[k.key]).length} of ${crit.length} ticked. Test with a keyboard and a screen reader, then tick.`}>
        <ul className="rows">
          {crit.map((k) => (
            <li key={k.key} className="row !grid-cols-[28px_minmax(0,1fr)] !items-start">
              <input id={`crit-${k.key}`} type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--forest)]" checked={!!comp.checks[k.key]}
                onChange={(e) => update((d) => { const x = d.components.find((c) => c.id === cid)!; if (e.target.checked) x.checks[k.key] = true; else delete x.checks[k.key]; })} />
              <label htmlFor={`crit-${k.key}`} className="cursor-pointer">{k.text}</label>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Documentation" intro="What it’s for and how it’s built.">
        <div className="flex flex-col gap-4">
          <Field label="Description"><textarea className="textarea" style={{ minHeight: 72 }} value={comp.description} placeholder="[When to use it, and when not to]" onChange={(e) => edit({ description: e.target.value })} /></Field>
          <Field label="Anatomy"><textarea className="textarea" style={{ minHeight: 96 }} value={comp.anatomy} placeholder={'1. Container\n2. Label'} onChange={(e) => edit({ anatomy: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Variants (comma separated)"><input className="input" value={comp.variants.join(', ')} onChange={(e) => edit({ variants: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
            <Field label="States (comma separated)"><input className="input" value={comp.states.join(', ')} onChange={(e) => edit({ states: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
          </div>
        </div>
      </Block>

      <Block title="Props" intro="The component’s API.">
        <ul className="rows">
          {comp.props.length === 0 && <li className="empty">No props yet.</li>}
          {comp.props.map((p, i) => (
            <li key={i} className="row !grid-cols-[1fr_auto] md:!grid-cols-[minmax(100px,1fr)_minmax(120px,1.2fr)_minmax(80px,.8fr)_minmax(140px,1.6fr)_auto]">
              <Field label="Name"><input className="input mono" value={p.name} onChange={(e) => update((d) => { d.components.find((c) => c.id === cid)!.props[i]!.name = e.target.value; })} /></Field>
              <Field label="Type" className="max-md:order-2 max-md:col-span-2"><input className="input mono" value={p.type} onChange={(e) => update((d) => { d.components.find((c) => c.id === cid)!.props[i]!.type = e.target.value; })} /></Field>
              <Field label="Default" className="max-md:order-3 max-md:col-span-2"><input className="input mono" value={p.default} onChange={(e) => update((d) => { d.components.find((c) => c.id === cid)!.props[i]!.default = e.target.value; })} /></Field>
              <Field label="Description" className="max-md:order-4 max-md:col-span-2"><input className="input" value={p.description} onChange={(e) => update((d) => { d.components.find((c) => c.id === cid)!.props[i]!.description = e.target.value; })} /></Field>
              <div className="max-md:order-1"><DeleteButton label={p.name || 'prop'} onClick={() => update((d) => { d.components.find((c) => c.id === cid)!.props.splice(i, 1); })} /></div>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => update((d) => { d.components.find((c) => c.id === cid)!.props.push({ name: '', type: 'string', default: '', description: '' }); })}>Add prop</AddButton>
      </Block>

      <Block title="Code" intro="How developers use it, in any framework.">
        <label className="sr-only" htmlFor="comp-code">Code</label>
        <textarea id="comp-code" className="textarea mono text-[13px]" spellCheck={false} style={{ minHeight: 120 }} value={comp.code} onChange={(e) => edit({ code: e.target.value })} />
      </Block>

      <Block title="Delete" intro="Removes this component from the system.">
        <div className="actions">
          {confirm ? (
            <>
              <button type="button" className="btn btn-danger" onClick={() => { update((d) => { d.components = d.components.filter((c) => c.id !== cid); }); router.push(`/systems/${id}/components`); }}>Delete for good</button>
              <button type="button" className="btn" autoFocus onClick={() => setConfirm(false)}>Keep it</button>
            </>
          ) : <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>Delete component</button>}
        </div>
      </Block>
    </>
  );
}

function Preview({ comp, onAxe }: { comp: Component; onAxe: (axe: Component['axe']) => void }) {
  const { content } = useSystem();
  const html = useDebounced(comp.html, 500), css = useDebounced(comp.css, 500);
  const tokens = useDebounced(content.tokens, 500);
  const runId = useMemo(() => Math.random().toString(36).slice(2), [html, css, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const [origin, setOrigin] = useState('');
  const [heights, setHeights] = useState<Record<Theme, number>>({ light: 160, dark: 160 });
  const [results, setResults] = useState<Partial<Record<Theme, AxeViolation[] | string>>>({});
  const saved = useRef(comp.axe);
  saved.current = comp.axe;

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setResults({}), [runId]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (!m || m.runId !== runId) return;
      if (m.type === 'dsv-height') setHeights((h) => ({ ...h, [m.theme]: Math.min(900, Math.max(120, m.height)) }));
      if (m.type === 'dsv-axe') setResults((r) => ({ ...r, [m.theme]: m.error ?? m.violations }));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [runId]);

  // Store the counts once both themes report, only when they change.
  useEffect(() => {
    const l = results.light, d = results.dark;
    if (!Array.isArray(l) || !Array.isArray(d)) return;
    const prev = saved.current;
    if (prev && prev.light === l.length && prev.dark === d.length) return;
    onAxe({ light: l.length, dark: d.length, at: new Date().toISOString() });
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  const docs = useMemo(() => (origin ? Object.fromEntries(THEMES.map((t) => [t, previewDoc({ ...content, tokens }, { html, css }, t, runId, origin)])) : null), [origin, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Block title="Preview" intro="Rendered with this system’s tokens. axe checks each theme (WCAG 2.2 A and AA).">
      <div className="grid gap-3 md:grid-cols-2">
        {THEMES.map((t) => {
          const r = results[t];
          return (
            <div key={t} className="flex min-w-0 flex-col gap-2">
              <span className="theme-tag w-auto">{t}</span>
              {docs && <iframe title={`${comp.name} preview, ${t} theme`} sandbox="allow-scripts" srcDoc={docs[t]} className="w-full rounded-sm border border-line" style={{ height: heights[t] }} />}
              <div aria-live="polite">
                {r === undefined ? <span className="note">Checking…</span> : typeof r === 'string' ? <span className="note text-rust">{r}</span> : r.length === 0 ? (
                  <span className="flex gap-2"><span className="mark" data-ok="true">Pass</span><span className="note">No axe issues.</span></span>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {r.map((v) => (
                      <li key={v.id} className="flex gap-2 py-0.5"><span className="mark" data-ok="false">Fix</span><span className="note text-graphite">{v.help} <span className="mono text-graphite-muted">({v.id}, {v.nodes}×)</span></span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Block>
  );
}
