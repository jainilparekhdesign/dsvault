import { describe, expect, it } from 'vitest';
import { diffContent } from './diff';
import { emptySystem } from './system';

describe('diffContent', () => {
  const a = emptySystem('One');
  a.tokens.colors = [
    { id: 'c1', name: 'paper', light: '#ffffff', dark: '#000000', usage: '', role: '' },
    { id: 'c2', name: 'ink', light: '#111111', dark: '#eeeeee', usage: '', role: '' },
  ];
  a.brand = { vision: 'Old vision' };

  it('finds nothing between identical systems', () => {
    expect(diffContent(a, structuredClone(a)).empty).toBe(true);
  });

  it('reports added, removed and changed tokens, brand and meta', () => {
    const b = structuredClone(a);
    b.name = 'Two';
    b.tokens.colors[0]!.dark = '#101010';
    b.tokens.colors.splice(1, 1);
    b.tokens.spacing.push({ id: 's1', name: 'space-1', value: 4, usage: '' });
    b.brand = { vision: 'New vision', voice: 'Plain' };
    b.checklist = { 'foundations.layout.grid': true };
    const d = diffContent(a, b);
    expect(d.meta).toEqual([{ field: 'name', from: 'One', to: 'Two' }]);
    expect(d.tokens).toEqual([
      { kind: 'changed', group: 'colors', id: 'c1', name: 'paper', fields: [{ field: 'dark', from: '#000000', to: '#101010' }] },
      { kind: 'removed', group: 'colors', id: 'c2', name: 'ink' },
      { kind: 'added', group: 'spacing', id: 's1', name: 'space-1' },
    ]);
    expect(d.brand.map((x) => [x.key, x.kind])).toEqual([['vision', 'changed'], ['voice', 'added']]);
    expect(d.checklist).toEqual([{ key: 'foundations.layout.grid', to: true }]);
  });
});
