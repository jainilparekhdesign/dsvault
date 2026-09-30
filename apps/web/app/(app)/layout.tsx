import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import { Shell } from '@/components/Shell';
import { brandColor } from '@/lib/brand-color';
import { currentOwner } from '@/lib/owner';
import { listSystems } from '@/lib/systems';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const owner = await currentOwner();
  if (!owner) redirect('/sign-in');
  const systems = await listSystems(owner);
  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }
  return (
    <Shell email={owner} signOut={doSignOut} systems={systems.map((s) => ({ id: s.id, name: s.name, brand: brandColor(s.content) }))}>
      {children}
    </Shell>
  );
}
