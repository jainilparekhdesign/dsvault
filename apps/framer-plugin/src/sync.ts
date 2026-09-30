// Pure planning between a vault system and a Framer project's color and text
// styles. No Framer API calls here, so it can be tested.
import type { SystemContent } from '@dsvault/schema';

export type FramerColor = { id: string; vaultId: string | null; path: string; light: string; dark: string | null };
export type FramerText = { id: string; vaultId: string | null; path: string; family: string; weight: number; fontSize: string; lineHeight: string; letterSpacing: string };
export type FramerSnapshot = { colors: FramerColor[]; texts: FramerText[] };

export type WantColor = { vaultId: string; path: string; light: string; dark: string };
export type WantText = { vaultId: string; path: string; family: string; weight: number; fontSize: string; lineHeight: string; letterSpacing: string; tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' };
export type Op<W> = { op: 'create'; want: W } | { op: 'update'; id: string; want: W; changes: string[] } | { op: 'remove'; id: string; path: string };
export type Plan = { colors: Op<WantColor>[]; texts: Op<WantText>[]; skipped: string[] };

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;
const norm = (v: string | null) => (v ?? '').replace(/\s+/g, '').toLowerCase();

/** Headings get heading tags so Framer's semantics follow the type scale. */
export function tagFor(name: string): WantText['tag'] {
  const n = name.toLowerCase();
  if (/^(display|h1|hero)/.test(n)) return 'h1';
  if (/^(title|h2)/.test(n)) return 'h2';
  if (/^(heading|h3|subtitle)/.test(n)) return 'h3';
  return 'p';
}

export function desired(c: SystemContent) {
  const root = c.name || 'Untitled system';
  const skipped: string[] = [];
  const colors: WantColor[] = [];
  for (const x of c.tokens.colors) {
    if (!COLOR.test(x.light.trim()) || !COLOR.test(x.dark.trim())) { skipped.push(`Color ${x.name}: Framer needs hex, rgb() or hsl().`); continue; }
    colors.push({ vaultId: x.id, path: `${root}/${x.name}`, light: x.light.trim(), dark: x.dark.trim() });
  }
  const texts: WantText[] = c.tokens.type.map((x) => ({
    vaultId: x.id, path: `${root}/${x.name}`, family: x.family || 'Inter', weight: x.weight,
    fontSize: `${x.size}px`, lineHeight: `${x.lineHeight}px`, letterSpacing: x.letterSpacing || '0em', tag: tagFor(x.name),
  }));
  return { colors, texts, skipped };
}

function planList<W extends { vaultId: string; path: string }, F extends { id: string; vaultId: string | null; path: string }>(want: W[], have: F[], diff: (w: W, f: F) => string[]): Op<W>[] {
  const byVault = new Map(have.filter((f) => f.vaultId).map((f) => [f.vaultId!, f]));
  const byPath = new Map(have.filter((f) => !f.vaultId).map((f) => [f.path, f]));
  const seen = new Set<string>();
  const ops: Op<W>[] = [];
  for (const w of want) {
    const f = byVault.get(w.vaultId) ?? byPath.get(w.path);
    if (!f) { ops.push({ op: 'create', want: w }); continue; }
    seen.add(f.id);
    const ch = diff(w, f);
    if (f.vaultId !== w.vaultId) ch.push('link');
    if (ch.length) ops.push({ op: 'update', id: f.id, want: w, changes: ch });
  }
  // Only styles the vault created are ever removed.
  for (const f of have) if (f.vaultId && !seen.has(f.id)) ops.push({ op: 'remove', id: f.id, path: f.path });
  return ops;
}

export function plan(c: SystemContent, snap: FramerSnapshot): Plan {
  const want = desired(c);
  return {
    colors: planList(want.colors, snap.colors, (w, f) => [
      ...(w.path !== f.path ? ['name'] : []), ...(norm(w.light) !== norm(f.light) ? ['light'] : []), ...(norm(w.dark) !== norm(f.dark) ? ['dark'] : []),
    ]),
    texts: planList(want.texts, snap.texts, (w, f) => [
      ...(w.path !== f.path ? ['name'] : []), ...(w.family !== f.family || w.weight !== f.weight ? ['font'] : []),
      ...(w.fontSize !== f.fontSize ? ['size'] : []), ...(w.lineHeight !== f.lineHeight ? ['line height'] : []),
      ...(norm(w.letterSpacing) !== norm(f.letterSpacing) && !(parseFloat(w.letterSpacing) === 0 && parseFloat(f.letterSpacing) === 0) ? ['letter spacing'] : []),
    ]),
    skipped: want.skipped,
  };
}

export const isEmpty = (p: Plan) => !p.colors.length && !p.texts.length;
export const count = (p: Plan) => p.colors.length + p.texts.length;

/** Framer → vault for colors: values from styles under the system's folder. */
export function pullColors(c: SystemContent, snap: FramerSnapshot): { content: SystemContent; changed: string[]; added: string[] } {
  const next: SystemContent = structuredClone(c);
  const prefix = `${c.name || 'Untitled system'}/`;
  const changed: string[] = [], added: string[] = [];
  for (const f of snap.colors) {
    if (!f.vaultId && !f.path.startsWith(prefix)) continue;
    const name = f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path.split('/').pop()!;
    const dark = f.dark ?? f.light;
    const x = next.tokens.colors.find((t) => t.id === f.vaultId) ?? next.tokens.colors.find((t) => t.name === name);
    if (x) {
      if (norm(x.light) !== norm(f.light) || norm(x.dark) !== norm(dark) || x.name !== name) { Object.assign(x, { name, light: f.light, dark }); changed.push(name); }
    } else {
      next.tokens.colors.push({ id: Math.random().toString(36).slice(2, 10), name, light: f.light, dark, usage: '', role: '' });
      added.push(name);
    }
  }
  return { content: next, changed, added };
}
