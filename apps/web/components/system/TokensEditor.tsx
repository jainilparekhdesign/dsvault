'use client';

import type { DimensionToken, TokenSet } from '@dsvault/schema';
import { useEffect } from 'react';
import { useSystem } from './SystemProvider';
import { AddButton, Block, DeleteButton, Empty, Field, PageHead, SwatchField, uid } from './ui';

const ROLES = ['', 'background', 'surface', 'text', 'text-muted', 'border', 'brand', 'on-brand', 'accent', 'success', 'warning', 'error', 'info', 'decorative'];

const loaded = new Set(['figtree', 'geist mono']);
function loadFont(family: string) {
  const f = family.split(',')[0]!.replace(/["']/g, '').trim();
  if (!f || /^(system-ui|ui-|sans-serif|serif|monospace)/i.test(f) || loaded.has(f.toLowerCase())) return;
  loaded.add(f.toLowerCase());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap`;
  document.head.append(link);
}

type ListKey = Exclude<keyof TokenSet, 'pairs'>;

function useList<K extends ListKey>(key: K) {
  const { content, update } = useSystem();
  const list = content.tokens[key] as TokenSet[K];
  const edit = (id: string, patch: Partial<TokenSet[K][number]>) =>
    update((d) => { const x = (d.tokens[key] as { id: string }[]).find((t) => t.id === id); if (x) Object.assign(x, patch); });
  const add = (item: TokenSet[K][number]) => update((d) => { (d.tokens[key] as unknown[]).push(item); });
  const remove = (id: string) => update((d) => {
    (d.tokens[key] as { id: string }[]) = (d.tokens[key] as { id: string }[]).filter((t) => t.id !== id) as never;
    if (key === 'colors') d.tokens.pairs = d.tokens.pairs.filter((p) => p.fg !== id && p.bg !== id);
  });
  return { list, edit, add, remove };
}

const focusLast = (listId: string) => setTimeout(() => {
  const rows = document.querySelectorAll<HTMLElement>(`#${listId} > li`);
  rows[rows.length - 1]?.querySelector<HTMLInputElement>('input[data-name]')?.focus();
}, 0);

function Colors() {
  const { list, edit, add, remove } = useList('colors');
  return (
    <Block id="colors" title="Colors" intro="Each color has a light and a dark value. Tap a swatch to pick, or type a hex. The role tells the checks what a color is for.">
      <ul className="rows" id="color-rows">
        {list.length === 0 && <Empty title="No colors yet">Start with a page background, a text color and one brand color.</Empty>}
        {list.map((c) => (
          <li key={c.id} className="row !grid-cols-[1fr_auto] md:!grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(110px,1fr)_120px_minmax(140px,1.3fr)_auto]">
            <div className="max-md:col-start-1 max-md:row-start-1"><SwatchField theme="light" name={c.name} value={c.light} onChange={(v) => edit(c.id, { light: v })} /></div>
            <div className="max-md:col-span-2"><SwatchField theme="dark" name={c.name} value={c.dark} onChange={(v) => edit(c.id, { dark: v })} /></div>
            <Field label="Name" className="max-md:col-span-2"><input data-name className="input mono" value={c.name} spellCheck={false} onChange={(e) => edit(c.id, { name: e.target.value })} /></Field>
            <Field label="Role" className="max-md:col-span-2">
              <select className="select" value={c.role} onChange={(e) => edit(c.id, { role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r || 'None'}</option>)}
              </select>
            </Field>
            <Field label="Usage" className="max-md:col-span-2"><input className="input" value={c.usage} placeholder="Where it’s used" onChange={(e) => edit(c.id, { usage: e.target.value })} /></Field>
            <div className="max-md:col-start-2 max-md:row-start-1"><DeleteButton label={c.name} onClick={() => remove(c.id)} /></div>
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `color-${list.length + 1}`, light: '#808080', dark: '#808080', usage: '', role: '' }); focusLast('color-rows'); }}>Add color</AddButton>
    </Block>
  );
}

