import type { SystemContent } from '@dsvault/schema';
import { type ExportFile, type ImportResult, finish, idFor, ms, px, uniqueNames } from './util';

// W3C Design Tokens Community Group format. Light values are the $value;
// dark values, roles and ids ride in $extensions["com.dsvault"].
const EXT = 'com.dsvault';

type Tok = { $type?: string; $value?: unknown; $description?: string; $extensions?: Record<string, any> };

const bezier = (v: string): number[] | null => {
  const m = v.match(/cubic-bezier\(\s*([^)]+)\)/);
  const nums = m?.[1]!.split(',').map((n) => parseFloat(n));
  return nums && nums.length === 4 && nums.every(Number.isFinite) ? nums : null;
};

export function toDTCG(c: SystemContent): Record<string, any> {
  const t = c.tokens;
  const out: Record<string, any> = { $description: c.name };
  const group = <T extends { id: string; name: string; usage?: string }>(key: string, list: T[], make: (x: T) => Tok) => {
    if (!list.length) return;
    const names = uniqueNames(list);
    out[key] = Object.fromEntries(list.map((x, i) => {
      const tok = make(x);
      if (x.usage) tok.$description = x.usage;
      tok.$extensions = { ...(tok.$extensions ?? {}), [EXT]: { id: x.id, name: x.name, ...(tok.$extensions?.[EXT] ?? {}) } };
      return [names[i], tok];
    }));
  };
  group('color', t.colors, (x) => ({ $type: 'color', $value: x.light, $extensions: { [EXT]: { dark: x.dark, role: x.role }, modes: { light: x.light, dark: x.dark } } }));
  group('spacing', t.spacing, (x) => ({ $type: 'dimension', $value: `${x.value}px` }));
  group('radius', t.radius, (x) => ({ $type: 'dimension', $value: `${x.value}px` }));
  group('breakpoint', t.breakpoints, (x) => ({ $type: 'dimension', $value: `${x.value}px` }));
  group('zIndex', t.zIndex, (x) => ({ $type: 'number', $value: x.value }));
  group('shadow', t.shadows, (x) => ({ $type: 'shadow', $value: x.value }));
  group('duration', t.durations, (x) => ({ $type: 'duration', $value: `${x.ms}ms`, $extensions: { [EXT]: { reducedMs: x.reducedMs } } }));
  group('easing', t.easings, (x) => ({ $type: 'cubicBezier', $value: bezier(x.value) ?? x.value }));
  group('typography', t.type.map((x) => ({ ...x, usage: '' })), (x) => ({
    $type: 'typography',
    $value: { fontFamily: x.family, fontSize: `${x.size}px`, lineHeight: `${x.lineHeight}px`, fontWeight: x.weight, ...(x.letterSpacing ? { letterSpacing: x.letterSpacing } : {}) },
    $extensions: { [EXT]: { sample: x.sample } },
  }));
  out.$extensions = { [EXT]: { description: c.description, pairs: t.pairs, brand: c.brand, checklist: c.checklist } };
  return out;
}

export function exportDTCG(c: SystemContent): ExportFile {
  return { filename: 'tokens.json', mime: 'application/json', text: JSON.stringify(toDTCG(c), null, 2) + '\n' };
}

export function importDTCG(json: Record<string, any>): ImportResult {
  const warnings: string[] = [];
  const meta = json.$extensions?.[EXT] ?? {};
  const entries = (key: string): [string, Tok][] => Object.entries(json[key] ?? {}).filter(([k, v]) => !k.startsWith('$') && v && typeof v === 'object' && '$value' in (v as object)) as [string, Tok][];
  const base = (group: string, key: string, tok: Tok) => {
    const e = tok.$extensions?.[EXT] ?? {};
    return { id: e.id ?? idFor(group, key), name: e.name ?? key, usage: tok.$description ?? '' };
  };
  const dims = (group: string, key: string) => entries(key).flatMap(([k, tok]) => {
    const v = px(tok.$value);
    if (v == null) { warnings.push(`Skipped ${key}.${k}: not a pixel value.`); return []; }
    return [{ ...base(group, k, tok), value: v }];
  });
  // Also accept groups nested one level (e.g. color.brand.primary).
  const colorEntries: [string, Tok][] = [];
  for (const [k, v] of Object.entries(json.color ?? {})) {
    if (k.startsWith('$') || !v || typeof v !== 'object') continue;
    if ('$value' in v) colorEntries.push([k, v as Tok]);
    else for (const [k2, v2] of Object.entries(v as object)) if (v2 && typeof v2 === 'object' && '$value' in v2) colorEntries.push([`${k}-${k2}`, v2 as Tok]);
  }
  const colors = colorEntries.map(([k, tok]) => {
    const e = tok.$extensions ?? {};
    const light = String(e.modes?.light ?? tok.$value ?? '');
    return { ...base('color', k, tok), light, dark: String(e[EXT]?.dark ?? e.modes?.dark ?? light), role: e[EXT]?.role ?? '' };
  });
  const type = entries('typography').map(([k, tok]) => {
    const v = (tok.$value ?? {}) as Record<string, any>;
    return {
      id: tok.$extensions?.[EXT]?.id ?? idFor('type', k),
      name: tok.$extensions?.[EXT]?.name ?? k,
      family: Array.isArray(v.fontFamily) ? v.fontFamily[0] : String(v.fontFamily ?? ''),
      size: px(v.fontSize) ?? 16,
      lineHeight: px(v.lineHeight) ?? (typeof v.lineHeight === 'number' ? v.lineHeight * (px(v.fontSize) ?? 16) : 24),
      weight: Number(v.fontWeight) || 400,
      letterSpacing: v.letterSpacing ? String(v.letterSpacing) : '',
      sample: tok.$extensions?.[EXT]?.sample ?? '',
    };
  });
  const durations = entries('duration').flatMap(([k, tok]) => {
    const v = ms(tok.$value);
    if (v == null) return [];
    const r = tok.$extensions?.[EXT]?.reducedMs;
    return [{ ...base('duration', k, tok), ms: v, reducedMs: r === undefined ? null : r }];
  });
  const easings = entries('easing').map(([k, tok]) => ({
    ...base('easing', k, tok),
    value: Array.isArray(tok.$value) ? `cubic-bezier(${tok.$value.join(', ')})` : String(tok.$value),
  }));
  const shadows = entries('shadow').map(([k, tok]) => ({ ...base('shadow', k, tok), value: typeof tok.$value === 'string' ? tok.$value : JSON.stringify(tok.$value) }));
  const zIndex = entries('zIndex').map(([k, tok]) => ({ ...base('z', k, tok), value: Number(tok.$value) || 0 }));
  return finish({
    name: typeof json.$description === 'string' ? json.$description : '',
    description: meta.description ?? '',
    brand: meta.brand ?? {},
    checklist: meta.checklist ?? {},
    tokens: { colors, type, spacing: dims('space', 'spacing'), radius: dims('radius', 'radius'), breakpoints: dims('bp', 'breakpoint'), zIndex, shadows, durations, easings, pairs: meta.pairs ?? [] },
  }, warnings);
}
