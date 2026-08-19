import { TechPost } from '@/lib/types'
import { SITE_URL, siteUrl } from '@/lib/site'

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'Frontier',
    url: SITE_URL,
    logo: siteUrl('/icon.svg'),
    description: 'AI intelligence stream covering technology, investment, and practical workflows in English and Chinese.',
    foundingDate: '2026-01',
    publishingPrinciples: siteUrl('/editorial-policy'),
    ethicsPolicy: siteUrl('/editorial-policy'),
    correctionsPolicy: siteUrl('/corrections'),
    ownershipFundingInfo: siteUrl('/about'),
    diversityPolicy: siteUrl('/source-methodology'),
    knowsAbout: [
      'artificial intelligence',
      'generative AI',
      'large language models',
      'AI investment',
      'AI workflows',
      'AI policy',
    ],
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Frontier',
    url: SITE_URL,
    inLanguage: ['en', 'zh-Hans'],
    description: 'Continuously collected AI news with technology, investment, and practical workflow coverage.',
    potentialAction: {
      '@type': 'SearchAction',
      target: siteUrl('/?search={search_term_string}'),
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ArticleSchema({ post, inLanguage = 'de', url }: { post: TechPost; inLanguage?: string; url?: string }) {
  // Use the first line of content as the headline (it acts as the article title),
  // truncated to 110 chars for schema.org compliance. Falls back to sliced content.
  const firstLine = (post.content || '').split('\n')[0]?.trim()
  const headline = (firstLine && firstLine.length > 0 ? firstLine : post.content).slice(0, 110)

  // Semantics: this is OUR summary page, not the original article.
  //   url / mainEntityOfPage  -> the Frontier story fragment where the schema lives
  //   isBasedOn               -> the external source we summarised, if any
  // Previously mainEntityOfPage pointed at the external source, which is
  // schema.org-wrong (the "main entity" of this page IS this page).
  const canonicalUrl = url || SITE_URL
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description: post.content,
    datePublished: post.timestamp,
    dateModified: post.timestamp,
    image: siteUrl('/og-image.jpg'),
    inLanguage,
    isAccessibleForFree: true,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: 'Frontier',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Frontier',
      logo: {
        '@type': 'ImageObject',
        url: siteUrl('/icon.svg'),
      },
    },
    // NOTE: `speakable` deliberately NOT set here. A per-item speakable on an
    // aggregation page matches selectors across EVERY other item's headline
    // and body, which contradicts Google's "concise, 20-30s" speakable
    // guidance. Speakable lives on the page-level CollectionPageSchema
    // instead, targeting the takeaways section only.
  }
  if (post.sourceUrl) {
    schema.isBasedOn = post.sourceUrl
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema({ lang = 'en' }: { lang?: string }) {
  const faqs: Record<string, Array<{ q: string; a: string }>> = {
    en: [
      { q: 'What is Frontier?', a: 'Frontier is an AI intelligence stream that collects technology breakthroughs, investment news, and practical workflows from public sources.' },
      { q: 'How often is the content updated?', a: 'Sources are collected on continuous fast, medium, and slow schedules throughout the day.' },
      { q: 'What languages does Frontier support?', a: 'Frontier supports English and Simplified Chinese.' },
      { q: 'What types of AI news does Frontier cover?', a: 'Frontier covers three main categories: Tech (AI breakthroughs, research, and product launches), Investment (funding rounds, M&A, market movements), and Tips (practical AI tools and prompts).' },
    ],
    zh: [
      { q: '什么是 Frontier？', a: 'Frontier 是从公开来源持续收集技术突破、投资新闻和实用工作流的 AI 情报流。' },
      { q: '内容多久更新一次？', a: '信息源按照快速、中速和慢速三个频率在一天内持续更新。' },
      { q: 'Frontier 支持哪些语言？', a: 'Frontier 支持英语和简体中文。' },
      { q: 'Frontier涵盖哪些类型的AI新闻？', a: 'Frontier涵盖三大类别：科技（AI突破、研究、产品发布）、投资（融资轮次、并购、市场动态）和技巧（实用AI工具和提示词）。' },
    ],
  }

  const langFaqs = faqs[lang] || faqs.en

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: langFaqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbListSchema({ weekId, weekLabel, lang = 'en' }: { weekId: string; weekLabel: string; lang?: string }) {
  const homeLabel = ({ en: 'Home', zh: '首页' } as Record<string, string>)[lang] || 'Home'
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: siteUrl(`/${lang}`) },
      { '@type': 'ListItem', position: 2, name: weekLabel, item: siteUrl(`/${lang}/week/${weekId}`) },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function SoftwareApplicationSchema({
  name,
  description,
  url,
  lang = 'en'
}: {
  name: string
  description: string
  url: string
  lang?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'NewsApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    author: {
      '@type': 'Organization',
      name: 'Frontier',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Frontier',
      logo: {
        '@type': 'ImageObject',
        url: siteUrl('/icon.svg'),
      },
    },
    inLanguage: ['en', 'zh-Hans'],
    featureList: [
      '35+ curated news sources',
      'English and Chinese content',
      'Continuous scheduled collection',
      'AI investment tracking',
      'Newsletter delivery',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/** Reusable ItemList schema with empty-guard: returns null when items array is empty */
export function ItemListSchema({ items, name, lang }: { items: Array<{ url: string; name: string }>; name: string; lang?: string }) {
  if (!items || items.length === 0) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * CollectionPage schema — tells Google this page is a curated list of
 * articles, not a single primary article. Complements the per-item
 * NewsArticle schemas, which continue to describe individual entries.
 *
 * Intentionally NOT using `hasPart`: our individual article items do not
 * have unique on-site URLs (all live on this week page), so any hasPart
 * list would collapse to N duplicate NewsArticle nodes at the same URL,
 * which weakens entity resolution instead of helping it. Add hasPart
 * back once we give each article a stable internal fragment or canonical.
 *
 * `speakable` points at the takeaways section (one concise, page-scoped
 * block) rather than spraying across every article body. Google's
 * Speakable guidance asks for 20-30s of focused text, not an entire
 * roundup page.
 */
export function CollectionPageSchema({
  url,
  name,
  description,
  inLanguage,
  datePublished,
  dateModified,
  speakableCssSelector,
}: {
  url: string
  name: string
  description: string
  inLanguage: string
  datePublished?: string
  dateModified?: string
  speakableCssSelector?: string[]
}) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url,
    name,
    description,
    inLanguage,
    isAccessibleForFree: true,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Frontier',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Frontier',
      url: SITE_URL,
    },
  }
  if (datePublished) schema.datePublished = datePublished
  if (dateModified) schema.dateModified = dateModified
  if (speakableCssSelector && speakableCssSelector.length > 0) {
    schema.speakable = {
      '@type': 'SpeakableSpecification',
      cssSelector: speakableCssSelector,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
