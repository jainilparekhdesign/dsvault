export { auth as middleware } from '@/auth';

// API routes check the session or an access token themselves and answer 401,
// so plugins and the MCP server get JSON instead of a sign-in redirect.
// Public static files (like axe.min.js, loaded by cookieless sandboxed
// previews) skip the check too.
export const config = {
  matcher: ['/((?!api/|sign-in|share/|_next/static|_next/image|favicon.ico|[^/]+\\.(?:js|css|png|svg|ico|txt|woff2?)$).*)'],
};
