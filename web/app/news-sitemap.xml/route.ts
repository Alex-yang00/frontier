import { NextResponse } from 'next/server';
import { formatPeriodTitle, periodPublishedDate } from '@/lib/period-utils';
import { absoluteArticleUrl, techStoryId } from '@/lib/article-routes';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api';
const SITE_URL = 'https://www.forager.example';
// Only the indexed article languages (middleware noindexes the rest —
// a news sitemap must not advertise URLs that carry noindex).
const SUPPORTED_LANGS = ['de', 'en', 'zh'] as const;

const LANG_NAMES: Record<string, string> = {
  de: 'de', en: 'en', zh: 'zh', fr: 'fr', es: 'es', pt: 'pt', ja: 'ja', ko: 'ko',
};

interface TechPost {
  id: number;
  content: string;
  category: string;
  timestamp: string;
  isVideo?: boolean;
}

interface Week {
  id: string;
  days?: { id: string }[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getLocalizedPosts(data: any, lang: string): TechPost[] {
  return data?.[lang] || data?.tech?.[lang] || data?.de || data?.tech?.de || [];
}

function isWithin72Hours(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs <= 72 * 60 * 60 * 1000;
}

function periodIdToDate(id: string): string {
  return periodPublishedDate(id).toISOString();
}

function toNewsDate(value: string | undefined, fallback: string): string {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getRecentPeriodIds(weeks: Week[]): string[] {
  const recentPeriodIds: string[] = [];
  for (const week of weeks.slice(0, 4)) {
    if (week.days) {
      for (const day of [...week.days].reverse()) {
        const dateStr = periodIdToDate(day.id);
        if (isWithin72Hours(dateStr)) {
          recentPeriodIds.push(day.id);
        }
      }
    }
    const weekDateStr = periodIdToDate(week.id);
    if (isWithin72Hours(weekDateStr)) {
      recentPeriodIds.push(week.id);
    }
  }

  if (recentPeriodIds.length === 0 && weeks.length > 0) {
    const latest = weeks[0];
    if (latest.days && latest.days.length > 0) {
      recentPeriodIds.push(latest.days[latest.days.length - 1].id);
    } else {
      recentPeriodIds.push(latest.id);
    }
  }

  return Array.from(new Set(recentPeriodIds));
}

function newsTitle(periodId: string, lang: string): string {
  const periodLabel = formatPeriodTitle(periodId, lang);
  const labels: Record<string, string> = {
    de: `Forager KI-News ${periodLabel}`,
    en: `Forager AI News ${periodLabel}`,
    zh: `Forager AI新闻 ${periodLabel}`,
    fr: `Forager Actualités IA ${periodLabel}`,
    es: `Forager Noticias IA ${periodLabel}`,
    pt: `Forager Notícias IA ${periodLabel}`,
    ja: `Forager AIニュース ${periodLabel}`,
    ko: `Forager AI 뉴스 ${periodLabel}`,
  };
  return labels[lang] || labels.en;
}

function articleTitle(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (clean.length <= 110) return clean;
  const cut = clean.lastIndexOf(' ', 110);
  return `${clean.slice(0, cut > 70 ? cut : 110).replace(/[ .,-;:]+$/, '')}...`;
}

export async function GET() {
  // Fetch weeks
  let weeks: Week[] = [];
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      weeks = data.weeks || [];
    }
  } catch {}

  const recentPeriodIds = getRecentPeriodIds(weeks);

  const entries: string[] = [];
  for (const periodId of recentPeriodIds) {
    if (entries.length >= 1000) break;

    try {
      const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const fallbackDate = periodIdToDate(periodId);

      for (const lang of SUPPORTED_LANGS) {
        const posts = getLocalizedPosts(data, lang).filter((post) => !post.isVideo);
        if (posts.length === 0 || entries.length >= 1000) continue;

        for (const post of posts) {
          if (entries.length >= 1000) break;
          entries.push(`  <url>
    <loc>${absoluteArticleUrl(SITE_URL, lang, periodId, techStoryId(post))}</loc>
    <news:news>
      <news:publication>
        <news:name>Forager</news:name>
        <news:language>${LANG_NAMES[lang]}</news:language>
      </news:publication>
      <news:publication_date>${toNewsDate(post.timestamp, fallbackDate)}</news:publication_date>
      <news:title>${escapeXml(articleTitle(post.content) || newsTitle(periodId, lang))}</news:title>
    </news:news>
  </url>`);
        }
      }
    } catch {}
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
