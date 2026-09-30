import { exportCSS, fontStack } from '@dsvault/converters';
import type { Component, SystemContent } from '@dsvault/schema';

export type Theme = 'light' | 'dark';
export type AxeViolation = { id: string; impact: string | null; help: string; nodes: number; target: string };

const ROLE_VARS: [string, string[]][] = [
  ['--ds-bg', ['background']],
  ['--ds-surface', ['surface', 'background']],
  ['--ds-text', ['text']],
  ['--ds-muted', ['text-muted', 'text']],
  ['--ds-border', ['border', 'decorative']],
  ['--ds-border-subtle', ['decorative', 'border']],
  ['--ds-brand', ['brand', 'accent', 'text']],
  ['--ds-on-brand', ['on-brand', 'background']],
  ['--ds-accent', ['accent', 'brand']],
  ['--ds-success', ['success', 'brand']],
  ['--ds-warning', ['warning', 'accent']],
  ['--ds-error', ['error', 'accent']],
  ['--ds-info', ['info', 'brand']],
];

/** Role aliases (--ds-*) that point at the system's own variables, so templates work for any system. */
export function roleAliases(c: SystemContent): string {
  const t = c.tokens;
  const byRole = (roles: string[]) => {
    for (const r of roles) { const x = t.colors.find((col) => col.role === r); if (x) return x; }
    return null;
  };
  const cssName = (n: string) => n.trim().replace(/^--/, '').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
  const lines = ROLE_VARS.flatMap(([v, roles]) => { const x = byRole(roles); return x ? [`${v}: var(--${cssName(x.name)});`] : []; });
  const radius = t.radius.find((r) => r.value >= 2 && r.value <= 12) ?? t.radius[0];
  const family = t.type.find((x) => !/mono/i.test(x.family))?.family ?? t.type[0]?.family ?? '';
  const duration = t.durations[0];
  lines.push(`--ds-radius: ${radius ? radius.value : 6}px;`, `--ds-font: ${fontStack(family)};`);
  if (duration) lines.push(`--ds-duration: var(--${cssName(duration.name)});`);
  return `:root {\n  ${lines.join('\n  ')}\n}`;
}

/** A self-contained document for one component in one theme, which runs axe and reports back. */
export function previewDoc(c: SystemContent, comp: Pick<Component, 'html' | 'css'>, theme: Theme, runId: string, origin: string): string {
  const families = [...new Set(c.tokens.type.map((x) => x.family.split(',')[0]!.replace(/["']/g, '').trim()).filter(Boolean))];
  const fonts = families.length
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap">`
    : '';
  const safe = (s: string) => s.replace(/<\/style/gi, '<\\/style');
  return `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview</title>${fonts}
<style>${safe(exportCSS(c).text)}
${roleAliases(c)}
html { color-scheme: ${theme}; }
body { margin: 0; padding: 24px; background: var(--ds-bg, Canvas); color: var(--ds-text, CanvasText); font: 16px/1.5 var(--ds-font, system-ui); }
${safe(comp.css)}</style></head><body><main>
${comp.html}
</main>
<script src="${origin}/axe.min.js"></script>
<script>
(function () {
  function report() {
    if (!window.axe) { parent.postMessage({ type: 'dsv-axe', runId: ${JSON.stringify(runId)}, theme: ${JSON.stringify(theme)}, error: 'axe didn’t load' }, '*'); return; }
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }).then(function (r) {
      parent.postMessage({ type: 'dsv-axe', runId: ${JSON.stringify(runId)}, theme: ${JSON.stringify(theme)}, violations: r.violations.map(function (v) {
        return { id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: String(v.nodes[0] && v.nodes[0].target) };
      }) }, '*');
    });
  }
  function fit() { parent.postMessage({ type: 'dsv-height', runId: ${JSON.stringify(runId)}, theme: ${JSON.stringify(theme)}, height: document.documentElement.scrollHeight }, '*'); }
  window.addEventListener('load', function () { fit(); setTimeout(report, 150); });
  new ResizeObserver(fit).observe(document.body);
})();
</script></body></html>`;
}
