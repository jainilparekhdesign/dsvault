'use client';

import { evaluateChecklist } from '@dsvault/a11y';
import { CHECKLIST } from '@dsvault/schema';
import { useMemo, useState } from 'react';
import { useSystem } from './SystemProvider';
import { Block, PageHead } from './ui';

type Filter = 'all' | 'open' | 'done';

export function ChecklistView() {
  const { content, update } = useSystem();
  const result = useMemo(() => evaluateChecklist(content), [content]);
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <>
      <PageHead title="Checklist" intro="The design system checklist, from design language to maintenance. Items marked Auto are verified from your tokens and brand book; tick the rest yourself." />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <p className="m-0 flex items-baseline gap-3">
          <span className="mono text-[40px] leading-[44px]">{result.score}%</span>
          <span className="muted">{result.done} of {result.total} items done</span>
        </p>
        <div className="tabs" role="tablist" aria-label="Show">
          {(['all', 'open', 'done'] as Filter[]).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Done'}</button>
          ))}
        </div>
      </div>
      {CHECKLIST.map((section) => {
        const items = section.topics.flatMap((t) => t.items);
        const done = items.filter((i) => result.items[i.key]!.done).length;
        return (
          <div key={section.key}>
            <h2 className="mt-14 flex flex-wrap items-baseline justify-between gap-2 text-xl font-semibold leading-7">
              {section.title}<span className="mono text-sm font-normal text-graphite-muted">{done}/{items.length}</span>
            </h2>
            {section.topics.map((topic) => {
              const shown = topic.items.filter((i) => filter === 'all' || (filter === 'done') === result.items[i.key]!.done);
              if (!shown.length) return null;
              const tDone = topic.items.filter((i) => result.items[i.key]!.done).length;
              return (
                <Block key={topic.key} title={topic.title} intro={`${tDone} of ${topic.items.length} done`}>
                  <ul className="rows">
                    {shown.map((item) => {
                      const st = result.items[item.key]!;
                      const id = `chk-${item.key}`;
                      return (
                        <li key={item.key} className="!grid-cols-[28px_minmax(0,1fr)_auto] row !items-start">
                          {st.auto ? (
                            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-[4px] border border-line-strong text-xs" aria-hidden>{st.done ? '✓' : ''}</span>
                          ) : (
                            <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--forest)]" checked={st.done}
                              onChange={(e) => update((d) => { if (e.target.checked) d.checklist[item.key] = true; else delete d.checklist[item.key]; })} />
                          )}
                          <div className="min-w-0">
                            {st.auto ? <span className="font-medium">{item.title}</span> : <label htmlFor={id} className="cursor-pointer font-medium">{item.title}</label>}
                            <p className="note m-0">{item.detail}{st.auto && st.reason ? <> <span className="text-graphite">{st.reason}</span></> : null}</p>
                          </div>
                          <span className="mark" data-ok={st.auto ? String(st.done) : 'manual'}>{st.auto ? (st.done ? 'Auto · Pass' : 'Auto · Open') : st.done ? 'Done' : 'Manual'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Block>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
