/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader'
    })
    return config
  },
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: 'http://127.0.0.1:8000/api/:path*',
    },
  ],
}

module.exports = nextConfig
