/** @type {import('next').NextConfig} */
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const isDev = process.env.NODE_ENV !== 'production'

if (isDev) initOpenNextCloudflareForDev()

// `upgrade-insecure-requests` must stay out of dev: the dev server speaks plain
// HTTP, so when the site is opened over a LAN IP the browser rewrites every
// chunk request to https:// and each one dies with ERR_SSL_PROTOCOL_ERROR,
// leaving the page as un-hydrated SSR markup. localhost is exempt from the
// upgrade, which is why this only breaks when testing from another device.
// Turbopack's HMR runtime needs 'unsafe-eval' and a ws: connection in dev.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com",
  "font-src 'self' data:",
  `connect-src 'self' https://raw.githubusercontent.com${isDev ? ' ws: wss:' : ''}`,
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const nextConfig = {
  agentRules: false,
  // Next 16 blocks dev chunks when the browser reaches this machine through a
  // loopback alias, LAN address, or Tailscale address. The HTML still renders,
  // but the client bundle gets a 403 and every interactive control appears
  // dead. This setting affects development only.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.50.144',
    '100.100.54.110',
  ],
  // Keep metadata in the initial <head> for crawlers and audit tools instead of
  // streaming it after page content.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/react-server-dom-webpack/client.edge.js',
      './node_modules/react-server-dom-webpack/server.edge.js',
      './node_modules/react-server-dom-webpack/static.edge.js',
    ],
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
          { key: 'Content-Security-Policy', value: csp },
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
