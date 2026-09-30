import { BRAND_SECTIONS } from './brand';
import type { SystemContent } from './system';
import type { TokenSet } from './tokens';

export const TOKEN_GROUPS: { key: keyof TokenSet; title: string }[] = [
  { key: 'colors', title: 'Colors' },
  { key: 'type', title: 'Type' },
  { key: 'spacing', title: 'Spacing' },
  { key: 'radius', title: 'Radius' },
  { key: 'breakpoints', title: 'Breakpoints' },
  { key: 'shadows', title: 'Shadows' },
  { key: 'zIndex', title: 'Z-index' },
  { key: 'durations', title: 'Durations' },
  { key: 'easings', title: 'Easing' },
  { key: 'pairs', title: 'Contrast pairs' },
];

export type FieldChange = { field: string; from: unknown; to: unknown };
export type TokenChange =
  | { kind: 'added'; group: keyof TokenSet; id: string; name: string }
  | { kind: 'removed'; group: keyof TokenSet; id: string; name: string }
  | { kind: 'changed'; group: keyof TokenSet; id: string; name: string; fields: FieldChange[] };

export type ContentDiff = {
  meta: FieldChange[];
  tokens: TokenChange[];
  brand: { key: string; title: string; kind: 'added' | 'removed' | 'changed' }[];
  checklist: { key: string; to: boolean }[];
  empty: boolean;
};

const label = (x: Record<string, unknown>) => String(x.name ?? `${x.fg} on ${x.bg}`);

/** What changed going from `a` (older) to `b` (newer). Tokens are matched by id. */
export function diffContent(a: SystemContent, b: SystemContent): ContentDiff {
  const meta: FieldChange[] = [];
  for (const f of ['name', 'description'] as const) if (a[f] !== b[f]) meta.push({ field: f, from: a[f], to: b[f] });

  const tokens: TokenChange[] = [];
  for (const { key } of TOKEN_GROUPS) {
    const before = new Map((a.tokens[key] as Record<string, unknown>[]).map((x) => [x.id as string, x]));
    const after = new Map((b.tokens[key] as Record<string, unknown>[]).map((x) => [x.id as string, x]));
    for (const [id, x] of after) {
      const old = before.get(id);
      if (!old) { tokens.push({ kind: 'added', group: key, id, name: label(x) }); continue; }
      const fields = Object.keys({ ...old, ...x }).filter((f) => f !== 'id' && JSON.stringify(old[f]) !== JSON.stringify(x[f]))
        .map((f) => ({ field: f, from: old[f], to: x[f] }));
      if (fields.length) tokens.push({ kind: 'changed', group: key, id, name: label(x), fields });
    }
    for (const [id, x] of before) if (!after.has(id)) tokens.push({ kind: 'removed', group: key, id, name: label(x) });
  }

  const brand: ContentDiff['brand'] = [];
  const keys = new Set([...Object.keys(a.brand), ...Object.keys(b.brand)]);
  for (const key of keys) {
    const x = (a.brand[key] ?? '').trim(), y = (b.brand[key] ?? '').trim();
    if (x === y) continue;
    const title = BRAND_SECTIONS.find((s) => s.key === key)?.title ?? key;
    brand.push({ key, title, kind: !x ? 'added' : !y ? 'removed' : 'changed' });
  }

  const checklist: ContentDiff['checklist'] = [];
  for (const key of new Set([...Object.keys(a.checklist), ...Object.keys(b.checklist)]))
    if (!!a.checklist[key] !== !!b.checklist[key]) checklist.push({ key, to: !!b.checklist[key] });

  return { meta, tokens, brand, checklist, empty: !meta.length && !tokens.length && !brand.length && !checklist.length };
}
