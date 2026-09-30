'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSystem } from './SystemProvider';
import { Block } from './ui';

type Share = { email: string; role: 'viewer' | 'editor' };

export function SharingPanel() {
  const { id, role } = useSystem();
  const [people, setPeople] = useState<Share[] | null>(null);
  const [owner, setOwner] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<'viewer' | 'editor'>('viewer');
  const [note, setNote] = useState('');
  const [origin, setOrigin] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/systems/${id}/shares`);
    if (!res.ok) return;
    const body = await res.json();
    setPeople(body.people); setToken(body.publicToken); setOwner(body.owner);
  }, [id]);
  useEffect(() => { setOrigin(window.location.origin); void load(); }, [load]);

  if (role !== 'owner') {
    return (
      <Block title="Sharing" intro="Who owns this system.">
        <p className="note">Shared with you by <span className="mono">{owner || '…'}</span> as {role === 'editor' ? 'an editor' : 'a viewer'}.</p>
      </Block>
    );
  }

  async function invite() {
    const res = await fetch(`/api/systems/${id}/shares`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, role: newRole }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setNote(body.error ?? 'Couldn’t share.'); return; }
    setNote(`Shared with ${email}. They can sign in with that Google account.`); setEmail('');
    await load();
  }
  async function setRole(e: string, r: string) {
    await fetch(`/api/systems/${id}/shares`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, role: r }) });
    await load();
  }
  async function remove(e: string) {
    await fetch(`/api/systems/${id}/shares?email=${encodeURIComponent(e)}`, { method: 'DELETE' });
    setNote(`${e} no longer has access.`);
    await load();
  }
  async function togglePublic(on: boolean) {
    const res = await fetch(`/api/systems/${id}/public`, { method: on ? 'POST' : 'DELETE' });
    if (res.ok) setToken(on ? (await res.json()).token : null);
    setNote(on ? 'Public link on. Anyone with it can view and export this system.' : 'Public link off. The old link no longer works.');
  }
  const link = token ? `${origin}/share/${token}` : '';

  return (
    <Block title="Sharing" intro="Viewers can browse and export. Editors can also change tokens, the brand book, components and versions. Only you can delete or share.">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void invite(); }}>
        <label className="field min-w-[220px] flex-1"><span>Email</span><input className="input" type="email" autoComplete="off" value={email} placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Role</span>
          <select className="select" value={newRole} onChange={(e) => setNewRole(e.target.value as 'viewer')}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!email.trim()}>Share</button>
      </form>
      <ul className="rows mt-4">
        {people === null ? <li className="note py-2">Loading…</li> : people.length === 0 ? <li className="empty">Only you have access.</li> : people.map((p) => (
          <li key={p.email} className="row !grid-cols-[minmax(0,1fr)_auto_auto] !items-center">
            <span className="mono min-w-0 truncate text-sm">{p.email}</span>
            <label className="sr-only" htmlFor={`role-${p.email}`}>Role for {p.email}</label>
            <select id={`role-${p.email}`} className="select !w-auto" value={p.role} onChange={(e) => setRole(p.email, e.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
            <button type="button" className="btn" onClick={() => remove(p.email)}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-2">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[var(--forest)]" checked={!!token} onChange={(e) => togglePublic(e.target.checked)} />
          Public read-only link
        </label>
        {token && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="mono min-w-0 flex-1 break-all rounded-sm bg-surface px-3 py-2 text-[13px]">{link}</code>
            <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(link).then(() => setNote('Link copied.'), () => setNote('Select the link and copy it.'))}>Copy</button>
            <a className="btn" href={link} target="_blank" rel="noopener">Open (new tab)</a>
          </div>
        )}
      </div>
      <p className="note mt-3" aria-live="polite">{note}</p>
    </Block>
  );
}
