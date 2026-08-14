import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api';
const SITE_URL = 'https://www.forager.example';

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
    if (lang === 'de') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  }
  const weekNum = periodId.replace(/^\d{4}-kw/, '');
  return lang === 'de' ? `KW ${weekNum}` : `Week ${weekNum}`;
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
  techData: Record<string, TechPost[]> | null,
  investmentData: { primaryMarket?: Record<string, PrimaryMarketPost[]>; secondaryMarket?: Record<string, SecondaryMarketPost[]>; ma?: Record<string, MAPost[]> } | null,
  tipsData: Record<string, TipPost[]> | null,
): string {
  const parts: string[] = [];
  const label = periodLabel(periodId, lang);
  const weekUrl = `${SITE_URL}/${lang}/week/${periodId}`;

  // Tech
  const techPosts: TechPost[] = (techData?.[lang] || []).filter(p => !p.isVideo);
  if (techPosts.length > 0) {
    parts.push(`<h2>${lang === 'de' ? '🔬 Technologie' : '🔬 Technology'}</h2>`);
    parts.push('<ul>');
    for (const post of techPosts.slice(0, 10)) {
      const link = post.sourceUrl ? ` <a href="${escapeXml(post.sourceUrl)}">[${escapeXml(post.source)}]</a>` : '';
      parts.push(`<li><strong>${escapeXml(post.category)}</strong> (${escapeXml(post.impact)}): ${escapeXml(post.content)}${link}</li>`);
    }
    parts.push('</ul>');
  }

  // Videos
  const videos: TechPost[] = (techData?.[lang] || []).filter(p => p.isVideo);
  if (videos.length > 0) {
    parts.push(`<h2>${lang === 'de' ? '🎬 Videos' : '🎬 Videos'}</h2>`);
    parts.push('<ul>');
    for (const v of videos) {
      parts.push(`<li><a href="https://youtube.com/watch?v=${escapeXml(v.videoId || '')}">${escapeXml(v.content.slice(0, 120))}</a></li>`);
    }
    parts.push('</ul>');
  }

  // Investment - Primary
  const pm: PrimaryMarketPost[] = investmentData?.primaryMarket?.[lang] || [];
  if (pm.length > 0) {
    parts.push(`<h2>${lang === 'de' ? '💰 Primärmarkt' : '💰 Primary Market'}</h2>`);
    parts.push('<table><tr><th>Company</th><th>Amount</th><th>Round</th></tr>');
    for (const p of pm.slice(0, 7)) {
      parts.push(`<tr><td>${escapeXml(p.company)}</td><td>${escapeXml(p.amount)}</td><td>${escapeXml(p.round)}</td></tr>`);
    }
    parts.push('</table>');
  }

  // Investment - M&A
  const ma: MAPost[] = investmentData?.ma?.[lang] || [];
  if (ma.length > 0) {
    parts.push(`<h2>${lang === 'de' ? '🤝 M&amp;A' : '🤝 M&amp;A'}</h2>`);
    parts.push('<ul>');
    for (const m of ma) {
      parts.push(`<li><strong>${escapeXml(m.acquirer)}</strong> → ${escapeXml(m.target)} (${escapeXml(m.dealValue)}): ${escapeXml(m.content)}</li>`);
    }
    parts.push('</ul>');
  }

  // Tips
  const tips: TipPost[] = tipsData?.[lang] || [];
  if (tips.length > 0) {
    parts.push(`<h2>${lang === 'de' ? '💡 Tipps' : '💡 Tips'}</h2>`);
    parts.push('<ul>');
    for (const t of tips.slice(0, 5)) {
      parts.push(`<li><strong>${escapeXml(t.category)}</strong>: ${escapeXml(t.content)}</li>`);
    }
    parts.push('</ul>');
  }

  // CTA
  parts.push(`<p style="margin-top:24px">
    <a href="${weekUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      ${lang === 'de' ? `Alle News vom ${label} lesen →` : `Read all news from ${label} →`}
    </a>
  </p>`);
  parts.push(`<p style="color:#6b7280;font-size:13px">— Forager · <a href="${SITE_URL}">forager.example</a></p>`);

  return parts.join('\n');
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'de';

  // Fetch latest periods
  interface WeekData {
    id: string;
    days?: { id: string }[];
  }

  let periodIds: string[] = [];
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (weeksRes.ok) {
      const data = await weeksRes.json();
      const weeks: WeekData[] = data.weeks || [];
      // Collect all daily + weekly period IDs, newest first, max 7
      for (const w of weeks.slice(0, 4)) {
        if (w.days && w.days.length > 0) {
          for (const d of w.days) {
            periodIds.push(d.id);
          }
        } else {
          periodIds.push(w.id);
        }
      }
      periodIds = periodIds.slice(0, 7);
    }
  } catch {}

  if (periodIds.length === 0) {
    return new Response('<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>', {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  // Fetch all data for each period in parallel
  const entries: string[] = [];

  for (const periodId of periodIds) {
    try {
      const [techRes, investmentRes, tipsRes] = await Promise.all([
        fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/investment/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/tips/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
      ]);

      const techData = techRes?.ok ? await techRes.json() : null;
      const investmentData = investmentRes?.ok ? await investmentRes.json() : null;
      const tipsData = tipsRes?.ok ? await tipsRes.json() : null;

      const html = buildDigestHtml(lang, periodId, techData, investmentData, tipsData);
      if (!html.trim()) continue;

      const label = periodLabel(periodId, lang);
      const title = lang === 'de'
        ? `KI-News Digest — ${label}`
        : `AI News Digest — ${label}`;
      const updated = periodToDate(periodId);
      const weekUrl = `${SITE_URL}/${lang}/week/${periodId}`;

      entries.push(`  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(weekUrl)}" rel="alternate" />
    <id>tag:forager.example,2026:digest-${periodId}-${lang}</id>
    <updated>${updated}</updated>
    <content type="html">${escapeXml(html)}</content>
  </entry>`);
    } catch {}
  }

  const feedTitle = lang === 'de' ? 'Forager — Newsletter Digest' : 'Forager — Newsletter Digest';
  const now = new Date().toISOString();

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${lang === 'de' ? 'Täglicher KI-News Digest von Forager' : 'Daily AI news digest from Forager'}</subtitle>
  <link href="${SITE_URL}/newsletter.xml?lang=${lang}" rel="self" type="application/atom+xml" />
  <link href="${SITE_URL}" rel="alternate" type="text/html" />
  <id>tag:forager.example,2026:newsletter:${lang}</id>
  <updated>${now}</updated>
  <author>
    <name>Forager</name>
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
