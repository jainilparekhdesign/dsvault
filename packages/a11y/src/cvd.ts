import { type RGB, fromLinear, parseHex, rgbToOklab, toHex, toLinear } from './color';

export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia';
export const DEFICIENCIES: Deficiency[] = ['protanopia', 'deuteranopia', 'tritanopia'];

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const MATRICES: Record<Deficiency, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

export function simulate(hex: string, type: Deficiency): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const lin = rgb.map(toLinear);
  const m = MATRICES[type];
  const out = m.map((row) => row[0]! * lin[0]! + row[1]! * lin[1]! + row[2]! * lin[2]!);
  return toHex(out.map((v) => fromLinear(Math.min(1, Math.max(0, v)))) as RGB);
}

/** Perceptual distance in OKLab (roughly: 0.02 barely visible, 0.1 clearly different). */
export function oklabDistance(a: string, b: string): number | null {
  const x = parseHex(a), y = parseHex(b);
  if (!x || !y) return null;
  const p = rgbToOklab(x), q = rgbToOklab(y);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export type HueOnlyFinding = { a: string; b: string; deficiency: Deficiency; distance: number; lightnessDelta: number };

const MIN_DISTANCE = 0.08; // below this, two colors are hard to tell apart
const MIN_LIGHTNESS = 0.1; // below this, the pair relies on hue

/**
 * Among colors that must be told apart (e.g. success / warning / error), flag pairs that
 * become hard to distinguish under a color-vision deficiency and differ little in lightness.
 */
export function hueOnlyPairs(colors: { name: string; hex: string }[]): HueOnlyFinding[] {
  const out: HueOnlyFinding[] = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const a = colors[i]!, b = colors[j]!;
      const pa = parseHex(a.hex), pb = parseHex(b.hex);
      if (!pa || !pb) continue;
      const lightnessDelta = Math.abs(rgbToOklab(pa)[0] - rgbToOklab(pb)[0]);
      if (lightnessDelta >= MIN_LIGHTNESS) continue;
      for (const d of DEFICIENCIES) {
        const distance = oklabDistance(simulate(a.hex, d)!, simulate(b.hex, d)!)!;
        if (distance < MIN_DISTANCE) out.push({ a: a.name, b: b.name, deficiency: d, distance, lightnessDelta });
      }
    }
  }
  return out;
}
