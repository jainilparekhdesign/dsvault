'use client';

import { APCA_MIN, DEFICIENCIES, WCAG_MIN, a11yReport, isStatusColor, normalizeHex, simulate } from '@dsvault/a11y';
import { THEMES, type PairKind } from '@dsvault/schema';
import { useMemo } from 'react';
import { useSystem } from './SystemProvider';
import { AddButton, Block, DeleteButton, Empty, Field, PageHead, uid } from './ui';

const KIND_LABEL: Record<PairKind, string> = { text: 'Text', 'large-text': 'Large text', 'non-text': 'Border, icon or focus' };
const DEF_LABEL = { protanopia: 'Protanopia', deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia' } as const;

export function AccessibilityView() {
  const { content, update } = useSystem();
  const report = useMemo(() => a11yReport(content), [content]);
  const colors = content.tokens.colors;
  const pairs = content.tokens.pairs;
  const status = colors.filter(isStatusColor);

  const suggestPairs = () => update((d) => {
    const cs = d.tokens.colors;
    const texts = cs.filter((c) => /^(text|text-muted|brand|accent|on-brand|success|warning|error|info)$/.test(c.role));
    const grounds = cs.filter((c) => /^(background|surface)$/.test(c.role));
    const have = new Set(d.tokens.pairs.map((p) => `${p.fg}/${p.bg}`));
    for (const f of texts) for (const b of grounds) {
      if (f.role === 'on-brand' || have.has(`${f.id}/${b.id}`)) continue;
      d.tokens.pairs.push({ id: uid(), fg: f.id, bg: b.id, kind: 'text' });
    }
    const brand = cs.find((c) => c.role === 'brand'), onBrand = cs.find((c) => c.role === 'on-brand');
    if (brand && onBrand && !have.has(`${onBrand.id}/${brand.id}`)) d.tokens.pairs.push({ id: uid(), fg: onBrand.id, bg: brand.id, kind: 'text' });
    for (const b of cs.filter((c) => c.role === 'border')) for (const g of grounds)
      if (!have.has(`${b.id}/${g.id}`)) d.tokens.pairs.push({ id: uid(), fg: b.id, bg: g.id, kind: 'non-text' });
  });

  return (
    <>
      <PageHead title="Accessibility" intro="Declare which colors sit on which, and every pair is checked against WCAG 2.2 and APCA in both themes. Status colors are checked for color blindness." />

      <Block id="contrast" title="Contrast" intro={`WCAG 2.2 needs ${WCAG_MIN.text}:1 for text and ${WCAG_MIN['non-text']}:1 for large text, borders, icons and focus rings. APCA Lc is shown for reference.`}>
        <ul className="rows" id="pair-rows">
          {pairs.length === 0 && <Empty title="No pairs yet">Pick a foreground and the background it sits on, or let the vault suggest pairs from your color roles.</Empty>}
          {pairs.map((p) => {
            const r = report.pairs.find((x) => x.id === p.id)!;
            return (
              <li key={p.id} className="row !grid-cols-1 gap-3">
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 md:grid-cols-[1fr_1fr_200px_auto]">
                  <Field label="Foreground">
                    <select className="select mono" value={p.fg} onChange={(e) => update((d) => { d.tokens.pairs.find((x) => x.id === p.id)!.fg = e.target.value; })}>
                      {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Background">
                    <select className="select mono" value={p.bg} onChange={(e) => update((d) => { d.tokens.pairs.find((x) => x.id === p.id)!.bg = e.target.value; })}>
                      {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Used for" className="max-md:order-last max-md:col-span-3">
                    <select className="select" value={p.kind} onChange={(e) => update((d) => { d.tokens.pairs.find((x) => x.id === p.id)!.kind = e.target.value as PairKind; })}>
                      {(Object.keys(KIND_LABEL) as PairKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                  </Field>
                  <DeleteButton label={`${r.fg} on ${r.bg}`} onClick={() => update((d) => { d.tokens.pairs = d.tokens.pairs.filter((x) => x.id !== p.id); })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {THEMES.map((th) => {
                    const x = r.themes[th];
                    return (
                      <div key={th} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-line p-2">
                        <span className="flex h-9 w-12 flex-none items-center justify-center rounded-[4px] border border-line text-base font-semibold"
                          style={{ color: x.fgHex ?? undefined, background: x.bgHex ?? undefined }} aria-hidden>{p.kind === 'non-text' ? '◯' : 'Aa'}</span>
                        <span className="theme-tag">{th}</span>
                        <span className="mono text-[13px]">{x.ratio ? `${x.ratio.toFixed(2)}:1` : '—'}</span>
                        <span className="mono text-[13px] text-graphite-muted" title={`APCA needs Lc ${APCA_MIN[p.kind]} for this use`}>Lc {x.lc != null ? Math.abs(x.lc).toFixed(0) : '—'}</span>
                        <span className="mark" data-ok={String(x.wcagPass)}>{x.wcagPass ? 'Pass' : 'Fail'}</span>
                        {x.suggestion && (
                          <button type="button" className="btn ml-auto h-8 px-2.5 text-[13px]"
                            onClick={() => update((d) => { const c = d.tokens.colors.find((c) => c.id === p.fg); if (c) c[th] = x.suggestion!; })}>
                            <span className="chip" style={{ background: x.suggestion }} aria-hidden />Use {x.suggestion}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="actions">
          <AddButton disabled={colors.length === 0} onClick={() => update((d) => { d.tokens.pairs.push({ id: uid(), fg: colors[0]!.id, bg: (colors[1] ?? colors[0])!.id, kind: 'text' }); })}>Add pair</AddButton>
          <button type="button" className="btn mt-3" onClick={suggestPairs} disabled={!colors.some((c) => c.role)}>Suggest pairs from roles</button>
        </div>
        {report.pairs.some((p) => !p.pass) && <p className="note mt-3">A suggested color keeps the hue and changes lightness until the pair passes. Using it changes that color everywhere it appears.</p>}
      </Block>

      <Block id="color-blindness" title="Color blindness" intro="Status colors (success, warning, error, info) as people with each type of color blindness see them. Pairs told apart by hue alone are flagged.">
        {status.length < 2 ? (
          <p className="empty">Give at least two colors a status role (success, warning, error or info) to check them.</p>
        ) : THEMES.map((th) => (
          <div key={th} className="mb-6">
            <h3 className="label mb-2">{th} theme</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">Vision</th>{status.map((c) => <th key={c.id} scope="col">{c.name}</th>)}</tr></thead>
                <tbody>
                  <tr><th scope="row" className="font-normal">Typical</th>{status.map((c) => <td key={c.id}><span className="chip !h-6 !w-10" style={{ background: normalizeHex(c[th]) ?? undefined }} /></td>)}</tr>
                  {DEFICIENCIES.map((d) => (
                    <tr key={d}><th scope="row" className="font-normal">{DEF_LABEL[d]}</th>
                      {status.map((c) => <td key={c.id}><span className="chip !h-6 !w-10" style={{ background: simulate(c[th], d) ?? undefined }} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.hueOnly[th].length === 0 ? (
              <p className="mt-2 flex gap-2"><span className="mark" data-ok="true">Pass</span><span className="note">Every status pair differs in lightness.</span></p>
            ) : (
              <ul className="mt-2 list-none p-0">
                {report.hueOnly[th].map((f, i) => (
                  <li key={i} className="flex flex-wrap gap-2 py-1"><span className="mark" data-ok="false">Flag</span>
                    <span className="text-sm"><code className="mono">{f.a}</code> and <code className="mono">{f.b}</code> look alike with {DEF_LABEL[f.deficiency].toLowerCase()}. Make one lighter or darker, and pair color with an icon or word.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Block>

      <Block id="type-size" title="Type and size" intro="Text at least 12px; running text with a line height of at least 1.2×.">
        <Findings items={report.type} ok={content.tokens.type.length ? 'Every type style is readable.' : 'Add type styles to check them.'} okState={content.tokens.type.length > 0} />
      </Block>

      <Block id="motion" title="Motion" intro="Every duration needs a reduced-motion value, used when someone asks their device for less motion.">
        <Findings items={report.motion} ok={content.tokens.durations.length ? 'Every duration has a reduced-motion value.' : 'Add durations to check them.'} okState={content.tokens.durations.length > 0} />
      </Block>

      {report.invalidColors.length > 0 && (
        <Block title="Unchecked colors" intro="These values aren’t hex colors, so contrast can’t be measured.">
          <p className="mono text-sm">{report.invalidColors.join(', ')}</p>
        </Block>
      )}
    </>
  );
}

function Findings({ items, ok, okState }: { items: { id: string; name: string; problem: string }[]; ok: string; okState: boolean }) {
  if (!items.length) return <p className="flex gap-2"><span className="mark" data-ok={okState ? 'true' : 'manual'}>{okState ? 'Pass' : 'Empty'}</span><span className="note">{ok}</span></p>;
  return (
    <ul className="rows">
      {items.map((f, i) => (
        <li key={i} className="row !grid-cols-[56px_minmax(0,1fr)]"><span className="mark" data-ok="false">Fix</span><span><code className="mono">{f.name}</code>: {f.problem}</span></li>
      ))}
    </ul>
  );
}
