import { NextRequest } from 'next/server';
import { latestPeriodId, readPeriodData } from '@/lib/server/forager-data';
import { SITE_URL, siteUrl } from '@/lib/site';

interface TechPost {
  id: number;
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
  dealType: string;
  content: string;
}

interface TipPost {
  content: string;
  tip: string;
  category: string;
}

type SummarySection = 'all' | 'tech' | 'investment' | 'tips';

function isValidPeriodId(value: string): boolean {
  return /^\d{4}-kw\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseSection(value: string | null): SummarySection | null {
  if (!value) return 'all';
  const normalized = value.toLowerCase();
  if (normalized === 'all' || normalized === 'tech' || normalized === 'investment' || normalized === 'tips') {
    return normalized;
  }
  return null;
}

function matchTopic(fields: Array<string | undefined>, topic: string): boolean {
  if (!topic) return true;
  return fields.some((value) => (value || '').toLowerCase().includes(topic));
}

export async function GET(request: NextRequest) {
  const SUPPORTED_LANGS = ['en', 'zh'] as const;
  type Lang = typeof SUPPORTED_LANGS[number];
  const rawLang = request.nextUrl.searchParams.get('lang') || 'en';
  const lang: Lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'en';
  const requestedPeriodId = request.nextUrl.searchParams.get('periodId')?.trim() || '';
  const section = parseSection(request.nextUrl.searchParams.get('section'));
  const topic = (request.nextUrl.searchParams.get('topic') || '').trim().toLowerCase();

  if (requestedPeriodId && !isValidPeriodId(requestedPeriodId)) {
    return new Response('Invalid periodId. Use YYYY-kwWW or YYYY-MM-DD.', { status: 400 });
  }

  if (!section) {
    return new Response('Invalid section. Use all, tech, investment, or tips.', { status: 400 });
  }

  let periodId = requestedPeriodId;

  if (!periodId) {
    periodId = (await latestPeriodId()) || '';
  }

  if (!periodId) {
    return new Response('# Forager\n\nNo content available.', {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
        'X-Robots-Tag': 'noindex, follow',
      },
    });
  }

  const generatedTimestamp = new Date().toISOString();

  const { tech: techData, investment: investmentData, tips: tipsData } = await readPeriodData(periodId);

  const isDayId = /^\d{4}-\d{2}-\d{2}$/.test(periodId);
  let periodLabel: string;
  if (isDayId) {
    const [y, m, d] = periodId.split('-').map(Number);
    const enLabel = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    periodLabel = lang === 'zh' ? `${y}年${m}月${d}日` : enLabel;
  } else {
    const weekLabel = periodId.replace(/^\d{4}-kw/, 'KW ');
    periodLabel = lang === 'zh' ? `第 ${weekLabel.replace('KW ', '')} 周` : `Week ${weekLabel.replace('KW ', '')}`;
  }

  const title = lang === 'zh' ? `Forager - AI 新闻 ${periodLabel}` : `Forager - AI News ${periodLabel}`;

  // --- Pre-compute all filtered data for statistics and content ---

  const techPosts: TechPost[] = techData?.[lang]
    ? (techData[lang] || []).filter((post: TechPost) =>
        matchTopic([post.content, post.category, post.source], topic)
      )
    : [];
  const techArticles = techPosts.filter((p) => !p.isVideo);
  const techCategories = new Set(techArticles.map((p) => p.category).filter(Boolean));

  const pmPosts: PrimaryMarketPost[] = (investmentData?.primaryMarket?.[lang] || []).filter((post: PrimaryMarketPost) =>
    matchTopic([post.company, post.round, post.content], topic)
  );
  const smPosts: SecondaryMarketPost[] = (investmentData?.secondaryMarket?.[lang] || []).filter((post: SecondaryMarketPost) =>
    matchTopic([post.ticker, post.content], topic)
  );
  const maPosts: MAPost[] = (investmentData?.ma?.[lang] || []).filter((post: MAPost) =>
    matchTopic([post.acquirer, post.target, post.dealType, post.content], topic)
  );

  const tipsPosts: TipPost[] = (tipsData?.[lang] || []).filter((tip: TipPost) =>
    matchTopic([tip.content, tip.category, tip.tip], topic)
  );

  // --- Build funding summary ---
  let fundingSummary = `${pmPosts.length} rounds`;
  if (pmPosts.length > 0) {
    const amounts = pmPosts
      .map((p) => p.amount)
      .filter((a) => a && a !== '-' && a !== 'N/A' && a !== 'n/a');
    if (amounts.length > 0) {
      fundingSummary += ` (${amounts.join(', ')})`;
    }
  }

  // --- Structured metadata header (YAML frontmatter) ---
  let md = `---\ntitle: "Forager - AI News ${periodLabel}"\nlanguage: ${lang}\nperiod: ${periodId}\ngenerated: ${generatedTimestamp}\nsource: ${SITE_URL}\nlicense: CC BY 4.0\n---\n\n`;

  md += `# ${title}\n\n`;

  // --- Summary Statistics ---
  if (section === 'all') {
    md += `## Summary Statistics\n`;
    md += `- **Tech articles**: ${techArticles.length} posts covering ${techCategories.size} categories\n`;
    md += `- **Funding rounds**: ${fundingSummary}\n`;
    md += `- **Market updates**: ${smPosts.length} as-reported items\n`;
    md += `- **M&A deals**: ${maPosts.length} deals\n`;
    md += `- **Tips**: ${tipsPosts.length} practical tips\n`;
    md += `- **Period**: ${periodId}\n`;
    md += `- **Last updated**: ${generatedTimestamp}\n`;
    md += '\n';
  }

  // --- Tech section ---
  if ((section === 'all' || section === 'tech') && techData?.[lang]) {
    if (techArticles.length > 0) {
      md += lang === 'zh' ? `## 技术\n\n` : `## Technology\n\n`;
      for (const post of techArticles) {
        md += `### ${post.category} (${post.impact})\n`;
        if (post.sourceUrl) {
          md += `${post.content} ([Source: ${post.source}](${post.sourceUrl}))\n`;
        } else {
          md += `${post.content}\n`;
        }
        md += '\n';
      }
    }

  }

  // --- Investment section ---
  if (section === 'all' || section === 'investment') {
    md += `## Investment\n\n`;

    if (pmPosts.length > 0) {
      md += `### Primary Market\n\n`;
      md += `| Company | Amount | Round |\n|---------|--------|-------|\n`;
      for (const p of pmPosts) {
        md += `| ${p.company} | ${p.amount} | ${p.round} |\n`;
      }
      md += '\n';
    }

    if (smPosts.length > 0) {
      md += `### Secondary Market\n\n`;
      const hasQuotes = smPosts.some((s) => s.price && s.price !== 'N/A');
      if (hasQuotes) {
        md += `| Ticker | Price | Change |\n|--------|-------|--------|\n`;
        for (const s of smPosts) {
          md += `| ${s.ticker} | ${s.price} | ${s.change} |\n`;
        }
      } else {
        for (const s of smPosts) {
          md += `- **${s.ticker}**: ${s.content}\n`;
        }
      }
      md += '\n';
    }

    if (maPosts.length > 0) {
      md += `### M&A\n\n`;
      md += `| Acquirer | Target | Value | Type |\n|----------|--------|-------|------|\n`;
      for (const m of maPosts) {
        md += `| ${m.acquirer} | ${m.target} | ${m.dealValue} | ${m.dealType} |\n`;
      }
      md += '\n';
    }
  }

  // --- Tips section ---
  if (section === 'all' || section === 'tips') {
    if (tipsPosts.length > 0) {
      md += `## Tips\n\n`;
      for (const t of tipsPosts) {
        md += `### ${t.category}\n`;
        md += `${t.content}\n\n`;
        if (t.tip) {
          md += '```\n' + t.tip + '\n```\n';
        }
        md += '\n';
      }
    }
  }

  // --- Enhanced footer ---
  const permalinkParams = new URLSearchParams({ lang, periodId });
  if (section !== 'all') permalinkParams.set('section', section);
  if (topic) permalinkParams.set('topic', topic);

  md += `---\n\n`;
  md += `## About Forager\n`;
  md += `Forager is an English and Chinese AI intelligence stream built from public RSS feeds, Hacker News, GitHub, arXiv, and Reddit communities. Classification and editorial throughlines are AI-assisted.\n\n`;
  md += `Source: [Forager](${SITE_URL}) | [Data notes](${siteUrl('/llms.txt')})\n\n`;
  md += `Canonical URL: ${siteUrl('/api/content-summary')}?${permalinkParams.toString()}\n\n`;
  md += `*Citation: Forager (${new URL(SITE_URL).hostname}), ${periodId}*\n`;

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
