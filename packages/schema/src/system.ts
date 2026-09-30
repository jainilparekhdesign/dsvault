import { z } from 'zod';
import { brandBook } from './brand';
import { component } from './components';
import { tokenSet } from './tokens';

// The full, portable content of a design system. This is what versions
// snapshot, what converters read and write, and what the API accepts.
export const systemContent = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  tokens: tokenSet.default({}),
  brand: brandBook,
  // Manual checklist state: itemKey -> ticked. Auto items are computed, not stored.
  checklist: z.record(z.string(), z.boolean()).default({}),
  components: z.array(component).default([]),
});
export type SystemContent = z.infer<typeof systemContent>;

export const emptySystem = (name = ''): SystemContent => systemContent.parse({ name });
