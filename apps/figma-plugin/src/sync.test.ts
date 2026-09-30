import { emptySystem } from '@dsvault/schema';
import { describe, expect, it } from 'vitest';
import { type FigmaSnapshot, formatShadows, fromRGBA, parseShadows, planIsEmpty, planPull, planPush, toRGBA, weightForStyle } from './sync';

const system = () => {
  const s = emptySystem('Portfolio');
  s.tokens.colors = [
    { id: 'c1', name: 'paper', light: '#f5f6f3', dark: '#141715', usage: 'Page', role: 'background' },
    { id: 'c2', name: 'glow', light: 'rgba(251, 227, 160, 0.55)', dark: '#000000', usage: '', role: '' },
  ];
  s.tokens.spacing = [{ id: 's1', name: 'space-1', value: 4, usage: '' }];
  s.tokens.type = [{ id: 't1', name: 'body', family: 'Figtree', size: 17, lineHeight: 28, weight: 600, letterSpacing: '', sample: '' }];
  s.tokens.shadows = [{ id: 'sh1', name: 'raised', value: '0px 1px 2px 0px rgba(0, 0, 0, 0.2)', usage: '' }];
  s.tokens.easings = [{ id: 'e1', name: 'out', value: 'cubic-bezier(0.2, 0, 0, 1)', usage: '' }];
  return s;
};
const empty: FigmaSnapshot = { collection: null, variables: [], textStyles: [], effectStyles: [] };

/** A snapshot that looks like Figma after applying `plan` for `s`. */
function applied(s: ReturnType<typeof system>): FigmaSnapshot {
  const p = planPull(s, empty);
  return {
    collection: p.collectionName,
    variables: p.variables.map((o, i) => ({ figmaId: `v${i}`, vaultId: o.op === 'create' ? o.want.vaultId : null, name: o.op === 'create' ? o.want.name : '', type: o.op === 'create' ? o.want.type : 'FLOAT', values: o.op === 'create' ? o.want.values : { light: 0, dark: 0 }, description: o.op === 'create' ? o.want.description : '' })),
    textStyles: p.textStyles.map((o, i) => o.op === 'create' ? ({ figmaId: `t${i}`, vaultId: o.want.vaultId, name: o.want.name, family: o.want.family, style: o.want.style, size: o.want.size, lineHeight: o.want.lineHeight, letterSpacing: o.want.letterSpacing }) : null!),
    effectStyles: p.effectStyles.map((o, i) => o.op === 'create' ? ({ figmaId: `e${i}`, vaultId: o.want.vaultId, name: o.want.name, value: o.want.value }) : null!),
  };
}

describe('values', () => {
  it('converts colors both ways', () => {
    expect(toRGBA('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(fromRGBA(toRGBA('#2f5d46')!)).toBe('#2f5d46');
    expect(fromRGBA(toRGBA('rgba(251, 227, 160, 0.55)')!)).toBe('rgba(251, 227, 160, 0.55)');
    expect(toRGBA('var(--x)')).toBeNull();
  });
  it('maps font styles to weights', () => {
    expect(weightForStyle('SemiBold')).toBe(600);
    expect(weightForStyle('Semi Bold Italic')).toBe(600);
    expect(weightForStyle('Regular')).toBe(400);
  });
  it('parses and formats shadows', () => {
    const s = parseShadows('0 1px 2px rgba(0,0,0,0.2), inset 0 0 0 1px #d3d7d0');
    expect(s).toHaveLength(2);
    expect(s[1]!.inset).toBe(true);
    expect(formatShadows(s)).toBe('0px 1px 2px 0px rgba(0, 0, 0, 0.2), inset 0px 0px 0px 1px #d3d7d0');
  });
});

describe('pull (vault → Figma)', () => {
  it('creates a collection, variables in groups, text and effect styles', () => {
    const p = planPull(system(), empty);
    expect(p.createCollection).toBe(true);
    expect(p.collectionName).toBe('Portfolio');
    expect(p.variables.map((o) => o.op === 'create' && [o.want.name, o.want.type])).toEqual([
      ['color/paper', 'COLOR'], ['color/glow', 'COLOR'], ['spacing/space-1', 'FLOAT'], ['easing/out', 'STRING'],
    ]);
    expect(p.textStyles[0]!.op === 'create' && p.textStyles[0]!.want).toMatchObject({ name: 'Portfolio/body', family: 'Figtree', style: 'SemiBold' });
    expect(p.effectStyles).toHaveLength(1);
  });
  it('is empty once applied, and shows only real changes after an edit', () => {
    const s = system();
    const snap = applied(s);
    expect(planIsEmpty(planPull(s, snap))).toBe(true);
    s.tokens.colors[0]!.dark = '#101010';
    s.tokens.spacing = [];
    const p = planPull(s, snap);
    expect(p.variables).toEqual([
      expect.objectContaining({ op: 'update', changes: ['dark'] }),
      { op: 'remove', figmaId: 'v2', name: 'spacing/space-1' },
    ]);
  });
  it('links hand-made variables by name instead of duplicating them', () => {
    const snap: FigmaSnapshot = { ...empty, collection: 'Portfolio', variables: [{ figmaId: 'x', vaultId: null, name: 'color/paper', type: 'COLOR', values: { light: toRGBA('#f5f6f3')!, dark: toRGBA('#141715')! }, description: 'Page' }] };
    const p = planPull(system(), snap);
    expect(p.variables[0]).toEqual(expect.objectContaining({ op: 'update', figmaId: 'x', changes: ['link'] }));
  });
});

describe('push (Figma → vault)', () => {
  it('takes changed values, adds new tokens and reports the diff', () => {
    const s = system();
    const snap = applied(s);
    (snap.variables[0]!.values.dark as any) = toRGBA('#202020');
    snap.variables.push({ figmaId: 'n', vaultId: null, name: 'spacing/space-2', type: 'FLOAT', values: { light: 8, dark: 8 }, description: '' });
    snap.textStyles[0]!.size = 18;
    const r = planPush(s, snap);
    expect(r.content.tokens.colors[0]!.dark).toBe('#202020');
    expect(r.content.tokens.spacing.map((x) => x.value)).toEqual([4, 8]);
    expect(r.content.tokens.type[0]!.size).toBe(18);
    expect(r.diff.tokens.map((d) => [d.kind, d.name])).toEqual([['changed', 'paper'], ['changed', 'body'], ['added', 'space-2']]);
  });
  it('keeps tokens missing from Figma unless asked to remove them', () => {
    const s = system();
    const snap = applied(s);
    snap.variables = snap.variables.filter((v) => v.name !== 'color/paper');
    expect(planPush(s, snap).content.tokens.colors).toHaveLength(2);
    expect(planPush(s, snap, true).content.tokens.colors.map((c) => c.name)).toEqual(['glow']);
  });
  it('round-trips a system unchanged', () => {
    const s = system();
    expect(planPush(s, applied(s)).diff.empty).toBe(true);
  });
});
