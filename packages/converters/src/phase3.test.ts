import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fullSystem } from './fixture';
import { EXPORTS, exportPenpot, exportStyleDictionary, importAny, importPenpot, toPenpot } from './index';

describe('Style Dictionary', () => {
  it('builds with the real Style Dictionary into light and dark CSS', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsv-sd-'));
    for (const f of exportStyleDictionary(fullSystem())) writeFileSync(join(dir, f.filename), f.text!);
    const { default: StyleDictionary } = await import('style-dictionary');
    const configs = (await import(join(dir, 'sd.config.mjs'))).default;
    for (const cfg of configs) {
      const sd = new StyleDictionary({ ...cfg, source: cfg.source.map((s: string) => join(dir, s)), include: cfg.include?.map((s: string) => join(dir, s)), log: { verbosity: 'silent', warnings: 'disabled' },
        platforms: Object.fromEntries(Object.entries(cfg.platforms).map(([k, p]: [string, any]) => [k, { ...p, buildPath: join(dir, 'build') + '/' }])) });
      await sd.buildAllPlatforms();
    }
    const light = readFileSync(join(dir, 'build/tokens.css'), 'utf8');
    const dark = readFileSync(join(dir, 'build/tokens.dark.css'), 'utf8');
    expect(light).toContain('--color-forest: #2f5d46;');
    expect(light).toContain('--spacing-space-4: 16px;');
    expect(dark).toContain(':root[data-theme="dark"]');
    expect(dark).toContain('--color-forest: #7fb394;');
    expect(dark).not.toContain('spacing');
  });
});

describe('Penpot', () => {
  it('uses sets, themes and Penpot’s type names', () => {
    const p = toPenpot(fullSystem());
    expect(Object.keys(p)).toEqual(['global', 'light', 'dark', '$themes', '$metadata']);
    expect(p.global.radius['radius-sm']).toEqual({ $value: '6', $type: 'borderRadius', $description: 'Controls' });
    expect(p.global['font-size'].body).toEqual({ $value: '17', $type: 'fontSizes' });
    expect(p.dark.color.forest.$value).toBe('#7fb394');
    expect(p.$themes.map((t: any) => `${t.group}/${t.name}`)).toEqual(['Mode/Light', 'Mode/Dark']);
    expect(p.global.shadow['shadow-1'].$value[0]).toMatchObject({ offsetX: '0', offsetY: '1', blur: '2', spread: '0' });
  });
  it('reads its own export back', () => {
    const { content } = importPenpot(JSON.parse(exportPenpot(fullSystem()).text!));
    expect(content.tokens.colors.map((c) => [c.name, c.light, c.dark])).toEqual(fullSystem().tokens.colors.map((c) => [c.name, c.light, c.dark]));
    expect(content.tokens.radius[0]!.value).toBe(6);
    expect(content.tokens.type.map((t) => [t.name, t.size, t.weight])).toEqual([['body', 17, 400], ['label', 12, 500]]);
  });
  it('is detected by importAny', async () => {
    expect((await importAny('x.json', exportPenpot(fullSystem()).text!)).kind).toBe('penpot');
  });
});

describe('registry', () => {
  it('lists every phase 3 format, and the Sketch export is a zip', async () => {
    expect(EXPORTS.map((e) => e.id)).toEqual(expect.arrayContaining(['style-dictionary', 'penpot', 'sketch']));
    const [file] = await EXPORTS.find((e) => e.id === 'sketch')!.run(fullSystem());
    expect(file!.bytes![0]).toBe(0x50); // "PK"
    const back = await importAny('tokens.sketch', '', file!.bytes);
    expect(back.kind).toBe('sketch');
    expect(back.content.tokens.colors).toHaveLength(4);
  });
});
