import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSupportedLanguage, toBcp47, SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n'
import { readPeriodData, readWeeks } from '@/lib/server/frontier-data'
import { toTopicSlug, topicSlugToQuery, topicSlugToTitle } from '@/lib/topic-utils'
import { SITE_URL, siteUrl } from '@/lib/site'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 3
const TOPIC_SECTIONS = ['all', 'tech', 'investment', 'tips'] as const

type TopicSection = (typeof TOPIC_SECTIONS)[number]

type Props = {
  params: Promise<{ lang: string; topic: string }>
  searchParams: Promise<{ page?: string; period?: string; q?: string; section?: string }>
}

interface WeekEntry {
  id: string
  days?: { id: string }[]
}

interface WeeksResponse {
  weeks?: WeekEntry[]
}

interface TechPost {
  id: number
  content: string
  category: string
  source: string
  sourceUrl?: string
  tags?: string[]
}

interface PrimaryPost {
  id: number
  content: string
  company: string
  round: string
}

interface SecondaryPost {
  id: number
  content: string
  ticker: string
}

interface MaPost {
  id: number
  content: string
  acquirer: string
  target: string
  dealType: string
}

interface TipPost {
  id: number
  content: string
  tip: string
  category: string
}

type TopicBucket = {
  periodId: string
  tech: TechPost[]
  primary: PrimaryPost[]
  secondary: SecondaryPost[]
  ma: MaPost[]
  tips: TipPost[]
}

function normalizeTopicQuery(value: string | undefined): string {
  const trimmed = (value || '').trim()
  return trimmed.length > 0 && trimmed.length <= 180 ? trimmed : ''
}

function topicQueryToSearchText(topicSlug: string, queryText: string): string {
  if (!queryText) return topicSlugToQuery(topicSlug)
  const querySlug = toTopicSlug(queryText)
  return topicSlugToQuery(querySlug) || topicSlugToQuery(topicSlug)
}

function topicDisplayTitle(topicSlug: string, queryText: string): string {
  return queryText || topicSlugToTitle(topicSlug)
}

function toSearchTerms(topicSlug: string, queryText = ''): string[] {
  return topicQueryToSearchText(topicSlug, queryText)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean)
}

function matchesTerms(fields: Array<string | undefined>, terms: string[]): boolean {
  if (terms.length === 0) return false
  const haystack = fields.map((field) => (field || '').toLowerCase()).join(' ')
  return terms.every((term) => haystack.includes(term))
}

