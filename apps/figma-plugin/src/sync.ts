// Pure sync logic between a vault system and a Figma file, shared by the
// plugin's main thread and UI and covered by tests. No Figma API calls here.
import { type ContentDiff, type SystemContent, diffContent, systemContent } from '@dsvault/schema';
import { type FigmaSnapshot, type Mode, type RGBA, type VarType, type VarValue, fromRGBA, sameValue, styleForWeight, toRGBA, weightForStyle } from './values';

export * from './values';

/** A Figma object the vault wants to exist, keyed by vault token id. */
export type DesiredVariable = { vaultId: string; name: string; type: VarType; values: Record<Mode, VarValue>; description: string; scopes: string[]; css: string };
export type DesiredTextStyle = { vaultId: string; name: string; family: string; style: string; size: number; lineHeight: number; letterSpacing: string };
export type DesiredEffectStyle = { vaultId: string; name: string; value: string };

export type Op<T> = { op: 'create'; want: T } | { op: 'update'; figmaId: string; want: T; changes: string[] } | { op: 'remove'; figmaId: string; name: string };
export type PullPlan = {
  collectionName: string;
  createCollection: boolean;
  variables: Op<DesiredVariable>[];
  textStyles: Op<DesiredTextStyle>[];
  effectStyles: Op<DesiredEffectStyle>[];
  skipped: string[];
};

// ---- vault → desired Figma state ----

/** Where a variable may be picked in Figma, so each one only shows up where it belongs. */
export function colorScopes(role: string): string[] {
  if (/^(text|text-muted|on-brand)$/.test(role)) return ['TEXT_FILL'];
  if (/^(background|surface)$/.test(role)) return ['FRAME_FILL', 'SHAPE_FILL'];
  if (/^(border|decorative)$/.test(role)) return ['STROKE_COLOR', 'SHAPE_FILL'];
  return ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
}
const NUM_SCOPES = { spacing: ['GAP'], radius: ['CORNER_RADIUS'], breakpoints: ['WIDTH_HEIGHT'], zIndex: [] as string[] };

const GROUPS = { colors: 'color', spacing: 'spacing', radius: 'radius', breakpoints: 'breakpoint', zIndex: 'z-index', durations: 'duration', easings: 'easing' } as const;

export function desiredState(c: SystemContent) {
  const t = c.tokens;
  const skipped: string[] = [];
  const variables: DesiredVariable[] = [];
  for (const x of t.colors) {
    const light = toRGBA(x.light), dark = toRGBA(x.dark);
    if (!light || !dark) { skipped.push(`Color ${x.name}: Figma needs hex or rgb() values.`); continue; }
    variables.push({ vaultId: x.id, name: `${GROUPS.colors}/${x.name}`, type: 'COLOR', values: { light, dark }, description: x.usage, scopes: colorScopes(x.role), css: `var(--${x.name})` });
  }
  const num = (key: 'spacing' | 'radius' | 'breakpoints' | 'zIndex') => {
    for (const x of t[key]) variables.push({ vaultId: x.id, name: `${GROUPS[key]}/${x.name}`, type: 'FLOAT', values: { light: x.value, dark: x.value }, description: x.usage, scopes: NUM_SCOPES[key], css: `var(--${x.name})` });
  };
  num('spacing'); num('radius'); num('breakpoints'); num('zIndex');
  for (const x of t.durations) variables.push({ vaultId: x.id, name: `${GROUPS.durations}/${x.name}`, type: 'FLOAT', values: { light: x.ms, dark: x.ms }, description: x.usage, scopes: [], css: `var(--${x.name})` });
  for (const x of t.easings) variables.push({ vaultId: x.id, name: `${GROUPS.easings}/${x.name}`, type: 'STRING', values: { light: x.value, dark: x.value }, description: x.usage, scopes: [], css: `var(--${x.name})` });
  const prefix = c.name || 'Untitled system';
  const textStyles: DesiredTextStyle[] = t.type.map((x) => ({
    vaultId: x.id, name: `${prefix}/${x.name}`, family: x.family || 'Inter', style: styleForWeight(x.weight), size: x.size, lineHeight: x.lineHeight, letterSpacing: x.letterSpacing,
  }));
  const effectStyles: DesiredEffectStyle[] = t.shadows.map((x) => ({ vaultId: x.id, name: `${prefix}/${x.name}`, value: x.value }));
  return { variables, textStyles, effectStyles, skipped };
}

