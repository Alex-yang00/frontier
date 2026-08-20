import type { Metadata } from 'next'
import EditorialHome from '@/components/editorial-home'
import type { AppLanguage } from '@/lib/i18n'
import { toTopicSlug } from '@/lib/topic-utils'
import { trimForClient, type FrontierFile, type FrontierItem } from '@/lib/frontier-adapter'
import { readCanonicalFile, readPeriodData, readWeeks } from '@/lib/server/frontier-data'
import { SITE_URL, siteUrl } from '@/lib/site'

export const revalidate = 3600

// Root / and /en render the same English homepage (EN became the default
// language 2026-08 as part of the generalization to a global audience).
// Consolidate indexing on /en by declaring it canonical here, so search
// engines don't treat both as dupes. The sitemap includes root as a
// discoverable entry, while the canonical tag points at the English homepage.
//
// The full hreflang `languages` map is restated here because Next.js merges
// metadata shallowly — setting `alternates` at page level would otherwise blow
// away the layout-level `alternates.languages` map.
export const metadata: Metadata = {
  title: { absolute: 'Frontier' },
  description: 'A personal AI information stream, collected from public sources and stored as durable JSON.',
  alternates: {
    canonical: siteUrl('/en'),
    languages: {
      'en': siteUrl('/en'),
      'zh-Hans': siteUrl('/zh'),
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    url: '/',
    title: 'Frontier',
    description: 'Curated AI news, investments and workflows, refreshed throughout the day.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Frontier – Where AI meets human insight',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontier',
    description: 'Curated AI news, investments and workflows, refreshed throughout the day.',
    images: [
      {
        url: '/og-image.jpg',
        alt: 'Frontier – Where AI meets human insight',
      },
    ],
  },
}

interface DayEntry {
  id: string
  current?: boolean
}

interface WeekEntry {
  id: string
  current?: boolean
  days?: DayEntry[]
}

interface WeeksResponse {
  weeks?: WeekEntry[]
}

interface TrendsResponse {
  trends?: Record<string, { title?: string }[]>
}

interface TechHeadline {
  title: string
  summary: string
}

async function getWeeksFromApi(): Promise<WeekEntry[]> {
  return []
}

async function getWeeks(): Promise<WeekEntry[]> {
  const apiWeeks = await getWeeksFromApi()
  if (apiWeeks.length > 0) return apiWeeks
  return (await readWeeks()).weeks || []
}

function getInitialPeriodId(weeks: WeekEntry[]): string {
  if (weeks.length === 0) return ''

  const currentWeek = weeks.find((w) => w.current) || weeks[0]
  if (currentWeek.days && currentWeek.days.length > 0) {
    const currentDay = currentWeek.days.find((d) => d.current)
    if (currentDay) return currentDay.id
    return currentWeek.days[currentWeek.days.length - 1].id
  }

  return currentWeek.id
}

function getRecentPeriodIds(weeks: WeekEntry[], limit = 10): string[] {
  const ids: string[] = []

  for (const week of weeks) {
    ids.push(week.id)
    if (week.days) {
      for (const day of week.days) ids.push(day.id)
    }
  }

  return Array.from(new Set(ids)).slice(0, limit)
}

function extractTrendTitles(data: TrendsResponse, language: AppLanguage): string[] {
  const languageTrends = data.trends?.[language] || data.trends?.en || []
  return languageTrends
    .map((item) => item.title || '')
    .map((title) => title.trim())
    .filter(Boolean)
}

async function getTrendingTopicTitles(periodId: string, language: AppLanguage): Promise<string[]> {
  if (!periodId) return []
  const { trends } = await readPeriodData(periodId)
  return extractTrendTitles((trends || {}) as TrendsResponse, language)
}

async function getLatestHeadlines(periodId: string, language: AppLanguage): Promise<TechHeadline[]> {
  if (!periodId) return []

  const { tech } = await readPeriodData(periodId)
  const posts = tech?.[language] || tech?.en || []
  return posts.slice(0, 5).map((p) => ({ title: p.author?.name || '', summary: (p.content || '').slice(0, 200) })).filter((h) => h.title)
}

// Localized sr-only headings for accessibility and SEO.
const SR_ONLY_TEXT: Record<AppLanguage, { h1: string; latestNews: string; recentUpdates: string; trendingTopics: string; description: string }> = {
  en: {
    h1: 'Frontier: AI News, Investment Signals, and Practical Tips',
    latestNews: 'Latest AI News',
    recentUpdates: 'Recent Updates',
    trendingTopics: 'Trending Topics',
    description: 'An AI intelligence stream covering technology breakthroughs, funding and market movements, and practical workflows in English and Chinese.',
  },
  zh: {
    h1: 'Frontier：AI新闻、投资信号与实用技巧',
    latestNews: '最新AI新闻',
    recentUpdates: '近期更新',
    trendingTopics: '热门话题',
    description: '中英文 AI 情报流，涵盖技术突破、融资与市场动态和实用 AI 工作流。',
  },
}

type HomePageContentProps = {
  language?: AppLanguage
}

export async function HomePageContent({ language = 'en' }: HomePageContentProps = {}) {
  const weeks = await getWeeks()
  const initialWeekId = getInitialPeriodId(weeks)
  let initialItems: FrontierItem[] = []
  let throughlines: FrontierFile['throughlines'] = {}
  let dailyThroughlines: FrontierFile['daily_throughlines'] = {}
  let curatedIds: FrontierFile['curated_ids'] = {}
  let updatedAt = ''
  try {
    const file = await readCanonicalFile()
    if (!file) throw new Error('daily data is unavailable')
    initialItems = trimForClient(file.items || [])
    throughlines = file.throughlines || {}
    dailyThroughlines = file.daily_throughlines || {}
    curatedIds = file.curated_ids || {}
    updatedAt = file.updated_at || file.date || ''
  } catch {
    initialItems = []
  }
  const [recentPeriodIds, trendingTopics, headlines] = await Promise.all([
    Promise.resolve(getRecentPeriodIds(weeks)),
    getTrendingTopicTitles(initialWeekId, language).then((t) =>
      Array.from(new Set(t)).slice(0, 8)
    ),
    getLatestHeadlines(initialWeekId, language),
  ])

  const t = SR_ONLY_TEXT[language] || SR_ONLY_TEXT.en

  return (
    <div className="min-h-screen w-full">
      <section className="sr-only" aria-label={t.h1}>
        <p>{t.h1}</p>
        <p>{t.description}</p>

        {headlines.length > 0 && (
          <section>
            <p>{t.latestNews}</p>
            <ul>
              {headlines.map((h) => (
                <li key={h.title}>
                  <strong>{h.title}</strong>: {h.summary}
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentPeriodIds.length > 0 && (
          <nav aria-label={t.recentUpdates}>
            <p>{t.recentUpdates}</p>
            {recentPeriodIds.map((id) => (
              <a
                key={id}
                href={`/${language}/week/${id}`}
                className="mr-2 inline-block"
              >
                {id}
              </a>
            ))}
          </nav>
        )}

        {trendingTopics.length > 0 && (
          <nav aria-label={t.trendingTopics}>
            <p>{t.trendingTopics}</p>
            {trendingTopics.map((topic) => (
              <a
                key={topic}
                href={`/${language}/topic/${toTopicSlug(topic)}`}
                className="mr-2 inline-block"
              >
                {topic}
              </a>
            ))}
          </nav>
        )}
      </section>

      <EditorialHome items={initialItems} curatedIds={curatedIds} throughlines={throughlines} dailyThroughlines={dailyThroughlines} updatedAt={updatedAt} />
    </div>
  )
}

export default async function HomePage() {
  return HomePageContent({ language: 'en' })
}
