/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/forager-ui.css',
        headers: [{ key: 'Content-Type', value: 'text/css; charset=utf-8' }, { key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
  // Keep metadata in the initial <head> for crawlers and audit tools instead of
  // streaming it after page content.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path((?!content-summary).*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com; font-src 'self' data:; connect-src 'self' https://raw.githubusercontent.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
        ],
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'header', key: 'next-router-prefetch' }],
          missing: [{ type: 'header', key: 'rsc' }],
          destination: '/api/prefetch-noop',
        },
      ],
    }
  },
}

export default nextConfig
