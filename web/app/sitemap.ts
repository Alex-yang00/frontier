import { MetadataRoute } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
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

interface WeeksResponse {
  weeks: { id: string; days?: { id: string }[] }[]
}

interface TrendsResponse {
  trends?: {
    de?: { title?: string }[]
    en?: { title?: string }[]
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

async function getTopicTitlesByLanguage(periodId: string, apiUrl: string): Promise<{ de: string[]; en: string[] }> {
  let data: TrendsResponse | null = null
  try {
    const res = await fetch(`${apiUrl}/trends/${periodId}`, { next: { revalidate: 3600 } })
    if (res.ok) data = (await res.json()) as TrendsResponse
  } catch {}

  if (!data) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', periodId, 'trends.json')
      const raw = await readFile(filePath, 'utf-8')
      data = JSON.parse(raw) as TrendsResponse
    } catch {}
  }

  return {
    de: (data?.trends?.de || []).map((i) => (i.title || '').trim()).filter(Boolean),
    en: (data?.trends?.en || []).map((i) => (i.title || '').trim()).filter(Boolean),
  }
}

async function getFeedFromApiOrFile<T>(periodId: string, apiUrl: string, endpoint: string, filename: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiUrl}/${endpoint}/${periodId}`, { next: { revalidate: 3600 } })
    if (res.ok) return (await res.json()) as T
  } catch {
    // Static fallback below.
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', periodId, filename)
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function firstLocalizedList<T>(data: Record<string, T[]> | null | undefined): T[] {
  if (!data) return []
  for (const lang of SUPPORTED_LANGUAGES) {
    const items = data[lang]
    if (Array.isArray(items) && items.length > 0) return items
  }
  return []
}

async function getArticleCandidates(periodId: string, apiUrl: string): Promise<ArticleCandidate[]> {
  const [techData, tipsData, investmentData] = await Promise.all([
    getFeedFromApiOrFile<Record<string, SitemapStoryPost[]>>(periodId, apiUrl, 'tech', 'tech.json'),
    getFeedFromApiOrFile<Record<string, SitemapStoryPost[]>>(periodId, apiUrl, 'tips', 'tips.json'),
    getFeedFromApiOrFile<SitemapInvestmentResponse>(periodId, apiUrl, 'investment', 'investment.json'),
  ])

  const candidates: ArticleCandidate[] = []
  const seen = new Set<string>()
  const add = (storyId: string, timestamp?: string) => {
    if (seen.has(storyId)) return
    seen.add(storyId)
    candidates.push({ storyId, timestamp })
  }

  const techPosts = firstLocalizedList(techData)
  for (const post of techPosts.filter((item) => !item.isVideo).slice(0, 8)) add(techStoryId(post), post.timestamp)
  for (const post of techPosts.filter((item) => item.isVideo).slice(0, 3)) add(techStoryId(post), post.timestamp)

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
  const baseUrl = 'https://www.forager.example'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api'

  // Fetch all periods from API with static file fallback
  let weeks: { id: string; days?: { id: string }[] }[] = []
  try {
    const response = await fetch(`${apiUrl}/weeks`, { next: { revalidate: 3600 } })
    if (response.ok) {
      const data: WeeksResponse = await response.json()
      weeks = data.weeks || []
    }
  } catch {
    // Handled by static fallback below.
  }

  if (weeks.length === 0) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'weeks.json')
      const raw = await readFile(filePath, 'utf-8')
      const data = JSON.parse(raw) as WeeksResponse
      weeks = data.weeks || []
    } catch {
      // Keep empty when all sources fail.
    }
  }

  const periodIds = Array.from(
    new Set(
      weeks.flatMap((week) => [
        week.id,
        ...(week.days ? week.days.map((day) => day.id) : []),
      ])
    )
  )

  const langPriority: Record<string, number> = { en: 0.8, de: 0.7, zh: 0.7 }
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

  const deTopicSet = new Set<string>()
  const enTopicSet = new Set<string>()
  for (const periodId of periodIds.slice(0, 8)) {
    const titles = await getTopicTitlesByLanguage(periodId, apiUrl)
    for (const t of titles.de) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') deTopicSet.add(s)
    }
    for (const t of titles.en) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') enTopicSet.add(s)
    }
  }

  // Filter out empty or invalid slugs to avoid sitemap entries pointing to empty topic pages.
  // Note: Topics with 0 matching articles may still appear if trends data includes them
  // but actual article matching yields nothing. A full fix would require querying article
  // counts per topic, which is too expensive at sitemap generation time.
  const deSlugs = Array.from(deTopicSet).filter((s) => s.length > 1).slice(0, 30)
  const enSlugs = Array.from(enTopicSet).filter((s) => s.length > 1).slice(0, 30)

  const topicEntries = SUPPORTED_LANGUAGES.flatMap((lang) => {
    const slugs = lang === 'de' ? deSlugs : enSlugs
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
      candidates: await getArticleCandidates(periodId, apiUrl),
    })),
  )

  // Article pages: only DE/EN/ZH are indexed (middleware sends noindex for the
  // other languages) — keep the sitemap consistent with that decision.
  const INDEXED_ARTICLE_LANGS = ['de', 'en', 'zh']
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

  const homePriority: Record<string, number> = { en: 1.0, de: 0.9, zh: 0.9 }
  const homeDefault = 0.7

  const langHomeEntries = SUPPORTED_LANGUAGES.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: homePriority[lang] ?? homeDefault,
  }))

  // Tool pages - all 8 languages (individual tools)
  // ai-stock-tracker removed: paused + noindexed pending market-data licensing
  const toolSlugs = ['ai-news-aggregator', 'ai-report-generator', 'ai-news-api']
  const toolEntries = toolSlugs.flatMap((slug) =>
    SUPPORTED_LANGUAGES.map((lang) => ({
      url: `${baseUrl}/${lang}/tools/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  )

  // Root serves the German homepage for users who arrive without a language
  // segment. It still canonicalizes to /de, but stays discoverable for crawlers
  // and audit tools that first enter through the bare domain.
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

  // The Funding Tracker is a primary compounding asset page — high priority,
  // refreshed daily by the collection pipeline.
  const fundingEntry = {
    url: `${baseUrl}/funding`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }

  return [
    rootEntry,
    fundingEntry,
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
