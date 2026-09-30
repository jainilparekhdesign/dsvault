import type { Config } from 'tailwindcss';

// Names match the tokens in styles/tokens.css. There are no other colors.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: 'var(--paper)',
      surface: 'var(--surface)',
      line: 'var(--line)',
      'line-strong': 'var(--line-strong)',
      graphite: 'var(--graphite)',
      'graphite-muted': 'var(--graphite-muted)',
      forest: 'var(--forest)',
      'on-forest': 'var(--on-forest)',
      'forest-tint': 'var(--forest-tint)',
      rust: 'var(--rust)',
    },
    fontFamily: {
      sans: ['var(--font-figtree)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    borderRadius: { none: '0', sm: '6px', full: '9999px' },
    boxShadow: { none: 'none' },
    extend: {
      transitionTimingFunction: { out: 'var(--ease-out)' },
      transitionDuration: { state: 'var(--dur-state)', panel: 'var(--dur-panel)' },
    },
  },
  plugins: [],
};

export default config;
