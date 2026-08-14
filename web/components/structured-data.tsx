import { TechPost } from '@/lib/types'

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'Forager',
    url: 'https://www.forager.example',
    logo: 'https://www.forager.example/icon.svg',
    description: 'Multilingual AI news aggregator providing daily tech, investment, and tips content in 8 languages.',
    foundingDate: '2026-01',
    publishingPrinciples: 'https://www.forager.example/editorial-policy',
    ethicsPolicy: 'https://www.forager.example/editorial-policy',
    correctionsPolicy: 'https://www.forager.example/corrections',
    ownershipFundingInfo: 'https://www.forager.example/about',
    diversityPolicy: 'https://www.forager.example/source-methodology',
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
    name: 'Forager',
    url: 'https://www.forager.example',
    inLanguage: ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'],
    description: 'Daily AI news aggregator with tech breakthroughs, investment news, and practical tips.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.forager.example/?search={search_term_string}',
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
  //   url / mainEntityOfPage  -> the Forager story fragment where the schema lives
  //   isBasedOn               -> the external source we summarised, if any
  // Previously mainEntityOfPage pointed at the external source, which is
  // schema.org-wrong (the "main entity" of this page IS this page).
  const canonicalUrl = url || 'https://www.forager.example'
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description: post.content,
    datePublished: post.timestamp,
    dateModified: post.timestamp,
    image: 'https://www.forager.example/og-image.jpg',
    inLanguage,
    isAccessibleForFree: true,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: 'Forager',
      url: 'https://www.forager.example',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Forager',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.forager.example/icon.svg',
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

