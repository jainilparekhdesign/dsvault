import { type RGB, oklchToRgb, parseHex, rgbToOklch, toHex, toLinear } from './color';

export type PairKind = 'text' | 'large-text' | 'non-text';

// WCAG 2.2: 1.4.3 (text 4.5, large text 3) and 1.4.11 (non-text 3).
export const WCAG_MIN: Record<PairKind, number> = { text: 4.5, 'large-text': 3, 'non-text': 3 };
// APCA guidance levels (Lc): body text 75, large or bold text 60, non-text and spot elements 45.
export const APCA_MIN: Record<PairKind, number> = { text: 75, 'large-text': 60, 'non-text': 45 };

export function relativeLuminance(rgb: RGB): number {
  const [r, g, b] = rgb.map(toLinear) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function wcagRatio(fg: string, bg: string): number | null {
  const a = parseHex(fg), b = parseHex(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** APCA-W3 0.0.98G-4g lightness contrast (Lc). Sign shows polarity; compare with Math.abs. */
export function apcaLc(fg: string, bg: string): number | null {
  const t = parseHex(fg), b = parseHex(bg);
  if (!t || !b) return null;
  const y = ([r, g, bl]: RGB) => 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * bl ** 2.4;
  const clamp = (v: number) => (v > 0.022 ? v : v + (0.022 - v) ** 1.414);
  const Yt = clamp(y(t)), Yb = clamp(y(b));
  if (Math.abs(Yb - Yt) < 0.0005) return 0;
  let out: number;
  if (Yb > Yt) {
    const s = (Yb ** 0.56 - Yt ** 0.57) * 1.14;
    out = s < 0.1 ? 0 : s - 0.027;
  } else {
    const s = (Yb ** 0.65 - Yt ** 0.62) * 1.14;
    out = s > -0.1 ? 0 : s + 0.027;
  }
  return out * 100;
}

export type PairResult = {
  ratio: number | null;
  lc: number | null;
  wcagPass: boolean;
  apcaPass: boolean;
  /** Nearest color to fg (same hue, changed lightness) that passes WCAG, when fg fails. */
  suggestion: string | null;
};

export function checkPair(fg: string, bg: string, kind: PairKind = 'text'): PairResult {
  const ratio = wcagRatio(fg, bg);
  const lc = apcaLc(fg, bg);
  const wcagPass = ratio != null && ratio >= WCAG_MIN[kind];
  const apcaPass = lc != null && Math.abs(lc) >= APCA_MIN[kind];
  return { ratio, lc, wcagPass, apcaPass, suggestion: wcagPass || ratio == null ? null : suggestPassing(fg, bg, WCAG_MIN[kind]) };
}

/** Search OKLCH lightness in both directions for the closest fg that reaches `target` against bg. */
export function suggestPassing(fg: string, bg: string, target: number): string | null {
  const f = parseHex(fg);
  if (!f || !parseHex(bg)) return null;
  const base = rgbToOklch(f);
  let best: { hex: string; dist: number } | null = null;
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const l = base.l + dir * step * 0.01;
      if (l < 0 || l > 1) break;
      const hex = toHex(oklchToRgb({ ...base, l }));
      const r = wcagRatio(hex, bg);
      if (r != null && r >= target + 0.02) {
        if (!best || step < best.dist) best = { hex, dist: step };
        break;
      }
    }
  }
  return best?.hex ?? null;
}
