import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  AppLanguage,
} from '@/lib/i18n'
import {
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  toBcp47,
} from '@/lib/i18n'
import {
  formatPeriodTitle,
  periodPublishedDate,
} from '@/lib/period-utils'
import { toTopicSlug } from '@/lib/topic-utils'
import type {
  InvestmentData,
  MAPost,
  MultilingualData,
  PrimaryMarketPost,
  SecondaryMarketPost,
  TechPost,
  TipPost,
} from '@/lib/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api'
const SITE_URL = 'https://www.forager.example'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string; periodId: string; storyId: string }>
}

type Dictionary = Record<AppLanguage, string>

const labels = {
  aiIntelligence: {
    de: 'KI Intelligence',
    en: 'AI Intelligence',
    zh: 'AI情报',
    fr: 'Intelligence IA',
    es: 'Inteligencia IA',
    pt: 'Inteligencia IA',
    ja: 'AIインテリジェンス',
    ko: 'AI 인텔리전스',
  },
  article: {
    de: 'Artikel',
    en: 'Article',
    zh: '文章',
    fr: 'Article',
    es: 'Articulo',
    pt: 'Artigo',
    ja: '記事',
    ko: '기사',
  },
  sourceBrief: {
    de: 'Source Brief',
    en: 'Source Brief',
    zh: '来源简报',
    fr: 'Brief source',
    es: 'Resumen fuente',
    pt: 'Brief da fonte',
    ja: 'ソース要約',
    ko: '출처 브리프',
  },
  keyFacts: {
    de: 'Key Facts',
    en: 'Key Facts',
    zh: '关键信息',
    fr: 'Faits cles',
    es: 'Datos clave',
    pt: 'Fatos-chave',
    ja: '主要情報',
    ko: '핵심 정보',
  },
  source: {
    de: 'Quelle',
    en: 'Source',
    zh: '来源',
    fr: 'Source',
    es: 'Fuente',
    pt: 'Fonte',
    ja: '出典',
    ko: '출처',
  },
  date: {
    de: 'Datum',
    en: 'Date',
    zh: '日期',
    fr: 'Date',
    es: 'Fecha',
    pt: 'Data',
    ja: '日付',
    ko: '날짜',
  },
  category: {
    de: 'Kategorie',
    en: 'Category',
    zh: '类别',
    fr: 'Categorie',
    es: 'Categoria',
    pt: 'Categoria',
    ja: 'カテゴリ',
    ko: '카테고리',
  },
  impact: {
    de: 'Impact',
    en: 'Impact',
    zh: '影响',
    fr: 'Impact',
    es: 'Impacto',
    pt: 'Impacto',
    ja: '影響度',
    ko: '영향도',
  },
  readInIssue: {
    de: 'Issue ansehen',
    en: 'Read the issue',
    zh: '查看本期',
    fr: "Voir l'edition",
    es: 'Ver edicion',
    pt: 'Ver edicao',
    ja: '号を見る',
    ko: '이슈 보기',
  },
  originalSource: {
    de: 'Originalquelle',
    en: 'Original source',
    zh: '原始来源',
    fr: 'Source originale',
    es: 'Fuente original',
    pt: 'Fonte original',
    ja: '原典',
    ko: '원문 출처',
  },
  sourceNote: {
    de: 'Diese Seite fasst den vorhandenen Forager Eintrag zusammen und verweist auf die Originalquelle.',
    en: 'This page summarizes the existing Forager entry and links back to the original source.',
    zh: '本页汇总 Forager 现有条目，并保留原始来源链接。',
    fr: "Cette page resume l'entree Forager existante et renvoie a la source originale.",
    es: 'Esta pagina resume la entrada existente de Forager y enlaza con la fuente original.',
    pt: 'Esta pagina resume a entrada existente do Forager e aponta para a fonte original.',
    ja: 'このページは既存の Forager 項目を要約し、原典へリンクします。',
    ko: '이 페이지는 기존 Forager 항목을 요약하고 원문 출처로 연결합니다.',
  },
  practicalTip: {
    de: 'Praktischer Tipp',
    en: 'Practical Tip',
    zh: '实用技巧',
    fr: 'Astuce pratique',
    es: 'Consejo practico',
    pt: 'Dica pratica',
    ja: '実践ヒント',
    ko: '실용 팁',
  },
  relatedTopics: {
    de: 'Related Topics',
    en: 'Related Topics',
    zh: '相关话题',
    fr: 'Sujets lies',
    es: 'Temas relacionados',
    pt: 'Topicos relacionados',
    ja: '関連トピック',
    ko: '관련 주제',
  },
  byline: {
    de: 'Forager Redaktion',
    en: 'Forager Editorial',
    zh: 'Forager 编辑部',
    fr: 'Redaction Forager',
    es: 'Redaccion Forager',
    pt: 'Editorial Forager',
    ja: 'Forager 編集部',
    ko: 'Forager 편집팀',
  },
} satisfies Record<string, Dictionary>

