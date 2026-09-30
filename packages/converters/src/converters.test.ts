import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SystemContent } from '@dsvault/schema';
import { describe, expect, it } from 'vitest';
import {
  EXPORTS, exportCSS, exportClaudeDesign, exportDTCG, exportMarkdownPack, exportTailwind, exportTokensStudio,
  importAny, importCSS, importClaudeTokens, importDTCG, importTailwind, importTokensStudio,
} from './index';
import { fullSystem } from './fixture';

const fixture = (f: string) => readFileSync(join(__dirname, '__fixtures__', f), 'utf8');

/** Drop the fields a lossy format can't carry, so the rest can be compared. */
function core(c: SystemContent, drop: { usage?: boolean; ids?: boolean; reduced?: boolean; sample?: boolean } = {}) {
  const t = structuredClone(c.tokens) as any;
  for (const list of Object.values(t) as any[][]) for (const x of list) {
    if (drop.ids) delete x.id;
    if (drop.usage) delete x.usage;
    delete x.role;
    if (drop.reduced) delete x.reducedMs;
    if (drop.sample) delete x.sample;
  }
  delete t.pairs;
  return t;
}

describe('W3C DTCG', () => {
  it('round-trips without loss', () => {
    const src = fullSystem();
    expect(importDTCG(JSON.parse(exportDTCG(src).text)).content).toEqual(src);
  });
  it('reads plain DTCG from other tools, including nested color groups', () => {
    const { content } = importDTCG({
      color: { brand: { primary: { $type: 'color', $value: '#123456' } }, bg: { $type: 'color', $value: '#ffffff' } },
      spacing: { sm: { $type: 'dimension', $value: '0.5rem' } },
    });
    expect(content.tokens.colors.map((c) => [c.name, c.light, c.dark])).toEqual([['brand-primary', '#123456', '#123456'], ['bg', '#ffffff', '#ffffff']]);
    expect(content.tokens.spacing[0]!.value).toBe(8);
  });
});

describe('Tokens Studio', () => {
  it('round-trips everything the format can hold', () => {
    const src = fullSystem();
    const back = importTokensStudio(JSON.parse(exportTokensStudio(src).text)).content;
    expect(core(back, { ids: true, reduced: true, sample: true })).toEqual(core(src, { ids: true, reduced: true, sample: true }));
  });
});

describe('CSS', () => {
  it('round-trips tokens, dark values and reduced motion', () => {
    const src = fullSystem();
    const { content, warnings } = importCSS(exportCSS(src).text);
    expect(warnings).toEqual([]);
    expect(core(content, { ids: true, usage: true, sample: true })).toEqual(core(src, { ids: true, usage: true, sample: true }));
  });
  it('reads the portfolio tokens.css', () => {
    const { content, warnings } = importCSS(fixture('portfolio-tokens.css'), 'Jainil Portfolio');
    const forest = content.tokens.colors.find((c) => c.name === 'forest')!;
    // 10 brand colors plus 16 scene colors (two of them rgba()).
    expect(content.tokens.colors).toHaveLength(26);
    expect(content.tokens.colors.find((c) => c.name === 'sun-glow')!.light).toBe('rgba(251, 227, 160, 0.55)');
    expect(warnings).toEqual(['Skipped --stars: couldn’t tell what kind of token it is.']);
    expect([forest.light, forest.dark]).toEqual(['#2f5d46', '#7fb394']);
    expect(content.tokens.durations.map((d) => [d.name, d.ms, d.reducedMs])).toEqual([['dur-state', 150, 0], ['dur-screen', 300, 0], ['dur-zoom', 450, 0]]);
    expect(content.tokens.easings[0]!.value).toBe('cubic-bezier(0.2, 0, 0, 1)');
  });
});

