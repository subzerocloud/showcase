/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  webpack: (config) => {
    // fix for next bug https://github.com/vercel/next.js/issues/34501#issuecomment-1046655345
    // if (config.module.generator?.asset?.filename) {
    //   if (!config.module.generator['asset/resource']) {
    //     config.module.generator['asset/resource'] = config.module.generator.asset
    //   }
    //   delete config.module.generator.asset
    // }
    // // package wasm files as base64
    // config.module.rules.push(
    //   {
    //     test: /\.wasm$/,
    //     type: "asset/inline",
    //   }
    // )
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader'
    })
    return config
  }
}

module.exports = nextConfig
