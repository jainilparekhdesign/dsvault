'use client';

import { COMPONENT_KINDS, componentDone, criteriaFor } from '@dsvault/schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HAS_TEMPLATE, templateFor } from '@/lib/component-templates';
import { useSystem } from './SystemProvider';
import { Block, PageHead, uid } from './ui';

export function ComponentsList() {
  const { id, content, update, saveNow } = useSystem();
  const router = useRouter();
  const [kind, setKind] = useState('');
  const [custom, setCustom] = useState('');
  const have = new Set(content.components.map((c) => c.kind).filter(Boolean));
  const missing = COMPONENT_KINDS.filter((k) => !have.has(k));

  async function add(k: string, name: string) {
    const t = templateFor(k);
    const cid = uid();
    update((d) => {
      d.components.push({
        id: cid, name, kind: k, description: t.description, anatomy: t.anatomy, props: t.props ?? [], variants: t.variants ?? [], states: t.states ?? [],
        html: t.html, css: t.css, code: t.code, checks: {}, axe: null,
      });
    });
    await saveNow();
    router.push(`/systems/${id}/components/${cid}`);
  }

  return (
    <>
      <PageHead title="Components" intro="Each component has a live preview in both themes, automated axe checks, and a keyboard and screen-reader checklist. Checklist components start from a template you can edit." />
      <Block title="Library" intro={`${content.components.filter(componentDone).length} of ${content.components.length} done.`}>
        {content.components.length === 0 ? <p className="empty">No components yet. Add one below.</p> : (
          <ul className="rows">
            {content.components.map((c) => {
              const crit = criteriaFor(c.kind);
              const ticked = crit.filter((k) => c.checks[k.key]).length;
              const axe = c.axe == null ? 'Axe not run' : c.axe.light === 0 && c.axe.dark === 0 ? 'Axe clean' : `Axe: ${(c.axe.light ?? 0) + (c.axe.dark ?? 0)} issues`;
              const done = componentDone(c);
              return (
                <li key={c.id} className="border-b border-line">
                  <Link href={`/systems/${id}/components/${c.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 text-graphite no-underline hover:text-forest">
                    <span className="min-w-0 font-medium">{c.name || 'Untitled component'}{c.kind && c.kind !== c.name && <span className="note"> · {c.kind}</span>}{!c.kind && <span className="note"> · custom</span>}</span>
                    <span className="mark" data-ok={String(done)}>{done ? 'Done' : 'Open'}</span>
                    <span className="note col-span-2">{axe} · {ticked}/{crit.length} checks</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
      <Block title="Add" intro="Checklist components with a template start with accessible markup that uses your tokens.">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (kind) void add(kind, kind); }}>
          <label className="field min-w-[220px] flex-1"><span>From the checklist</span>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Choose a component</option>
              {missing.map((k) => <option key={k} value={k}>{k}{HAS_TEMPLATE.has(k) ? ' (template)' : ''}</option>)}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!kind}>Add component</button>
        </form>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) void add('', custom.trim()); }}>
          <label className="field min-w-[220px] flex-1"><span>Custom component</span><input className="input" value={custom} placeholder="e.g. Phone frame" onChange={(e) => setCustom(e.target.value)} /></label>
          <button type="submit" className="btn" disabled={!custom.trim()}>Add custom</button>
        </form>
      </Block>
    </>
  );
}