function Type() {
  const { list, edit, add, remove } = useList('type');
  useEffect(() => { list.forEach((t) => loadFont(t.family)); }, [list]);
  return (
    <Block id="type" title="Type" intro="Sizes and line heights in pixels. Any Google Fonts family loads for the preview.">
      <ul className="rows" id="type-rows">
        {list.length === 0 && <Empty title="No type styles yet">A heading and a body style are enough to begin.</Empty>}
        {list.map((t) => (
          <li key={t.id} className="row !grid-cols-2 md:!grid-cols-[minmax(90px,1fr)_minmax(120px,1.4fr)_72px_72px_84px_96px_auto]">
            <Field label="Name"><input data-name className="input mono" value={t.name} spellCheck={false} onChange={(e) => edit(t.id, { name: e.target.value })} /></Field>
            <Field label="Family"><input className="input" value={t.family} placeholder="e.g. Figtree" onChange={(e) => { edit(t.id, { family: e.target.value }); }} onBlur={(e) => loadFont(e.target.value)} /></Field>
            <Field label="Size"><input className="input mono" type="number" min={1} value={t.size} onChange={(e) => edit(t.id, { size: Number(e.target.value) })} /></Field>
            <Field label="Line"><input className="input mono" type="number" min={1} value={t.lineHeight} onChange={(e) => edit(t.id, { lineHeight: Number(e.target.value) })} /></Field>
            <Field label="Weight">
              <select className="select" value={t.weight} onChange={(e) => edit(t.id, { weight: Number(e.target.value) })}>
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Tracking"><input className="input mono" value={t.letterSpacing} placeholder="0" onChange={(e) => edit(t.id, { letterSpacing: e.target.value })} /></Field>
            <div className="col-span-2 flex justify-end md:col-span-1"><DeleteButton label={t.name} onClick={() => remove(t.id)} /></div>
            <input
              className="col-span-full w-full min-w-0 overflow-hidden text-ellipsis rounded-sm border border-transparent bg-surface px-3.5 py-3 focus-visible:border-line-strong"
              aria-label={`${t.name} sample text`} value={t.sample} placeholder="The quick brown fox jumps over the lazy dog"
              style={{ fontFamily: `"${t.family}", system-ui, sans-serif`, fontSize: t.size, lineHeight: `${t.lineHeight}px`, fontWeight: t.weight, letterSpacing: t.letterSpacing || undefined, height: 'auto' }}
              onChange={(e) => edit(t.id, { sample: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `style-${list.length + 1}`, family: list.at(-1)?.family ?? 'Figtree', size: 16, lineHeight: 24, weight: 400, letterSpacing: '', sample: '' }); focusLast('type-rows'); }}>Add type style</AddButton>
    </Block>
  );
}

function Dimensions({ k, title, intro, prefix, unit = 'px', preview, emptyText, next }: {
  k: 'spacing' | 'radius' | 'breakpoints' | 'zIndex'; title: string; intro: string; prefix: string; unit?: string; emptyText: [string, string];
  preview?: (v: number) => React.ReactNode; next: (list: DimensionToken[]) => number;
}) {
  const { list, edit, add, remove } = useList(k);
  const listId = `${k}-rows`;
  return (
    <Block id={k} title={title} intro={intro}>
      <ul className="rows" id={listId}>
        {list.length === 0 && <Empty title={emptyText[0]}>{emptyText[1]}</Empty>}
        {list.map((s) => (
          <li key={s.id} className="row !grid-cols-[1fr_96px_auto] md:!grid-cols-[minmax(120px,1fr)_96px_minmax(120px,1.2fr)_minmax(80px,1.2fr)_auto]">
            <Field label="Name"><input data-name className="input mono" value={s.name} spellCheck={false} onChange={(e) => edit(s.id, { name: e.target.value })} /></Field>
            <Field label={unit === 'px' ? 'Pixels' : 'Value'}><input className="input mono" type="number" value={s.value} onChange={(e) => edit(s.id, { value: Number(e.target.value) })} /></Field>
            <DeleteButton label={s.name} onClick={() => remove(s.id)} />
            <Field label="Usage" className="max-md:col-span-2 md:order-none"><input className="input" value={s.usage} placeholder="Where it’s used" onChange={(e) => edit(s.id, { usage: e.target.value })} /></Field>
            <div className="flex min-w-0 items-center max-md:col-span-3 md:-order-none">{preview?.(s.value)}</div>
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `${prefix}${list.length + 1}`, value: next(list), usage: '' }); focusLast(listId); }}>Add {title.toLowerCase().replace(/s$/, '')}</AddButton>
    </Block>
  );
}

function Shadows() {
  const { list, edit, add, remove } = useList('shadows');
  return (
    <Block id="shadows" title="Shadows" intro="CSS box-shadow values. Leave empty if the system uses borders for depth, and say so in the brand book.">
      <ul className="rows" id="shadow-rows">
        {list.length === 0 && <Empty title="No shadows">That’s fine for a borders-first system.</Empty>}
        {list.map((s) => (
          <li key={s.id} className="row !grid-cols-[1fr_auto] md:!grid-cols-[minmax(110px,1fr)_minmax(180px,2fr)_minmax(120px,1.2fr)_56px_auto]">
            <Field label="Name"><input data-name className="input mono" value={s.name} spellCheck={false} onChange={(e) => edit(s.id, { name: e.target.value })} /></Field>
            <Field label="Value" className="max-md:order-2 max-md:col-span-2"><input className="input mono" value={s.value} spellCheck={false} onChange={(e) => edit(s.id, { value: e.target.value })} /></Field>
            <Field label="Usage" className="max-md:order-3 max-md:col-span-2"><input className="input" value={s.usage} onChange={(e) => edit(s.id, { usage: e.target.value })} /></Field>
            <div className="h-9 w-12 rounded-sm border border-line bg-paper max-md:order-4" style={{ boxShadow: s.value }} aria-hidden />
            <div className="max-md:order-1"><DeleteButton label={s.name} onClick={() => remove(s.id)} /></div>
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `shadow-${list.length + 1}`, value: '0 1px 2px rgba(0, 0, 0, 0.12)', usage: '' }); focusLast('shadow-rows'); }}>Add shadow</AddButton>
    </Block>
  );
}

