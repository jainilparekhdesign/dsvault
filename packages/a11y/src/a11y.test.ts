import { emptySystem } from '@dsvault/schema';
import { describe, expect, it } from 'vitest';
import { apcaLc, checkPair, evaluateChecklist, hueOnlyPairs, simulate, suggestPassing, wcagRatio, a11yReport } from './index';

describe('WCAG contrast', () => {
  it('matches reference ratios', () => {
    expect(wcagRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(wcagRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(wcagRatio('#fff', '#fff')).toBe(1);
    expect(wcagRatio('nope', '#fff')).toBeNull();
  });
  it('uses the right threshold per pair kind', () => {
    expect(checkPair('#777777', '#ffffff', 'text').wcagPass).toBe(false);
    expect(checkPair('#777777', '#ffffff', 'large-text').wcagPass).toBe(true);
    expect(checkPair('#949494', '#ffffff', 'non-text').wcagPass).toBe(true);
  });
});

describe('APCA', () => {
  it('matches APCA-W3 0.0.98G reference values', () => {
    expect(apcaLc('#000000', '#ffffff')).toBeCloseTo(106.04, 1);
    expect(apcaLc('#ffffff', '#000000')).toBeCloseTo(-107.88, 1);
    expect(apcaLc('#888888', '#ffffff')).toBeCloseTo(63.06, 1);
  });
});

describe('suggestions', () => {
  it('finds a nearby passing color that keeps the hue', () => {
    const s = suggestPassing('#7fb394', '#f5f6f3', 4.5)!;
    expect(s).toMatch(/^#[0-9a-f]{6}$/);
    expect(wcagRatio(s, '#f5f6f3')!).toBeGreaterThanOrEqual(4.5);
    expect(checkPair('#7fb394', '#f5f6f3').suggestion).toBe(s);
  });
  it('gives no suggestion for a passing pair', () => {
    expect(checkPair('#1f2321', '#f5f6f3').suggestion).toBeNull();
  });
});

describe('color blindness', () => {
  it('leaves greys unchanged', () => {
    expect(simulate('#808080', 'deuteranopia')).toBe('#808080');
  });
  it('flags red and green of equal lightness', () => {
    const found = hueOnlyPairs([{ name: 'error', hex: '#c0392b' }, { name: 'success', hex: '#5f8a1f' }]);
    expect(found.some((f) => f.deficiency === 'deuteranopia' || f.deficiency === 'protanopia')).toBe(true);
  });
  it('does not flag colors with different lightness', () => {
    expect(hueOnlyPairs([{ name: 'error', hex: '#8b0000' }, { name: 'success', hex: '#90ee90' }])).toEqual([]);
  });
});

describe('report and checklist', () => {
  const sys = emptySystem('Test');
  sys.tokens.colors = [
    { id: 'bg', name: 'bg', light: '#ffffff', dark: '#111111', usage: '', role: 'background' },
    { id: 'fg', name: 'fg', light: '#111111', dark: '#eeeeee', usage: '', role: 'text' },
    { id: 'muted', name: 'muted', light: '#999999', dark: '#555555', usage: '', role: 'text' },
  ];
  sys.tokens.pairs = [
    { id: 'p1', fg: 'fg', bg: 'bg', kind: 'text' },
    { id: 'p2', fg: 'muted', bg: 'bg', kind: 'text' },
  ];
  sys.tokens.type = [{ id: 't', name: 'tiny', family: 'X', size: 10, lineHeight: 11, weight: 400, letterSpacing: '', sample: '' }];
  sys.tokens.durations = [{ id: 'd', name: 'fast', ms: 150, reducedMs: null, usage: '' }];

  it('reports pairs per theme with suggestions', () => {
    const r = a11yReport(sys);
    expect(r.pairs[0]!.pass).toBe(true);
    expect(r.pairs[1]!.pass).toBe(false);
    expect(r.pairs[1]!.themes.light.suggestion).not.toBeNull();
    expect(r.type).toHaveLength(2);
    expect(r.motion).toHaveLength(1);
  });

  it('ticks auto items and counts manual ones', () => {
    const res = evaluateChecklist({ ...sys, checklist: { 'foundations.layout.grid': true } });
    expect(res.items['foundations.color.palette']!.done).toBe(true);
    expect(res.items['foundations.color.dark']!.done).toBe(true);
    expect(res.items['foundations.color.contrast']!.done).toBe(false);
    expect(res.items['foundations.motion.reduced']!.done).toBe(false);
    expect(res.items['foundations.layout.grid']!.done).toBe(true);
    expect(res.total).toBeGreaterThan(80);
  });
});
