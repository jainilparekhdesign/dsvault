'use client';

import { useCallback, useEffect, useState } from 'react';

type Token = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function SettingsView({ origin }: { origin: string }) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/tokens');
    setTokens(res.ok ? await res.json() : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    const res = await fetch('/api/tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) { setNote('Couldn’t create a token.'); return; }
    setFresh(await res.json()); setName(''); setNote('');
    await load();
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    setConfirm(null);
    setNote(res.ok ? 'Token revoked. Anything using it stops working now.' : 'Couldn’t revoke the token.');
    await load();
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNote('Copied.'); } catch { setNote('Select the text and copy it.'); }
  }

  const mcpUrl = `${origin}/api/mcp`;

  return (
    <>
      <span className="label">Settings</span>
      <h1 className="page-title mt-1.5">Access tokens</h1>
      <p className="muted mt-2 max-w-[62ch]">A token lets the Figma plugin, the Framer plugin and AI tools read and change your systems without a browser sign-in. Give each tool its own token so you can revoke one without touching the others.</p>

      <section className="block">
        <div className="block-head"><h2>New token</h2><p>You see a token once. Store it in the tool that uses it.</p></div>
        <div className="block-body">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <label className="field min-w-[220px] flex-1"><span>Name</span><input className="input" value={name} maxLength={100} placeholder="e.g. Figma plugin" onChange={(e) => setName(e.target.value)} /></label>
            <button type="submit" className="btn btn-primary">Create token</button>
          </form>
          {fresh && (
            <div className="mt-4 rounded-sm border border-line-strong p-4" role="status">
              <p className="m-0 font-medium">{fresh.name}</p>
              <p className="note m-0 mt-1">Copy it now. It won’t be shown again.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="mono min-w-0 flex-1 break-all rounded-sm bg-surface px-3 py-2 text-[13px]">{fresh.token}</code>
                <button type="button" className="btn" onClick={() => copy(fresh.token)}>Copy</button>
              </div>
            </div>
          )}
          <p className="note mt-2" aria-live="polite">{note}</p>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Your tokens</h2><p>Revoking a token signs that tool out.</p></div>
        <div className="block-body">
          {tokens === null ? <p className="note">Loading…</p> : tokens.length === 0 ? <p className="empty">No tokens yet.</p> : (
            <ul className="rows">
              {tokens.map((t) => (
                <li key={t.id} className="row !grid-cols-[minmax(0,1fr)_auto] !items-center">
                  <span className="min-w-0">
                    <span className="font-medium">{t.name}</span>
                    <span className="note block"><span className="mono">{t.prefix}…</span> · created {fmt.format(new Date(t.createdAt))} · {t.lastUsedAt ? `last used ${fmt.format(new Date(t.lastUsedAt))}` : 'never used'}</span>
                  </span>
                  <span className="actions">
                    {confirm === t.id ? (
                      <><button type="button" className="btn btn-danger" onClick={() => revoke(t.id)}>Revoke</button><button type="button" className="btn" autoFocus onClick={() => setConfirm(null)}>Cancel</button></>
                    ) : <button type="button" className="btn" onClick={() => setConfirm(t.id)}>Revoke</button>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Connect tools</h2><p>Where each token goes.</p></div>
        <div className="block-body flex flex-col gap-4 text-[15px]">
          <div><p className="m-0 font-medium">Figma plugin</p><p className="note m-0">In Figma: Plugins → Development → Import plugin from manifest, and pick <span className="mono">apps/figma-plugin/manifest.json</span>. Open the plugin, paste the server address <span className="mono">{origin}</span> and a token.</p></div>
          <div><p className="m-0 font-medium">Framer plugin</p><p className="note m-0">Run <span className="mono">corepack pnpm --filter @dsvault/framer-plugin dev</span>, then in Framer: Plugins → Open Development Plugin. Paste the same server address and a token.</p></div>
          <div>
            <p className="m-0 font-medium">AI tools (MCP)</p>
            <p className="note m-0">Add a remote MCP server with this URL and an <span className="mono">Authorization: Bearer</span> header set to a token. It can read your systems but never change them.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><code className="mono rounded-sm bg-surface px-3 py-2 text-[13px]">{mcpUrl}</code><button type="button" className="btn" onClick={() => copy(mcpUrl)}>Copy</button></div>
          </div>
        </div>
      </section>
    </>
  );
}
