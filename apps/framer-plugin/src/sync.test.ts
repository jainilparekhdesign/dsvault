import { emptySystem } from '@dsvault/schema';
import { describe, expect, it } from 'vitest';
import { type FramerSnapshot, isEmpty, plan, pullColors, tagFor } from './sync';

const sys = () => {
  const s = emptySystem('Portfolio');
  s.tokens.colors = [
    { id: 'c1', name: 'paper', light: '#f5f6f3', dark: '#141715', usage: '', role: '' },
    { id: 'c2', name: 'glow', light: 'rgba(251, 227, 160, 0.55)', dark: 'rgba(239, 230, 200, 0.18)', usage: '', role: '' },
    { id: 'c3', name: 'bad', light: 'var(--x)', dark: '#000', usage: '', role: '' },
  ];
  s.tokens.type = [{ id: 't1', name: 'display', family: 'Figtree', size: 56, lineHeight: 56, weight: 600, letterSpacing: '-0.025em', sample: '' }];
  return s;
};
const empty: FramerSnapshot = { colors: [], texts: [] };
const applied = (): FramerSnapshot => ({
  colors: [
    { id: 'f1', vaultId: 'c1', path: 'Portfolio/paper', light: '#F5F6F3', dark: '#141715' },
    { id: 'f2', vaultId: 'c2', path: 'Portfolio/glow', light: 'rgba(251,227,160,0.55)', dark: 'rgba(239, 230, 200, 0.18)' },
  ],
  texts: [{ id: 'x1', vaultId: 't1', path: 'Portfolio/display', family: 'Figtree', weight: 600, fontSize: '56px', lineHeight: '56px', letterSpacing: '-0.025em' }],
});

describe('Framer plan', () => {
  it('creates color and text styles in a folder named after the system', () => {
    const p = plan(sys(), empty);
    expect(p.colors.map((o) => o.op === 'create' && o.want.path)).toEqual(['Portfolio/paper', 'Portfolio/glow']);
    expect(p.texts[0]).toMatchObject({ op: 'create', want: { tag: 'h1', fontSize: '56px', letterSpacing: '-0.025em' } });
    expect(p.skipped).toEqual(['Color bad: Framer needs hex, rgb() or hsl().']);
  });
  it('treats case and spacing differences as equal', () => {
    expect(isEmpty(plan(sys(), applied()))).toBe(true);
  });
  it('updates changed values, links by path, removes only its own styles', () => {
    const s = sys();
    s.tokens.colors[0]!.dark = '#101010';
    s.tokens.type = [];
    const snap = applied();
    snap.colors.push({ id: 'mine', vaultId: null, path: 'Other/hand-made', light: '#fff', dark: null });
    const p = plan(s, snap);
    expect(p.colors).toEqual([expect.objectContaining({ op: 'update', id: 'f1', changes: ['dark'] })]);
    expect(p.texts).toEqual([{ op: 'remove', id: 'x1', path: 'Portfolio/display' }]);
  });
  it('maps heading names to tags', () => {
    expect([tagFor('display'), tagFor('title'), tagFor('heading'), tagFor('body')]).toEqual(['h1', 'h2', 'h3', 'p']);
  });
});

describe('Framer → vault colors', () => {
  it('takes changed values and new styles in the system folder only', () => {
    const snap = applied();
    snap.colors[0]!.dark = '#202020';
    snap.colors.push({ id: 'n', vaultId: null, path: 'Portfolio/sea', light: '#b9d9e5', dark: null });
    snap.colors.push({ id: 'o', vaultId: null, path: 'Elsewhere/x', light: '#000000', dark: null });
    const r = pullColors(sys(), snap);
    expect(r.changed).toEqual(['paper']);
    expect(r.added).toEqual(['sea']);
    expect(r.content.tokens.colors.find((c) => c.name === 'sea')).toMatchObject({ light: '#b9d9e5', dark: '#b9d9e5' });
  });
});
