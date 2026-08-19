import { SITE_URL, siteUrl } from '@/lib/site'

export function GET() {
  const body = `# Forager

> An English and Simplified Chinese AI intelligence stream built from public sources.

## Coverage

- Technology: model releases, research, developer tools, and product developments
- Investment: funding, acquisitions, and market movements
- Practical workflows: tutorials, prompts, and hands-on AI use

Items include source attribution, publication time, relevance, impact, and editorial tier. Classification, translation, curation, and section throughlines are AI-assisted.

## Languages

- English (en)
- Simplified Chinese (zh)

## Update Rhythm

- Fast sources: every 30 minutes
- Medium sources: every 6 hours
- Slow sources and video: once per day

Forager is a continuous stream. Feed backlogs mean a collection may include older items.

## Public Pages

- Home: ${siteUrl('/en')} and ${siteUrl('/zh')}
- Period: ${SITE_URL}/{lang}/week/{periodId}
- Article: ${SITE_URL}/{lang}/news/{periodId}/{storyId}
- Topic: ${SITE_URL}/{lang}/topic/{topic}
- Report generator: ${SITE_URL}/{lang}/tools/ai-report-generator

## Machine-Readable Surfaces

- Sitemap: ${siteUrl('/sitemap.xml')}
- News sitemap: ${siteUrl('/news-sitemap.xml')}
- Atom: ${siteUrl('/feed.xml?lang=en')} and ${siteUrl('/feed.xml?lang=zh')}
- Newsletter feed: ${siteUrl('/newsletter.xml?lang=en')}
- Markdown summary: ${siteUrl('/api/content-summary?lang=en')}

The summary endpoint accepts periodId, section, and topic filters. Forager does not offer a separate public REST API product.

## Publisher Transparency

- About: ${siteUrl('/about')}
- Editorial policy: ${siteUrl('/editorial-policy')}
- Source methodology: ${siteUrl('/source-methodology')}
- Corrections: ${siteUrl('/corrections')}
- AI disclosure: ${siteUrl('/ai-disclosure')}

Preferred citation: Forager (${new URL(SITE_URL).hostname})
`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
