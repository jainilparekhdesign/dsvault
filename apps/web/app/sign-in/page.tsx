import { signIn } from '@/auth';

export default function SignInPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="font-mono text-xs uppercase tracking-wider text-graphite-muted">Design System Vault</p>
      <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
      {searchParams.error && (
        <p role="alert" className="mt-4 border border-line-strong px-3 py-2 text-sm text-rust">
          That account doesn’t have access.
        </p>
      )}
      <form
        className="mt-6"
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-sm bg-forest px-4 py-2.5 text-sm font-medium text-on-forest transition-opacity duration-state ease-out hover:opacity-90"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
