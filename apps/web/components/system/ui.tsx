'use client';

import { normalizeHex } from '@dsvault/a11y';
import { useId } from 'react';
import { PlusIcon, TrashIcon } from '../icons';
import { SaveStatus, useSystem } from './SystemProvider';

export function PageHead({ title, intro }: { title: string; intro?: React.ReactNode }) {
  const { content } = useSystem();
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="label">{content.name || 'Untitled system'}</span>
        <SaveStatus />
      </div>
      <h1 className="page-title">{title}</h1>
      {intro && <p className="muted max-w-[62ch]">{intro}</p>}
    </header>
  );
}

export function Block({ id, title, intro, children }: { id?: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  const hid = useId();
  return (
    <section className="block" id={id} aria-labelledby={hid}>
      <div className="block-head"><h2 id={hid}>{title}</h2>{intro && <p>{intro}</p>}</div>
      <div className="block-body">{children}</div>
    </section>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}

export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <li className="empty"><strong>{title}</strong>{children}</li>;
}

export function AddButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className="add" onClick={onClick} disabled={disabled}><PlusIcon />{children}</button>;
}

export function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="icon-btn" aria-label={`Delete ${label}`} onClick={onClick}><TrashIcon /></button>;
}

export function SwatchField({ theme, value, name, onChange }: { theme: string; value: string; name: string; onChange: (v: string) => void }) {
  const hex = normalizeHex(value);
  return (
    <div className="swatch-field">
      <span className="theme-tag">{theme}</span>
      <span className="swatch" style={{ background: hex ?? value ?? 'transparent' }}>
        <input type="color" value={hex ?? '#808080'} aria-label={`${name} ${theme} color picker`} onChange={(e) => onChange(e.target.value)} />
      </span>
      <input className="input mono min-w-0 flex-1" value={value} spellCheck={false} aria-label={`${name} ${theme} value`}
        aria-invalid={!hex && !/^(rgb|hsl|oklch|oklab|lab|lch|color)a?\(/i.test(value)} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
