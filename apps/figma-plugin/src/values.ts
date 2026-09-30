// Plain value helpers and Figma snapshot types, with no schema dependency, so
// the plugin's main thread stays small.
import { parseHex } from '@dsvault/a11y/src/color';

export type Mode = 'light' | 'dark';
export type RGBA = { r: number; g: number; b: number; a: number };
export type VarType = 'COLOR' | 'FLOAT' | 'STRING';
export type VarValue = RGBA | number | string;

/** What the plugin reads from Figma: the vault's collection and styles. */
export type FigmaVariable = { figmaId: string; vaultId: string | null; name: string; type: VarType; values: Record<Mode, VarValue>; description: string };
export type FigmaTextStyle = { figmaId: string; vaultId: string | null; name: string; family: string; style: string; size: number; lineHeight: number | null; letterSpacing: string };
export type FigmaEffectStyle = { figmaId: string; vaultId: string | null; name: string; value: string };
export type FigmaSnapshot = { collection: string | null; variables: FigmaVariable[]; textStyles: FigmaTextStyle[]; effectStyles: FigmaEffectStyle[] };

// ---- values ----

export function toRGBA(value: string): RGBA | null {
  const rgb = parseHex(value);
  if (rgb) return { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 };
  const m = value.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
  if (!m) return null;
  const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1]! / 255, g: +m[2]! / 255, b: +m[3]! / 255, a };
}

export function fromRGBA({ r, g, b, a }: RGBA): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  if (a < 0.999) return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${Math.round(a * 100) / 100})`;
  return `#${[r, g, b].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

export const sameValue = (a: VarValue, b: VarValue) =>
  typeof a === 'object' && typeof b === 'object'
    ? ['r', 'g', 'b', 'a'].every((k) => Math.abs((a as any)[k] - (b as any)[k]) < 0.002)
    : a === b;

const WEIGHT_STYLE: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const styleForWeight = (w: number) => WEIGHT_STYLE[Math.round(w / 100) * 100] ?? 'Regular';
export function weightForStyle(style: string): number {
  const s = style.replace(/\s+/g, '').toLowerCase();
  for (const [w, name] of Object.entries(WEIGHT_STYLE)) if (s.startsWith(name.toLowerCase())) return Number(w);
  if (s.includes('semibold') || s.includes('demibold')) return 600;
  return 400;
}

// ---- shadows ----

export type Shadow = { x: number; y: number; blur: number; spread: number; color: RGBA; inset: boolean };

/** Split a CSS box-shadow list into shadows Figma can hold. */
export function parseShadows(css: string): Shadow[] {
  const parts = css.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
  const out: Shadow[] = [];
  for (const p of parts) {
    const inset = /\binset\b/.test(p);
    const color = p.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i)?.[1] ?? 'rgba(0,0,0,0.25)';
    const nums = p.replace(color, '').replace('inset', '').trim().split(/\s+/).map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
    const rgba = toRGBA(color);
    if (nums.length < 2 || !rgba) continue;
    out.push({ x: nums[0]!, y: nums[1]!, blur: nums[2] ?? 0, spread: nums[3] ?? 0, color: rgba, inset });
  }
  return out;
}

export function formatShadows(list: Shadow[]): string {
  return list.map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${fromRGBA(s.color)}`).join(', ');
}
