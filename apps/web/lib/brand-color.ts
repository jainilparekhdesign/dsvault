import type { SystemContent } from '@dsvault/schema';
import { normalizeHex } from '@dsvault/a11y';

/** The color that best represents a system in lists: its brand color, else its first. */
export function brandColor(c: SystemContent): string | null {
  const cs = c.tokens.colors;
  const pick =
    cs.find((x) => x.role === 'brand') ??
    cs.find((x) => /\b(brand|primary)\b/i.test(x.name)) ??
    cs.find((x) => !/background|surface|text|border|decorative/.test(x.role)) ??
    cs[0];
  return pick ? normalizeHex(pick.light) : null;
}
