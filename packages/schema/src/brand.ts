import { z } from 'zod';

// Brand book sections follow the checklist's design-language part.
export const BRAND_SECTIONS = [
  { key: 'vision', group: 'Brand', title: 'Vision', hint: 'What the product is for and who it serves.' },
  { key: 'principles', group: 'Brand', title: 'Design principles', hint: 'A few rules that settle design arguments.' },
  { key: 'voice', group: 'Brand', title: 'Tone of voice', hint: 'How the product sounds, with examples.' },
  { key: 'terminology', group: 'Brand', title: 'Terminology', hint: 'Words you use, and words you avoid.' },
  { key: 'assets', group: 'Brand', title: 'Brand assets', hint: 'Logos, marks and where to find them.' },
  { key: 'accessibility', group: 'Guidelines', title: 'Accessibility', hint: 'Standards you meet and how you test.' },
  { key: 'writing', group: 'Guidelines', title: 'Writing', hint: 'Grammar, casing, numbers, dates.' },
  { key: 'microcopy', group: 'Guidelines', title: 'Microcopy', hint: 'Buttons, errors, empty states.' },
  { key: 'i18n', group: 'Guidelines', title: 'Internationalisation', hint: 'Languages, text expansion, right-to-left.' },
  { key: 'color', group: 'Foundations', title: 'Color guidelines', hint: 'When to use each color.' },
  { key: 'type', group: 'Foundations', title: 'Type guidelines', hint: 'Which style for what.' },
  { key: 'layout', group: 'Foundations', title: 'Layout and spacing', hint: 'Grid, gutters, breakpoints.' },
  { key: 'motion', group: 'Foundations', title: 'Motion', hint: 'What moves, how fast, and why.' },
  { key: 'iconography', group: 'Foundations', title: 'Iconography', hint: 'Style, grid, naming.' },
] as const;

export type BrandSectionKey = (typeof BRAND_SECTIONS)[number]['key'];
export const brandBook = z.record(z.string(), z.string()).default({});
export type BrandBook = Record<string, string>;