function planList<D extends { vaultId: string; name: string }, F extends { figmaId: string; vaultId: string | null; name: string }>(
  desired: D[], current: F[], changes: (d: D, f: F) => string[],
): Op<D>[] {
  const ops: Op<D>[] = [];
  const byVault = new Map(current.filter((f) => f.vaultId).map((f) => [f.vaultId!, f]));
  const byName = new Map(current.filter((f) => !f.vaultId).map((f) => [f.name, f]));
  const matched = new Set<string>();
  for (const d of desired) {
    const f = byVault.get(d.vaultId) ?? byName.get(d.name);
    if (!f) { ops.push({ op: 'create', want: d }); continue; }
    matched.add(f.figmaId);
    const ch = changes(d, f);
    if (f.vaultId !== d.vaultId) ch.push('link');
    if (ch.length) ops.push({ op: 'update', figmaId: f.figmaId, want: d, changes: ch });
  }
  // Only remove what the vault created; styles and variables made by hand stay.
  for (const f of current) if (f.vaultId && !matched.has(f.figmaId)) ops.push({ op: 'remove', figmaId: f.figmaId, name: f.name });
  return ops;
}

/** Vault → Figma: what applying the system to this file would change. */
export function planPull(c: SystemContent, snap: FigmaSnapshot): PullPlan {
  const want = desiredState(c);
  const collectionName = c.name || 'Untitled system';
  return {
    collectionName,
    createCollection: !snap.collection,
    variables: planList(want.variables, snap.variables, (d, f) => {
      const ch: string[] = [];
      if (d.name !== f.name) ch.push('name');
      if (d.type !== f.type) ch.push('type');
      if (!sameValue(d.values.light, f.values.light)) ch.push('light');
      if (!sameValue(d.values.dark, f.values.dark)) ch.push('dark');
      if (d.description !== f.description) ch.push('description');
      return ch;
    }),
    textStyles: planList(want.textStyles, snap.textStyles, (d, f) => {
      const ch: string[] = [];
      if (d.name !== f.name) ch.push('name');
      if (d.family !== f.family || d.style !== f.style) ch.push('font');
      if (d.size !== f.size) ch.push('size');
      if (d.lineHeight !== f.lineHeight) ch.push('line height');
      if ((d.letterSpacing || '0') !== (f.letterSpacing || '0')) ch.push('letter spacing');
      return ch;
    }),
    effectStyles: planList(want.effectStyles, snap.effectStyles, (d, f) => {
      const ch: string[] = [];
      if (d.name !== f.name) ch.push('name');
      if (d.value.replace(/\s+/g, ' ') !== f.value.replace(/\s+/g, ' ')) ch.push('shadow');
      return ch;
    }),
    skipped: want.skipped,
  };
}

export const planIsEmpty = (p: PullPlan) => !p.createCollection && !p.variables.length && !p.textStyles.length && !p.effectStyles.length;

// ---- Figma → vault ----

const uid = () => Math.random().toString(36).slice(2, 10);
const leaf = (name: string) => name.split('/').slice(1).join('/') || name;

export type PushResult = { content: SystemContent; diff: ContentDiff; notes: string[] };

/**
 * Figma → vault: the system as it would be after taking the file's values.
 * Tokens that no longer exist in Figma are kept unless `removeMissing`.
 */
