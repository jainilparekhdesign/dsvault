import { notFound } from 'next/navigation';
import { SystemProvider } from '@/components/system/SystemProvider';
import { requireOwner } from '@/lib/owner';
import { getSystem } from '@/lib/systems';

export const dynamic = 'force-dynamic';

export default async function SystemLayout({ params, children }: { params: { id: string }; children: React.ReactNode }) {
  const system = await getSystem(await requireOwner(), params.id);
  if (!system) notFound();
  return <SystemProvider id={system.id} initial={system.content}>{children}</SystemProvider>;
}
