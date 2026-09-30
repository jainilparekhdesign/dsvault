import { evaluateChecklist, normalizeHex } from '@dsvault/a11y';
import Link from 'next/link';
import { LibraryActions } from '@/components/LibraryActions';
import { requireOwner } from '@/lib/owner';
import { listSystems } from '@/lib/systems';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function LibraryPage() {
  const systems = await listSystems(await requireOwner());
  return (
    <>
      <span className="label">Library</span>
      <h1 className="page-title mt-1.5">Your design systems</h1>
      <ul className="mt-7 list-none border-t border-line p-0">
        {systems.length === 0 && (
          <li className="empty mt-4"><strong>No systems yet</strong>Start one from scratch, or import a W3C tokens, Tokens Studio, Claude Design, CSS or Tailwind file.</li>
        )}
        {systems.map((s) => {
          const t = s.content.tokens;
          const score = evaluateChecklist(s.content);
          return (
            <li key={s.id} className="border-b border-line">
              <Link href={`/systems/${s.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-4 text-graphite no-underline">
                <span className="min-w-0 break-words text-xl font-semibold leading-7 transition-colors duration-state ease-out group-hover:text-forest">{s.name || 'Untitled system'}</span>
                {t.colors.length > 0 ? (
                  <span className="strip" aria-hidden>{t.colors.slice(0, 10).map((c) => <span key={c.id} style={{ background: normalizeHex(c.light) ?? c.light }} />)}</span>
                ) : <span />}
                <span className="mono col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-5 text-graphite-muted">
                  <span>{t.colors.length} colors</span>
                  <span>{t.type.length} type styles</span>
                  <span>{t.spacing.length} spacing</span>
                  <span className="text-graphite">Checklist {score.score}%</span>
                  <span>Edited {dateFmt.format(s.updatedAt)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <LibraryActions />
    </>
  );
}
