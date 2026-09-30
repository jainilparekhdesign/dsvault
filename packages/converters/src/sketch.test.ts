import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { fullSystem } from './fixture';
import { exportSketch, importSketch, sketchDocument } from './sketch';

// The official schemas from @sketch-hq/sketch-file-format.
const load = (f: string) => require(`@sketch-hq/sketch-file-format/dist/${f}.schema.json`);

describe('Sketch', () => {
  it('writes files that match the Sketch file-format schema', () => {
    const { document, page, meta, user } = sketchDocument(fullSystem());
    const ajv = new Ajv({ strict: false, allErrors: true, unicodeRegExp: false });
    for (const [name, data] of [['document', document], ['page', page], ['meta', meta], ['user', user]] as const) {
      const ok = ajv.validate(load(name), data);
      expect(ok ? [] : ajv.errors!.slice(0, 8).map((e) => `${name}${e.instancePath} ${e.message} ${JSON.stringify(e.params)}`)).toEqual([]);
    }
  });
  it('the schema check really catches broken files', () => {
    const { document } = sketchDocument(fullSystem());
    const broken: any = structuredClone(document);
    delete broken.colorSpace;
    broken.sharedSwatches.objects[0].value.red = 'red';
    const ajv = new Ajv({ strict: false, allErrors: true, unicodeRegExp: false });
    expect(ajv.validate(load('document'), broken)).toBe(false);
    expect(ajv.errors!.map((e) => e.message).join(' ')).toMatch(/colorSpace|number/);
  });
  it('round-trips colors (both themes) and type through a real .sketch zip', async () => {
    const src = fullSystem();
    const bytes = await exportSketch(src);
    const { content } = await importSketch(bytes);
    expect(content.tokens.colors.map((c) => [c.name, c.light, c.dark])).toEqual(src.tokens.colors.map((c) => [c.name, c.light, c.dark]));
    expect(content.tokens.type.map((t) => [t.name, t.family, t.size, t.lineHeight, t.weight, t.letterSpacing]))
      .toEqual(src.tokens.type.map((t) => [t.name, t.family, t.size, t.lineHeight, t.weight, t.letterSpacing]));
  });
  it('rejects files that aren’t Sketch documents', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip(); zip.file('x.txt', 'hi');
    await expect(importSketch(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/Sketch/);
  });
});
