import type { ColorToken, SystemContent, ThemeId } from '@dsvault/schema';
import { THEMES } from '@dsvault/schema';
import { normalizeHex } from './color';
import { type PairKind, type PairResult, checkPair } from './contrast';
import { type HueOnlyFinding, hueOnlyPairs } from './cvd';

export const STATUS_PATTERN = /success|positive|warning|caution|error|danger|critical|negative|info/i;
export const isStatusColor = (c: ColorToken) => STATUS_PATTERN.test(`${c.role} ${c.name}`);

export type PairReport = {
  id: string;
  fg: string;
  bg: string;
  kind: PairKind;
  themes: Record<ThemeId, PairResult & { fgHex: string | null; bgHex: string | null }>;
  pass: boolean;
};

export type TypeFinding = { id: string; name: string; problem: string };
export type MotionFinding = { id: string; name: string; problem: string };

export type A11yReport = {
  pairs: PairReport[];
  hueOnly: Record<ThemeId, HueOnlyFinding[]>;
  statusColors: string[];
  type: TypeFinding[];
  motion: MotionFinding[];
  invalidColors: string[];
};

export const MIN_TEXT_PX = 12;
export const MIN_LINE_HEIGHT = 1.2;
const LARGE_TEXT_PX = 32;

export function a11yReport(content: SystemContent): A11yReport {
  const { colors, pairs, type, durations } = content.tokens;
  const byId = new Map(colors.map((c) => [c.id, c]));

  const pairReports: PairReport[] = pairs.map((p) => {
    const fg = byId.get(p.fg), bg = byId.get(p.bg);
    const themes = {} as PairReport['themes'];
    for (const t of THEMES) {
      const fgHex = fg ? normalizeHex(fg[t]) : null, bgHex = bg ? normalizeHex(bg[t]) : null;
      const r = fgHex && bgHex ? checkPair(fgHex, bgHex, p.kind) : { ratio: null, lc: null, wcagPass: false, apcaPass: false, suggestion: null };
      themes[t] = { ...r, fgHex, bgHex };
    }
    return { id: p.id, fg: fg?.name ?? '(missing)', bg: bg?.name ?? '(missing)', kind: p.kind, themes, pass: THEMES.every((t) => themes[t].wcagPass) };
  });

  const status = colors.filter(isStatusColor);
  const hueOnly = {} as A11yReport['hueOnly'];
  for (const t of THEMES) hueOnly[t] = hueOnlyPairs(status.map((c) => ({ name: c.name, hex: normalizeHex(c[t]) ?? '' })));

  const typeFindings: TypeFinding[] = [];
  for (const s of type) {
    if (s.size < MIN_TEXT_PX) typeFindings.push({ id: s.id, name: s.name, problem: `${s.size}px is below the ${MIN_TEXT_PX}px minimum.` });
    if (s.size < LARGE_TEXT_PX && s.lineHeight < s.size * MIN_LINE_HEIGHT)
      typeFindings.push({ id: s.id, name: s.name, problem: `Line height ${s.lineHeight}px is under ${MIN_LINE_HEIGHT}× the ${s.size}px size.` });
  }

  const motion: MotionFinding[] = [];
  for (const d of durations) {
    if (d.reducedMs == null) motion.push({ id: d.id, name: d.name, problem: 'No reduced-motion value.' });
    else if (d.ms > 0 && d.reducedMs > d.ms) motion.push({ id: d.id, name: d.name, problem: 'Reduced-motion value is longer than the normal value.' });
  }

  const invalidColors = colors.filter((c) => THEMES.some((t) => !normalizeHex(c[t]))).map((c) => c.name);

  return { pairs: pairReports, hueOnly, statusColors: status.map((c) => c.name), type: typeFindings, motion, invalidColors };
}
