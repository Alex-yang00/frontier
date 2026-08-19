import { NextRequest } from 'next/server';
import { absoluteArticleUrl, techStoryId } from '@/lib/article-routes';
import { availablePeriodIds, readPeriodData } from '@/lib/server/frontier-data';
import { SITE_URL } from '@/lib/site';

interface TechPost {
  id: number;
  content: string;
  category: string;
  impact: string;
  timestamp: string;
  source: string;
  sourceUrl?: string;
  isVideo?: boolean;
  videoId?: string;
}

interface Week {
  id: string;
  days?: { id: string }[];
}

interface FeedPost extends TechPost {
  periodId: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toAtomDate(value: string | undefined, fallback: string): string {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getRecentPeriodIds(weeks: Week[], limit = 14): string[] {
  const ids: string[] = [];
  for (const week of weeks) {
    const days = [...(week.days || [])].reverse().map((day) => day.id);
    ids.push(...days, week.id);
  }
  return Array.from(new Set(ids)).slice(0, limit);
}

function getLocalizedPosts(data: any, lang: string): TechPost[] {
  return data?.[lang] || data?.tech?.[lang] || data?.en || data?.tech?.en || [];
}

export async function GET(request: NextRequest) {
  const SUPPORTED_LANGS = ['en', 'zh'] as const;
  type Lang = typeof SUPPORTED_LANGS[number];
  const rawLang = request.nextUrl.searchParams.get('lang') || 'en';
  const lang: Lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'en';

  const weekIds = (await availablePeriodIds()).slice(0, 14);

  if (weekIds.length === 0) {
    return new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>', {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  const allPosts: FeedPost[] = [];
  for (const periodId of weekIds) {
    const { tech } = await readPeriodData(periodId);
    const posts = getLocalizedPosts(tech, lang);
    allPosts.push(...posts.map((post) => ({ ...post, periodId })));
  }

  const feedTitle = ({
    en: 'Frontier – AI Intelligence Stream',
    zh: 'Frontier – AI 情报流',
  } as Record<string, string>)[lang] || 'Frontier – AI Intelligence Stream';
  const feedSubtitle = ({
    en: 'Curated AI news: Technology, Investment, and Tips',
    zh: '精选AI新闻：技术、投资与实用技巧',
  } as Record<string, string>)[lang] || 'Curated AI news: Technology, Investment, and Tips';

  const now = new Date().toISOString();

  const entries = allPosts
    .filter(post => !post.isVideo)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, 50)
    .map(post => {
      const title = post.content.length > 120
        ? post.content.slice(0, 117) + '...'
        : post.content;
      const storyId = techStoryId(post);
      const postUrl = absoluteArticleUrl(SITE_URL, lang, post.periodId, storyId);
      const updated = toAtomDate(post.timestamp, now);

      return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(postUrl)}" rel="alternate" />
    <id>tag:${new URL(SITE_URL).hostname},2026:${lang}:${post.periodId}-${storyId}</id>
    <updated>${updated}</updated>
    <summary type="text">${escapeXml(post.content)}</summary>
    <category term="${escapeXml(post.category)}" />
    <source>
      <title>${escapeXml(post.source)}</title>
      ${post.sourceUrl ? `<link href="${escapeXml(post.sourceUrl)}" />` : ''}
    </source>
  </entry>`;
    })
    .join('\n');

  const feedUpdated = allPosts.length > 0
    ? toAtomDate([...allPosts].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))[0]?.timestamp, now)
    : now;

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${escapeXml(feedSubtitle)}</subtitle>
  <link href="${SITE_URL}/feed.xml?lang=${lang}" rel="self" type="application/atom+xml" />
  <link href="${SITE_URL}" rel="alternate" type="text/html" />
  <id>tag:${new URL(SITE_URL).hostname},2026:feed:${lang}</id>
  <updated>${feedUpdated}</updated>
  <author>
    <name>Frontier</name>
    <uri>${SITE_URL}</uri>
  </author>
  <generator>Frontier</generator>
${entries}
</feed>`;

  return new Response(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
