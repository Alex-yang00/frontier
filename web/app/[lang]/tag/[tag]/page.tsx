import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47, type AppLanguage } from '@/lib/i18n'
import { readCanonicalFile, readWeeks } from '@/lib/server/frontier-data'
import { toTopicSlug } from '@/lib/topic-utils'
import { siteUrl } from '@/lib/site'
import type { FrontierItem } from '@/lib/frontier-adapter'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string; tag: string }>
}

// How far back a tag timeline reaches. Each archive day is a separate object of
// roughly 1 MB, so this is a request-cost ceiling, not an editorial one: 14 days
// covers "spanning weeks" without fetching a quarter of the archive to render one
// page. Days are read newest-first, so the cap trims the oldest tail.
const TIMELINE_DAYS = 14
const TIMELINE_LIMIT = 60

const COPY = {
  en: {
    tag: 'Tag',
    items: (n: number, days: number) =>
      `${n} item${n === 1 ? '' : 's'} · spanning ${days} day${days === 1 ? '' : 's'}`,
    empty: 'Nothing tagged this yet.',
    emptyDeck: 'This tag has no items in the days currently archived.',
  },
  zh: {
    tag: '标签',
    items: (n: number, days: number) => `${n} 条 · 跨 ${days} 天`,
    empty: '暂无使用该标签的内容。',
    emptyDeck: '当前归档范围内没有该标签的条目。',
  },
} as const

function tagsOf(item: FrontierItem): string[] {
  return [...(item.tags || []), ...(item.tags_zh || [])]
}

function localizedTitle(item: FrontierItem, language: AppLanguage): string {
  return (language === 'zh' ? item.title_zh : item.title_en) || item.title || ''
}

/** The label to print for a slug: the first real tag that produced it. */
function labelFor(matches: FrontierItem[], slug: string, language: AppLanguage): string {
  for (const item of matches) {
    const preferred = language === 'zh' && item.tags_zh?.length ? item.tags_zh : item.tags || []
    const hit = preferred.find((tag) => toTopicSlug(tag) === slug)
    if (hit) return hit
    const any = tagsOf(item).find((tag) => toTopicSlug(tag) === slug)
    if (any) return any
  }
  return slug
}

async function readTimeline(slug: string): Promise<FrontierItem[]> {
  const weeks = (await readWeeks()).weeks || []
  const dayIds = weeks
    .filter((week) => /^\d{4}-\d{2}-\d{2}$/.test(week.id))
    .map((week) => week.id)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, TIMELINE_DAYS)

  const files = await Promise.all(dayIds.map((id) => readCanonicalFile(id)))
  const seen = new Set<string>()
  const matches: FrontierItem[] = []
  for (const file of files) {
    for (const item of file?.items || []) {
      // An item can appear in several days' archives -- daily.json is the whole
      // rolling day and each archive is a copy of it -- so dedupe by id.
      if (seen.has(item.id)) continue
      if (!tagsOf(item).some((tag) => toTopicSlug(tag) === slug)) continue
      seen.add(item.id)
      matches.push(item)
    }
  }
  return matches
    .sort((a, b) =>
      ((b.edition_date || b.published || '')).localeCompare(a.edition_date || a.published || ''),
    )
    .slice(0, TIMELINE_LIMIT)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, tag } = await params
  if (!isSupportedLanguage(lang)) return {}
  const slug = toTopicSlug(tag)
  const title = `#${slug}`

  const hreflangEntries: Record<string, string> = { 'x-default': siteUrl(`/en/tag/${slug}`) }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = siteUrl(`/${code}/tag/${slug}`)
  }

  return {
    title,
    description:
      lang === 'zh'
        ? `Frontier 中标记为 ${title} 的内容，按时间回溯。`
        : `Items tagged ${title} on Frontier, newest first across archived days.`,
    alternates: { canonical: siteUrl(`/${lang}/tag/${slug}`), languages: hreflangEntries },
  }
}

export default async function TagPage({ params }: Props) {
  const { lang, tag } = await params
  if (!isSupportedLanguage(lang)) notFound()
  const language = lang as AppLanguage
  const copy = COPY[language] || COPY.en
  const slug = toTopicSlug(tag)
  const items = await readTimeline(slug)
  const label = labelFor(items, slug, language)
  const spannedDays = new Set(items.map((item) => (item.edition_date || item.published || '').slice(0, 10))).size
  const locale = language === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <div className="f-page">
      <div className="f-paper f-paper-900">
        {/* Wordmark only, as the mock draws this frame's top bar. */}
        <header className="f-top">
          <Link href={`/${language}`} className="f-wordmark">
            Frontier
          </Link>
        </header>

        <div className="f-taghead">
          <span className="f-label">{copy.tag}</span>
          <h1 className="f-tagname">#{label}</h1>
          <span className="f-tagmeta">{copy.items(items.length, spannedDays)}</span>
        </div>

        {items.length === 0 ? (
          <div className="f-empty">
            <p className="f-empty-t">{copy.empty}</p>
            <p className="f-empty-d">{copy.emptyDeck}</p>
          </div>
        ) : (
          items.map((item) => (
            <article className="f-it is-timeline" key={item.id}>
              <span className="f-ord">
                {new Date(`${(item.edition_date || item.published || '').slice(0, 10)}T00:00:00Z`)
                  .toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              </span>
              <div className="f-it-body">
                <a className="f-it-h-btn" href={item.url} target="_blank" rel="noopener noreferrer">
                  <h2 className="f-it-h">{localizedTitle(item, language)}</h2>
                </a>
                {/* A bare meta line, as in the mock -- the timeline row carries no
                    tag and no expand affordance, so the lead's flex foot would only
                    add its 6px top margin to a row whose whole point is density. */}
                <span className="f-meta">{item.source_name}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