function t(label: Dictionary, lang: AppLanguage): string {
  return label[lang] || label.en
}

type ArticleStory = {
  id: string
  kind: 'technology' | 'video' | 'tip' | 'primary-market' | 'secondary-market' | 'm-and-a'
  label: string
  headline: string
  deck?: string
  body: string
  sourceName?: string
  sourceUrl?: string
  timestamp?: string
  category?: string
  impact?: string
  tags: string[]
  facts: { label: string; value: string }[]
  tip?: string
}

function compact<T>(items: (T | null | undefined | false)[]): T[] {
  return items.filter(Boolean) as T[]
}

function cleanText(value: string | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function sentenceCaseFragment(text: string): string {
  if (!text) return ''
  return /^[a-z]/.test(text) ? `${text[0].toUpperCase()}${text.slice(1)}` : text
}

function splitHeadlineDeck(content: string): [string, string] {
  const clean = cleanText(content)
  if (!clean) return ['', '']

  for (const separator of [': ', ' - ']) {
    const position = clean.indexOf(separator)
    if (position >= 24 && position <= 92 && position + separator.length < clean.length) {
      const headline = clean.slice(0, position + (separator.trim().length === 1 ? 1 : 0)).replace(/[ .,-;:]+$/, '')
      return [headline, sentenceCaseFragment(clean.slice(position + separator.length).trim())]
    }
  }

  for (const separator of ['. ', '? ', '! ']) {
    const position = clean.indexOf(separator)
    if (position >= 32 && position <= 150 && position + separator.length < clean.length) {
      return [
        clean.slice(0, position + 1).trim(),
        sentenceCaseFragment(clean.slice(position + separator.length).trim()),
      ]
    }
  }

  if (clean.length <= 130) return [clean, '']

  const cut = clean.lastIndexOf(' ', 130)
  if (cut <= 0) return [`${clean.slice(0, 130)}...`, clean.slice(130)]
  return [
    `${clean.slice(0, cut).replace(/[ .,-;:]+$/, '')}...`,
    sentenceCaseFragment(clean.slice(cut).trim()),
  ]
}

function uniqueTags(tags: (string | undefined)[]): string[] {
  return Array.from(new Set(tags.map((tag) => cleanText(tag)).filter(Boolean))).slice(0, 6)
}

function getLocalizedArray<T>(data: MultilingualData<T> | undefined | null, lang: AppLanguage): T[] {
  if (!data) return []
  return data[lang] || data.en || data.de || []
}

async function readStaticJson<T>(periodId: string, filename: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', periodId, filename)
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function fetchFeed<T>(periodId: string, endpoint: string, filename: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/${endpoint}/${periodId}`, { next: { revalidate: 3600 } })
    if (response.ok) return (await response.json()) as T
  } catch {
    // Static fallback below.
  }

  return readStaticJson<T>(periodId, filename)
}

function techToStory(post: TechPost, lang: AppLanguage): ArticleStory {
  const [headline, deck] = splitHeadlineDeck(post.content)
  const isVideo = Boolean(post.isVideo)
  return {
    id: `${isVideo ? 'video' : 'tech'}-${post.id}`,
    kind: isVideo ? 'video' : 'technology',
    label: isVideo ? 'Video' : t(labels.aiIntelligence, lang),
    headline,
    deck,
    body: post.content,
    sourceName: post.source || post.author?.name,
    sourceUrl: post.sourceUrl,
    timestamp: post.timestamp,
    category: post.category,
    impact: post.impact,
    tags: uniqueTags([post.category, ...(post.tags || [])]),
    facts: compact([
      post.category ? { label: t(labels.category, lang), value: post.category } : undefined,
      post.impact ? { label: t(labels.impact, lang), value: post.impact } : undefined,
      post.source ? { label: t(labels.source, lang), value: post.source } : undefined,
    ]),
  }
}

function tipToStory(post: TipPost, lang: AppLanguage): ArticleStory {
  const [headline, deck] = splitHeadlineDeck(post.content)
  return {
    id: `tip-${post.id}`,
    kind: 'tip',
    label: t(labels.practicalTip, lang),
    headline,
    deck,
    body: post.content,
    sourceName: post.author?.name || post.platform,
    sourceUrl: post.sourceUrl,
    timestamp: post.timestamp,
    category: post.category,
    tags: uniqueTags([post.category, post.difficulty, post.platform]),
    facts: compact([
      post.category ? { label: t(labels.category, lang), value: post.category } : undefined,
      post.difficulty ? { label: 'Level', value: post.difficulty } : undefined,
      post.platform ? { label: 'Platform', value: post.platform } : undefined,
    ]),
    tip: post.tip,
  }
}

function primaryToStory(post: PrimaryMarketPost, lang: AppLanguage): ArticleStory {
  const headline = compact([post.company, post.amount, post.round]).join(' · ')
  return {
    id: `primary-${post.id}`,
    kind: 'primary-market',
    label: 'Primary Market',
    headline: headline || cleanText(post.content),
    deck: post.content,
    body: post.content,
    sourceName: post.author?.name,
    sourceUrl: post.sourceUrl,
    timestamp: post.timestamp,
    category: 'Investment',
    tags: uniqueTags([post.company, post.round, post.roundCategory, 'AI Funding']),
    facts: compact([
      post.company ? { label: 'Company', value: post.company } : undefined,
      post.amount ? { label: 'Amount', value: post.amount } : undefined,
      post.round ? { label: 'Round', value: post.round } : undefined,
      Array.isArray(post.investors) && post.investors.length > 0 ? { label: 'Investors', value: post.investors.join(', ') } : undefined,
      post.valuation ? { label: 'Valuation', value: post.valuation } : undefined,
    ]),
  }
}

function secondaryToStory(post: SecondaryMarketPost, lang: AppLanguage): ArticleStory {
  const headline = compact([post.ticker, post.change, post.price]).join(' · ')
  return {
    id: `secondary-${post.id}`,
    kind: 'secondary-market',
    label: 'Secondary Market',
    headline: headline || cleanText(post.content),
    deck: post.content,
    body: post.content,
    sourceName: post.author?.name,
    sourceUrl: post.sourceUrl,
    timestamp: post.timestamp,
    category: 'Investment',
    tags: uniqueTags([post.ticker, post.direction, 'AI Stocks']),
    facts: compact([
      post.ticker ? { label: 'Ticker', value: post.ticker } : undefined,
      post.price ? { label: 'Price', value: post.price } : undefined,
      post.change ? { label: 'Change', value: post.change } : undefined,
      post.marketCap ? { label: 'Market Cap', value: post.marketCap } : undefined,
    ]),
  }
}

function maToStory(post: MAPost, lang: AppLanguage): ArticleStory {
  const headline = compact([post.acquirer, post.target]).join(' -> ')
  return {
    id: `ma-${post.id}`,
    kind: 'm-and-a',
    label: 'M&A',
    headline: headline || cleanText(post.content),
    deck: post.content,
    body: post.content,
    sourceName: post.author?.name,
    sourceUrl: post.sourceUrl,
    timestamp: post.timestamp,
    category: 'Investment',
    tags: uniqueTags([post.acquirer, post.target, post.industry, post.dealType]),
    facts: compact([
      post.acquirer ? { label: 'Acquirer', value: post.acquirer } : undefined,
      post.target ? { label: 'Target', value: post.target } : undefined,
      post.dealValue ? { label: 'Deal Value', value: post.dealValue } : undefined,
      post.dealType ? { label: 'Deal Type', value: post.dealType } : undefined,
      post.industry ? { label: 'Industry', value: post.industry } : undefined,
    ]),
  }
}

const getArticleStory = cache(async (periodId: string, storyId: string, lang: AppLanguage): Promise<ArticleStory | null> => {
  const [techData, investmentData, tipsData] = await Promise.all([
    fetchFeed<MultilingualData<TechPost>>(periodId, 'tech', 'tech.json'),
    fetchFeed<InvestmentData>(periodId, 'investment', 'investment.json'),
    fetchFeed<MultilingualData<TipPost>>(periodId, 'tips', 'tips.json'),
  ])

  const stories = [
    ...getLocalizedArray(techData, lang).map((post) => techToStory(post, lang)),
    ...getLocalizedArray(tipsData, lang).flatMap((post) => {
      const story = tipToStory(post, lang)
      return [
        story,
        { ...story, id: `tips-${post.id}` },
      ]
    }),
    ...getLocalizedArray(investmentData?.primaryMarket, lang).map((post) => primaryToStory(post, lang)),
    ...getLocalizedArray(investmentData?.secondaryMarket, lang).map((post) => secondaryToStory(post, lang)),
    ...getLocalizedArray(investmentData?.ma, lang).map((post) => maToStory(post, lang)),
  ]

  return stories.find((story) => story.id === storyId) || null
})

function validIso(value: string | undefined, fallback: Date): string {
  if (!value) return fallback.toISOString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback.toISOString()
  return date.toISOString()
}

function dateLabel(value: string, lang: AppLanguage): string {
  try {
    return new Intl.DateTimeFormat(toBcp47(lang), { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value.slice(0, 10)
  }
}

function truncateText(value: string, max = 160): string {
  const text = cleanText(value)
  if (text.length <= max) return text
  const cut = text.lastIndexOf(' ', max)
  return `${text.slice(0, cut > 80 ? cut : max).replace(/[ .,-;:]+$/, '')}...`
}

function descriptionFor(story: ArticleStory): string {
  return truncateText(story.body)
}

function storyUrl(lang: AppLanguage, periodId: string, storyId: string): string {
  return `${SITE_URL}/${lang}/news/${periodId}/${storyId}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, periodId, storyId } = await params
  if (!isSupportedLanguage(rawLang)) return {}

  const lang = rawLang
  const story = await getArticleStory(periodId, storyId, lang)
  if (!story) {
    return {
      title: 'Article not found | Forager',
      robots: { index: false, follow: true },
    }
  }

  const description = descriptionFor(story)
  const canonical = storyUrl(lang, periodId, storyId)
  const languages = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((code) => [toBcp47(code), storyUrl(code, periodId, storyId)]),
  )

  return {
    title: story.headline,
    description,
    alternates: {
      canonical,
      languages: {
        'x-default': storyUrl('en', periodId, storyId),
        ...languages,
      },
    },
    openGraph: {
      title: story.headline,
      description,
      url: canonical,
      type: 'article',
      publishedTime: validIso(story.timestamp, periodPublishedDate(periodId)),
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Forager',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: story.headline,
      description,
      images: ['/og-image.jpg'],
    },
  }
}

