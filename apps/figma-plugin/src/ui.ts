import type { SystemContent } from '@dsvault/schema';
import { TOKEN_GROUPS } from '@dsvault/schema';
import { type FigmaSnapshot, type PullPlan, planIsEmpty, planPull, planPush } from './sync';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const post = (msg: unknown) => parent.postMessage({ pluginMessage: msg }, '*');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

let settings: Record<string, string> = {};
let systems: { id: string; name: string }[] = [];
let current: { id: string; content: SystemContent } | null = null;
let waiting: ((m: any) => void) | null = null;

const status = (text: string) => { $('status').textContent = text; };
const fit = () => post({ type: 'resize', height: document.body.scrollHeight + 8 });

function ask<T>(msg: { type: string; [k: string]: unknown }, reply: string): Promise<T> {
  return new Promise((resolve, reject) => {
    waiting = (m) => (m.type === 'error' ? reject(new Error(m.message)) : m.type === reply ? resolve(m) : undefined);
    post(msg);
  });
}

window.onmessage = (e) => {
  const m = e.data.pluginMessage;
  if (!m) return;
  if (m.type === 'init') { settings = m.settings ?? {}; void start(); return; }
  if (m.type === 'selection') { $('sel').textContent = m.count ? `${m.count} selected` : 'Nothing selected'; return; }
  waiting?.(m);
};

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch((settings.server ?? '').replace(/\/$/, '') + path, {
    ...init,
    headers: { authorization: `Bearer ${settings.token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}.`);
  return body;
}

async function start() {
  ($('server') as HTMLInputElement).value = settings.server || 'https://designsystemvault.xyz';
  if (settings.token) {
    try { await loadSystems(); return; } catch (e) { $('connect-note').textContent = (e as Error).message; }
  }
  $('connect').hidden = false; $('work').hidden = true; fit();
}

async function loadSystems() {
  systems = await api('/api/systems');
  const sel = $<HTMLSelectElement>('system');
  sel.innerHTML = systems.length ? systems.map((s) => `<option value="${s.id}">${esc(s.name || 'Untitled system')}</option>`).join('') : '<option value="">No systems yet</option>';
  if (settings.systemId && systems.some((s) => s.id === settings.systemId)) sel.value = settings.systemId;
  $('connect').hidden = true; $('work').hidden = false; $('edit-conn').hidden = false;
  status(`Connected to ${new URL(settings.server ?? '').host}.`);
  fit();
}

async function loadCurrent() {
  const id = $<HTMLSelectElement>('system').value;
  if (!id) throw new Error('Create a system in the vault first.');
  const body = await api(`/api/systems/${id}`);
  current = { id, content: body.content };
  if (settings.systemId !== id) { settings.systemId = id; post({ type: 'save-settings', settings }); }
  return current;
}

$('connect-btn').onclick = async () => {
  settings.server = ($('server') as HTMLInputElement).value.trim();
  settings.token = ($('token') as HTMLInputElement).value.trim();
  $('connect-note').textContent = 'Connecting…';
  try { await loadSystems(); post({ type: 'save-settings', settings }); $('connect-note').textContent = ''; }
  catch (e) { $('connect-note').textContent = (e as Error).message; }
};
$('edit-conn').onclick = () => { $('connect').hidden = !$('connect').hidden; fit(); };
$('system').onchange = () => { $('pull-out').innerHTML = ''; $('push-out').innerHTML = ''; };

document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    fit();
  };
});

// ---- Vault → Figma ----

let pending: PullPlan | null = null;
const SIGN = { create: '+', update: '~', remove: '−' } as const;

$('preview-pull').onclick = async () => {
  status('Reading the vault and this file…');
  try {
    const { id, content } = await loadCurrent();
    const { snapshot } = await ask<{ snapshot: FigmaSnapshot }>({ type: 'snapshot', systemId: id, systemName: content.name || 'Untitled system' }, 'snapshot');
    pending = planPull(content, snapshot);
    renderPull(pending);
    status('');
  } catch (e) { status((e as Error).message); }
};