function parsePositiveInt(value: string | undefined): number {
  const parsed = Number.parseInt(value || '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

function parseSection(value: string | undefined): TopicSection {
  if (!value) return 'all'
  if ((TOPIC_SECTIONS as readonly string[]).includes(value)) return value as TopicSection
  return 'all'
}

function isValidPeriodId(value: string | undefined): boolean {
  if (!value) return false
  return /^\d{4}-kw\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function projectBucketBySection(bucket: TopicBucket, section: TopicSection): TopicBucket {
  if (section === 'all') return bucket
  if (section === 'tech') {
    return { ...bucket, primary: [], secondary: [], ma: [], tips: [] }
  }
  if (section === 'investment') {
    return { ...bucket, tech: [], tips: [] }
  }
  return { ...bucket, tech: [], primary: [], secondary: [], ma: [] }
}

function bucketResultCount(bucket: TopicBucket): number {
  return bucket.tech.length + bucket.primary.length + bucket.secondary.length + bucket.ma.length + bucket.tips.length
}

function buildTopicHref(
  lang: AppLanguage,
  topic: string,
  opts: { page?: number; period?: string; q?: string; section?: TopicSection; hash?: string }
): string {
  const params = new URLSearchParams()
  if (opts.period) params.set('period', opts.period)
  if (opts.q) params.set('q', opts.q)
  if (opts.section && opts.section !== 'all') params.set('section', opts.section)
  if (opts.page && opts.page > 1) params.set('page', String(opts.page))

  const base = `/${lang}/topic/${topic}`
  const query = params.toString()
  const url = query ? `${base}?${query}` : base
  return opts.hash ? `${url}#${opts.hash}` : url
}

function entryAnchorId(periodId: string, section: string, id: number): string {
  return `${periodId}-${section}-${id}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
}

async function getWeeks(): Promise<WeekEntry[]> {
  return (await readWeeks()).weeks || []
}

function getCandidatePeriodIds(weeks: WeekEntry[], preferredPeriodId?: string): string[] {
  if (preferredPeriodId) return [preferredPeriodId]
  return weeks.slice(0, 6).map((w) => w.id)
}

async function getTopicBuckets(terms: string[], language: AppLanguage, preferredPeriodId?: string): Promise<TopicBucket[]> {
  const weeks = await getWeeks()
  const periodIds = getCandidatePeriodIds(weeks, preferredPeriodId)

  const bucketCandidates = await Promise.all(
    periodIds.map(async (periodId) => {
      const { tech: techData, investment: investmentData, tips: tipsData } = await readPeriodData(periodId)

      const tech: TechPost[] = (techData?.[language] || []).filter((post: TechPost) =>
        matchesTerms([post.content, post.category, post.source, ...(post.tags || [])], terms)
      )

      const primary: PrimaryPost[] = (investmentData?.primaryMarket?.[language] || []).filter((post: PrimaryPost) =>
        matchesTerms([post.content, post.company, post.round], terms)
      )

      const secondary: SecondaryPost[] = (investmentData?.secondaryMarket?.[language] || []).filter((post: SecondaryPost) =>
        matchesTerms([post.content, post.ticker], terms)
      )

      const ma: MaPost[] = (investmentData?.ma?.[language] || []).filter((post: MaPost) =>
        matchesTerms([post.content, post.acquirer, post.target, post.dealType], terms)
      )

      const tips: TipPost[] = (tipsData?.[language] || []).filter((post: TipPost) =>
        matchesTerms([post.content, post.tip, post.category], terms)
      )

      if (tech.length || primary.length || secondary.length || ma.length || tips.length) {
        return { periodId, tech, primary, secondary, ma, tips }
      }

      return null
    })
  )

  return bucketCandidates.filter((bucket): bucket is TopicBucket => bucket !== null)
}

function buildBreadcrumbSchema(lang: AppLanguage, topic: string, topicTitle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ({
          de: 'Startseite',
          en: 'Home',
          zh: '首页',
          fr: 'Accueil',
          es: 'Inicio',
          pt: 'Início',
          ja: 'ホーム',
          ko: '홈',
        } as Record<string, string>)[lang] || 'Home',
        item: siteUrl(`/${lang}`),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: topicTitle,
        item: siteUrl(`/${lang}/topic/${topic}`),
      },
    ],
  }
}

function buildFAQSchema(lang: AppLanguage, topicTitle: string, buckets: TopicBucket[]) {
  const questions: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[] = []

  const l = (translations: Record<string, string>): string =>
    translations[lang] || translations.en

  // Q1: What is [topic]?
  const firstTech = buckets.flatMap((b) => b.tech).find((p) => p.content)
  if (firstTech) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Was ist ${topicTitle}?`,
        en: `What is ${topicTitle}?`,
        zh: `什么是${topicTitle}？`,
        fr: `Qu'est-ce que ${topicTitle} ?`,
        es: `¿Qué es ${topicTitle}?`,
        pt: `O que é ${topicTitle}?`,
        ja: `${topicTitle}とは？`,
        ko: `${topicTitle}란 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: firstTech.content.slice(0, 300),
      },
    })
  }

  // Q2: Investment implications
  const firstInvest = buckets.flatMap((b) => [...b.primary, ...b.secondary, ...b.ma]).find((p) => p.content)
  if (firstInvest) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Welche Investitionsauswirkungen hat ${topicTitle}?`,
        en: `What are the investment implications of ${topicTitle}?`,
        zh: `${topicTitle}的投资影响有哪些？`,
        fr: `Quelles sont les implications d'investissement de ${topicTitle} ?`,
        es: `¿Cuáles son las implicaciones de inversión de ${topicTitle}?`,
        pt: `Quais são as implicações de investimento de ${topicTitle}?`,
        ja: `${topicTitle}の投資への影響は？`,
        ko: `${topicTitle}의 투자 영향은 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: firstInvest.content.slice(0, 300),
      },
    })
  }

  // Q3: Practical tips
  const firstTip = buckets.flatMap((b) => b.tips).find((p) => p.content)
  if (firstTip) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Welche praktischen Tipps gibt es für ${topicTitle}?`,
        en: `What are practical tips for ${topicTitle}?`,
        zh: `关于${topicTitle}有哪些实用技巧？`,
        fr: `Quels sont les conseils pratiques pour ${topicTitle} ?`,
        es: `¿Cuáles son los consejos prácticos para ${topicTitle}?`,
        pt: `Quais são as dicas práticas para ${topicTitle}?`,
        ja: `${topicTitle}の実践的なヒントは？`,
        ko: `${topicTitle}에 대한 실용적인 팁은 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (firstTip.tip || firstTip.content).slice(0, 300),
      },
    })
  }

  if (questions.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  }
}

function buildItemListSchema(lang: AppLanguage, topicTitle: string, buckets: TopicBucket[], section: TopicSection) {
  const items = buckets.slice(0, 20).map((bucket, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: siteUrl(`/${lang}/week/${bucket.periodId}`),
    name: `${topicTitle} - ${bucket.periodId}`,
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${topicTitle} topic results (${section})`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items,
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, topic } = await params
  if (!isSupportedLanguage(lang)) return {}
  const query = await searchParams

  const topicQuery = normalizeTopicQuery(query.q)
  const topicTitle = topicDisplayTitle(topic, topicQuery)
  const localizedUrl = siteUrl(`/${lang}/topic/${topic}`)
  const section = parseSection(query.section)
  const period = isValidPeriodId(query.period) ? query.period : ''

  const canonicalUrl = localizedUrl

  const metaTitle = ({
    de: `${topicTitle} KI-News – Aktuelle Berichte & Analysen`,
    en: `${topicTitle} AI News – Latest Coverage & Analysis`,
    zh: `${topicTitle} AI新闻 – 最新报道与分析`,
    fr: `${topicTitle} Actualités IA – Dernières analyses`,
    es: `${topicTitle} Noticias IA – Últimos informes y análisis`,
    pt: `${topicTitle} Notícias IA – Últimas análises`,
    ja: `${topicTitle} AIニュース – 最新レポート＆分析`,
    ko: `${topicTitle} AI 뉴스 – 최신 보도 & 분석`,
  } as Record<string, string>)[lang] || `${topicTitle} AI News – Latest Coverage & Analysis`

  const metaDescription = ({
    de: `Kuratierte KI-Berichterstattung zu ${topicTitle}: Technologie-Updates, Investment-Signale und praktische Tipps.`,
    en: `Curated AI coverage for ${topicTitle}: technology updates, investment signals, and practical tips.`,
    zh: `${topicTitle}精选AI报道：技术动态、投资信号和实用技巧。`,
    fr: `Couverture IA sélectionnée pour ${topicTitle} : actualités tech, signaux d'investissement et conseils pratiques.`,
    es: `Cobertura de IA seleccionada para ${topicTitle}: noticias tecnológicas, señales de inversión y consejos prácticos.`,
    pt: `Cobertura de IA selecionada para ${topicTitle}: notícias de tecnologia, sinais de investimento e dicas práticas.`,
    ja: `${topicTitle}のAI厳選記事：テクノロジー、投資シグナル、実践ヒント。`,
    ko: `${topicTitle} AI 큐레이션: 기술 뉴스, 투자 신호, 실용 팁.`,
  } as Record<string, string>)[lang] || `Curated AI coverage for ${topicTitle}: technology updates, investment signals, and practical tips.`

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': siteUrl(`/en/topic/${topic}`),
        ...Object.fromEntries(
          SUPPORTED_LANGUAGES.map((code) => [
            toBcp47(code),
            siteUrl(`/${code}/topic/${topic}`),
          ])
        ),
      },
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: '/logo/social-share-en.png',
          width: 1200,
          height: 630,
          alt: `Frontier – ${topicTitle}`,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const enSlugs = new Set<string>()
  const zhSlugs = new Set<string>()

  const weeks = (await readWeeks()).weeks || []
  for (const week of weeks.slice(0, 4)) {
    const { trends } = await readPeriodData(week.id)
    for (const item of trends?.trends?.en || []) {
      const slug = toTopicSlug(item.title)
      if (slug && slug !== 'topic') enSlugs.add(slug)
    }
    for (const item of trends?.trends?.zh || []) {
      const slug = toTopicSlug(item.title)
      if (slug && slug !== 'topic') zhSlugs.add(slug)
    }
  }

  return SUPPORTED_LANGUAGES.flatMap((lang) => {
    const slugs = lang === 'zh' && zhSlugs.size ? zhSlugs : enSlugs
    return Array.from(slugs).slice(0, 40).map((topic) => ({ lang, topic }))
  })
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { lang, topic } = await params
  if (!isSupportedLanguage(lang)) notFound()

  const query = await searchParams
  const topicQuery = normalizeTopicQuery(query.q)
  const terms = toSearchTerms(topic, topicQuery)
  if (terms.length === 0) notFound()

  const periodFilter = isValidPeriodId(query.period) ? query.period : ''
  const buckets = await getTopicBuckets(terms, lang, periodFilter || undefined)
  const topicTitle = topicDisplayTitle(topic, topicQuery)
  const topicQueryParam = topicQuery || undefined
  const sectionFilter = parseSection(query.section)
  const sectionBuckets = buckets
    .map((bucket) => projectBucketBySection(bucket, sectionFilter))
    .filter((bucket) => bucketResultCount(bucket) > 0)

  const availablePeriods = sectionBuckets.map((bucket) => bucket.periodId)
  const activePeriodFilter = periodFilter && availablePeriods.includes(periodFilter) ? periodFilter : ''

  const filteredBuckets = activePeriodFilter
    ? sectionBuckets.filter((bucket) => bucket.periodId === activePeriodFilter)
    : sectionBuckets

  const requestedPage = parsePositiveInt(query.page)
  const totalPages = Math.max(1, Math.ceil(filteredBuckets.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)

  const start = (currentPage - 1) * PAGE_SIZE
  const pagedBuckets = filteredBuckets.slice(start, start + PAGE_SIZE)

  const total = filteredBuckets.reduce((acc, item) => acc + bucketResultCount(item), 0)

  const t = (translations: Record<string, string>): string =>
    translations[lang] || translations.en
  const sectionTitle = {
    all: t({ de: 'Alle Bereiche', en: 'All sections', zh: '所有板块', fr: 'Toutes les sections', es: 'Todas las secciones', pt: 'Todas as seções', ja: '全セクション', ko: '모든 섹션' }),
    tech: t({ de: 'Technologie', en: 'Technology', zh: '科技', fr: 'Technologie', es: 'Tecnología', pt: 'Tecnologia', ja: 'テクノロジー', ko: '기술' }),
    investment: t({ de: 'Investitionen', en: 'Investment', zh: '投资', fr: 'Investissement', es: 'Inversión', pt: 'Investimento', ja: '投資', ko: '투자' }),
    tips: t({ de: 'Tipps', en: 'Tips', zh: '技巧', fr: 'Conseils', es: 'Consejos', pt: 'Dicas', ja: 'ヒント', ko: '팁' }),
  } as const
  const breadcrumbSchema = buildBreadcrumbSchema(lang, topic, topicTitle)
  const itemListSchema = buildItemListSchema(lang, topicTitle, pagedBuckets, sectionFilter)
  const faqSchema = buildFAQSchema(lang, topicTitle, filteredBuckets)

  return (
    <main id="main-content">
    <article className="mx-auto max-w-4xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold">{topicTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({ de: 'Themen-Archiv', en: 'Topic archive', zh: '主题归档', fr: 'Archive thématique', es: 'Archivo temático', pt: 'Arquivo temático', ja: 'トピックアーカイブ', ko: '주제 아카이브' })} • {total} {t({ de: 'Treffer', en: 'matches', zh: '条结果', fr: 'résultats', es: 'resultados', pt: 'resultados', ja: '件', ko: '건' })}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <a className="underline" href={`/${lang}`}>{t({ de: 'Zur Startseite', en: 'Back to home', zh: '返回首页', fr: "Retour à l'accueil", es: 'Volver al inicio', pt: 'Voltar ao início', ja: 'ホームに戻る', ko: '홈으로 돌아가기' })}</a>
          <span> • </span>
          <a
            className="underline"
            href={`/api/content-summary?lang=${lang}&section=${sectionFilter}&periodId=${encodeURIComponent(periodFilter || pagedBuckets[0]?.periodId || '')}&topic=${encodeURIComponent(terms.join(' '))}`}
          >
            GEO summary endpoint
          </a>
        </p>

        <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="Section filter">
          {TOPIC_SECTIONS.map((section) => (
            <a
              key={section}
              href={buildTopicHref(lang, topic, { section, period: periodFilter || undefined, q: topicQueryParam })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${sectionFilter === section ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
            >
              {sectionTitle[section]}
            </a>
          ))}
        </nav>

        {availablePeriods.length > 0 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="Period filter">
            <a
              href={buildTopicHref(lang, topic, { section: sectionFilter, q: topicQueryParam })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter ? 'border-border text-muted-foreground' : 'border-primary text-primary'}`}
            >
              {t({ de: 'Alle Zeiträume', en: 'All periods', zh: '所有时段', fr: 'Toutes les périodes', es: 'Todos los periodos', pt: 'Todos os períodos', ja: '全期間', ko: '전체 기간' })}
            </a>
            {availablePeriods.slice(0, 12).map((periodId) => (
              <a
                key={periodId}
                href={buildTopicHref(lang, topic, { period: periodId, section: sectionFilter, q: topicQueryParam })}
                className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter === periodId ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
              >
                {periodId}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {pagedBuckets.length === 0 ? (
        <p className="text-muted-foreground">{t({ de: 'Keine Einträge für dieses Thema gefunden.', en: 'No entries found for this topic.', zh: '未找到该主题的内容。', fr: 'Aucune entrée trouvée pour ce sujet.', es: 'No se encontraron entradas para este tema.', pt: 'Nenhuma entrada encontrada para este tópico.', ja: 'このトピックに関するエントリは見つかりませんでした。', ko: '이 주제에 대한 항목을 찾을 수 없습니다.' })}</p>
      ) : (
        <div className="space-y-10">
          {pagedBuckets.map((bucket) => (
            <section key={bucket.periodId} className="space-y-5">
              <h2 className="text-2xl font-semibold">
                <a className="hover:underline" href={`/${lang}/week/${bucket.periodId}`}>
                  {bucket.periodId}
                </a>
              </h2>

              {bucket.tech.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.tech}</h3>
                  <ul className="space-y-3">
                    {bucket.tech.slice(0, 8).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tech', post.id)
                      return (
                        <li id={anchorId} key={`tech-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.content}</p>
                          <p className="text-sm text-muted-foreground">{post.category} • {post.source}</p>
                          <a
                            className="text-xs text-muted-foreground underline"
                            href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}
                          >
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.primary.length + bucket.secondary.length + bucket.ma.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.investment}</h3>
                  <ul className="space-y-3">
                    {bucket.primary.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'pm', post.id)
                      return (
                        <li id={anchorId} key={`pm-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.company} • {post.round}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                    {bucket.secondary.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'sm', post.id)
                      return (
                        <li id={anchorId} key={`sm-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.ticker}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                    {bucket.ma.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'ma', post.id)
                      return (
                        <li id={anchorId} key={`ma-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.acquirer} → {post.target}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.tips.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.tips}</h3>
                  <ul className="space-y-3">
                    {bucket.tips.slice(0, 6).map((tip) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tips', tip.id)
                      return (
                        <li id={anchorId} key={`tip-${bucket.periodId}-${tip.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{tip.category}</p>
                          <p className="text-sm text-muted-foreground">{tip.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {filteredBuckets.length > PAGE_SIZE ? (
        <nav className="mt-10 flex items-center justify-between border-t border-border pt-4" aria-label="Topic pagination">
          {currentPage > 1 ? (
            <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, q: topicQueryParam, section: sectionFilter, page: currentPage - 1 })}>
              {t({ de: '← Vorherige', en: '← Previous', zh: '← 上一页', fr: '← Précédent', es: '← Anterior', pt: '← Anterior', ja: '← 前へ', ko: '← 이전' })}
            </a>
          ) : (
            <span className="text-muted-foreground">{t({ de: '← Vorherige', en: '← Previous', zh: '← 上一页', fr: '← Précédent', es: '← Anterior', pt: '← Anterior', ja: '← 前へ', ko: '← 이전' })}</span>
          )}

          <span className="text-sm text-muted-foreground">
            {t({ de: 'Seite', en: 'Page', zh: '页', fr: 'Page', es: 'Página', pt: 'Página', ja: 'ページ', ko: '페이지' })} {currentPage} / {totalPages}
          </span>

          {currentPage < totalPages ? (
            <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, q: topicQueryParam, section: sectionFilter, page: currentPage + 1 })}>
              {t({ de: 'Nächste →', en: 'Next →', zh: '下一页 →', fr: 'Suivant →', es: 'Siguiente →', pt: 'Próximo →', ja: '次へ →', ko: '다음 →' })}
            </a>
          ) : (
            <span className="text-muted-foreground">{t({ de: 'Nächste →', en: 'Next →', zh: '下一页 →', fr: 'Suivant →', es: 'Siguiente →', pt: 'Próximo →', ja: '次へ →', ko: '다음 →' })}</span>
          )}
        </nav>
      ) : null}
      <footer className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
        <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href="/contact">
          {t({ de: 'Kontakt', en: 'Contact', zh: '联系', fr: 'Contact', es: 'Contacto', pt: 'Contato', ja: 'お問い合わせ', ko: '문의' })}
        </a>
        <span className="mx-2">|</span>
        <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href="/datenschutz">
          {t({ de: 'Datenschutz', en: 'Privacy Policy', zh: '隐私政策', fr: 'Confidentialité', es: 'Privacidad', pt: 'Privacidade', ja: 'プライバシー', ko: '개인정보' })}
        </a>
      </footer>
    </article>
    </main>
  )
}
