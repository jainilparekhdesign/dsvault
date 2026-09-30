import { z } from 'zod';

// Phase 1 themes are fixed: every color has a light and a dark value.
export const THEMES = ['light', 'dark'] as const;
export type ThemeId = (typeof THEMES)[number];

const id = z.string().min(1);
const name = z.string();
export const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color');

export const colorToken = z.object({
  id,
  name,
  light: z.string(),
  dark: z.string(),
  usage: z.string().default(''),
  // Semantic role, used by checks: e.g. "text", "background", "brand", "success".
  role: z.string().default(''),
});

export const typeToken = z.object({
  id,
  name,
  family: z.string().default(''),
  size: z.number().nonnegative(),
  lineHeight: z.number().nonnegative(),
  weight: z.number().int().min(100).max(900).default(400),
  letterSpacing: z.string().default(''),
  sample: z.string().default(''),
});

export const dimensionToken = z.object({ id, name, value: z.number(), usage: z.string().default('') });

export const durationToken = z.object({
  id,
  name,
  ms: z.number().nonnegative(),
  // Value used under prefers-reduced-motion. null means no alternative declared.
  reducedMs: z.number().nonnegative().nullable().default(null),
  usage: z.string().default(''),
});

export const easingToken = z.object({ id, name, value: z.string(), usage: z.string().default('') });

export const shadowToken = z.object({ id, name, value: z.string(), usage: z.string().default('') });

// A declared foreground/background pair. `kind` sets the WCAG threshold.
export const pairKind = z.enum(['text', 'large-text', 'non-text']);
export const colorPair = z.object({ id, fg: z.string(), bg: z.string(), kind: pairKind.default('text') });

export const tokenSet = z.object({
  colors: z.array(colorToken).default([]),
  type: z.array(typeToken).default([]),
  spacing: z.array(dimensionToken).default([]),
  radius: z.array(dimensionToken).default([]),
  shadows: z.array(shadowToken).default([]),
  zIndex: z.array(dimensionToken).default([]),
  durations: z.array(durationToken).default([]),
  easings: z.array(easingToken).default([]),
  breakpoints: z.array(dimensionToken).default([]),
  pairs: z.array(colorPair).default([]),
});

export type ColorToken = z.infer<typeof colorToken>;
export type TypeToken = z.infer<typeof typeToken>;
export type DimensionToken = z.infer<typeof dimensionToken>;
export type DurationToken = z.infer<typeof durationToken>;
export type EasingToken = z.infer<typeof easingToken>;
export type ShadowToken = z.infer<typeof shadowToken>;
export type PairKind = z.infer<typeof pairKind>;
export type ColorPair = z.infer<typeof colorPair>;
export type TokenSet = z.infer<typeof tokenSet>;

export const emptyTokens = (): TokenSet => tokenSet.parse({});
