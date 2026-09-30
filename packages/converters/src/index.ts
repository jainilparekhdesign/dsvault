import type { SystemContent } from '@dsvault/schema';
import { exportClaudeDesign, importClaudeTokens } from './claude-design';
import { exportCSS, importCSS } from './css';
import { exportDTCG, importDTCG } from './dtcg';
import { exportMarkdownPack } from './markdown-pack';
import { exportTailwind, importTailwind } from './tailwind';
import { exportTokensStudio, importTokensStudio } from './tokens-studio';
import type { ExportFile, ImportResult } from './util';

export * from './util';
export * from './dtcg';
export * from './tokens-studio';
export * from './css';
export * from './tailwind';
export * from './claude-design';
export * from './markdown-pack';

export type ExportFormat = { id: string; label: string; note: string; run: (c: SystemContent) => ExportFile[] };

export const EXPORTS: ExportFormat[] = [
  { id: 'dtcg', label: 'W3C tokens', note: 'Design Tokens Community Group format. Reads back in without loss; also opens in Penpot.', run: (c) => [exportDTCG(c)] },
  { id: 'tokens-studio', label: 'Tokens Studio', note: 'Global, light and dark sets with themes, for Tokens Studio in Figma.', run: (c) => [exportTokensStudio(c)] },
  { id: 'css', label: 'CSS', note: 'Custom properties with light, dark and reduced-motion blocks, and a class per type style.', run: (c) => [exportCSS(c)] },
  { id: 'tailwind', label: 'Tailwind', note: 'A tailwind.config.js whose colors read the CSS custom properties. Use it with the CSS export.', run: (c) => [exportTailwind(c)] },
  { id: 'claude-design', label: 'Claude Design', note: 'README.md and tokens.json for a Claude Design System artifact.', run: exportClaudeDesign },
  { id: 'markdown', label: 'Markdown pack', note: 'Brand book, tokens and rules in one file for AI tools such as Figma Make, Paper or Gemini.', run: (c) => [exportMarkdownPack(c)] },
];

export type ImportKind = 'dtcg' | 'tokens-studio' | 'claude-design' | 'css' | 'tailwind';

/** Guess the format from a file's name and text, then import it. */
export function importAny(filename: string, text: string): ImportResult & { kind: ImportKind } {
  const base = filename.replace(/\.[^.]+$/, '');
  if (/\.css$/i.test(filename)) return { ...importCSS(text, base), kind: 'css' };
  if (/\.(c|m)?(js|ts)$/i.test(filename)) return { ...importTailwind(text, base), kind: 'tailwind' };
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error('That file isn’t valid JSON, CSS or a Tailwind config.'); }
  if (json?.color?.tokens && Array.isArray(json.color.tokens)) return { ...importClaudeTokens(json), kind: 'claude-design' };
  if (json?.$themes || json?.$metadata?.tokenSetOrder) return { ...importTokensStudio(json, base), kind: 'tokens-studio' };
  if (json && typeof json === 'object' && Object.values(json).some((v: any) => v && typeof v === 'object' && Object.values(v).some((x: any) => x && typeof x === 'object' && '$value' in x)))
    return { ...importDTCG(json), kind: 'dtcg' };
  throw new Error('Couldn’t recognise the format. Use W3C tokens, Tokens Studio, a Claude Design tokens.json, CSS or a Tailwind config.');
}
