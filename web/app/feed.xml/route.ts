import { NextRequest } from 'next/server';
import { absoluteArticleUrl, techStoryId } from '@/lib/article-routes';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api';
const SITE_URL = 'https://www.forager.example';

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
  return data?.[lang] || data?.tech?.[lang] || data?.de || data?.tech?.de || [];
}

export async function GET(request: NextRequest) {
  const SUPPORTED_LANGS = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const;
  type Lang = typeof SUPPORTED_LANGS[number];
  const rawLang = request.nextUrl.searchParams.get('lang') || 'de';
  const lang: Lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'de';

  let weekIds: string[] = [];
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (weeksRes.ok) {
      const data = await weeksRes.json();
      weekIds = getRecentPeriodIds(data.weeks || []);
    }
  } catch {}

  if (weekIds.length === 0) {
    return new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>', {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  const allPosts: FeedPost[] = [];
  for (const periodId of weekIds) {
    try {
      const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const posts = getLocalizedPosts(data, lang);
        allPosts.push(...posts.map((post) => ({ ...post, periodId })));
      }
    } catch {}
  }

  const feedTitle = ({
    de: 'Forager – Tägliche KI-News',
    en: 'Forager – Daily AI News',
    zh: 'Forager – 每日AI新闻',
    fr: 'Forager – Actualités IA quotidiennes',
    es: 'Forager – Noticias diarias de IA',
    pt: 'Forager – Notícias diárias de IA',
    ja: 'Forager – 毎日のAIニュース',
    ko: 'Forager – 매일 AI 뉴스',
  } as Record<string, string>)[lang] || 'Forager – Daily AI News';
  const feedSubtitle = ({
    de: 'Kuratierte KI-Nachrichten: Technologie, Investment und Tipps',
    en: 'Curated AI news: Technology, Investment, and Tips',
    zh: '精选AI新闻：技术、投资与实用技巧',
    fr: "Actualités IA sélectionnées : technologie, investissement et astuces",
    es: 'Noticias de IA seleccionadas: tecnología, inversión y consejos',
    pt: 'Notícias de IA selecionadas: tecnologia, investimento e dicas',
    ja: '厳選AIニュース：テクノロジー、投資、実践ヒント',
    ko: '엄선된 AI 뉴스: 기술, 투자, 실용 팁',
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
    <id>tag:forager.example,2026:${lang}:${post.periodId}-${storyId}</id>
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
  <id>tag:forager.example,2026:feed:${lang}</id>
  <updated>${feedUpdated}</updated>
  <author>
    <name>Forager</name>
    <uri>${SITE_URL}</uri>
  </author>
  <generator>Forager</generator>
${entries}
</feed>`;

  return new Response(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
