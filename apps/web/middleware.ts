export { auth as middleware } from '@/auth';

// API routes check the session or an access token themselves and answer 401,
// so plugins and the MCP server get JSON instead of a sign-in redirect.
export const config = {
  matcher: ['/((?!api/|sign-in|share/|_next/static|_next/image|favicon.ico).*)'],
};
