'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MenuIcon, PlusIcon } from './icons';

export type NavSystem = { id: string; name: string; brand: string | null };

export const SYSTEM_SECTIONS = [
  { slug: '', title: 'Overview' },
  { slug: 'tokens', title: 'Tokens' },
  { slug: 'brand', title: 'Brand book' },
  { slug: 'checklist', title: 'Checklist' },
  { slug: 'accessibility', title: 'Accessibility' },
  { slug: 'versions', title: 'Versions' },
  { slug: 'export', title: 'Export and import' },
];

export function Shell({ systems, email, signOut, children }: { systems: NavSystem[]; email: string; signOut: () => Promise<void>; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const current = pathname.match(/^\/systems\/([^/]+)/)?.[1] ?? null;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); openBtn.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function newSystem() {
    setCreating(true);
    const res = await fetch('/api/systems', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '' }) });
    setCreating(false);
    if (res.ok) { const { id } = await res.json(); router.push(`/systems/${id}`); router.refresh(); }
  }

  return (
    <div className="min-h-screen min-[900px]:grid min-[900px]:grid-cols-[248px_minmax(0,1fr)]">
      <aside
        id="side"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-20 flex w-[min(300px,86vw)] flex-col gap-7 overflow-y-auto border-r border-line bg-paper px-4 pb-8 pt-5 duration-panel ease-out min-[900px]:sticky min-[900px]:top-0 min-[900px]:z-auto min-[900px]:h-screen min-[900px]:w-auto min-[900px]:translate-x-0 min-[900px]:visible ${open ? 'visible translate-x-0 transition-transform' : 'invisible -translate-x-full transition-[transform,visibility]'}`}
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <Link href="/" className="font-semibold text-graphite no-underline">Design System Vault</Link>
          <button ref={closeBtn} type="button" className="btn min-[900px]:hidden" onClick={() => { setOpen(false); openBtn.current?.focus(); }}>Close</button>
        </div>
        <nav aria-labelledby="nav-systems" className="flex flex-col gap-0.5">
          <span id="nav-systems" className="label px-2 pb-2">Systems</span>
          <Link href="/" className="nav-link" aria-current={pathname === '/' ? 'page' : undefined}><span className="t">All systems</span></Link>
          {systems.map((s) => (
            <Link key={s.id} href={`/systems/${s.id}`} className="nav-link" aria-current={s.id === current ? 'page' : undefined}>
              <span className="chip" style={{ background: s.brand ?? 'transparent' }} aria-hidden />
              <span className="t">{s.name || 'Untitled system'}</span>
            </Link>
          ))}
          <button type="button" className="add ml-0" onClick={newSystem} disabled={creating}><PlusIcon />{creating ? 'Creating…' : 'New system'}</button>
        </nav>
        {current && (
          <nav aria-labelledby="nav-sections" className="flex flex-col gap-0.5">
            <span id="nav-sections" className="label px-2 pb-2">This system</span>
            {SYSTEM_SECTIONS.map((s) => {
              const href = `/systems/${current}${s.slug ? `/${s.slug}` : ''}`;
              return <Link key={s.slug} href={href} className="nav-link nav-sub" aria-current={pathname === href ? 'page' : undefined}><span className="t">{s.title}</span></Link>;
            })}
          </nav>
        )}
        <nav aria-label="Account" className="mt-auto flex flex-col gap-0.5">
          <Link href="/settings" className="nav-link nav-sub" aria-current={pathname === '/settings' ? 'page' : undefined}><span className="t">Settings and tokens</span></Link>
        </nav>
        <form action={signOut} className="flex flex-col gap-2 px-2">
          <span className="mono truncate text-xs text-graphite-muted">{email}</span>
          <button type="submit" className="btn self-start">Sign out</button>
        </form>
      </aside>
      <div
        aria-hidden
        onClick={() => { setOpen(false); openBtn.current?.focus(); }}
        className={`fixed inset-0 z-10 bg-graphite transition-opacity duration-panel ease-out min-[900px]:hidden ${open ? 'pointer-events-auto opacity-30' : 'pointer-events-none opacity-0'}`}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 min-[900px]:hidden">
          <button ref={openBtn} type="button" className="btn" aria-controls="side" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon />Menu</button>
          <Link href="/" className="font-semibold text-graphite no-underline">Design System Vault</Link>
        </div>
        <main className="mx-auto max-w-[1040px] px-4 pb-24 pt-6 md:px-12">{children}</main>
      </div>
    </div>
  );
}
