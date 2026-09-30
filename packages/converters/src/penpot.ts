import type { SystemContent } from '@dsvault/schema';
import { type TextFile, type ImportResult, finish, firstFamily, idFor, px, uniqueNames } from './util';
import { parseBoxShadow } from './shadow';

// Penpot design tokens: W3C DTCG ($value/$type) in one file whose top-level
// keys are token sets, plus $themes and $metadata. Type names follow Penpot's
// own mapping (borderRadius, fontSizes, fontFamilies, fontWeights, …).
// Light and dark are two sets switched by a "Mode" theme group.

export function toPenpot(c: SystemContent): Record<string, any> {
  const t = c.tokens;
  const group = <T extends { name: string; usage?: string }>(list: T[], value: (x: T) => unknown, type: string) => {
    const n = uniqueNames(list);
    return Object.fromEntries(list.map((x, i) => [n[i], { $value: value(x), $type: type, ...(x.usage ? { $description: x.usage } : {}) }]));
  };
  const global: Record<string, any> = {};
  if (t.spacing.length) global.spacing = group(t.spacing, (x) => String(x.value), 'spacing');
  if (t.radius.length) global.radius = group(t.radius, (x) => String(x.value), 'borderRadius');
  if (t.breakpoints.length) global.breakpoint = group(t.breakpoints, (x) => String(x.value), 'sizing');
  if (t.zIndex.length) global['z-index'] = group(t.zIndex, (x) => String(x.value), 'number');
  if (t.shadows.length) global.shadow = group(t.shadows, (x) => parseBoxShadow(x.value).map((s) => ({ offsetX: String(s.x), offsetY: String(s.y), blur: String(s.blur), spread: String(s.spread), color: s.color, inset: s.inset })), 'shadow');
  if (t.type.length) {
    const n = uniqueNames(t.type);
    global['font-size'] = Object.fromEntries(t.type.map((x, i) => [n[i], { $value: String(x.size), $type: 'fontSizes' }]));
    global['font-weight'] = Object.fromEntries(t.type.map((x, i) => [n[i], { $value: String(x.weight), $type: 'fontWeights' }]));
    const fams = [...new Set(t.type.map((x) => x.family).filter(Boolean))];
    global['font-family'] = Object.fromEntries(fams.map((f) => [f.toLowerCase().replace(/[^a-z0-9]+/g, '-'), { $value: f, $type: 'fontFamilies' }]));
    const ls = t.type.filter((x) => x.letterSpacing);
    if (ls.length) global['letter-spacing'] = Object.fromEntries(ls.map((x) => [uniqueNames(t.type)[t.type.indexOf(x)], { $value: x.letterSpacing, $type: 'letterSpacing' }]));
  }
  const colors = (mode: 'light' | 'dark') => (t.colors.length ? { color: group(t.colors, (x) => x[mode], 'color') } : {});
  return {
    global,
    light: colors('light'),
    dark: colors('dark'),
    $themes: [
      { name: 'Light', group: 'Mode', description: '', isSource: false, selectedTokenSets: { global: 'enabled', light: 'enabled' } },
      { name: 'Dark', group: 'Mode', description: '', isSource: false, selectedTokenSets: { global: 'enabled', dark: 'enabled' } },
    ],
    $metadata: { tokenSetOrder: ['global', 'light', 'dark'], activeThemes: ['Mode/Light'], activeSets: ['global', 'light'] },
  };
}

export function exportPenpot(c: SystemContent): TextFile {
  const slug = (c.name || 'design-system').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { filename: `${slug}.penpot-tokens.json`, mime: 'application/json', text: JSON.stringify(toPenpot(c), null, 2) + '\n' };
}

/** Penpot files look like Tokens Studio with $value/$type; read colors and dimensions back. */
export function importPenpot(json: Record<string, any>, name = ''): ImportResult {
  const warnings: string[] = [];
  const sets = Object.keys(json).filter((k) => !k.startsWith('$'));
  const leaves = (o: any, prefix = ''): [string, any][] => Object.entries(o ?? {}).flatMap(([k, v]: [string, any]) =>
    v && typeof v === 'object' && '$value' in v ? [[prefix ? `${prefix}-${k}` : k, v]] : v && typeof v === 'object' ? leaves(v, prefix ? `${prefix}-${k}` : k) : []);
  const all = sets.flatMap((s) => leaves(json[s]).map(([k, v]) => ({ set: s, key: k, tok: v })));
  const darkSet = sets.find((s) => /dark/i.test(s));
  const colorsBy = new Map<string, { light?: string; dark?: string; usage: string }>();
  for (const { set, key, tok } of all.filter((x) => x.tok.$type === 'color')) {
    const name = key.replace(/^color-/, '');
    const e: { light?: string; dark?: string; usage: string } = colorsBy.get(name) ?? { usage: tok.$description ?? '' };
    if (set === darkSet) e.dark = String(tok.$value); else e.light ??= String(tok.$value);
    colorsBy.set(name, e);
  }
  const colors = [...colorsBy].map(([n, e]) => ({ id: idFor('color', n), name: n, light: e.light ?? e.dark ?? '', dark: e.dark ?? e.light ?? '', usage: e.usage, role: '' }));
  const dims = (type: string, group: string, strip: RegExp) => all.filter((x) => x.tok.$type === type).flatMap(({ key, tok }) => {
    const v = px(tok.$value);
    if (v == null) { warnings.push(`Skipped ${key}: "${tok.$value}" isn’t a plain number.`); return []; }
    const n = key.replace(strip, '');
    return [{ id: idFor(group, n), name: n, value: v, usage: tok.$description ?? '' }];
  });
  const sizes = all.filter((x) => x.tok.$type === 'fontSizes');
  const weights = new Map(all.filter((x) => x.tok.$type === 'fontWeights').map((x) => [x.key.replace(/^font-weight-/, ''), Number(x.tok.$value)]));
  const family = all.find((x) => x.tok.$type === 'fontFamilies')?.tok.$value;
  const type = sizes.map(({ key, tok }) => {
    const n = key.replace(/^font-size-/, '');
    const size = px(tok.$value) ?? 16;
    return { id: idFor('type', n), name: n, family: firstFamily(Array.isArray(family) ? family[0] : String(family ?? '')), size, lineHeight: Math.round(size * 1.5), weight: weights.get(n) || 400, letterSpacing: '', sample: '' };
  });
  if (type.length) warnings.push('Penpot font sizes have no line height here; set to 1.5×. Adjust on the Tokens page.');
  return finish({
    name,
    tokens: { colors, type, spacing: dims('spacing', 'space', /^spacing-/), radius: dims('borderRadius', 'radius', /^radius-/), breakpoints: dims('sizing', 'bp', /^breakpoint-/) },
  }, warnings);
}
