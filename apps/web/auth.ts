import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: '/sign-in' },
  callbacks: {
    // Single user for now: only the allowed, verified Google address gets in.
    signIn({ profile }) {
      return (
        !!allowedEmail &&
        profile?.email_verified === true &&
        profile.email?.toLowerCase() === allowedEmail
      );
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
