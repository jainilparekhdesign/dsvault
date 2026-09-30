// Color math on 6-digit hex sRGB colors.

export type RGB = [number, number, number]; // 0..1, gamma-encoded sRGB

export function parseHex(input: string): RGB | null {
  const m = String(input ?? '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1]!.toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
}

export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : null;
}

export function toHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// ---- OKLab / OKLCH (Björn Ottosson) ----
export type Oklch = { l: number; c: number; h: number };

export function rgbToOklab([r, g, b]: RGB): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinearRgb([L, a, b]: [number, number, number]): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgbToOklch(rgb: RGB): Oklch {
  const [l, a, b] = rgbToOklab(rgb);
  return { l, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
}

/** OKLCH to sRGB, reducing chroma until the color fits the sRGB gamut. */
export function oklchToRgb({ l, c, h }: Oklch): RGB {
  const rad = (h * Math.PI) / 180;
  let chroma = c;
  for (let i = 0; i < 40; i++) {
    const lin = oklabToLinearRgb([l, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
    if (lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) return lin.map((v) => fromLinear(Math.min(1, Math.max(0, v)))) as RGB;
    chroma *= 0.9;
  }
  const lin = oklabToLinearRgb([l, 0, 0]);
  return lin.map((v) => fromLinear(Math.min(1, Math.max(0, v)))) as RGB;
}
