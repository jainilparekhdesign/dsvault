import { type SystemContent, type TokenSet, emptySystem, systemContent } from '@dsvault/schema';

export type ImportResult = { content: SystemContent; warnings: string[] };
export type ExportFile = { filename: string; mime: string; text: string };

/** A CSS-safe token name. */
export function slug(s: string): string {
  return String(s ?? '').trim().replace(/^--/, '').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'token';
}

/** Unique slugs for a list, in order. */
export function uniqueNames<T extends { name: string }>(list: T[]): string[] {
  const seen = new Map<string, number>();
  return list.map((it) => {
    const base = slug(it.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** Deterministic ids for imported tokens, so re-imports line up. */
export const idFor = (group: string, name: string) => `${group}-${slug(name)}`;

export function px(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const m = String(v ?? '').trim().match(/^(-?\d*\.?\d+)(px|rem)?$/);
  if (!m) return null;
  return m[2] === 'rem' ? parseFloat(m[1]!) * 16 : parseFloat(m[1]!);
}

export function ms(v: unknown): number | null {
  if (typeof v === 'number') return v;
  const m = String(v ?? '').trim().match(/^(\d*\.?\d+)(ms|s)$/);
  if (!m) return null;
  return m[2] === 's' ? parseFloat(m[1]!) * 1000 : parseFloat(m[1]!);
}

export const fontStack = (family: string) => {
  const f = family.trim();
  if (!f) return 'system-ui, sans-serif';
  if (f.includes(',')) return f;
  const quoted = /\s/.test(f) ? `"${f}"` : f;
  return /mono/i.test(f) ? `${quoted}, ui-monospace, SFMono-Regular, Menlo, monospace` : `${quoted}, ui-sans-serif, system-ui, sans-serif`;
};

/** First family name in a CSS font stack, unquoted. */
export const firstFamily = (stack: string) => String(stack ?? '').split(',')[0]!.replace(/["']/g, '').trim();

export function finish(partial: Omit<Partial<SystemContent>, 'tokens'> & { tokens?: Partial<TokenSet> }, warnings: string[] = []): ImportResult {
  const base = emptySystem();
  const content = systemContent.parse({ ...base, ...partial, tokens: { ...base.tokens, ...partial.tokens } });
  return { content, warnings };
}