function jsonLdFor(story: ArticleStory, lang: AppLanguage, periodId: string, storyId: string) {
  const publishedIso = validIso(story.timestamp, periodPublishedDate(periodId))
  const url = storyUrl(lang, periodId, storyId)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: story.headline,
      description: descriptionFor(story),
      articleSection: story.label,
      datePublished: publishedIso,
      dateModified: publishedIso,
      inLanguage: toBcp47(lang),
      isAccessibleForFree: true,
      mainEntityOfPage: url,
      author: {
        '@type': 'Organization',
        name: 'Forager Editorial',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Forager',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/icon.svg`,
        },
      },
      about: story.tags,
      citation: story.sourceUrl ? [story.sourceUrl] : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Forager',
          item: `${SITE_URL}/${lang}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: formatPeriodTitle(periodId, lang),
          item: `${SITE_URL}/${lang}/week/${periodId}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: story.headline,
          item: url,
        },
      ],
    },
  ]
}

export default async function ArticlePage({ params }: Props) {
  const { lang: rawLang, periodId, storyId } = await params
  if (!isSupportedLanguage(rawLang)) notFound()

  const lang = rawLang
  const story = await getArticleStory(periodId, storyId, lang)
  if (!story) notFound()

  const periodLabel = formatPeriodTitle(periodId, lang)
  const publishedIso = validIso(story.timestamp, periodPublishedDate(periodId))
  const facts = [
    { label: t(labels.date, lang), value: dateLabel(publishedIso, lang) },
    ...story.facts,
  ]
  const jsonLd = jsonLdFor(story, lang, periodId, storyId)

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto min-h-screen w-full max-w-[1180px] border-x border-border bg-content-surface">
        <header className="border-b-2 border-foreground px-5 pb-7 pt-6 sm:px-8 lg:px-12">
          <div className="grid gap-3 border-b border-border pb-5 font-sans text-[11px] font-extrabold uppercase tracking-[0.24em] text-muted-foreground sm:grid-cols-[1fr_auto_1fr]">
            <span>{t(labels.aiIntelligence, lang)}</span>
            <span className="text-center text-foreground">{periodLabel}</span>
            <span className="text-left sm:text-right">{story.label}</span>
          </div>

          <div className="mx-auto max-w-4xl py-8 text-center">
            <div className="mb-5 inline-flex border border-foreground px-3 py-1 font-sans text-[10px] font-extrabold uppercase tracking-[0.2em]">
              {t(labels.article, lang)}
            </div>
            <h1 className="font-display text-5xl font-normal leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              {story.headline}
            </h1>
            {story.deck ? (
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-foreground sm:text-xl">
                {story.deck}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 border-t border-foreground pt-4 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:grid-cols-3">
            <span>{t(labels.byline, lang)}</span>
            <time className="sm:text-center" dateTime={publishedIso}>
              {dateLabel(publishedIso, lang)}
            </time>
            <span className="sm:text-right">
              {story.sourceName ? `${t(labels.source, lang)}: ${story.sourceName}` : t(labels.sourceBrief, lang)}
            </span>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
            <section aria-labelledby="source-brief-heading" className="border-b border-border pb-8">
              <div className="mb-4 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4">
                <div className="font-display text-4xl leading-none text-primary">01</div>
                <div>
                  <h2 id="source-brief-heading" className="font-sans text-[12px] font-extrabold uppercase tracking-[0.2em] text-primary">
                    {t(labels.sourceBrief, lang)}
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap font-display text-3xl font-normal leading-[1.14] text-foreground">
                    {story.body}
                  </p>
                </div>
              </div>
            </section>

            {story.tip ? (
              <section aria-labelledby="tip-heading" className="border-b border-border py-8">
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4">
                  <div className="font-display text-4xl leading-none text-primary">02</div>
                  <div>
                    <h2 id="tip-heading" className="font-sans text-[12px] font-extrabold uppercase tracking-[0.2em] text-primary">
                      {t(labels.practicalTip, lang)}
                    </h2>
                    <div className="mt-4 border-l-4 border-foreground bg-secondary/55 px-4 py-4 font-mono text-sm leading-relaxed">
                      <pre className="whitespace-pre-wrap break-words">{story.tip}</pre>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="related-topics-heading" className="py-8">
              <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4">
                <div className="font-display text-4xl leading-none text-primary">{story.tip ? '03' : '02'}</div>
                <div>
                  <h2 id="related-topics-heading" className="font-sans text-[12px] font-extrabold uppercase tracking-[0.2em] text-primary">
                    {t(labels.relatedTopics, lang)}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {story.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/${lang}/topic/${toTopicSlug(tag)}`}
                        className="border border-border px-3 py-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                      >
                        {tag}
                      </Link>
                    ))}
                    <Link
                      href={`/${lang}/week/${periodId}`}
                      className="border border-foreground bg-foreground px-3 py-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-background transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      {t(labels.readInIssue, lang)}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="border-t border-foreground px-5 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-7">
            <div className="sticky top-6 space-y-8">
              <section aria-labelledby="facts-heading">
                <h2 id="facts-heading" className="border-b-2 border-foreground pb-3 font-sans text-[12px] font-extrabold uppercase tracking-[0.22em] text-primary">
                  {t(labels.keyFacts, lang)}
                </h2>
                <dl className="divide-y divide-border">
                  {facts.map((fact) => (
                    <div key={`${fact.label}-${fact.value}`} className="grid gap-1 py-4">
                      <dt className="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{fact.label}</dt>
                      <dd className="text-sm leading-relaxed text-foreground">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="source-heading" className="border border-foreground bg-secondary/55 p-5">
                <h2 id="source-heading" className="font-sans text-[12px] font-extrabold uppercase tracking-[0.2em] text-primary">
                  {t(labels.originalSource, lang)}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {t(labels.sourceNote, lang)}
                </p>
                {story.sourceUrl ? (
                  <a
                    href={story.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex border border-foreground bg-foreground px-4 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-background transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {story.sourceName || t(labels.source, lang)}
                  </a>
                ) : null}
              </section>
            </div>
          </aside>
        </div>
      </article>
    </main>
  )
}
