import { normalizeHex, evaluateChecklist } from '@dsvault/a11y';
import { EXPORTS, fontStack } from '@dsvault/converters';
import { BRAND_SECTIONS, THEMES } from '@dsvault/schema';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { getPublicSystem } from '@/lib/systems';

export const dynamic = 'force-dynamic';
// Checked here, before anything streams, so an off or unknown link answers 404.
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const s = await getPublicSystem(params.token);
  if (!s) notFound();
  return { title: `${s.name || 'Untitled system'} · Design System Vault`, robots: { index: false, follow: false } };
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const s = await getPublicSystem(params.token);
  if (!s) notFound();
  const c = s.content, t = c.tokens;
  const score = evaluateChecklist(c);
  const families = [...new Set(t.type.map((x) => x.family).filter(Boolean))];
  const fontHref = families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap` : null;
  const brand = BRAND_SECTIONS.filter((x) => (c.brand[x.key] ?? '').trim());

  return (
    <main className="mx-auto max-w-[1040px] px-4 pb-24 pt-8 md:px-12">
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <span className="font-semibold">Design System Vault</span>
        <span className="label">Shared, read only</span>
      </header>
      <h1 className="page-title mt-8">{c.name || 'Untitled system'}</h1>
      {c.description && <p className="muted mt-3 max-w-[62ch]">{c.description}</p>}
      <p className="mono mt-3 text-[13px] text-graphite-muted">Checklist {score.score}% · {t.colors.length} colors · {t.type.length} type styles · {c.components.length} components</p>

      {t.colors.length > 0 && (
        <section className="block" aria-labelledby="h-colors">
          <div className="block-head"><h2 id="h-colors">Colors</h2><p>Every color has a light and a dark value.</p></div>
          <div className="block-body table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Token</th>{THEMES.map((th) => <th key={th} scope="col">{th}</th>)}<th scope="col">Usage</th></tr></thead>
              <tbody>
                {t.colors.map((x) => (
                  <tr key={x.id}>
                    <td className="mono text-[13px]">{x.name}</td>
                    {THEMES.map((th) => <td key={th} className="num"><span className="chip mr-2" style={{ background: normalizeHex(x[th]) ?? x[th] }} />{x[th]}</td>)}
                    <td className="note">{x.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {t.type.length > 0 && (
        <section className="block" aria-labelledby="h-type">
          <div className="block-head"><h2 id="h-type">Type</h2><p>Size / line height in pixels.</p></div>
          <ul className="block-body rows">
            {t.type.map((x) => (
              <li key={x.id} className="row !grid-cols-1 !gap-1">
                <span className="mono text-[12px] text-graphite-muted">{x.name} · {x.family} {x.weight} · {x.size}/{x.lineHeight}</span>
                <span className="block overflow-hidden text-ellipsis" style={{ fontFamily: fontStack(x.family), fontSize: Math.min(x.size, 56), lineHeight: `${Math.min(x.lineHeight, 60)}px`, fontWeight: x.weight, letterSpacing: x.letterSpacing || undefined }}>
                  {x.sample || 'The quick brown fox jumps over the lazy dog'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(t.spacing.length > 0 || t.radius.length > 0) && (
        <section className="block" aria-labelledby="h-space">
          <div className="block-head"><h2 id="h-space">Space and shape</h2></div>
          <ul className="block-body rows">
            {t.spacing.map((x) => <li key={x.id} className="row !grid-cols-[120px_60px_1fr]"><span className="mono text-[13px]">{x.name}</span><span className="mono text-[13px]">{x.value}px</span><span className="h-3 max-w-full rounded-[2px] bg-forest" style={{ width: Math.min(x.value, 600) }} aria-hidden /></li>)}
            {t.radius.map((x) => <li key={x.id} className="row !grid-cols-[120px_60px_1fr]"><span className="mono text-[13px]">{x.name}</span><span className="mono text-[13px]">{x.value}px</span><span className="h-9 w-12 border-[1.5px] border-forest bg-forest-tint" style={{ borderRadius: x.value }} aria-hidden /></li>)}
          </ul>
        </section>
      )}

      {brand.length > 0 && (
        <section className="block" aria-labelledby="h-brand">
          <div className="block-head"><h2 id="h-brand">Brand book</h2></div>
          <div className="block-body prose-md">
            {brand.map((b) => (
              <div key={b.key}>
                <h3>{b.title}</h3>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.brand[b.key]!) }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {c.components.length > 0 && (
        <section className="block" aria-labelledby="h-comp">
          <div className="block-head"><h2 id="h-comp">Components</h2></div>
          <ul className="block-body rows">
            {c.components.map((x) => <li key={x.id} className="row !grid-cols-1 !gap-1"><span className="font-medium">{x.name}</span>{x.description && <span className="note">{x.description}</span>}</li>)}
          </ul>
        </section>
      )}

      <section className="block" aria-labelledby="h-dl">
        <div className="block-head"><h2 id="h-dl">Download</h2><p>Take the tokens into your own tools.</p></div>
        <ul className="block-body flex list-none flex-wrap gap-2 p-0">
          {EXPORTS.map((f) => <li key={f.id}><a className="btn" href={`/api/share/${params.token}?format=${f.id}`}>{f.label}</a></li>)}
        </ul>
      </section>
    </main>
  );
}