function Durations() {
  const { list, edit, add, remove } = useList('durations');
  return (
    <Block id="durations" title="Durations" intro="Milliseconds. Every duration needs a reduced-motion value; 0 means the change is instant.">
      <ul className="rows" id="duration-rows">
        {list.length === 0 && <Empty title="No durations yet">Most systems need a short one for state changes and a longer one for screens.</Empty>}
        {list.map((d) => (
          <li key={d.id} className="row !grid-cols-[1fr_1fr_auto] md:!grid-cols-[minmax(110px,1fr)_96px_120px_minmax(140px,1.5fr)_auto]">
            <Field label="Name" className="max-md:col-span-2"><input data-name className="input mono" value={d.name} spellCheck={false} onChange={(e) => edit(d.id, { name: e.target.value })} /></Field>
            <div className="md:hidden"><DeleteButton label={d.name} onClick={() => remove(d.id)} /></div>
            <Field label="Milliseconds"><input className="input mono" type="number" min={0} value={d.ms} onChange={(e) => edit(d.id, { ms: Number(e.target.value) })} /></Field>
            <Field label="Reduced motion">
              <input className="input mono" type="number" min={0} value={d.reducedMs ?? ''} placeholder="None" aria-invalid={d.reducedMs == null}
                onChange={(e) => edit(d.id, { reducedMs: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Usage" className="max-md:col-span-3"><input className="input" value={d.usage} onChange={(e) => edit(d.id, { usage: e.target.value })} /></Field>
            <div className="max-md:hidden"><DeleteButton label={d.name} onClick={() => remove(d.id)} /></div>
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `dur-${list.length + 1}`, ms: list.length ? (list.at(-1)!.ms || 150) * 2 : 150, reducedMs: 0, usage: '' }); focusLast('duration-rows'); }}>Add duration</AddButton>
    </Block>
  );
}

function Easings() {
  const { list, edit, add, remove } = useList('easings');
  return (
    <Block id="easings" title="Easing" intro="CSS timing functions, such as cubic-bezier(0.2, 0, 0, 1).">
      <ul className="rows" id="easing-rows">
        {list.length === 0 && <Empty title="No easing curves yet">One ease-out curve covers most movement.</Empty>}
        {list.map((x) => (
          <li key={x.id} className="row !grid-cols-[1fr_auto] md:!grid-cols-[minmax(110px,1fr)_minmax(180px,2fr)_minmax(120px,1.2fr)_auto]">
            <Field label="Name"><input data-name className="input mono" value={x.name} spellCheck={false} onChange={(e) => edit(x.id, { name: e.target.value })} /></Field>
            <Field label="Value" className="max-md:order-2 max-md:col-span-2"><input className="input mono" value={x.value} spellCheck={false} onChange={(e) => edit(x.id, { value: e.target.value })} /></Field>
            <Field label="Usage" className="max-md:order-3 max-md:col-span-2"><input className="input" value={x.usage} onChange={(e) => edit(x.id, { usage: e.target.value })} /></Field>
            <div className="max-md:order-1"><DeleteButton label={x.name} onClick={() => remove(x.id)} /></div>
          </li>
        ))}
      </ul>
      <AddButton onClick={() => { add({ id: uid(), name: `ease-${list.length + 1}`, value: 'cubic-bezier(0.2, 0, 0, 1)', usage: '' }); focusLast('easing-rows'); }}>Add easing</AddButton>
    </Block>
  );
}

const double = (list: DimensionToken[], start: number) => (list.length ? (list.at(-1)!.value || start / 2) * 2 : start);

export function TokensEditor() {
  return (
    <>
      <PageHead title="Tokens" intro="Every value the system is built from. Changes save as you type." />
      <Colors />
      <Type />
      <Dimensions k="spacing" title="Spacing" intro="Steps in pixels, smallest first." prefix="space-" emptyText={['No spacing steps yet', 'A 4px or 8px base works for most systems.']}
        next={(l) => double(l, 4)} preview={(v) => <div className="h-3 max-w-full rounded-[2px] bg-forest" style={{ width: Math.min(v, 600) }} aria-hidden />} />
      <Dimensions k="radius" title="Radius" intro="Corner radii in pixels." prefix="radius-" emptyText={['No radii yet', 'Many systems need only two or three.']}
        next={(l) => (l.length ? l.at(-1)!.value * 2 : 4)} preview={(v) => <div className="h-9 w-12 border-[1.5px] border-forest bg-forest-tint" style={{ borderRadius: v }} aria-hidden />} />
      <Dimensions k="breakpoints" title="Breakpoints" intro="Widths in pixels where the layout changes." prefix="bp-" emptyText={['No breakpoints yet', 'Two or three are usually enough, for example 768 and 1200.']}
        next={(l) => (l.length ? l.at(-1)!.value + 400 : 768)} />
      <Shadows />
      <Dimensions k="zIndex" title="Z-index" intro="Named layers, lowest first." prefix="z-" unit="" emptyText={['No layers yet', 'Name the layers for dropdowns, overlays and toasts.']}
        next={(l) => (l.length ? l.at(-1)!.value + 10 : 10)} />
      <Durations />
      <Easings />
    </>
  );
}
