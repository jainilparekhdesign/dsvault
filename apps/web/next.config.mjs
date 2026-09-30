/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dsvault/schema', '@dsvault/converters', '@dsvault/a11y'],
};

export default nextConfig;
