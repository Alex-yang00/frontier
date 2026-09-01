import { SITE_URL, siteUrl } from '@/lib/site'

const BOTS = [
  '*',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'Google-Extended',
  'CCBot',
]

export function GET() {
  const groups = BOTS.map((bot) => [
    `User-agent: ${bot}`,
    'Allow: /',
    'Disallow: /api/',
    'Allow: /api/content-summary',
    ...(bot === '*' ? [] : ['Crawl-delay: 2']),
  ].join('\n')).join('\n\n')
  const body = `${groups}\n\n# Machine-readable description\n# ${siteUrl('/llms.txt')}\n\nSitemap: ${siteUrl('/sitemap.xml')}\nSitemap: ${siteUrl('/news-sitemap.xml')}\n`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Site-Origin': SITE_URL,
    },
  })
}
