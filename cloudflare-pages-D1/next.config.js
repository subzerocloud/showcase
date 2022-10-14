/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: 'http://127.0.0.1:3001/api/:path*',
    },
  ],
}

module.exports = nextConfig
