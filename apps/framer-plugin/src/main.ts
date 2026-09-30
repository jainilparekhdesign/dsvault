// Framer plugin: syncs a vault system's colors (light and dark) and type into
// this project's color and text styles, with a preview before applying.
import 'framer-plugin/framer.css';
import './style.css';
import type { SystemContent } from '@dsvault/schema';
import { framer } from 'framer-plugin';
import { type FramerSnapshot, type Plan, count, isEmpty, plan, pullColors } from './sync';

void framer.showUI({ width: 320, height: 560, resizable: 'height', position: 'top right' });

const KEY = 'vaultId';
const STORE = 'dsvault-settings';
// Settings stay in this browser only; plugin data would share the token with collaborators.
type Settings = { server: string; token: string; systemId?: string };
const load = (): Settings => { try { return { server: 'https://designsystemvault.xyz', token: '', ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }; } catch { return { server: 'https://designsystemvault.xyz', token: '' }; } };
const store = (s: Settings) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode */ } };
let settings = load();
let current: { id: string; content: SystemContent } | null = null;
let pending: Plan | null = null;

const app = document.getElementById('app')!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(settings.server.replace(/\/$/, '') + path, { ...init, headers: { authorization: `Bearer ${settings.token}`, 'content-type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}.`);
  return body;
}

async function snapshot(): Promise<FramerSnapshot> {
  const [colors, texts] = await Promise.all([framer.getColorStyles(), framer.getTextStyles()]);
  return {
    colors: await Promise.all(colors.map(async (c) => ({ id: c.id, vaultId: await c.getPluginData(KEY), path: c.path, light: c.light, dark: c.dark }))),
    texts: await Promise.all(texts.map(async (t) => ({
      id: t.id, vaultId: await t.getPluginData(KEY), path: t.path, family: t.font.family, weight: t.font.weight ?? 400,
      fontSize: t.fontSize, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing,
    }))),
  };
}

async function apply(p: Plan) {
  const failed: string[] = [];
  const [colors, texts] = await Promise.all([framer.getColorStyles(), framer.getTextStyles()]);
  const colorById = new Map(colors.map((c) => [c.id, c])), textById = new Map(texts.map((t) => [t.id, t]));
  for (const o of p.colors) {
    try {
      if (o.op === 'remove') { await colorById.get(o.id)?.remove(); continue; }
      const attrs = { path: o.want.path, light: o.want.light, dark: o.want.dark };
      const style = o.op === 'create' ? await framer.createColorStyle(attrs) : await colorById.get(o.id)?.setAttributes(attrs);
      await style?.setPluginData(KEY, o.want.vaultId);
    } catch (e) { failed.push(`${o.op === 'remove' ? o.path : o.want.path}: ${(e as Error).message}`); }
  }
  for (const o of p.texts) {
    try {
      if (o.op === 'remove') { await textById.get(o.id)?.remove(); continue; }
      const w = o.want;
      const font = (await framer.getFont(w.family, { weight: w.weight as 400 })) ?? (await framer.getFont(w.family)) ?? (await framer.getFont('Inter', { weight: w.weight as 400 }));
      if (!font) throw new Error(`Font ${w.family} isn’t available in Framer.`);
      const attrs = { path: w.path, font, fontSize: w.fontSize as `${number}px`, lineHeight: w.lineHeight as `${number}px`, letterSpacing: w.letterSpacing as `${number}em`, tag: w.tag };
      const style = o.op === 'create' ? await framer.createTextStyle(attrs) : await textById.get(o.id)?.setAttributes(attrs);
      await style?.setPluginData(KEY, w.vaultId);
    } catch (e) { failed.push(`${o.op === 'remove' ? o.path : o.want.path}: ${(e as Error).message}`); }
  }
  return failed;
}

function render(html: string) { app.innerHTML = html; }
function status(text: string) { const el = document.getElementById('status'); if (el) el.textContent = text; }

function connectView(note = '') {
  render(`
    <h1>Design System Vault</h1>
    <p class="muted">Create a token in the vault under Settings and tokens, then paste it here.</p>
    <label>Server<input id="server" value="${esc(settings.server)}" spellcheck="false"></label>
    <label>Access token<input id="token" type="password" placeholder="dsv_…" value="${esc(settings.token)}" spellcheck="false"></label>
    <button id="connect" class="framer-button-primary">Connect</button>
    <p id="status" class="muted" role="status">${esc(note)}</p>`);
  document.getElementById('connect')!.onclick = async () => {
    settings = { ...settings, server: (document.getElementById('server') as HTMLInputElement).value.trim(), token: (document.getElementById('token') as HTMLInputElement).value.trim() };
    store(settings);
    await mainView();
  };
}

async function mainView() {
  let systems: { id: string; name: string }[];
  try { systems = await api('/api/systems'); } catch (e) { connectView((e as Error).message); return; }
  render(`
    <h1>Design System Vault</h1>
    <label>System<select id="system">${systems.map((s) => `<option value="${s.id}" ${s.id === settings.systemId ? 'selected' : ''}>${esc(s.name || 'Untitled system')}</option>`).join('')}</select></label>
    <div class="row"><button id="preview" class="framer-button-primary">Preview vault → Framer</button></div>
    <div class="row"><button id="pull">Preview Framer colors → vault</button></div>
    <div id="out"></div>
    <p id="status" class="muted" role="status"></p>
    <button id="disconnect" class="link">Change connection</button>`);
  const pick = async () => {
    const id = (document.getElementById('system') as HTMLSelectElement).value;
    settings.systemId = id; store(settings);
    current = { id, content: (await api(`/api/systems/${id}`)).content };
    return current;
  };
  document.getElementById('disconnect')!.onclick = () => connectView();
  document.getElementById('preview')!.onclick = async () => {
    status('Reading…');
    try {
      const { content } = await pick();
      pending = plan(content, await snapshot());
      showPlan(pending);
      status('');
    } catch (e) { status((e as Error).message); }
  };
  document.getElementById('pull')!.onclick = async () => {
    status('Reading…');
    try {
      const { id, content } = await pick();
      const r = pullColors(content, await snapshot());
      const out = document.getElementById('out')!;
      if (!r.changed.length && !r.added.length) { out.innerHTML = '<p class="ok">The vault’s colors already match.</p>'; status(''); return; }
      out.innerHTML = `<ul class="list">${[...r.changed.map((n) => `<li><span>~</span>${esc(n)}</li>`), ...r.added.map((n) => `<li><span>+</span>${esc(n)}</li>`)].join('')}</ul>
        <button id="save" class="framer-button-primary">Update ${r.changed.length + r.added.length} colors in the vault</button>`;
      document.getElementById('save')!.onclick = async () => {
        try { await api(`/api/systems/${id}`, { method: 'PUT', body: JSON.stringify({ content: r.content }) }); out.innerHTML = '<p class="ok">Saved to the vault.</p>'; framer.notify('Saved colors to the vault.'); }
        catch (e) { status((e as Error).message); }
      };
      status('');
    } catch (e) { status((e as Error).message); }
  };
}

function showPlan(p: Plan) {
  const out = document.getElementById('out')!;
  if (isEmpty(p)) { out.innerHTML = '<p class="ok">This project already matches the vault.</p>'; return; }
  const sign = { create: '+', update: '~', remove: '−' } as const;
  const rows = [...p.colors, ...p.texts].map((o) => {
    const name = o.op === 'remove' ? o.path : o.want.path;
    const what = o.op === 'update' ? o.changes.join(', ') : o.op === 'create' ? 'new' : 'removed';
    return `<li><span>${sign[o.op]}</span>${esc(name)} <em>${esc(what)}</em></li>`;
  });
  out.innerHTML = `<ul class="list">${rows.join('')}</ul>${p.skipped.length ? `<p class="muted">${p.skipped.map(esc).join('<br>')}</p>` : ''}
    <button id="apply" class="framer-button-primary">Apply ${count(p)} changes</button>`;
  document.getElementById('apply')!.onclick = async () => {
    status('Applying…');
    const failed = await apply(p);
    out.innerHTML = failed.length ? `<p class="bad">${failed.length} changes failed:</p><p class="muted">${failed.map(esc).join('<br>')}</p>` : '<p class="ok">Done. Styles match the vault.</p>';
    framer.notify(failed.length ? `${failed.length} changes failed.` : 'Styles now match the vault.');
    status('');
  };
}

if (settings.token) void mainView(); else connectView();
