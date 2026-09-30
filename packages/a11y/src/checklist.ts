import { ALL_ITEMS, type AutoCheck, type ChecklistItem, type SystemContent } from '@dsvault/schema';
import { normalizeHex } from './color';
import { type A11yReport, a11yReport } from './report';

export type ItemState = { done: boolean; auto: boolean; reason: string };
export type ChecklistResult = { items: Record<string, ItemState>; done: number; total: number; score: number };

const written = (s: string | undefined, min = 40) => (s ?? '').trim().length >= min;

function autoCheck(check: AutoCheck, item: ChecklistItem, c: SystemContent, r: A11yReport): ItemState {
  const t = c.tokens;
  const res = (done: boolean, reason: string): ItemState => ({ done, auto: true, reason });
  switch (check) {
    case 'brand-written':
    case 'guidelines-written': {
      const body = c.brand[item.brandKey ?? ''];
      return res(written(body), written(body) ? 'Written in the brand book.' : 'Write this section in the brand book.');
    }
    case 'palette':
      return res(t.colors.length >= 3, `${t.colors.length} colors.`);
    case 'semantic-colors': {
      const has = (re: RegExp) => t.colors.some((x) => re.test(`${x.role} ${x.name}`));
      const missing = [['success', /success|positive/i], ['warning', /warning|caution/i], ['error', /error|danger|critical|negative/i]]
        .filter(([, re]) => !has(re as RegExp)).map(([n]) => n);
      return res(missing.length === 0, missing.length ? `Missing: ${missing.join(', ')}.` : 'Success, warning and error are defined.');
    }
    case 'dark-theme': {
      const changed = t.colors.filter((x) => normalizeHex(x.light) && normalizeHex(x.dark) && normalizeHex(x.light) !== normalizeHex(x.dark)).length;
      return res(t.colors.length > 0 && changed >= Math.ceil(t.colors.length / 2), `${changed} of ${t.colors.length} colors change in dark mode.`);
    }
    case 'contrast-text': {
      const ps = r.pairs.filter((p) => p.kind !== 'non-text');
      const ok = ps.filter((p) => p.pass).length;
      return res(ps.length > 0 && ok === ps.length, ps.length ? `${ok} of ${ps.length} text pairs pass in both themes.` : 'Declare text pairs on the Accessibility page.');
    }
    case 'contrast-non-text': {
      const ps = r.pairs.filter((p) => p.kind === 'non-text');
      const ok = ps.filter((p) => p.pass).length;
      return res(ps.length > 0 && ok === ps.length, ps.length ? `${ok} of ${ps.length} non-text pairs reach 3:1.` : 'Declare border, focus or icon pairs as non-text.');
    }
    case 'color-blind-safe': {
      const n = r.hueOnly.light.length + r.hueOnly.dark.length;
      if (r.statusColors.length < 2) return res(false, 'Add status colors to check them.');
      return res(n === 0, n ? `${n} status pairs rely on hue alone.` : 'Status colors differ in lightness.');
    }
    case 'spacing-scale':
      return res(t.spacing.length >= 4, `${t.spacing.length} spacing steps.`);
    case 'breakpoints':
      return res(t.breakpoints.length >= 2, `${t.breakpoints.length} breakpoints.`);
    case 'type-scale':
      return res(t.type.length >= 3, `${t.type.length} type styles.`);
    case 'type-readable': {
      const small = r.type.filter((f) => f.problem.includes('minimum')).length;
      return res(t.type.length > 0 && small === 0, small ? `${small} styles are too small.` : 'All styles are 12px or larger.');
    }
    case 'line-height': {
      const bad = r.type.filter((f) => f.problem.startsWith('Line height')).length;
      return res(t.type.length > 0 && bad === 0, bad ? `${bad} styles have tight line height.` : 'Line heights are comfortable.');
    }
    case 'shadows': {
      const bordersRule = /no shadow|borders? (instead|over|not)/i.test(Object.values(c.brand).join(' '));
      return res(t.shadows.length > 0 || bordersRule, t.shadows.length ? `${t.shadows.length} shadow tokens.` : bordersRule ? 'Brand book states borders instead of shadows.' : 'Add shadow tokens or a borders rule.');
    }
    case 'z-index':
      return res(t.zIndex.length >= 2, `${t.zIndex.length} layers.`);
    case 'easings':
      return res(t.easings.length >= 1, `${t.easings.length} easings.`);
    case 'durations':
      return res(t.durations.length >= 2, `${t.durations.length} durations.`);
    case 'reduced-motion':
      return res(t.durations.length > 0 && r.motion.length === 0, t.durations.length ? (r.motion.length ? `${r.motion.length} durations lack a reduced value.` : 'Every duration has a reduced value.') : 'Add durations first.');
  }
}

export function evaluateChecklist(content: SystemContent, report = a11yReport(content)): ChecklistResult {
  const items: Record<string, ItemState> = {};
  for (const item of ALL_ITEMS) {
    items[item.key] = item.auto
      ? autoCheck(item.auto, item, content, report)
      : { done: !!content.checklist[item.key], auto: false, reason: '' };
  }
  const total = ALL_ITEMS.length;
  const done = Object.values(items).filter((s) => s.done).length;
  return { items, done, total, score: total ? Math.round((done / total) * 100) : 0 };
}
