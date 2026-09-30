// Starter markup for checklist components. Styles read role-based variables
// (--ds-*) that the preview maps from the system's color roles, so a template
// picks up any system's look. Everything here is a starting point to edit.

type Template = { description: string; anatomy: string; html: string; css: string; code: string; props?: { name: string; type: string; default: string; description: string }[]; variants?: string[]; states?: string[] };

const T: Record<string, Template> = {
  Button: {
    description: 'Starts an action. Use one primary button per view.',
    anatomy: '1. Container\n2. Label\n3. Optional leading icon',
    props: [
      { name: 'variant', type: "'primary' | 'secondary'", default: 'secondary', description: 'Visual weight.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Blocks interaction.' },
    ],
    variants: ['primary', 'secondary'], states: ['default', 'hover', 'focus', 'pressed', 'disabled'],
    html: '<div class="row">\n  <button class="btn btn-primary" type="button">Save changes</button>\n  <button class="btn" type="button">Cancel</button>\n  <button class="btn" type="button" disabled>Disabled</button>\n</div>',
    css: '.row { display: flex; gap: 12px; flex-wrap: wrap; }\n.btn { min-height: 44px; padding: 0 16px; border-radius: var(--ds-radius); border: 1px solid var(--ds-border); background: transparent; color: var(--ds-text); font: inherit; font-weight: 500; cursor: pointer; }\n.btn:hover { border-color: var(--ds-text); }\n.btn-primary { background: var(--ds-brand); border-color: var(--ds-brand); color: var(--ds-on-brand); }\n.btn:disabled { opacity: .5; cursor: not-allowed; }\n.btn:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 2px; }',
    code: '<Button variant="primary">Save changes</Button>',
  },
  Link: {
    description: 'Takes people somewhere. Use a button for actions.',
    anatomy: '1. Text\n2. Optional external marker',
    html: '<p>Read the <a href="#">release notes</a> or visit <a href="#" target="_blank" rel="noopener">the docs (opens in a new tab)</a>.</p>',
    css: 'a { color: var(--ds-brand); text-underline-offset: 3px; }\na:hover { text-decoration-thickness: 2px; }\na:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 2px; border-radius: 2px; }',
    code: '<Link href="/notes">release notes</Link>',
  },
  Badge: {
    description: 'A short status or count next to something else.',
    anatomy: '1. Container\n2. Label',
    variants: ['neutral', 'success', 'warning', 'error'],
    html: '<p class="row"><span class="badge">Draft</span><span class="badge badge-success">Published</span><span class="badge badge-error">3 errors</span></p>',
    css: '.row { display: flex; gap: 8px; }\n.badge { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 999px; border: 1px solid var(--ds-border); font-size: 13px; font-weight: 500; color: var(--ds-text); }\n.badge-success { border-color: var(--ds-success); color: var(--ds-success); }\n.badge-error { border-color: var(--ds-error); color: var(--ds-error); }',
    code: '<Badge tone="success">Published</Badge>',
  },
  Alert: {
    description: 'A message about the page or a task, shown inline.',
    anatomy: '1. Container\n2. Icon\n3. Title\n4. Body',
    variants: ['info', 'success', 'warning', 'error'],
    html: '<div class="alert" role="status">\n  <strong>Saved.</strong> Your changes are live.\n</div>\n<div class="alert alert-error" role="alert">\n  <strong>Couldn’t save.</strong> Check your connection and try again.\n</div>',
    css: '.alert { border: 1px solid var(--ds-border); border-radius: var(--ds-radius); padding: 12px 14px; margin-bottom: 12px; color: var(--ds-text); background: var(--ds-surface); }\n.alert-error { border-color: var(--ds-error); }\n.alert-error strong { color: var(--ds-error); }',
    code: '<Alert tone="error" title="Couldn’t save.">Check your connection and try again.</Alert>',
  },
  Card: {
    description: 'Groups related content about one thing.',
    anatomy: '1. Container\n2. Title\n3. Body\n4. Optional action',
    html: '<article class="card">\n  <h3><a href="#">Onboarding redesign</a></h3>\n  <p>Three screens, one decision each. Shipped March 2024.</p>\n</article>',
    css: '.card { border: 1px solid var(--ds-border-subtle, var(--ds-border)); border-radius: var(--ds-radius); padding: 16px; max-width: 360px; background: var(--ds-surface); }\n.card h3 { margin: 0 0 6px; font-size: 18px; }\n.card a { color: var(--ds-text); text-decoration: none; }\n.card a:hover { text-decoration: underline; }\n.card a:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 2px; }\n.card p { margin: 0; color: var(--ds-muted); }',
    code: '<Card title="Onboarding redesign" href="/work/onboarding" />',
  },
  'Text field': {
    description: 'One line of text input with a visible label.',
    anatomy: '1. Label\n2. Input\n3. Hint or error text',
    states: ['default', 'focus', 'error', 'disabled'],
    html: '<div class="field">\n  <label for="email">Email</label>\n  <input id="email" type="email" autocomplete="email" aria-describedby="email-hint" />\n  <p id="email-hint" class="hint">We only use this to sign you in.</p>\n</div>\n<div class="field">\n  <label for="name">Name</label>\n  <input id="name" autocomplete="name" aria-invalid="true" aria-describedby="name-error" />\n  <p id="name-error" class="error">Enter your name.</p>\n</div>',
    css: '.field { display: flex; flex-direction: column; gap: 6px; max-width: 320px; margin-bottom: 16px; }\nlabel { font-weight: 500; }\ninput { height: 40px; padding: 0 10px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-bg); color: var(--ds-text); font: inherit; }\ninput:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 1px; }\ninput[aria-invalid="true"] { border-color: var(--ds-error); }\n.hint { margin: 0; font-size: 13px; color: var(--ds-muted); }\n.error { margin: 0; font-size: 13px; color: var(--ds-error); }',
    code: '<TextField label="Email" type="email" hint="We only use this to sign you in." />',
  },
  'Text area': {
    description: 'Several lines of text input.',
    anatomy: '1. Label\n2. Text area\n3. Hint or counter',
    html: '<div class="field">\n  <label for="msg">Message</label>\n  <textarea id="msg" rows="4" aria-describedby="msg-hint"></textarea>\n  <p id="msg-hint" class="hint">Up to 500 characters.</p>\n</div>',
    css: '.field { display: flex; flex-direction: column; gap: 6px; max-width: 420px; }\nlabel { font-weight: 500; }\ntextarea { padding: 10px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-bg); color: var(--ds-text); font: inherit; resize: vertical; }\ntextarea:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 1px; }\n.hint { margin: 0; font-size: 13px; color: var(--ds-muted); }',
    code: '<TextArea label="Message" maxLength={500} />',
  },
  Checkbox: {
    description: 'Turns one option on or off, often in a group.',
    anatomy: '1. Box\n2. Label',
    html: '<fieldset>\n  <legend>Notify me about</legend>\n  <label><input type="checkbox" checked /> Releases</label>\n  <label><input type="checkbox" /> Weekly summary</label>\n</fieldset>',
    css: 'fieldset { border: 1px solid var(--ds-border-subtle, var(--ds-border)); border-radius: var(--ds-radius); padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; max-width: 320px; }\nlegend { font-weight: 500; padding: 0 4px; }\nlabel { display: flex; gap: 8px; align-items: center; min-height: 24px; }\ninput { width: 18px; height: 18px; accent-color: var(--ds-brand); }',
    code: '<Checkbox label="Releases" defaultChecked />',
  },
  Radio: {
    description: 'Picks exactly one option from a small set.',
    anatomy: '1. Group label\n2. Options',
    html: '<fieldset>\n  <legend>Theme</legend>\n  <label><input type="radio" name="theme" checked /> System</label>\n  <label><input type="radio" name="theme" /> Light</label>\n  <label><input type="radio" name="theme" /> Dark</label>\n</fieldset>',
    css: 'fieldset { border: 1px solid var(--ds-border-subtle, var(--ds-border)); border-radius: var(--ds-radius); padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; max-width: 320px; }\nlegend { font-weight: 500; padding: 0 4px; }\nlabel { display: flex; gap: 8px; align-items: center; min-height: 24px; }\ninput { width: 18px; height: 18px; accent-color: var(--ds-brand); }',
    code: '<RadioGroup label="Theme" options={["System", "Light", "Dark"]} />',
  },
  Switch: {
    description: 'Turns a setting on or off, taking effect at once.',
    anatomy: '1. Track\n2. Thumb\n3. Label',
    html: '<button class="switch" type="button" role="switch" aria-checked="true" onclick="this.setAttribute(\'aria-checked\', this.getAttribute(\'aria-checked\') !== \'true\')">\n  <span class="track"><span class="thumb"></span></span>\n  Email notifications\n</button>',
    css: '.switch { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; border: 0; background: none; color: var(--ds-text); font: inherit; cursor: pointer; }\n.track { width: 40px; height: 24px; border-radius: 999px; border: 1px solid var(--ds-border); position: relative; background: var(--ds-bg); }\n.thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--ds-muted); transition: transform var(--ds-duration, 150ms); }\n[aria-checked="true"] .track { background: var(--ds-brand); border-color: var(--ds-brand); }\n[aria-checked="true"] .thumb { transform: translateX(16px); background: var(--ds-on-brand); }\n.switch:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 2px; border-radius: 6px; }\n@media (prefers-reduced-motion: reduce) { .thumb { transition: none; } }',
    code: '<Switch label="Email notifications" defaultChecked />',
  },
  Divider: {
    description: 'Separates groups of content.',
    anatomy: '1. Line',
    html: '<p>Above the line.</p>\n<hr />\n<p>Below the line.</p>',
    css: 'hr { border: 0; border-top: 1px solid var(--ds-border-subtle, var(--ds-border)); margin: 16px 0; }',
    code: '<Divider />',
  },
  Avatar: {
    description: 'A person, shown as a photo or initials.',
    anatomy: '1. Frame\n2. Image or initials',
    html: '<div class="row">\n  <span class="avatar" role="img" aria-label="Jainil Parekh">JP</span>\n  <span class="avatar" role="img" aria-label="Sam Lee">SL</span>\n</div>',
    css: '.row { display: flex; gap: 8px; }\n.avatar { width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--ds-surface); border: 1px solid var(--ds-border-subtle, var(--ds-border)); color: var(--ds-text); font-weight: 600; font-size: 14px; }',
    code: '<Avatar name="Jainil Parekh" src={photo} />',
  },
  'Progress bar': {
    description: 'Shows how far a task has got.',
    anatomy: '1. Label\n2. Track\n3. Fill',
    html: '<label for="upload">Uploading brand assets</label>\n<progress id="upload" max="100" value="60">60%</progress>',
    css: 'label { display: block; margin-bottom: 6px; font-weight: 500; }\nprogress { width: 100%; max-width: 360px; height: 8px; accent-color: var(--ds-brand); }',
    code: '<ProgressBar label="Uploading brand assets" value={60} />',
  },
  'Loading indicator': {
    description: 'Shows that something is loading.',
    anatomy: '1. Spinner\n2. Text for screen readers',
    html: '<div class="loading" role="status">\n  <span class="spinner" aria-hidden="true"></span>\n  <span>Loading projects…</span>\n</div>',
    css: '.loading { display: inline-flex; align-items: center; gap: 10px; color: var(--ds-muted); }\n.spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ds-border); border-top-color: var(--ds-brand); animation: spin 900ms linear infinite; }\n@keyframes spin { to { transform: rotate(360deg); } }\n@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 3s; } }',
    code: '<Spinner label="Loading projects…" />',
  },
  Tabs: {
    description: 'Switches between views of the same thing.',
    anatomy: '1. Tab list\n2. Tabs\n3. Panel',
    html: '<div class="tabs">\n  <div role="tablist" aria-label="Project">\n    <button role="tab" id="t1" aria-selected="true" aria-controls="p1">Overview</button>\n    <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Details</button>\n  </div>\n  <div role="tabpanel" id="p1" aria-labelledby="t1">Three screens, one decision each.</div>\n  <div role="tabpanel" id="p2" aria-labelledby="t2" hidden>Built with the portfolio tokens.</div>\n</div>\n<script>\nconst tabs = [...document.querySelectorAll(\'[role=tab]\')];\nconst select = (t) => { tabs.forEach((x) => { const on = x === t; x.setAttribute(\'aria-selected\', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute(\'aria-controls\')).hidden = !on; }); t.focus(); };\ntabs.forEach((t, i) => { t.onclick = () => select(t); t.onkeydown = (e) => { if (e.key === \'ArrowRight\') select(tabs[(i + 1) % tabs.length]); if (e.key === \'ArrowLeft\') select(tabs[(i - 1 + tabs.length) % tabs.length]); }; });\n</script>',
    css: '[role=tablist] { display: flex; gap: 4px; border-bottom: 1px solid var(--ds-border-subtle, var(--ds-border)); }\n[role=tab] { height: 40px; padding: 0 12px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--ds-muted); font: inherit; cursor: pointer; }\n[role=tab][aria-selected=true] { color: var(--ds-text); border-bottom-color: var(--ds-brand); }\n[role=tab]:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: -2px; }\n[role=tabpanel] { padding: 12px 0; }',
    code: '<Tabs items={[{ label: "Overview", panel: <Overview /> }, { label: "Details", panel: <Details /> }]} />',
  },
  Tooltip: {
    description: 'A short hint on hover or focus.',
    anatomy: '1. Trigger\n2. Bubble',
    html: '<span class="tip">\n  <button type="button" aria-describedby="tip1">Export</button>\n  <span role="tooltip" id="tip1">Downloads tokens.css</span>\n</span>',
    css: '.tip { position: relative; display: inline-block; margin-top: 40px; }\nbutton { min-height: 40px; padding: 0 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: none; color: var(--ds-text); font: inherit; }\n[role=tooltip] { position: absolute; bottom: calc(100% + 6px); left: 0; white-space: nowrap; padding: 4px 8px; border-radius: var(--ds-radius); background: var(--ds-text); color: var(--ds-bg); font-size: 13px; opacity: 0; pointer-events: none; }\n.tip:hover [role=tooltip], .tip:focus-within [role=tooltip] { opacity: 1; }',
    code: '<Tooltip label="Downloads tokens.css"><Button>Export</Button></Tooltip>',
  },
  Breadcrumbs: {
    description: 'Shows where a page sits and links back up.',
    anatomy: '1. Nav\n2. Links\n3. Separators\n4. Current page',
    html: '<nav aria-label="Breadcrumb">\n  <ol>\n    <li><a href="#">Work</a></li>\n    <li><a href="#">2024</a></li>\n    <li aria-current="page">Onboarding</li>\n  </ol>\n</nav>',
    css: 'ol { display: flex; gap: 8px; list-style: none; padding: 0; margin: 0; }\nli + li::before { content: "/"; margin-right: 8px; color: var(--ds-muted); }\na { color: var(--ds-brand); }\n[aria-current] { color: var(--ds-muted); }',
    code: '<Breadcrumbs items={[{ label: "Work", href: "/work" }, { label: "Onboarding" }]} />',
  },
};

export function templateFor(kind: string): Template {
  return T[kind] ?? {
    description: '',
    anatomy: '',
    html: `<!-- Markup for ${kind || 'this component'}. Style it with the system's variables, e.g. var(--ds-text). -->\n<div class="demo">${kind || 'Component'}</div>`,
    css: '.demo { padding: 16px; border: 1px dashed var(--ds-border); border-radius: var(--ds-radius); color: var(--ds-muted); }',
    code: '',
  };
}

export const HAS_TEMPLATE = new Set(Object.keys(T));
