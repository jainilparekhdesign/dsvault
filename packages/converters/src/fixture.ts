import { type SystemContent, emptySystem } from '@dsvault/schema';

export function fullSystem(): SystemContent {
  const s = emptySystem('Test System');
  s.description = 'A system that uses every token family.';
  s.brand = { vision: 'Make calm tools.', voice: 'Plain and short.' };
  s.checklist = { 'foundations.layout.grid': true };
  s.tokens = {
    colors: [
      { id: 'color-paper', name: 'paper', light: '#f5f6f3', dark: '#141715', usage: 'Page ground', role: 'background' },
      { id: 'color-graphite', name: 'graphite', light: '#1f2321', dark: '#e6e9e4', usage: 'Text', role: 'text' },
      { id: 'color-forest', name: 'forest', light: '#2f5d46', dark: '#7fb394', usage: 'Brand', role: 'brand' },
      { id: 'color-error', name: 'error', light: '#b3261e', dark: '#f2b8b5', usage: 'Errors', role: 'error' },
    ],
    type: [
      { id: 'type-body', name: 'body', family: 'Figtree', size: 17, lineHeight: 28, weight: 400, letterSpacing: '', sample: 'Hello' },
      { id: 'type-label', name: 'label', family: 'Geist Mono', size: 12, lineHeight: 16, weight: 500, letterSpacing: '0.06em', sample: 'LABEL' },
    ],
    spacing: [
      { id: 'space-space-1', name: 'space-1', value: 4, usage: '' },
      { id: 'space-space-4', name: 'space-4', value: 16, usage: 'Gutter' },
    ],
    radius: [{ id: 'radius-radius-sm', name: 'radius-sm', value: 6, usage: 'Controls' }],
    shadows: [{ id: 'shadow-shadow-1', name: 'shadow-1', value: '0 1px 2px rgba(0, 0, 0, 0.2)', usage: '' }],
    zIndex: [{ id: 'z-z-modal', name: 'z-modal', value: 100, usage: '' }],
    durations: [
      { id: 'duration-dur-state', name: 'dur-state', ms: 150, reducedMs: 0, usage: 'State changes' },
      { id: 'duration-dur-screen', name: 'dur-screen', ms: 300, reducedMs: null, usage: '' },
    ],
    easings: [{ id: 'easing-ease-out', name: 'ease-out', value: 'cubic-bezier(0.2, 0, 0, 1)', usage: '' }],
    breakpoints: [{ id: 'bp-bp-md', name: 'bp-md', value: 768, usage: '' }],
    pairs: [{ id: 'p1', fg: 'color-graphite', bg: 'color-paper', kind: 'text' }],
  };
  return s;
}
