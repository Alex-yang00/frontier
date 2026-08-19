import { MetadataRoute } from 'next'
import {
  articleHref,
  maStoryId,
  primaryStoryId,
  secondaryStoryId,
  techStoryId,
  tipStoryId,
} from '@/lib/article-routes'
import { toTopicSlug } from '@/lib/topic-utils'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n'
import { periodPublishedDate } from '@/lib/period-utils'
import { availablePeriodIds, readPeriodData } from '@/lib/server/forager-data'
import { SITE_URL } from '@/lib/site'

interface WeeksResponse {
  weeks: { id: string; days?: { id: string }[] }[]
}

interface TrendsResponse {
  trends?: {
    en?: { title?: string }[]
    zh?: { title?: string }[]
  }
}

interface SitemapStoryPost {
  id: number
  timestamp?: string
  isVideo?: boolean
}

interface SitemapInvestmentResponse {
  primaryMarket?: Record<string, SitemapStoryPost[]>
  secondaryMarket?: Record<string, SitemapStoryPost[]>
  ma?: Record<string, SitemapStoryPost[]>
}

interface ArticleCandidate {
  storyId: string
  timestamp?: string
}

// `periodPublishedDate` from lib/period-utils is the shared source of truth
// for period-id → Date conversion across sitemap.ts + week/page.tsx.
const lastModFromId = periodPublishedDate

async function getTopicTitlesByLanguage(periodId: string): Promise<{ en: string[]; zh: string[] }> {
  const { trends: data } = await readPeriodData(periodId)

  return {
    en: (data?.trends?.en || []).map((i) => (i.title || '').trim()).filter(Boolean),
    zh: (data?.trends?.zh || []).map((i) => (i.title || '').trim()).filter(Boolean),
  }
}

function firstLocalizedList<T>(data: Partial<Record<string, T[]>> | null | undefined): T[] {
  if (!data) return []
  for (const lang of SUPPORTED_LANGUAGES) {
    const items = data[lang]
    if (Array.isArray(items) && items.length > 0) return items
  }
  return []
}

async function getArticleCandidates(periodId: string): Promise<ArticleCandidate[]> {
  const { tech: techData, tips: tipsData, investment: investmentData } = await readPeriodData(periodId)

  const candidates: ArticleCandidate[] = []
  const seen = new Set<string>()
  const add = (storyId: string, timestamp?: string) => {
    if (seen.has(storyId)) return
    seen.add(storyId)
    candidates.push({ storyId, timestamp })
  }

  const techPosts = firstLocalizedList(techData)
  for (const post of techPosts.filter((item) => !item.isVideo).slice(0, 8)) add(techStoryId(post), post.timestamp)

  for (const post of firstLocalizedList(tipsData).slice(0, 5)) add(tipStoryId(post), post.timestamp)
  for (const post of firstLocalizedList(investmentData?.primaryMarket).slice(0, 5)) add(primaryStoryId(post), post.timestamp)
  for (const post of firstLocalizedList(investmentData?.secondaryMarket).slice(0, 3)) add(secondaryStoryId(post), post.timestamp)
  for (const post of firstLocalizedList(investmentData?.ma).slice(0, 3)) add(maStoryId(post), post.timestamp)

  return candidates
}

function candidateLastModified(candidate: ArticleCandidate, periodId: string): Date {
  if (candidate.timestamp) {
    const date = new Date(candidate.timestamp)
    if (!Number.isNaN(date.getTime())) return date
  }
  return lastModFromId(periodId)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL
  const periodIds = await availablePeriodIds()

  const langPriority: Record<string, number> = { en: 0.8, zh: 0.7 }
  const defaultPriority = 0.5

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const periodEntries = periodIds.flatMap((periodId) => {
    const lastModified = lastModFromId(periodId)
    // Older periods are unlikely to change daily — use "weekly" for accuracy.
    const changeFrequency: 'daily' | 'weekly' = lastModified < sevenDaysAgo ? 'weekly' : 'daily'
    return SUPPORTED_LANGUAGES.map((lang) => ({
      url: `${baseUrl}/${lang}/week/${periodId}`,
      lastModified,
      changeFrequency,
      priority: langPriority[lang] ?? defaultPriority,
    }))
  })

  const enTopicSet = new Set<string>()
  const zhTopicSet = new Set<string>()
  for (const periodId of periodIds.slice(0, 8)) {
    const titles = await getTopicTitlesByLanguage(periodId)
    for (const t of titles.en) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') enTopicSet.add(s)
    }
    for (const t of titles.zh) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') zhTopicSet.add(s)
    }
  }

  // Filter out empty or invalid slugs to avoid sitemap entries pointing to empty topic pages.
  // Note: Topics with 0 matching articles may still appear if trends data includes them
  // but actual article matching yields nothing. A full fix would require querying article
  // counts per topic, which is too expensive at sitemap generation time.
  const enSlugs = Array.from(enTopicSet).filter((s) => s.length > 1).slice(0, 30)
  const zhSlugs = Array.from(zhTopicSet).filter((s) => s.length > 1).slice(0, 30)

  const topicEntries = SUPPORTED_LANGUAGES.flatMap((lang) => {
    const slugs = lang === 'zh' && zhSlugs.length ? zhSlugs : enSlugs
    // Skip languages with no topic data to avoid empty topic pages in sitemap.
    if (slugs.length === 0) return []
    return slugs.map((topic) => ({
      url: `${baseUrl}/${lang}/topic/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
  })

  const articlePeriods = await Promise.all(
    periodIds.slice(0, 8).map(async (periodId) => ({
      periodId,
      candidates: await getArticleCandidates(periodId),
    })),
  )

  const INDEXED_ARTICLE_LANGS = ['en', 'zh']
  const articleEntries = articlePeriods.flatMap(({ periodId, candidates }) =>
    candidates.flatMap((candidate) => {
      const lastModified = candidateLastModified(candidate, periodId)
      const changeFrequency: 'daily' | 'weekly' = lastModified < sevenDaysAgo ? 'weekly' : 'daily'
      return INDEXED_ARTICLE_LANGS.map((lang) => ({
        url: `${baseUrl}${articleHref(lang, periodId, candidate.storyId)}`,
        lastModified,
        changeFrequency,
        priority: 0.55,
      }))
    }),
  )

  const homePriority: Record<string, number> = { en: 1.0, zh: 0.9 }
  const homeDefault = 0.7

  const langHomeEntries = SUPPORTED_LANGUAGES.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: homePriority[lang] ?? homeDefault,
  }))

  const toolSlugs = ['ai-report-generator']
  const toolEntries = toolSlugs.flatMap((slug) =>
    SUPPORTED_LANGUAGES.map((lang) => ({
      url: `${baseUrl}/${lang}/tools/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  )

  // Root serves English and canonicalizes to /en.
  const rootEntry = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }

  const trustEntries = [
    'about',
    'editorial-policy',
    'source-methodology',
    'corrections',
    'ai-disclosure',
    'contact',
    'for-teams',
  ].map((slug) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date('2026-05-24T00:00:00Z'),
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }))

  return [
    rootEntry,
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date('2026-02-18T00:00:00Z'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date('2026-02-18T00:00:00Z'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...trustEntries,
    ...langHomeEntries,
    ...toolEntries,
    ...topicEntries,
    ...articleEntries,
    ...periodEntries,
  ]
}
