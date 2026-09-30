'use client';

import { EXPORTS } from '@dsvault/converters';
import type { SystemContent } from '@dsvault/schema';
import { useMemo, useState } from 'react';
import { useSystem } from './SystemProvider';
import { Block, PageHead, download } from './ui';

type Parsed = { content: SystemContent; warnings: string[]; kind: string; filename: string };

export function ExportView() {
  const { content, update } = useSystem();
  const [fmt, setFmt] = useState(EXPORTS[0]!.id);
  const [fileIdx, setFileIdx] = useState(0);
  const [note, setNote] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [importNote, setImportNote] = useState('');
  const format = EXPORTS.find((f) => f.id === fmt)!;
  const files = useMemo(() => format.run(content), [format, content]);
  const file = files[Math.min(fileIdx, files.length - 1)]!;

  async function copy() {
    try { await navigator.clipboard.writeText(file.text); setNote(`Copied ${file.filename}.`); }
    catch { setNote('Couldn’t copy. Select the text and copy it instead.'); }
  }

  async function read(f: File) {
    setImportNote(`Reading ${f.name}…`); setParsed(null);
    const res = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: f.name, text: await f.text() }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setImportNote(body.error ?? 'Couldn’t read that file.'); return; }
    setParsed({ ...body, filename: f.name });
    setImportNote('');
  }

  function apply() {
    if (!parsed) return;
    update((d) => {
      d.tokens = parsed.content.tokens;
      for (const [k, v] of Object.entries(parsed.content.brand)) if (v.trim()) d.brand[k] = v;
    });
    setImportNote(`Replaced tokens from ${parsed.filename}.`);
    setParsed(null);
  }

  const counts = parsed && Object.entries(parsed.content.tokens).filter(([, v]) => v.length).map(([k, v]) => `${v.length} ${k}`);

  return (
    <>
      <PageHead title="Export and import" intro="Take the system to other tools, or bring tokens in from them." />
      <Block title="Export" intro={format.note}>
        <div className="tabs" role="tablist" aria-label="Format">
          {EXPORTS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={f.id === fmt} onClick={() => { setFmt(f.id); setFileIdx(0); setNote(''); }}>{f.label}</button>)}
        </div>
        {files.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="File">
            {files.map((x, i) => <button key={x.filename} type="button" className="btn h-8 px-2.5 text-[13px]" aria-pressed={i === fileIdx} style={i === fileIdx ? { borderColor: 'var(--forest)', color: 'var(--forest)' } : undefined} onClick={() => setFileIdx(i)}>{x.filename}</button>)}
          </div>
        )}
        <pre className="code mt-3" tabIndex={0} aria-label={`${file.filename} preview`}>{file.text}</pre>
        <div className="actions mt-3">
          <button type="button" className="btn btn-primary" onClick={copy}>Copy</button>
          <button type="button" className="btn" onClick={() => { files.forEach((x) => download(x.filename, x.text, x.mime)); setNote(`Downloaded ${files.map((x) => x.filename).join(' and ')}.`); }}>
            Download {files.length > 1 ? 'both files' : file.filename}
          </button>
          <span className="note" aria-live="polite">{note}</span>
        </div>
      </Block>
      <Block title="Import" intro="W3C tokens, Tokens Studio, a Claude Design tokens.json, a CSS file or a Tailwind config. Replaces this system’s tokens; the name and checklist stay.">
        <div className="actions">
          <label className="btn">
            Choose a file
            <input type="file" className="sr-only" accept=".json,.css,.js,.cjs,.mjs,.ts" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void read(f); }} />
          </label>
          <span className="note" aria-live="polite">{importNote}</span>
        </div>
        {parsed && (
          <div className="mt-4 rounded-sm border border-line p-4">
            <p className="m-0"><span className="font-medium">{parsed.filename}</span> <span className="note">read as {parsed.kind}</span></p>
            <p className="note m-0 mt-1">{counts?.length ? counts.join(', ') : 'No tokens found.'}</p>
            {parsed.warnings.length > 0 && (
              <details className="mt-2"><summary className="note cursor-pointer">{parsed.warnings.length} notes</summary>
                <ul className="note mt-1 list-disc pl-5">{parsed.warnings.slice(0, 30).map((w, i) => <li key={i}>{w}</li>)}</ul>
              </details>
            )}
            <div className="actions mt-3">
              <button type="button" className="btn btn-primary" onClick={apply} disabled={!counts?.length}>Replace tokens</button>
              <button type="button" className="btn" onClick={() => setParsed(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Block>
    </>
  );
}
