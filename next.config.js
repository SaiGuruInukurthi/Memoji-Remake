/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable WebAssembly support for MediaPipe
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    return config
  },

  // CORS headers for MediaPipe WASM loading
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