function renderPull(p: PullPlan) {
  const out = $('pull-out');
  if (planIsEmpty(p)) { out.innerHTML = '<p class="ok">This file already matches the vault.</p>'; fit(); return; }
  const rows = [
    ...(p.createCollection ? [`<li><span class="sign">+</span><span>Collection <b>${esc(p.collectionName)}</b> with Light and Dark</span><span></span></li>`] : []),
    ...[...p.variables, ...p.textStyles, ...p.effectStyles].map((o) => {
      const name = o.op === 'remove' ? o.name : o.want.name;
      const what = o.op === 'update' ? o.changes.join(', ') : o.op === 'create' ? 'new' : 'removed';
      return `<li><span class="sign">${SIGN[o.op]}</span><span class="mono">${esc(name)}</span><span class="muted">${esc(what)}</span></li>`;
    }),
  ];
  out.innerHTML = `<ul class="list">${rows.join('')}</ul>
    ${p.skipped.length ? `<p class="muted" style="margin-top:6px">${p.skipped.map(esc).join('<br>')}</p>` : ''}
    <div class="row" style="margin-top:10px"><button id="apply-pull" class="primary" type="button">Apply ${rows.length} changes</button><button id="cancel-pull" type="button">Cancel</button></div>`;
  $('apply-pull').onclick = async () => {
    if (!pending || !current) return;
    status('Applying…');
    try {
      const r = await ask<{ done: number; failed: string[] }>({ type: 'apply', systemId: current.id, plan: pending }, 'applied');
      out.innerHTML = r.failed.length ? `<p class="bad">${r.failed.length} changes failed:</p><p class="muted">${r.failed.map(esc).join('<br>')}</p>` : '<p class="ok">Done. This file now matches the vault.</p>';
      status(`Applied ${r.done} changes.`);
    } catch (e) { status((e as Error).message); }
    pending = null; fit();
  };
  $('cancel-pull').onclick = () => { pending = null; out.innerHTML = ''; fit(); };
  fit();
}

// ---- Figma → Vault ----

$('preview-push').onclick = async () => {
  status('Reading this file and the vault…');
  try {
    const { id, content } = await loadCurrent();
    const { snapshot } = await ask<{ snapshot: FigmaSnapshot }>({ type: 'snapshot', systemId: id, systemName: content.name || 'Untitled system' }, 'snapshot');
    if (!snapshot.collection && !snapshot.textStyles.length) { $('push-out').innerHTML = '<p class="muted">This file has nothing from this system yet. Use Vault → Figma first.</p>'; status(''); fit(); return; }
    const r = planPush(content, snapshot, ($('remove-missing') as HTMLInputElement).checked);
    const out = $('push-out');
    if (r.diff.empty) { out.innerHTML = '<p class="ok">The vault already matches this file.</p>'; status(''); fit(); return; }
    const title = (g: string) => TOKEN_GROUPS.find((x) => x.key === g)?.title ?? g;
    const rows = r.diff.tokens.map((t) => {
      const sign = t.kind === 'added' ? '+' : t.kind === 'removed' ? '−' : '~';
      const what = t.kind === 'changed' ? t.fields.map((f) => f.field).join(', ') : t.kind;
      return `<li><span class="sign">${sign}</span><span><span class="muted">${esc(title(t.group))}</span> <span class="mono">${esc(t.name)}</span></span><span class="muted">${esc(what)}</span></li>`;
    });
    out.innerHTML = `<ul class="list">${rows.join('')}</ul>
      ${r.notes.length ? `<p class="muted" style="margin-top:6px">${r.notes.map(esc).join('<br>')}</p>` : ''}
      <p class="muted" style="margin-top:6px">Tip: save a version in the vault first if you may want to undo this.</p>
      <div class="row" style="margin-top:10px"><button id="apply-push" class="primary" type="button">Update the vault</button><button id="cancel-push" type="button">Cancel</button></div>`;
    $('apply-push').onclick = async () => {
      status('Saving to the vault…');
      try { await api(`/api/systems/${id}`, { method: 'PUT', body: JSON.stringify({ content: r.content }) }); out.innerHTML = '<p class="ok">Saved. The vault now matches this file.</p>'; status(''); }
      catch (e) { status((e as Error).message); }
      fit();
    };
    $('cancel-push').onclick = () => { out.innerHTML = ''; fit(); };
    status(''); fit();
  } catch (e) { status((e as Error).message); }
};

// ---- Contrast ----

$('check').onclick = async () => {
  const { results } = await ask<{ results: { name: string; fg: string; bg: string; ratio: number | null; large: boolean; pass: boolean; suggestion: string | null; note?: string }[] }>({ type: 'contrast' }, 'contrast');
  const out = $('contrast-out');
  if (!results.length) { out.innerHTML = '<p class="muted">Select frames or text layers first.</p>'; fit(); return; }
  const fails = results.filter((r) => !r.pass).length;
  out.innerHTML = `<p class="${fails ? 'bad' : 'ok'}">${fails ? `${fails} of ${results.length} text layers fail` : `All ${results.length} text layers pass`}</p>
    <ul class="list">${results.map((r) => `<li>
      <span class="chip" style="background:${r.bg}"><span style="display:block;width:6px;height:6px;margin:2px;border-radius:2px;background:${r.fg}"></span></span>
      <span><span>${esc(r.name)}</span><br><span class="muted mono">${r.note ? esc(r.note) : `${r.ratio?.toFixed(2)}:1${r.large ? ' · large' : ''}${r.suggestion ? ` · try ${r.suggestion}` : ''}`}</span></span>
      <span class="${r.pass ? 'ok' : 'bad'}">${r.pass ? 'Pass' : 'Fail'}</span></li>`).join('')}</ul>`;
  fit();
};

post({ type: 'init' });
