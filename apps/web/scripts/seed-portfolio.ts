/**
 * Seeds the Jainil Portfolio system from its source files.
 * Usage: pnpm seed:portfolio [path-to-portfolio-repo]
 * Colors and motion come from styles/tokens.css, usage notes and type from the
 * published Claude Design tokens.json, and the brand book from brand.md.
 * Re-running replaces the seeded system's content (same id).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { importCSS, importClaudeTokens } from '@dsvault/converters';
import { type SystemContent, systemContent } from '@dsvault/schema';
import { eq } from 'drizzle-orm';
import { db, systems } from '../lib/db';

const ID = 'jainil-portfolio';
const OWNER = (process.env.ALLOWED_EMAIL ?? '').toLowerCase();
const repo = process.argv[2] ?? join(homedir(), 'Desktop/Jainil.portfolio.interactive');
const claudeTokens = join(__dirname, '../../../packages/converters/src/__fixtures__/claude-design-tokens.json');

const ROLES: Record<string, string> = {
  paper: 'background', surface: 'surface', line: 'decorative', 'line-strong': 'border', graphite: 'text',
  'graphite-muted': 'text-muted', forest: 'brand', 'on-forest': 'on-brand', 'forest-tint': 'surface', rust: 'accent',
};

function brandSections(md: string): Record<string, string> {
  const parts = md.split(/^## /m);
  const intro = parts[0]!.replace(/^# .*\n/, '').replace(/^The live design system.*\n|^Token values live.*\n/gm, '').trim();
  const sec = Object.fromEntries(parts.slice(1).map((p) => { const [h, ...rest] = p.split('\n'); return [h!.trim(), rest.join('\n').trim()]; }));
  const out: Record<string, string> = {};
  if (intro) out.principles = intro;
  const map: [string, string][] = [['Voice', 'voice'], ['Color', 'color'], ['Type', 'type'], ['Motion', 'motion'], ['Focus and accessibility', 'accessibility'], ['Iconography', 'iconography']];
  for (const [h, k] of map) if (sec[h]) out[k] = sec[h]!;
  const layout = [sec['Space and shape'], sec['Borders, not shadows'] && `### Borders, not shadows\n\n${sec['Borders, not shadows']}`].filter(Boolean).join('\n\n');
  if (layout) out.layout = layout;
  return out;
}

async function main() {
  if (!OWNER) throw new Error('ALLOWED_EMAIL is not set');
  const css = importCSS(readFileSync(join(repo, 'styles/tokens.css'), 'utf8'), 'Jainil Portfolio').content;
  const published = importClaudeTokens(JSON.parse(readFileSync(claudeTokens, 'utf8'))).content;
  const usage = new Map(published.tokens.colors.map((c) => [c.name, c.usage]));

  const content: SystemContent = systemContent.parse({
    name: 'Jainil Portfolio',
    description: 'The design system behind jainilparekh.design: plain type, three colors, borders instead of shadows, in light and dark.',
    brand: brandSections(readFileSync(join(repo, 'brand.md'), 'utf8')),
    tokens: {
      colors: css.tokens.colors.map((c) => ({
        ...c,
        role: ROLES[c.name] ?? 'decorative',
        usage: usage.get(c.name) ?? (ROLES[c.name] ? '' : 'Scene palette: sky and landscape only.'),
      })),
      type: [
        ...published.tokens.type.slice(0, 1),
        { id: 'type-display-sm', name: 'display-sm', family: 'Figtree', size: 40, lineHeight: 42, weight: 600, letterSpacing: '-0.025em', sample: 'I design and build things for screens.' },
        ...published.tokens.type.slice(1),
      ],
      spacing: published.tokens.spacing,
      radius: published.tokens.radius,
      breakpoints: [{ id: 'bp-md', name: 'md', value: 768, usage: 'Side gutter grows from space-4 to space-12; display drops to display-sm below.' }],
      durations: css.tokens.durations.map((d) => ({
        ...d,
        usage: { 'dur-state': 'State changes: hover, press, toggles.', 'dur-screen': 'Screen changes: the phone rising, crossfades.', 'dur-zoom': 'The app zooming out of its icon.' }[d.name] ?? '',
      })),
      easings: css.tokens.easings.map((e) => ({ ...e, usage: 'All movement.' })),
      pairs: [
        ['graphite', 'paper', 'text'], ['graphite', 'surface', 'text'], ['graphite', 'forest-tint', 'text'],
        ['graphite-muted', 'paper', 'text'], ['graphite-muted', 'surface', 'text'],
        ['forest', 'paper', 'text'], ['forest', 'surface', 'text'], ['on-forest', 'forest', 'text'], ['rust', 'paper', 'text'],
        ['line-strong', 'paper', 'non-text'], ['line-strong', 'surface', 'non-text'], ['forest', 'forest-tint', 'non-text'],
      ].map(([fg, bg, kind], i) => ({ id: `pair-${i + 1}`, fg: `color-${fg}`, bg: `color-${bg}`, kind })),
    },
  });

  const [existing] = await db.select({ id: systems.id }).from(systems).where(eq(systems.id, ID));
  if (existing) await db.update(systems).set({ content, name: content.name, updatedAt: new Date() }).where(eq(systems.id, ID));
  else await db.insert(systems).values({ id: ID, ownerId: OWNER, name: content.name, content });
  const t = content.tokens;
  console.log(`${existing ? 'Updated' : 'Created'} ${content.name}: ${t.colors.length} colors, ${t.type.length} type, ${t.pairs.length} pairs, ${Object.keys(content.brand).length} brand sections.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
