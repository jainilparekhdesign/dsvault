/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dsvault/schema', '@dsvault/converters', '@dsvault/a11y'],
  // Plugins (Figma, Framer) call the API from sandboxed iframes with a bearer
  // token. Cookies are never sent cross-origin with "*", so sessions stay safe.
  async headers() {
    return [
      {
        source: '/api/:path((?!auth|tokens).*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'authorization, content-type, mcp-session-id, mcp-protocol-version' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
