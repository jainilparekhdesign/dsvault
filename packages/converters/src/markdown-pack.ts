import { THEMES, type SystemContent } from '@dsvault/schema';
import { a11yReport } from '@dsvault/a11y';
import { brandBookMarkdown } from './claude-design';
import { type TextFile, fontStack, uniqueNames } from './util';

// One markdown file an AI design tool can read in a prompt: the brand book,
// every token, and the rules the tokens imply.

const row = (cells: (string | number)[]) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`;

export function exportMarkdownPack(c: SystemContent): TextFile {
  const t = c.tokens;
  const out: string[] = [brandBookMarkdown(c).trimEnd(), '', '---', '', '# Tokens', ''];
  const cn = uniqueNames(t.colors);
  if (t.colors.length) {
    out.push('## Color', '', 'Use these as CSS custom properties (`var(--name)`). Every color has a light and a dark value; never hard-code hex values.', '');
    out.push(row(['Token', ...THEMES.map((x) => x[0]!.toUpperCase() + x.slice(1)), 'Usage']), row(['---', ...THEMES.map(() => '---'), '---']));
    t.colors.forEach((x, i) => out.push(row([`\`--${cn[i]}\``, x.light, x.dark, x.usage])));
    out.push('');
  }
  if (t.type.length) {
    const tn = uniqueNames(t.type);
    out.push('## Type', '', row(['Style', 'Family', 'Size / line', 'Weight']), row(['---', '---', '---', '---']));
    t.type.forEach((x, i) => out.push(row([`\`${tn[i]}\``, fontStack(x.family), `${x.size}/${x.lineHeight}px`, x.weight])));
    out.push('');
  }
  const simple = (title: string, list: { name: string; usage?: string }[], val: (i: number) => string) => {
    if (!list.length) return;
    const n = uniqueNames(list as { name: string }[]);
    out.push(`## ${title}`, '', ...list.map((x, i) => `- \`--${n[i]}\`: ${val(i)}${x.usage ? ` — ${x.usage}` : ''}`), '');
  };
  simple('Spacing', t.spacing, (i) => `${t.spacing[i]!.value}px`);
  simple('Radius', t.radius, (i) => `${t.radius[i]!.value}px`);
  simple('Breakpoints', t.breakpoints, (i) => `${t.breakpoints[i]!.value}px`);
  simple('Shadows', t.shadows, (i) => t.shadows[i]!.value);
  simple('Z-index', t.zIndex, (i) => String(t.zIndex[i]!.value));
  simple('Durations', t.durations, (i) => `${t.durations[i]!.ms}ms${t.durations[i]!.reducedMs != null ? ` (reduced motion: ${t.durations[i]!.reducedMs}ms)` : ''}`);
  simple('Easing', t.easings, (i) => t.easings[i]!.value);

  const report = a11yReport(c);
  out.push('# Rules', '');
  out.push('- Use only the tokens above. Spacing comes from the spacing scale; nothing in between.');
  if (t.colors.length) out.push('- Support light and dark: switch every color token, never branch components on theme.');
  const good = report.pairs.filter((p) => p.pass);
  if (good.length) out.push(`- These color pairs pass WCAG 2.2 AA in both themes; prefer them for text: ${good.map((p) => `\`${p.fg}\` on \`${p.bg}\``).join(', ')}.`);
  const bad = report.pairs.filter((p) => !p.pass);
  if (bad.length) out.push(`- Don’t use these pairs for ${bad.some((p) => p.kind === 'non-text') ? 'text or meaningful borders' : 'text'}: ${bad.map((p) => `\`${p.fg}\` on \`${p.bg}\``).join(', ')}.`);
  if (t.durations.length) out.push('- Under `prefers-reduced-motion: reduce`, use the reduced durations or none.');
  out.push('- Keep a visible focus ring on every interactive element.');
  return { filename: `${(c.name || 'design-system').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, mime: 'text/markdown', text: out.join('\n').trimEnd() + '\n' };
}
