'use client';

import { type SystemContent, systemContent } from '@dsvault/schema';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type SaveState = 'saved' | 'saving' | 'error';
type Ctx = {
  id: string;
  content: SystemContent;
  update: (fn: (draft: SystemContent) => void) => void;
  replace: (next: SystemContent) => void;
  /** Replace local content with what the server already holds (no save). */
  reset: (next: SystemContent) => void;
  save: SaveState;
  saveNow: () => Promise<void>;
};

const SystemCtx = createContext<Ctx | null>(null);

export function useSystem() {
  const ctx = useContext(SystemCtx);
  if (!ctx) throw new Error('useSystem outside SystemProvider');
  return ctx;
}

const SAVE_DELAY = 600;

export function SystemProvider({ id, initial, children }: { id: string; initial: SystemContent; children: React.ReactNode }) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [save, setSave] = useState<SaveState>('saved');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(content);
  const savedName = useRef(initial.name);

  const persist = useCallback(async () => {
    timer.current = null;
    const body = latest.current;
    try {
      const res = await fetch(`/api/systems/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: body }) });
      if (!res.ok) throw new Error(String(res.status));
      if (!timer.current) setSave('saved');
      if (body.name !== savedName.current) { savedName.current = body.name; router.refresh(); }
    } catch {
      setSave('error');
    }
  }, [id, router]);

  const schedule = useCallback(() => {
    setSave('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, SAVE_DELAY);
  }, [persist]);

  const update = useCallback((fn: (draft: SystemContent) => void) => {
    const next = structuredClone(latest.current);
    fn(next);
    latest.current = next;
    setContent(next);
    schedule();
  }, [schedule]);

  const replace = useCallback((next: SystemContent) => {
    latest.current = systemContent.parse(next);
    setContent(latest.current);
    schedule();
  }, [schedule]);

  const reset = useCallback((next: SystemContent) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    latest.current = systemContent.parse(next);
    savedName.current = latest.current.name;
    setContent(latest.current);
    setSave('saved');
  }, []);

  const saveNow = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); await persist(); }
  }, [persist]);

  // Save pending edits before leaving the page.
  useEffect(() => {
    const flush = () => { if (timer.current) { clearTimeout(timer.current); navigator.sendBeacon?.(`/api/systems/${id}/beacon`, JSON.stringify({ content: latest.current })); } };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); if (timer.current) { clearTimeout(timer.current); void persist(); } };
  }, [id, persist]);

  return <SystemCtx.Provider value={{ id, content, update, replace, reset, save, saveNow }}>{children}</SystemCtx.Provider>;
}

export function SaveStatus() {
  const { save } = useSystem();
  const text = save === 'saved' ? 'Saved' : save === 'saving' ? 'Saving' : 'Not saved. Retrying on your next edit';
  return (
    <p className="label m-0 inline-flex items-center gap-2 whitespace-nowrap" aria-live="polite">
      <span className="status-dot" data-state={save} />{text}
    </p>
  );
}
