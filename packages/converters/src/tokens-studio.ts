import type { SystemContent } from '@dsvault/schema';
import { type TextFile, type ImportResult, finish, idFor, ms, px, uniqueNames } from './util';

// Tokens Studio for Figma, multi-file JSON: a "global" set plus one set per
// theme, with $themes and $metadata. Roles, pairs, ids and reduced-motion
// values have no place in this format and are lost on export.

type TS = { value: any; type: string; description?: string };
const tok = (value: any, type: string, description = ''): TS => (description ? { value, type, description } : { value, type });

export function toTokensStudio(c: SystemContent): Record<string, any> {
  const t = c.tokens;
  const named = <T extends { name: string }>(list: T[], make: (x: T) => TS) => {
    const n = uniqueNames(list);
    return Object.fromEntries(list.map((x, i) => [n[i], make(x)]));
  };
  const global: Record<string, any> = {};
  if (t.spacing.length) global.spacing = named(t.spacing, (x) => tok(String(x.value), 'spacing', x.usage));
  if (t.radius.length) global.borderRadius = named(t.radius, (x) => tok(String(x.value), 'borderRadius', x.usage));
  if (t.breakpoints.length) global.breakpoint = named(t.breakpoints, (x) => tok(String(x.value), 'sizing', x.usage));
  if (t.zIndex.length) global.zIndex = named(t.zIndex, (x) => tok(String(x.value), 'other', x.usage));
  if (t.durations.length) global.duration = named(t.durations, (x) => tok(`${x.ms}ms`, 'other', x.usage));
  if (t.easings.length) global.easing = named(t.easings, (x) => tok(x.value, 'other', x.usage));
  if (t.shadows.length) global.shadow = named(t.shadows, (x) => tok(x.value, 'boxShadow', x.usage));
  if (t.type.length)
    global.typography = named(t.type, (x) => tok({
      fontFamily: x.family, fontWeight: String(x.weight), fontSize: String(x.size), lineHeight: String(x.lineHeight),
      ...(x.letterSpacing ? { letterSpacing: x.letterSpacing } : {}),
    }, 'typography'));
  const theme = (k: 'light' | 'dark') => ({ color: named(t.colors, (x) => tok(x[k], 'color', x.usage)) });
  return {
    global,
    light: theme('light'),
    dark: theme('dark'),
    $themes: [
      { id: 'light', name: 'Light', selectedTokenSets: { global: 'source', light: 'enabled' } },
      { id: 'dark', name: 'Dark', selectedTokenSets: { global: 'source', dark: 'enabled' } },
    ],
    $metadata: { tokenSetOrder: ['global', 'light', 'dark'] },
  };
}

export function exportTokensStudio(c: SystemContent): TextFile {
  return { filename: 'tokens-studio.json', mime: 'application/json', text: JSON.stringify(toTokensStudio(c), null, 2) + '\n' };
}

export function importTokensStudio(json: Record<string, any>, name = ''): ImportResult {
  const warnings: string[] = [];
  const sets = Object.keys(json).filter((k) => !k.startsWith('$'));
  const global = json.global ?? {};
  const lightSet = json.light ?? json[sets.find((s) => /light/i.test(s)) ?? ''] ?? global;
  const darkSet = json.dark ?? json[sets.find((s) => /dark/i.test(s)) ?? ''] ?? lightSet;
  const leaves = (o: Record<string, any> | undefined): [string, TS][] =>
    Object.entries(o ?? {}).filter(([, v]) => v && typeof v === 'object' && 'value' in v) as [string, TS][];

  const lightColors = leaves(lightSet.color ?? global.color);
  const darkColors = new Map(leaves(darkSet.color ?? global.color));
  const colors = lightColors.map(([k, v]) => ({
    id: idFor('color', k), name: k, light: String(v.value), dark: String(darkColors.get(k)?.value ?? v.value), usage: v.description ?? '', role: '',
  }));
  const dims = (group: string, o: Record<string, any> | undefined) => leaves(o).flatMap(([k, v]) => {
    const n = px(v.value);
    if (n == null) { warnings.push(`Skipped ${k}: "${v.value}" is not a number.`); return []; }
    return [{ id: idFor(group, k), name: k, value: n, usage: v.description ?? '' }];
  });
  const type = leaves(global.typography).map(([k, v]) => ({
    id: idFor('type', k), name: k, family: String(v.value.fontFamily ?? ''), size: px(v.value.fontSize) ?? 16,
    lineHeight: px(v.value.lineHeight) ?? 24, weight: Number(v.value.fontWeight) || 400,
    letterSpacing: v.value.letterSpacing ? String(v.value.letterSpacing) : '', sample: '',
  }));
  const durations = leaves(global.duration).flatMap(([k, v]) => {
    const n = ms(v.value);
    return n == null ? [] : [{ id: idFor('duration', k), name: k, ms: n, reducedMs: null, usage: v.description ?? '' }];
  });
  const plain = (group: string, o: Record<string, any> | undefined) => leaves(o).map(([k, v]) => ({ id: idFor(group, k), name: k, value: String(v.value), usage: v.description ?? '' }));
  return finish({
    name,
    tokens: {
      colors, type, durations,
      spacing: dims('space', global.spacing),
      radius: dims('radius', global.borderRadius),
      breakpoints: dims('bp', global.breakpoint),
      zIndex: dims('z', global.zIndex),
      easings: plain('easing', global.easing),
      shadows: plain('shadow', global.shadow),
    },
  }, warnings);
}
