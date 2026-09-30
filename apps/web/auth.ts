import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Accounts: people on the allowlist (ALLOWED_EMAILS, comma separated, or the
// older ALLOWED_EMAIL), plus anyone a system has been shared with.
const allowlist = new Set(
  [process.env.ALLOWED_EMAILS, process.env.ALLOWED_EMAIL].filter(Boolean).join(',').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: '/sign-in' },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified !== true) return false;
      if (allowlist.has(email)) return true;
      // Loaded here so the middleware bundle never pulls in the database.
      const { hasInvite } = await import('@/lib/invites');
      return hasInvite(email);
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