export function planPush(c: SystemContent, snap: FigmaSnapshot, removeMissing = false): PushResult {
  const next = systemContent.parse(structuredClone(c));
  const notes: string[] = [];
  const t = next.tokens;
  const seen = new Set<string>();
  const group = (name: string) => name.split('/')[0];

  for (const v of snap.variables) {
    const g = group(v.name);
    const name = leaf(v.name);
    if (v.type === 'COLOR' && g === 'color') {
      const light = fromRGBA(v.values.light as RGBA), dark = fromRGBA(v.values.dark as RGBA);
      const x = t.colors.find((c) => c.id === v.vaultId) ?? t.colors.find((c) => c.name === name);
      if (x) { Object.assign(x, { name, light, dark, usage: v.description || x.usage }); seen.add(x.id); }
      else { const id = uid(); t.colors.push({ id, name, light, dark, usage: v.description, role: '' }); seen.add(id); }
      continue;
    }
    const numKey = ({ spacing: 'spacing', radius: 'radius', breakpoint: 'breakpoints', 'z-index': 'zIndex' } as const)[g as 'spacing'];
    if (v.type === 'FLOAT' && numKey) {
      const list = t[numKey];
      const value = Number(v.values.light);
      const x = list.find((s) => s.id === v.vaultId) ?? list.find((s) => s.name === name);
      if (x) { Object.assign(x, { name, value, usage: v.description || x.usage }); seen.add(x.id); }
      else { const id = uid(); list.push({ id, name, value, usage: v.description }); seen.add(id); }
      continue;
    }
    if (v.type === 'FLOAT' && g === 'duration') {
      const x = t.durations.find((s) => s.id === v.vaultId) ?? t.durations.find((s) => s.name === name);
      if (x) { Object.assign(x, { name, ms: Number(v.values.light) }); seen.add(x.id); }
      else { const id = uid(); t.durations.push({ id, name, ms: Number(v.values.light), reducedMs: null, usage: v.description }); seen.add(id); }
      continue;
    }
    if (v.type === 'STRING' && g === 'easing') {
      const x = t.easings.find((s) => s.id === v.vaultId) ?? t.easings.find((s) => s.name === name);
      if (x) { Object.assign(x, { name, value: String(v.values.light) }); seen.add(x.id); }
      else { const id = uid(); t.easings.push({ id, name, value: String(v.values.light), usage: v.description }); seen.add(id); }
      continue;
    }
    notes.push(`Skipped variable ${v.name}: the vault doesn’t have a place for it.`);
  }
  for (const s of snap.textStyles) {
    const name = leaf(s.name);
    const patch = { name, family: s.family, size: s.size, lineHeight: s.lineHeight ?? Math.round(s.size * 1.4), weight: weightForStyle(s.style), letterSpacing: s.letterSpacing };
    const x = t.type.find((y) => y.id === s.vaultId) ?? t.type.find((y) => y.name === name);
    if (x) { Object.assign(x, patch); seen.add(x.id); }
    else { const id = uid(); t.type.push({ id, ...patch, sample: '' }); seen.add(id); }
    if (s.lineHeight == null) notes.push(`${s.name} uses auto line height; set to ${patch.lineHeight}px.`);
  }
  for (const s of snap.effectStyles) {
    const name = leaf(s.name);
    const x = t.shadows.find((y) => y.id === s.vaultId) ?? t.shadows.find((y) => y.name === name);
    if (x) { Object.assign(x, { name, value: s.value }); seen.add(x.id); }
    else { const id = uid(); t.shadows.push({ id, name, value: s.value, usage: '' }); seen.add(id); }
  }
  if (removeMissing) {
    const keep = <T extends { id: string }>(list: T[]) => list.filter((x) => seen.has(x.id));
    t.colors = keep(t.colors); t.spacing = keep(t.spacing); t.radius = keep(t.radius); t.breakpoints = keep(t.breakpoints);
    t.zIndex = keep(t.zIndex); t.durations = keep(t.durations); t.easings = keep(t.easings); t.type = keep(t.type); t.shadows = keep(t.shadows);
    const ids = new Set(t.colors.map((x) => x.id));
    t.pairs = t.pairs.filter((p) => ids.has(p.fg) && ids.has(p.bg));
  }
  return { content: next, diff: diffContent(c, next), notes };
}