export function VideoSchema({ video }: { video: TechPost }) {
  if (!video.isVideo || !video.videoId) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.content.slice(0, 110),
    description: video.content,
    thumbnailUrl: video.videoThumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    uploadDate: video.timestamp,
    duration: video.videoDuration,
    contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
    publisher: {
      '@type': 'Organization',
      name: 'Forager',
    },
    author: {
      '@type': 'Organization',
      name: 'Forager',
      url: 'https://www.forager.example',
    },
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
    de: [
      { q: 'Was ist Forager?', a: 'Forager ist ein mehrsprachiger (8 Sprachen: DE, EN, ZH, FR, ES, PT, JA, KO) täglicher KI-News-Aggregator. Er kuratiert Technologie-Durchbrüche, Investment-News, praktische Tipps und YouTube-Videos aus über 40 Quellen.' },
      { q: 'Wie oft wird der Inhalt aktualisiert?', a: 'Der Inhalt wird täglich am späten Abend (Europe/Berlin) aktualisiert, mit neuen Tech-Meldungen, Investment-News und praktischen Tipps.' },
      { q: 'Welche Sprachen unterstützt Forager?', a: 'Forager unterstützt 8 Sprachen: Deutsch, Englisch, Chinesisch, Französisch, Spanisch, Portugiesisch, Japanisch und Koreanisch.' },
      { q: 'Welche Arten von KI-News deckt Forager ab?', a: 'Forager deckt drei Hauptkategorien ab: Tech (KI-Durchbrüche, Forschung, Produkteinführungen), Investment (Finanzierungsrunden, M&A, Marktbewegungen) und Tipps (praktische KI-Tools und Prompts).' },
    ],
    en: [
      { q: 'What is Forager?', a: 'Forager is a multilingual (8 languages: DE, EN, ZH, FR, ES, PT, JA, KO) daily AI news aggregator that curates tech breakthroughs, investment news, practical tips, and YouTube videos from 40+ sources.' },
      { q: 'How often is the content updated?', a: 'Content is updated daily in the late evening (Europe/Berlin time), with new tech posts, investment news, and practical tips curated every day.' },
      { q: 'What languages does Forager support?', a: 'Forager supports 8 languages: German, English, Chinese, French, Spanish, Portuguese, Japanese, and Korean.' },
      { q: 'What types of AI news does Forager cover?', a: 'Forager covers three main categories: Tech (AI breakthroughs, research, and product launches), Investment (funding rounds, M&A, market movements), and Tips (practical AI tools and prompts).' },
    ],
    zh: [
      { q: '什么是Forager？', a: 'Forager是一个多语言（8种语言：DE、EN、ZH、FR、ES、PT、JA、KO）每日AI新闻聚合器，精选技术突破、投资新闻、实用技巧和YouTube视频，来源超过40个。' },
      { q: '内容多久更新一次？', a: '内容每天在柏林时间深夜更新，包含新的技术报道、投资新闻和实用技巧。' },
      { q: 'Forager支持哪些语言？', a: 'Forager支持8种语言：德语、英语、中文、法语、西班牙语、葡萄牙语、日语和韩语。' },
      { q: 'Forager涵盖哪些类型的AI新闻？', a: 'Forager涵盖三大类别：科技（AI突破、研究、产品发布）、投资（融资轮次、并购、市场动态）和技巧（实用AI工具和提示词）。' },
    ],
    fr: [
      { q: "Qu'est-ce que Forager ?", a: "Forager est un agrégateur d'actualités IA multilingue (8 langues) qui sélectionne quotidiennement des percées technologiques, des nouvelles d'investissement, des conseils pratiques et des vidéos YouTube à partir de plus de 40 sources." },
      { q: 'À quelle fréquence le contenu est-il mis à jour ?', a: 'Le contenu est mis à jour quotidiennement en fin de soirée (heure de Berlin), avec de nouveaux articles tech, des actualités investissement et des conseils pratiques.' },
      { q: 'Quelles langues sont prises en charge ?', a: 'Forager prend en charge 8 langues : allemand, anglais, chinois, français, espagnol, portugais, japonais et coréen.' },
      { q: "Quels types d'actualités IA couvre Forager ?", a: "Forager couvre trois catégories : Tech (percées IA, recherche, lancements de produits), Investissement (levées de fonds, M&A, mouvements de marché) et Astuces (outils IA pratiques et prompts)." },
    ],
    es: [
      { q: '¿Qué es Forager?', a: 'Forager es un agregador de noticias de IA multilingüe (8 idiomas) que selecciona diariamente avances tecnológicos, noticias de inversión, consejos prácticos y videos de YouTube de más de 40 fuentes.' },
      { q: '¿Con qué frecuencia se actualiza el contenido?', a: 'El contenido se actualiza diariamente a última hora de la tarde (hora de Berlín), con nuevas noticias de tecnología, inversión y consejos prácticos.' },
      { q: '¿Qué idiomas admite Forager?', a: 'Forager admite 8 idiomas: alemán, inglés, chino, francés, español, portugués, japonés y coreano.' },
      { q: '¿Qué tipos de noticias de IA cubre Forager?', a: 'Forager cubre tres categorías principales: Tecnología (avances en IA, investigación, lanzamientos), Inversión (rondas de financiación, M&A, movimientos de mercado) y Consejos (herramientas de IA prácticas y prompts).' },
    ],
    pt: [
      { q: 'O que é o Forager?', a: 'Forager é um agregador de notícias de IA multilíngue (8 idiomas) que seleciona diariamente avanços tecnológicos, notícias de investimento, dicas práticas e vídeos do YouTube de mais de 40 fontes.' },
      { q: 'Com que frequência o conteúdo é atualizado?', a: 'O conteúdo é atualizado diariamente no fim da noite (horário de Berlim), com novas notícias de tecnologia, investimento e dicas práticas.' },
      { q: 'Quais idiomas o Forager suporta?', a: 'Forager suporta 8 idiomas: alemão, inglês, chinês, francês, espanhol, português, japonês e coreano.' },
      { q: 'Que tipos de notícias de IA o Forager cobre?', a: 'Forager cobre três categorias: Tecnologia (avanços em IA, pesquisa, lançamentos), Investimento (rodadas de financiamento, M&A, movimentos de mercado) e Dicas (ferramentas de IA práticas e prompts).' },
    ],
    ja: [
      { q: 'Foragerとは？', a: 'Foragerは多言語（8言語：DE、EN、ZH、FR、ES、PT、JA、KO）対応の毎日のAIニュースアグリゲーターです。40以上のソースから技術的ブレークスルー、投資ニュース、実践ヒント、YouTube動画を厳選しています。' },
      { q: 'コンテンツはどのくらいの頻度で更新されますか？', a: 'コンテンツは毎日ベルリン時間の深夜に更新され、新しいテクノロジー記事、投資ニュース、実践ヒントが追加されます。' },
      { q: 'Foragerはどの言語をサポートしていますか？', a: 'Foragerは8言語をサポートしています：ドイツ語、英語、中国語、フランス語、スペイン語、ポルトガル語、日本語、韓国語。' },
      { q: 'Foragerはどのような種類のAIニュースをカバーしていますか？', a: 'Foragerは3つの主要カテゴリをカバーしています：テック（AIブレークスルー、研究、製品発表）、投資（資金調達、M&A、市場動向）、ヒント（実用的なAIツールとプロンプト）。' },
    ],
    ko: [
      { q: 'Forager란 무엇인가요?', a: 'Forager는 다국어(8개 언어: DE, EN, ZH, FR, ES, PT, JA, KO) 일일 AI 뉴스 애그리게이터입니다. 40개 이상의 소스에서 기술 돌파구, 투자 뉴스, 실용 팁, YouTube 동영상을 엄선합니다.' },
      { q: '콘텐츠는 얼마나 자주 업데이트되나요?', a: '콘텐츠는 매일 베를린 시간 늦은 저녁에 업데이트되며, 새로운 기술 기사, 투자 뉴스, 실용 팁이 추가됩니다.' },
      { q: 'Forager는 어떤 언어를 지원하나요?', a: 'Forager는 8개 언어를 지원합니다: 독일어, 영어, 중국어, 프랑스어, 스페인어, 포르투갈어, 일본어, 한국어.' },
      { q: 'Forager는 어떤 종류의 AI 뉴스를 다루나요?', a: 'Forager는 세 가지 주요 카테고리를 다룹니다: 기술(AI 돌파구, 연구, 제품 출시), 투자(펀딩 라운드, M&A, 시장 동향), 팁(실용적인 AI 도구 및 프롬프트).' },
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
  const homeLabel = ({ de: 'Startseite', en: 'Home', zh: '首页', fr: 'Accueil', es: 'Inicio', pt: 'Início', ja: 'ホーム', ko: '홈' } as Record<string, string>)[lang] || 'Home'
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: `https://www.forager.example/${lang}` },
      { '@type': 'ListItem', position: 2, name: weekLabel, item: `https://www.forager.example/${lang}/week/${weekId}` },
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
      name: 'Forager',
      url: 'https://www.forager.example',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Forager',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.forager.example/icon.svg',
      },
    },
    inLanguage: ['de', 'en', 'zh-Hans', 'fr', 'es', 'pt', 'ja', 'ko'],
    featureList: [
      '35+ curated news sources',
      '8 language support',
      'Daily and weekly updates',
      'AI investment tracking',
      'YouTube video curation',
      'REST API access',
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
      name: 'Forager',
      url: 'https://www.forager.example',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Forager',
      url: 'https://www.forager.example',
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
