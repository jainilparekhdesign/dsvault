import { BRAND_SECTIONS, THEMES, type SystemContent } from '@dsvault/schema';
import { type TextFile, type ImportResult, finish, firstFamily, fontStack, idFor, ms, px, uniqueNames } from './util';

// Claude Design "Design System" artifact: README.md (the brand book) plus
// tokens.json, where every family is a list of {name, value, usage} and
// colors carry one value per theme. There is no motion family, so durations
// and easings go in as plain "other" families.

const familyKey = (family: string) => (/mono/i.test(family) ? 'mono' : /serif/i.test(family) && !/sans/i.test(family) ? 'serif' : 'sans');

export function toClaudeTokens(c: SystemContent): Record<string, any> {
  const t = c.tokens;
  const list = <T extends { name: string; usage?: string }>(xs: T[], value: (x: T) => string) => {
    const n = uniqueNames(xs);
    return { tokens: xs.map((x, i) => ({ name: n[i], value: value(x), ...(x.usage ? { usage: x.usage } : {}) })) };
  };
  const out: Record<string, any> = {
    name: c.name || 'Untitled system',
    version: 1,
    color: {
      themes: THEMES.map((id) => ({ id, name: id[0]!.toUpperCase() + id.slice(1) })),
      tokens: t.colors.map((x, i) => ({ name: uniqueNames(t.colors)[i], value: { light: x.light, dark: x.dark }, ...(x.usage ? { usage: x.usage } : {}) })),
    },
  };
  if (t.type.length) {
    const families: Record<string, string> = {};
    const groups: Record<string, { name: string; family: string; styles: any[] }> = {};
    const tn = uniqueNames(t.type);
    t.type.forEach((x, i) => {
      const key = familyKey(x.family);
      families[key] ??= fontStack(x.family);
      const g = (groups[key] ??= { name: x.family || key, family: key, styles: [] });
      g.styles.push({
        name: tn[i], fontSize: `${x.size}px`, lineHeight: `${x.lineHeight}px`, fontWeight: x.weight,
        ...(x.letterSpacing ? { letterSpacing: x.letterSpacing } : {}), ...(x.sample ? { sample: x.sample.slice(0, 200) } : {}),
      });
    });
    out.type = { fonts: [], families, groups: Object.values(groups) };
  }
  if (t.spacing.length) out.spacing = list(t.spacing, (x) => `${x.value}px`);
  if (t.radius.length) out.radius = list(t.radius, (x) => `${x.value}px`);
  if (t.shadows.length) out.shadow = list(t.shadows, (x) => x.value);
  if (t.zIndex.length) out.zIndex = list(t.zIndex, (x) => String(x.value));
  if (t.breakpoints.length) out.breakpoint = list(t.breakpoints, (x) => `${x.value}px`);
  if (t.durations.length) out.duration = list(t.durations, (x) => `${x.ms}ms`);
  if (t.easings.length) out.easing = list(t.easings, (x) => x.value);
  return out;
}

export function brandBookMarkdown(c: SystemContent): string {
  const lines = [`# ${c.name || 'Untitled system'}`, ''];
  if (c.description.trim()) lines.push(c.description.trim(), '');
  let group = '';
  for (const s of BRAND_SECTIONS) {
    const body = (c.brand[s.key] ?? '').trim();
    if (!body) continue;
    if (s.group !== group) { group = s.group; lines.push(`## ${group}`, ''); }
    lines.push(`### ${s.title}`, '', body, '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function exportClaudeDesign(c: SystemContent): TextFile[] {
  return [
    { filename: 'README.md', mime: 'text/markdown', text: brandBookMarkdown(c) },
    { filename: 'tokens.json', mime: 'application/json', text: JSON.stringify(toClaudeTokens(c), null, 2) + '\n' },
  ];
}

export function importClaudeTokens(json: Record<string, any>, readme = ''): ImportResult {
  const warnings: string[] = [];
  const themes: string[] = (json.color?.themes ?? []).map((t: any) => t.id);
  const first = themes[0] ?? 'light';
  const colors = (json.color?.tokens ?? []).map((t: any) => {
    const v = typeof t.value === 'string' ? { [first]: t.value } : t.value ?? {};
    const light = v.light ?? v[first] ?? '';
    return { id: idFor('color', t.name), name: t.name, light, dark: v.dark ?? light, usage: t.usage ?? '', role: '' };
  });
  const families: Record<string, string> = json.type?.families ?? {};
  const type = (json.type?.groups ?? []).flatMap((g: any) => (g.styles ?? []).map((s: any) => ({
    id: idFor('type', s.name), name: s.name, family: firstFamily(families[s.family ?? g.family] ?? g.name ?? ''),
    size: px(s.fontSize) ?? 16, lineHeight: px(s.lineHeight) ?? (Number(s.lineHeight) ? Number(s.lineHeight) * (px(s.fontSize) ?? 16) : 24),
    weight: Number(s.fontWeight) || 400, letterSpacing: s.letterSpacing ?? '', sample: s.sample ?? '',
  })));
  const tokens = (key: string) => (json[key]?.tokens ?? []) as { name: string; value: string; usage?: string }[];
  const dims = (group: string, key: string) => tokens(key).flatMap((t) => {
    const n = px(t.value);
    if (n == null) { warnings.push(`Skipped ${key} ${t.name}: "${t.value}" isn’t a pixel value.`); return []; }
    return [{ id: idFor(group, t.name), name: t.name, value: n, usage: t.usage ?? '' }];
  });
  const brand: Record<string, string> = {};
  if (readme.trim()) brand.vision = readme.trim();
  return finish({
    name: json.name ?? '',
    brand,
    tokens: {
      colors, type,
      spacing: dims('space', 'spacing'),
      radius: dims('radius', 'radius'),
      breakpoints: dims('bp', 'breakpoint'),
      zIndex: tokens('zIndex').map((t) => ({ id: idFor('z', t.name), name: t.name, value: Number(t.value) || 0, usage: t.usage ?? '' })),
      shadows: tokens('shadow').map((t) => ({ id: idFor('shadow', t.name), name: t.name, value: String(t.value), usage: t.usage ?? '' })),
      durations: tokens('duration').flatMap((t) => (ms(t.value) == null ? [] : [{ id: idFor('duration', t.name), name: t.name, ms: ms(t.value)!, reducedMs: null, usage: t.usage ?? '' }])),
      easings: tokens('easing').map((t) => ({ id: idFor('easing', t.name), name: t.name, value: String(t.value), usage: t.usage ?? '' })),
    },
  }, warnings);
}
