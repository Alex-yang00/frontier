import { NextRequest } from 'next/server';
import { availablePeriodIds, readPeriodData } from '@/lib/server/frontier-data';
import { SITE_URL } from '@/lib/site';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function periodToDate(periodId: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodId)) {
    return new Date(periodId + 'T08:00:00Z').toISOString();
  }
  // Weekly: YYYY-kwWW → approximate date
  const match = periodId.match(/^(\d{4})-kw(\d{2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday.toISOString();
  }
  return new Date().toISOString();
}

function periodLabel(periodId: string, lang: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodId)) {
    const [y, m, d] = periodId.split('-').map(Number);
    if (lang === 'zh') return `${y}年${m}月${d}日`;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  }
  const weekNum = periodId.replace(/^\d{4}-kw/, '');
  return lang === 'zh' ? `第 ${weekNum} 周` : `Week ${weekNum}`;
}

interface TechPost {
  content: string;
  category: string;
  impact: string;
  source: string;
  sourceUrl?: string;
  isVideo?: boolean;
  videoId?: string;
}

interface PrimaryMarketPost {
  company: string;
  amount: string;
  round: string;
  content: string;
}

interface SecondaryMarketPost {
  ticker: string;
  price: string;
  change: string;
  content: string;
}

interface MAPost {
  acquirer: string;
  target: string;
  dealValue: string;
  content: string;
}

interface TipPost {
  content: string;
  tip: string;
  category: string;
}

function buildDigestHtml(
  lang: string,
  periodId: string,
  techData: Partial<Record<string, TechPost[]>> | null,
  investmentData: { primaryMarket?: Partial<Record<string, PrimaryMarketPost[]>>; secondaryMarket?: Partial<Record<string, SecondaryMarketPost[]>>; ma?: Partial<Record<string, MAPost[]>> } | null,
  tipsData: Partial<Record<string, TipPost[]>> | null,
): string {
  const parts: string[] = [];
  const label = periodLabel(periodId, lang);
  const weekUrl = `${SITE_URL}/${lang}/week/${periodId}`;

  // Tech
  const techPosts: TechPost[] = (techData?.[lang] || []).filter(p => !p.isVideo);
  if (techPosts.length > 0) {
    parts.push(`<h2>${lang === 'zh' ? '技术' : 'Technology'}</h2>`);
    parts.push('<ul>');
    for (const post of techPosts.slice(0, 10)) {
      const link = post.sourceUrl ? ` <a href="${escapeXml(post.sourceUrl)}">[${escapeXml(post.source)}]</a>` : '';
      parts.push(`<li><strong>${escapeXml(post.category)}</strong> (${escapeXml(post.impact)}): ${escapeXml(post.content)}${link}</li>`);
    }
    parts.push('</ul>');
  }

  // Investment - Primary
  const pm: PrimaryMarketPost[] = investmentData?.primaryMarket?.[lang] || [];
  if (pm.length > 0) {
    parts.push(`<h2>${lang === 'zh' ? '一级市场' : 'Primary Market'}</h2>`);
    parts.push('<table><tr><th>Company</th><th>Amount</th><th>Round</th></tr>');
    for (const p of pm.slice(0, 7)) {
      parts.push(`<tr><td>${escapeXml(p.company)}</td><td>${escapeXml(p.amount)}</td><td>${escapeXml(p.round)}</td></tr>`);
    }
    parts.push('</table>');
  }

  // Investment - M&A
  const ma: MAPost[] = investmentData?.ma?.[lang] || [];
  if (ma.length > 0) {
    parts.push('<h2>M&amp;A</h2>');
    parts.push('<ul>');
    for (const m of ma) {
      parts.push(`<li><strong>${escapeXml(m.acquirer)}</strong> → ${escapeXml(m.target)} (${escapeXml(m.dealValue)}): ${escapeXml(m.content)}</li>`);
    }
    parts.push('</ul>');
  }

  // Tips
  const tips: TipPost[] = tipsData?.[lang] || [];
  if (tips.length > 0) {
    parts.push(`<h2>${lang === 'zh' ? '实用技巧' : 'Tips'}</h2>`);
    parts.push('<ul>');
    for (const t of tips.slice(0, 5)) {
      parts.push(`<li><strong>${escapeXml(t.category)}</strong>: ${escapeXml(t.content)}</li>`);
    }
    parts.push('</ul>');
  }

  // CTA
  parts.push(`<p style="margin-top:24px">
    <a href="${weekUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      ${lang === 'zh' ? `阅读 ${label} 的全部内容 →` : `Read all news from ${label} →`}
    </a>
  </p>`);
  parts.push(`<p style="color:#6b7280;font-size:13px">— Frontier · <a href="${SITE_URL}">${new URL(SITE_URL).hostname}</a></p>`);

  return parts.join('\n');
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') === 'zh' ? 'zh' : 'en';

  // Fetch latest periods
  interface WeekData {
    id: string;
    days?: { id: string }[];
  }

  const periodIds = (await availablePeriodIds()).slice(0, 7);

  if (periodIds.length === 0) {
    return new Response('<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>', {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  // Fetch all data for each period in parallel
  const entries: string[] = [];

  for (const periodId of periodIds) {
    try {
      const { tech: techData, investment: investmentData, tips: tipsData } = await readPeriodData(periodId);

      const html = buildDigestHtml(lang, periodId, techData, investmentData, tipsData);
      if (!html.trim()) continue;

      const label = periodLabel(periodId, lang);
      const title = lang === 'zh' ? `AI 新闻摘要 — ${label}` : `AI News Digest — ${label}`;
      const updated = periodToDate(periodId);
      const weekUrl = `${SITE_URL}/${lang}/week/${periodId}`;

      entries.push(`  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(weekUrl)}" rel="alternate" />
    <id>tag:${new URL(SITE_URL).hostname},2026:digest-${periodId}-${lang}</id>
    <updated>${updated}</updated>
    <content type="html">${escapeXml(html)}</content>
  </entry>`);
    } catch {}
  }

  const feedTitle = lang === 'zh' ? 'Frontier — 情报摘要' : 'Frontier — Newsletter Digest';
  const now = new Date().toISOString();

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${lang === 'zh' ? 'Frontier AI 情报摘要' : 'AI intelligence digest from Frontier'}</subtitle>
  <link href="${SITE_URL}/newsletter.xml?lang=${lang}" rel="self" type="application/atom+xml" />
  <link href="${SITE_URL}" rel="alternate" type="text/html" />
  <id>tag:${new URL(SITE_URL).hostname},2026:newsletter:${lang}</id>
  <updated>${now}</updated>
  <author>
    <name>Frontier</name>
    <uri>${SITE_URL}</uri>
  </author>
${entries.join('\n')}
</feed>`;

  return new Response(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
