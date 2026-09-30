import { auth, signOut } from '@/auth';

export default async function LibraryPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-12">
      <header className="flex items-center justify-between border-b border-line py-4">
        <span className="text-base font-semibold">Design System Vault</span>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/sign-in' });
          }}
        >
          <span className="mr-4 font-mono text-xs text-graphite-muted">{session?.user?.email}</span>
          <button
            type="submit"
            className="rounded-sm border border-line-strong px-3 py-1.5 text-sm transition-colors duration-state ease-out hover:bg-surface"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="py-12">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="mt-2 text-graphite-muted">No systems yet. They arrive with the seed data in M9.</p>
      </main>
    </div>
  );
}