describe('Tailwind', () => {
  it('exports colors as CSS variables and literal scales', () => {
    const text = exportTailwind(fullSystem()).text;
    expect(text).toContain("'forest': 'var(--forest)'".replace(/'/g, '"'));
    expect(text).toContain('"sm": "6px"');
  });
  it('reads its own scales back and explains skipped variable colors', () => {
    const { content, warnings } = importTailwind(exportTailwind(fullSystem()).text);
    expect(content.tokens.spacing.map((s) => s.value)).toEqual([4, 16]);
    expect(content.tokens.type.map((t) => [t.name, t.size, t.lineHeight, t.weight])).toEqual([['body', 17, 28, 400], ['label', 12, 16, 500]]);
    expect(content.tokens.durations.map((d) => d.ms)).toEqual([150, 300]);
    expect(warnings.some((w) => w.includes('var(--forest)'))).toBe(true);
  });
  it('reads literal colors from a hand-written config', () => {
    const { content } = importTailwind(`module.exports = { theme: { extend: { colors: { brand: { DEFAULT: '#2f5d46', light: '#dce6df' }, // comment
      ink: "#111" } } } }`);
    expect(content.tokens.colors.map((c) => [c.name, c.light])).toEqual([['brand', '#2f5d46'], ['brand-light', '#dce6df'], ['ink', '#111']]);
  });
});

describe('Claude Design', () => {
  it('writes the artifact’s list shape with per-theme colors', () => {
    const [readme, tokens] = exportClaudeDesign(fullSystem());
    const json = JSON.parse(tokens!.text);
    expect(readme!.filename).toBe('README.md');
    expect(readme!.text).toContain('### Vision');
    expect(json.color.themes).toEqual([{ id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }]);
    expect(json.color.tokens[0]).toEqual({ name: 'paper', value: { light: '#f5f6f3', dark: '#141715' }, usage: 'Page ground' });
    expect(json.type.families.mono).toContain('Geist Mono');
    expect(json.duration.tokens[0]).toEqual({ name: 'dur-state', value: '150ms', usage: 'State changes' });
  });
  it('round-trips the families it holds', () => {
    const src = fullSystem();
    const back = importClaudeTokens(JSON.parse(exportClaudeDesign(src)[1]!.text)).content;
    expect(core(back, { ids: true, reduced: true })).toEqual(core(src, { ids: true, reduced: true }));
  });
  it('reads the published portfolio system', () => {
    const { content } = importClaudeTokens(JSON.parse(fixture('claude-design-tokens.json')));
    expect(content.name).toBe('Jainil Portfolio');
    expect(content.tokens.colors).toHaveLength(10);
    expect(content.tokens.type.map((t) => t.family)).toContain('Geist Mono');
    expect(content.tokens.type).toHaveLength(8);
  });
});

describe('Markdown pack and registry', () => {
  it('includes brand book, tokens and rules', () => {
    const md = exportMarkdownPack(fullSystem()).text;
    expect(md).toContain('# Test System');
    expect(md).toContain('`--forest`');
    expect(md).toContain('# Rules');
    expect(md).toContain('`graphite` on `paper`');
  });
  it('every export runs', async () => {
    for (const f of EXPORTS) expect((await f.run(fullSystem())).every((file) => (file.text?.length ?? file.bytes?.length ?? 0) > 0)).toBe(true);
  });
  it('detects formats', async () => {
    const s = fullSystem();
    expect((await importAny('tokens.json', exportDTCG(s).text!)).kind).toBe('dtcg');
    expect((await importAny('t.json', exportTokensStudio(s).text!)).kind).toBe('tokens-studio');
    expect((await importAny('tokens.json', exportClaudeDesign(s)[1]!.text!)).kind).toBe('claude-design');
    expect((await importAny('tokens.css', exportCSS(s).text!)).kind).toBe('css');
    expect((await importAny('tailwind.config.js', exportTailwind(s).text!)).kind).toBe('tailwind');
    await expect(importAny('x.json', '{"a":1}')).rejects.toThrow();
  });
});
