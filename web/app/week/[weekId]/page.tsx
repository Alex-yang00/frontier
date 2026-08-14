import type { Metadata } from 'next'
import { ArticleSchema, VideoSchema, BreadcrumbListSchema, CollectionPageSchema } from '@/components/structured-data'
import { formatPeriodTitle, periodPublishedDate } from '@/lib/period-utils'
import type { TechPost, MultilingualData, InvestmentData, TipPost, ImpactLevel } from '@/lib/types'
import { toTopicSlug } from '@/lib/topic-utils'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'
import {
  ARTICLE_CTA_LABELS,
  articleHref,
  maStoryId,
  primaryStoryId,
  secondaryStoryId,
  techStoryId,
  tipStoryId,
} from '@/lib/article-routes'

// API base URL with production fallback
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api'

// ISR: revalidate every hour
export const revalidate = 3600

// ---------------------------------------------------------------------------
// 8-language i18n lookup helpers
// ---------------------------------------------------------------------------
type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// Next.js 15+ async params/searchParams typing per request
export type Props = {
  params: Promise<{ weekId: string }>
  searchParams: Promise<{ lang?: string }>
}

// ---------------------------------------------------------------------------
// Metadata (title, description, OG)
// ---------------------------------------------------------------------------
function metaTitles(periodLabel: string): L {
  return {
    de: `KI-News ${periodLabel} | Forager`,
    en: `AI News ${periodLabel} | Forager`,
    zh: `AI新闻 ${periodLabel} — 科技、投资与实用技巧`,
    fr: `Actualités IA ${periodLabel} | Forager`,
    es: `Noticias IA ${periodLabel} | Forager`,
    pt: `Notícias IA ${periodLabel} | Forager`,
    ja: `AIニュース ${periodLabel} — テクノロジー、投資＆実用ヒント`,
    ko: `AI 뉴스 ${periodLabel} — 기술, 투자 및 실용 팁`,
  }
}

function metaDescriptions(periodLabel: string): L {
  return {
    de: `Kuratierte KI-News der ${periodLabel}: Technologie, Investment-Signale, praktische Tipps und Quellenlinks auf Forager.`,
    en: `Curated AI news for ${periodLabel}: technology, investment signals, practical tips, and source links on Forager.`,
    zh: `${periodLabel} AI新闻精选：技术突破、投资信号和实用技巧 – 每日更新于 Forager。`,
    fr: `Actualités IA pour ${periodLabel}: technologie, signaux d'investissement, conseils pratiques et sources sur Forager.`,
    es: `Noticias de IA para ${periodLabel}: tecnología, señales de inversión, consejos prácticos y fuentes en Forager.`,
    pt: `Notícias de IA para ${periodLabel}: tecnologia, sinais de investimento, dicas práticas e fontes no Forager.`,
    ja: `${periodLabel}のAIニュース厳選：技術的ブレークスルー、投資シグナル、実践ヒント – 毎日更新。`,
    ko: `${periodLabel} AI 뉴스 큐레이션: 기술 돌파구, 투자 신호, 실용 팁 – 매일 업데이트.`,
  }
}

function ogAlt(periodLabel: string): L {
  return {
    de: `Forager – KI-News ${periodLabel}`,
    en: `Forager – AI News ${periodLabel}`,
    zh: `Forager – AI新闻 ${periodLabel}`,
    fr: `Forager – Actualités IA ${periodLabel}`,
    es: `Forager – Noticias IA ${periodLabel}`,
    pt: `Forager – Notícias IA ${periodLabel}`,
    ja: `Forager – AIニュース ${periodLabel}`,
    ko: `Forager – AI 뉴스 ${periodLabel}`,
  }
}

// ---------------------------------------------------------------------------
// H1 heading
// ---------------------------------------------------------------------------
function h1Headings(periodLabel: string): L {
  return {
    de: `KI-News ${periodLabel}`,
    en: `AI News ${periodLabel}`,
    zh: `AI新闻 ${periodLabel}`,
    fr: `Actualités IA ${periodLabel}`,
    es: `Noticias IA ${periodLabel}`,
    pt: `Notícias IA ${periodLabel}`,
    ja: `AIニュース ${periodLabel}`,
    ko: `AI 뉴스 ${periodLabel}`,
  }
}

// ---------------------------------------------------------------------------
// H2 section headings
// ---------------------------------------------------------------------------
const h2Tech: L = {
  de: 'Was sind die wichtigsten KI-Durchbrüche?',
  en: 'What are the top AI breakthroughs?',
  zh: '最重要的AI突破有哪些？',
  fr: 'Quelles sont les principales avancées en IA ?',
  es: '¿Cuáles son los principales avances en IA?',
  pt: 'Quais são os principais avanços em IA?',
  ja: '最も重要なAIの進展は？',
  ko: '주요 AI 혁신은 무엇인가요?',
}

const h2Videos: L = {
  de: 'Top KI-Videos der Woche',
  en: 'Top AI Videos This Week',
  zh: '本周热门AI视频',
  fr: 'Meilleures vidéos IA de la semaine',
  es: 'Mejores videos de IA de la semana',
  pt: 'Melhores vídeos de IA da semana',
  ja: '今週のトップAI動画',
  ko: '이번 주 최고의 AI 동영상',
}

const h2Investment: L = {
  de: 'Was sind die neuesten KI-Investment-Signale?',
  en: 'What are the latest AI investment signals?',
  zh: '最新的AI投资信号有哪些？',
  fr: "Quels sont les derniers signaux d'investissement IA ?",
  es: '¿Cuáles son las últimas señales de inversión en IA?',
  pt: 'Quais são os sinais mais recentes de investimento em IA?',
  ja: '最新のAI投資シグナルは？',
  ko: '최신 AI 투자 신호는?',
}

const h2Tips: L = {
  de: 'Welche praktischen KI-Tipps gibt es diese Woche?',
  en: 'What are practical AI tips this week?',
  zh: '本周有哪些实用的AI技巧？',
  fr: 'Quelles astuces IA pratiques cette semaine ?',
  es: '¿Qué consejos prácticos de IA hay esta semana?',
  pt: 'Quais dicas práticas de IA esta semana?',
  ja: '今週の実用的なAIヒントは？',
  ko: '이번 주 실용적인 AI 팁은?',
}

const h2Takeaways: L = {
  de: 'Wichtigste Erkenntnisse',
  en: 'Key Takeaways',
  zh: '核心要点',
  fr: 'Points clés',
  es: 'Ideas clave',
  pt: 'Pontos principais',
  ja: '主なポイント',
  ko: '핵심 요약',
}

const h2Editorial: L = {
  de: 'Warum das heute zählt',
  en: 'Why Today Matters',
  zh: '今日看点',
  fr: "L'essentiel du jour",
  es: 'Por qué importa hoy',
  pt: 'Por que importa hoje',
  ja: '今日の注目点',
  ko: '오늘의 포인트',
}

const labelEditorialAttribution: L = {
  de: 'KI-generierte Analyse von Forager Editorial — mehr erfahren',
  en: 'AI-generated analysis by Forager Editorial — learn how we work',
  zh: '由 Forager Editorial 生成的 AI 分析 — 了解我们的方法',
  fr: 'Analyse générée par IA — Forager Editorial',
  es: 'Análisis generado por IA — Forager Editorial',
  pt: 'Análise gerada por IA — Forager Editorial',
  ja: 'Forager Editorial による AI 生成分析',
  ko: 'Forager Editorial의 AI 생성 분석',
}

// periodPublishedDate is imported from lib/period-utils — shared with
// sitemap.ts so freshness signals can't drift.

// ---------------------------------------------------------------------------
// Lead paragraphs (functions — they use dynamic counts)
// ---------------------------------------------------------------------------
function leadTech(periodLabel: string, count: number): L {
  return {
    de: `Diese ${periodLabel} umfasst ${count} kuratierte KI-Nachrichten aus Technologie, Forschung und Produktentwicklung.`,
    en: `This ${periodLabel} covers ${count} curated AI news items spanning technology, research, and product developments.`,
    zh: `本期${periodLabel}精选了${count}条AI新闻，涵盖技术、研究和产品动态。`,
    fr: `Ce ${periodLabel} couvre ${count} actualités IA sélectionnées dans les domaines de la technologie, de la recherche et des produits.`,
    es: `Este ${periodLabel} incluye ${count} noticias de IA seleccionadas sobre tecnología, investigación y desarrollos de productos.`,
    pt: `Este ${periodLabel} abrange ${count} notícias de IA selecionadas sobre tecnologia, pesquisa e desenvolvimento de produtos.`,
    ja: `この${periodLabel}は、技術・研究・製品開発にわたる${count}件のAIニュースを厳選しています。`,
    ko: `이번 ${periodLabel}은 기술, 연구, 제품 개발에 걸친 ${count}건의 AI 뉴스를 엄선했습니다.`,
  }
}

function leadVideos(count: number): L {
  return {
    de: `${count} kuratierte YouTube-Videos über KI-Entwicklungen.`,
    en: `${count} curated YouTube videos about AI developments.`,
    zh: `${count}个精选YouTube视频，聚焦AI最新发展。`,
    fr: `${count} vidéos YouTube sélectionnées sur les développements en IA.`,
    es: `${count} videos de YouTube seleccionados sobre desarrollos en IA.`,
    pt: `${count} vídeos do YouTube selecionados sobre desenvolvimentos em IA.`,
    ja: `AI最新動向に関する厳選YouTube動画${count}本。`,
    ko: `AI 발전에 관한 엄선된 YouTube 동영상 ${count}개.`,
  }
}

function leadInvestment(pm: number, sm: number, ma: number): L {
  return {
    de: `Aktuelle KI-Investment-Signale: ${pm} Finanzierungsrunden, ${sm} Markt-Updates und ${ma} M&A-Transaktionen.`,
    en: `Latest AI investment signals: ${pm} funding rounds, ${sm} market updates, and ${ma} M&A transactions.`,
    zh: `最新AI投资信号：${pm}轮融资、${sm}条市场动态和${ma}宗并购交易。`,
    fr: `Derniers signaux d'investissement IA : ${pm} levées de fonds, ${sm} actualités de marché et ${ma} transactions M&A.`,
    es: `Últimas señales de inversión en IA: ${pm} rondas de financiación, ${sm} actualizaciones de mercado y ${ma} transacciones de M&A.`,
    pt: `Últimos sinais de investimento em IA: ${pm} rodadas de financiamento, ${sm} atualizações de mercado e ${ma} transações de M&A.`,
    ja: `最新AI投資シグナル：資金調達${pm}件、市場アップデート${sm}件、M&A取引${ma}件。`,
    ko: `최신 AI 투자 신호: 펀딩 라운드 ${pm}건, 시장 업데이트 ${sm}건, M&A 거래 ${ma}건.`,
  }
}

function leadTips(count: number): L {
  return {
    de: `${count} praktische KI-Tipps aus Reddit-Communities und Experten-Blogs.`,
    en: `${count} practical AI tips curated from Reddit communities and expert blogs.`,
    zh: `${count}条实用AI技巧，精选自Reddit社区和专家博客。`,
    fr: `${count} astuces IA pratiques sélectionnées sur Reddit et des blogs d'experts.`,
    es: `${count} consejos prácticos de IA seleccionados de comunidades de Reddit y blogs de expertos.`,
    pt: `${count} dicas práticas de IA selecionadas de comunidades do Reddit e blogs de especialistas.`,
    ja: `Redditコミュニティと専門家ブログから厳選した実用AIヒント${count}件。`,
    ko: `Reddit 커뮤니티와 전문가 블로그에서 엄선한 실용 AI 팁 ${count}건.`,
  }
}

// ---------------------------------------------------------------------------
// H3 investment subheadings
// ---------------------------------------------------------------------------
const h3PrimaryMarket: L = {
  de: 'Primärmarkt – Finanzierungsrunden',
  en: 'Primary Market – Funding Rounds',
  zh: '一级市场 – 融资轮次',
  fr: 'Marché primaire – Levées de fonds',
  es: 'Mercado primario – Rondas de financiación',
  pt: 'Mercado primário – Rodadas de financiamento',
  ja: 'プライマリーマーケット – 資金調達',
  ko: '1차 시장 – 펀딩 라운드',
}

const h3SecondaryMarket: L = {
  de: 'Sekundärmarkt – Markt-Updates',
  en: 'Secondary Market – Market Updates',
  zh: '二级市场 – 市场动态',
  fr: 'Marché secondaire – Actualités de marché',
  es: 'Mercado secundario – Actualizaciones de mercado',
  pt: 'Mercado secundário – Atualizações de mercado',
  ja: 'セカンダリーマーケット – 市場動向',
  ko: '세컨더리 마켓 – 시장 동향',
}

const h3MA: L = {
  de: 'M&A – Fusionen & Übernahmen',
  en: 'M&A – Mergers & Acquisitions',
  zh: 'M&A – 并购交易',
  fr: 'M&A – Fusions & Acquisitions',
  es: 'M&A – Fusiones y Adquisiciones',
  pt: 'M&A – Fusões e Aquisições',
  ja: 'M&A – 合併・買収',
  ko: 'M&A – 인수합병',
}

// ---------------------------------------------------------------------------
// Table headers
// ---------------------------------------------------------------------------
const thCompany: L = { de: 'Unternehmen', en: 'Company', zh: '公司', fr: 'Entreprise', es: 'Empresa', pt: 'Empresa', ja: '企業', ko: '기업' }
const thAmount: L = { de: 'Betrag', en: 'Amount', zh: '金额', fr: 'Montant', es: 'Monto', pt: 'Valor', ja: '金額', ko: '금액' }
const thRound: L = { de: 'Runde', en: 'Round', zh: '轮次', fr: 'Tour', es: 'Ronda', pt: 'Rodada', ja: 'ラウンド', ko: '라운드' }
const thInvestors: L = { de: 'Investoren', en: 'Investors', zh: '投资者', fr: 'Investisseurs', es: 'Inversores', pt: 'Investidores', ja: '投資家', ko: '투자자' }
const thTicker: L = { de: 'Ticker', en: 'Ticker', zh: '股票代码', fr: 'Ticker', es: 'Ticker', pt: 'Ticker', ja: 'ティッカー', ko: '티커' }
const thPrice: L = { de: 'Kurs', en: 'Price', zh: '价格', fr: 'Prix', es: 'Precio', pt: 'Preço', ja: '株価', ko: '주가' }
const thChange: L = { de: 'Änderung', en: 'Change', zh: '变动', fr: 'Variation', es: 'Cambio', pt: 'Variação', ja: '変動', ko: '변동' }
const thAcquirer: L = { de: 'Käufer', en: 'Acquirer', zh: '收购方', fr: 'Acquéreur', es: 'Adquirente', pt: 'Adquirente', ja: '買収者', ko: '인수자' }
const thTarget: L = { de: 'Ziel', en: 'Target', zh: '目标公司', fr: 'Cible', es: 'Objetivo', pt: 'Alvo', ja: 'ターゲット', ko: '대상' }
const thDealValue: L = { de: 'Dealwert', en: 'Deal Value', zh: '交易金额', fr: 'Valeur', es: 'Valor', pt: 'Valor', ja: '取引額', ko: '거래 가치' }
const thDealType: L = { de: 'Dealtyp', en: 'Deal Type', zh: '交易类型', fr: 'Type', es: 'Tipo', pt: 'Tipo', ja: '取引種別', ko: '거래 유형' }

// ---------------------------------------------------------------------------
// Misc UI labels
// ---------------------------------------------------------------------------
const labelLanguage: L = { de: 'Sprache:', en: 'Language:', zh: '语言：', fr: 'Langue :', es: 'Idioma:', pt: 'Idioma:', ja: '言語：', ko: '언어:' }
const labelByline: L = { de: 'Von', en: 'By', zh: '作者：', fr: 'Par', es: 'Por', pt: 'Por', ja: '著者：', ko: '작성:' }
const labelPublished: L = { de: 'Veröffentlicht', en: 'Published', zh: '发布于', fr: 'Publié', es: 'Publicado', pt: 'Publicado', ja: '公開日', ko: '게시일' }
const labelContact: L = { de: 'Kontakt', en: 'Contact', zh: '联系', fr: 'Contact', es: 'Contacto', pt: 'Contato', ja: 'お問い合わせ', ko: '문의' }
const labelPrivacy: L = { de: 'Datenschutz', en: 'Privacy Policy', zh: '隐私政策', fr: 'Confidentialité', es: 'Privacidad', pt: 'Privacidade', ja: 'プライバシー', ko: '개인정보' }
const labelCategory: L = { de: 'Kategorie:', en: 'Category:', zh: '类别：', fr: 'Catégorie :', es: 'Categoría:', pt: 'Categoria:', ja: 'カテゴリ：', ko: '카테고리:' }
const labelImpact: L = { de: 'Auswirkung:', en: 'Impact:', zh: '影响：', fr: 'Impact :', es: 'Impacto:', pt: 'Impacto:', ja: '影響度：', ko: '영향:' }
const labelSource: L = { de: 'Quelle:', en: 'Source:', zh: '来源：', fr: 'Source :', es: 'Fuente:', pt: 'Fonte:', ja: '出典：', ko: '출처:' }

const noTech: L = { de: 'Keine Technologie-Beiträge verfügbar.', en: 'No technology posts available.', zh: '暂无技术文章。', fr: 'Aucun article technologique disponible.', es: 'No hay publicaciones de tecnología disponibles.', pt: 'Nenhuma publicação de tecnologia disponível.', ja: 'テクノロジー記事はありません。', ko: '기술 게시물이 없습니다.' }
const noVideos: L = { de: 'Keine Videos verfügbar.', en: 'No video posts available.', zh: '暂无视频。', fr: 'Aucune vidéo disponible.', es: 'No hay videos disponibles.', pt: 'Nenhum vídeo disponível.', ja: '動画はありません。', ko: '동영상이 없습니다.' }
const noPrimary: L = { de: 'Keine Primärmarktdaten.', en: 'No primary market data.', zh: '暂无一级市场数据。', fr: 'Aucune donnée de marché primaire.', es: 'Sin datos del mercado primario.', pt: 'Sem dados do mercado primário.', ja: 'プライマリーマーケットデータなし。', ko: '1차 시장 데이터 없음.' }
const noSecondary: L = { de: 'Keine Sekundärmarktdaten.', en: 'No secondary market data.', zh: '暂无二级市场数据。', fr: 'Aucune donnée de marché secondaire.', es: 'Sin datos del mercado secundario.', pt: 'Sem dados do mercado secundário.', ja: 'セカンダリーマーケットデータなし。', ko: '2차 시장 데이터 없음.' }
const noMA: L = { de: 'Keine M&A-Daten.', en: 'No M&A data.', zh: '暂无并购数据。', fr: 'Aucune donnée M&A.', es: 'Sin datos de M&A.', pt: 'Sem dados de M&A.', ja: 'M&Aデータなし。', ko: 'M&A 데이터 없음.' }
const noTips: L = { de: 'Keine Tipps verfügbar.', en: 'No tips available.', zh: '暂无技巧。', fr: 'Aucune astuce disponible.', es: 'No hay consejos disponibles.', pt: 'Nenhuma dica disponível.', ja: 'ヒントはありません。', ko: '팁이 없습니다.' }

const navPrev: L = { de: '\u2190 Zurück', en: '\u2190 Previous', zh: '\u2190 上一期', fr: '\u2190 Précédent', es: '\u2190 Anterior', pt: '\u2190 Anterior', ja: '\u2190 前へ', ko: '\u2190 이전' }
const navNext: L = { de: 'Weiter \u2192', en: 'Next \u2192', zh: '下一期 \u2192', fr: 'Suivant \u2192', es: 'Siguiente \u2192', pt: 'Próximo \u2192', ja: '次へ \u2192', ko: '다음 \u2192' }
const navHome: L = { de: 'Startseite', en: 'Home', zh: '首页', fr: 'Accueil', es: 'Inicio', pt: 'Início', ja: 'ホーム', ko: '홈' }
const footerInteractive: L = {
  de: 'Interaktive Version ansehen',
  en: 'View interactive version',
  zh: '查看互动版本',
  fr: 'Voir la version interactive',
  es: 'Ver versión interactiva',
  pt: 'Ver versão interativa',
  ja: 'インタラクティブ版を見る',
  ko: '인터랙티브 버전 보기',
}

// ---------------------------------------------------------------------------
// Metadata generator
// ---------------------------------------------------------------------------
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { weekId } = await params
  const rawLang = (await searchParams)?.lang || 'de'
  const lang = isSupportedLanguage(rawLang) ? rawLang : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)
  const localizedUrl = `https://www.forager.example/${lang}/week/${weekId}`

  const titles = metaTitles(periodLabel)
  const descriptions = metaDescriptions(periodLabel)
  const altTexts = ogAlt(periodLabel)

  return {
    title: t(titles, lang),
    description: t(descriptions, lang),
    alternates: {
      canonical: localizedUrl,
      languages: {
        'x-default': `https://www.forager.example/de/week/${weekId}`,
        ...Object.fromEntries(SUPPORTED_LANGUAGES.map((code) => [toBcp47(code), `https://www.forager.example/${code}/week/${weekId}`])),
      },
    },
    openGraph: {
      title: t(titles, lang),
      description: t(descriptions, lang),
      url: localizedUrl,
      type: 'article',
      // article:published_time freshness signal derived deterministically
      // from the period id (day or Saturday of ISO week). modifiedTime is
      // intentionally omitted here — generateMetadata doesn't fetch item
      // data, so we'd have to emit render time (noisy) or duplicate the
      // fetch. The JSON-LD CollectionPage in the page body uses the max
      // item timestamp, which is what Google will prefer.
      publishedTime: periodPublishedDate(weekId).toISOString(),
      images: [
        {
          url: `/api/og?period=${weekId}&lang=${lang}`,
          width: 1200,
          height: 630,
          alt: t(altTexts, lang),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t(titles, lang),
      description: t(descriptions, lang),
      images: [
        {
          url: `/api/og?period=${weekId}&lang=${lang}`,
          alt: t(altTexts, lang),
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  // Prerender only the most recent periods; older ones render on-demand with
  // ISR (revalidate above). Prerendering every period × 8 languages fired
  // hundreds of concurrent API calls per build and exhausted the backend DB
  // connection pool (2026-08-01 incident).
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      return (data.weeks || [])
        .slice(0, 6)
        .map((w: { id: string }) => ({ weekId: w.id }))
    }
  } catch {}
  return []
}

function impactBadgeClass(impact: ImpactLevel | undefined) {
  switch (impact) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function snippetFromContent(content: string, max = 100) {
  const firstLine = (content || '').split('\n')[0]?.trim() || ''
  const base = firstLine.length > 0 ? firstLine : (content || '')
  return base.length > max ? `${base.slice(0, max)}…` : base
}

export default async function WeekPage({ params, searchParams }: Props) {
  const { weekId } = await params
  const rawLang = (await searchParams)?.lang || 'de'
  const lang = isSupportedLanguage(rawLang) ? rawLang : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)

  // Fetch the feeds in parallel (trends carries the AI editorial brief)
  const [techRes, investmentRes, tipsRes, trendsRes] = await Promise.all([
    fetch(`${API_BASE}/tech/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/investment/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/tips/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/trends/${weekId}`, { next: { revalidate: 3600 } }),
  ])

  let techData: MultilingualData<TechPost> | null = null
  let investmentData: InvestmentData | null = null
  let tipsData: MultilingualData<TipPost> | null = null
  let editorialData: Record<string, { text: string; topic?: string }[]> | null = null

  try {
    if (techRes.ok) techData = await techRes.json()
  } catch {}
  try {
    if (investmentRes.ok) investmentData = await investmentRes.json()
  } catch {}
  try {
    if (tipsRes.ok) tipsData = await tipsRes.json()
  } catch {}
  try {
    if (trendsRes.ok) {
      const trendsJson = await trendsRes.json()
      if (trendsJson && typeof trendsJson.editorial === 'object') {
        editorialData = trendsJson.editorial
      }
    }
  } catch {}

  const editorialBullets = editorialData
    ? editorialData[lang] || editorialData.en || []
    : []

  const techPostsAll: TechPost[] = techData ? (techData as any)[lang] || (techData as any).de || [] : []
  const nonVideoTechPosts = (techPostsAll || []).filter((p) => !p.isVideo)
  const videoTechPosts = (techPostsAll || []).filter((p) => !!p.isVideo)

  const primaryMarket = investmentData ? (investmentData as any).primaryMarket?.[lang] || [] : []
  const secondaryMarket = investmentData ? (investmentData as any).secondaryMarket?.[lang] || [] : []
  const maDeals = investmentData ? (investmentData as any).ma?.[lang] || [] : []

  const tips = tipsData ? (tipsData as any)[lang] || [] : []

  // Optionally fetch weeks to display date range and prev/next navigation
  let dateRange: string | undefined
  let prevId: string | undefined
  let nextId: string | undefined
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (weeksRes.ok) {
      const weeksData = await weeksRes.json()
      const allWeeks: { id: string; dateRange?: string; days?: { id: string }[] }[] = weeksData?.weeks || []
      const match = allWeeks.find((w) => w.id === weekId)
      dateRange = match?.dateRange

      // Build a flat list of all period IDs (weeks + days) for prev/next
      const allIds: string[] = []
      for (const w of allWeeks) {
        allIds.push(w.id)
        if (w.days) {
          for (const d of w.days) {
            allIds.push(d.id)
          }
        }
      }
      const currentIdx = allIds.indexOf(weekId)
      if (currentIdx > 0) prevId = allIds[currentIdx - 1]
      if (currentIdx >= 0 && currentIdx < allIds.length - 1) nextId = allIds[currentIdx + 1]
    }
  } catch {}

  // Build an extractive Key Takeaways list from existing data. No LLM call.
  // This gives AI answer engines (Perplexity, AI Overviews) a crisp bulleted
  // summary they can quote verbatim, without any authenticity risk from
  // machine-generated editorial. Sort by impact, then timestamp desc as
  // tie-break (Codex recommendation).
  const takeawayBullets: string[] = []
  const prioritizedTech = [...nonVideoTechPosts].sort((a, b) => {
    const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    const byImpact = (rank[a.impact || 'medium'] ?? 2) - (rank[b.impact || 'medium'] ?? 2)
    if (byImpact !== 0) return byImpact
    return (b.timestamp || '').localeCompare(a.timestamp || '')
  })
  for (const post of prioritizedTech.slice(0, 3)) {
    const snippet = snippetFromContent(post.content, 180)
    if (snippet) takeawayBullets.push(snippet)
  }
  if (primaryMarket[0]?.company && primaryMarket[0]?.amount) {
    takeawayBullets.push(
      `${primaryMarket[0].company}: ${primaryMarket[0].amount}${primaryMarket[0].round ? ` (${primaryMarket[0].round})` : ''}`,
    )
  }
  if (maDeals[0]?.acquirer && maDeals[0]?.target) {
    takeawayBullets.push(
      `${maDeals[0].acquirer} → ${maDeals[0].target}${maDeals[0].dealValue ? ` (${maDeals[0].dealValue})` : ''}`,
    )
  }
  if (tips[0]?.tip) {
    takeawayBullets.push(snippetFromContent(tips[0].tip, 160))
  }

  const pageUrl = `https://www.forager.example/${lang}/week/${weekId}`
  const articleLabel = ARTICLE_CTA_LABELS[lang] || ARTICLE_CTA_LABELS.en
  const publishedIso = periodPublishedDate(weekId).toISOString()

  // Derive modifiedTime from the max underlying item timestamp rather than
  // new Date(). Avoids emitting a "fresh" timestamp every ISR render when
  // nothing actually changed (Codex feedback). Falls back to publishedIso
  // when no items have timestamps yet.
  const allTimestamps: string[] = [
    ...nonVideoTechPosts.map((p) => p.timestamp || ''),
    ...videoTechPosts.map((p) => p.timestamp || ''),
    ...primaryMarket.map((p: { timestamp?: string }) => p.timestamp || ''),
    ...secondaryMarket.map((p: { timestamp?: string }) => p.timestamp || ''),
    ...maDeals.map((p: { timestamp?: string }) => p.timestamp || ''),
    ...tips.map((p: { timestamp?: string }) => p.timestamp || ''),
  ].filter(Boolean)
  const maxTimestamp = allTimestamps.length > 0 ? allTimestamps.sort().at(-1) : undefined
  const modifiedIso = maxTimestamp
    ? new Date(maxTimestamp).toISOString()
    : publishedIso
  const publishedDateLabel = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(publishedIso))

  return (
    <main id="main-content">
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <BreadcrumbListSchema weekId={weekId} weekLabel={periodLabel} lang={lang} />
      <CollectionPageSchema
        url={pageUrl}
        name={t(metaTitles(periodLabel), lang)}
        description={t(metaDescriptions(periodLabel), lang)}
        inLanguage={lang}
        datePublished={publishedIso}
        dateModified={modifiedIso}
        speakableCssSelector={
          takeawayBullets.length > 0 ? ['#dcai-takeaways'] : undefined
        }
      />
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{t(h1Headings(periodLabel), lang)}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {dateRange ? <span>{dateRange}</span> : null}
          {dateRange ? <span> • </span> : null}
          <span>{t(labelLanguage, lang)} </span>
          {SUPPORTED_LANGUAGES.map((code, index) => (
            <span key={code}>
              {index > 0 && <span> / </span>}
              <a href={`/${code}/week/${weekId}`} className={`rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${lang === code ? 'font-semibold underline' : 'hover:underline'}`}>{code.toUpperCase()}</a>
            </span>
          ))}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          <span>{t(labelByline, lang)} <span className="font-medium">Forager Editorial</span></span>
          <span> • </span>
          <time dateTime={publishedIso}>{t(labelPublished, lang)} {publishedDateLabel}</time>
        </p>
      </header>

      {/* Key Takeaways — extractive (no LLM), localized heading.
          This is the primary extractable surface for AI answer engines.
          Bullets are sourced from existing content: top-3 impact-ranked tech
          items, then lead deal, lead M&A, lead tip.

          The #dcai-takeaways id is referenced as the `speakable` cssSelector
          on the page-level CollectionPage schema — keeps voice-read scope
          tight (~20-30s) per Google's Speakable guidance, instead of
          spraying across every article on the roundup. */}
      {takeawayBullets.length > 0 && (
        <section
          id="dcai-takeaways"
          aria-labelledby="takeaways-heading"
          className="mb-10 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:bg-gray-900/40"
        >
          <h2
            id="takeaways-heading"
            className="text-xl font-semibold mb-3"
          >
            {t(h2Takeaways, lang)}
          </h2>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            {takeawayBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {/* AI Editorial Brief — the information-gain layer: synthesized
          "why it matters" bullets citing concrete numbers across stories.
          Honestly attributed to Forager Editorial (never an invented
          human) with a link to /ai-disclosure. */}
      {editorialBullets.length > 0 && (
        <section
          aria-labelledby="editorial-heading"
          className="mb-10 rounded-lg border border-gray-200 p-5"
        >
          <h2 id="editorial-heading" className="text-xl font-semibold mb-3">
            {t(h2Editorial, lang)}
          </h2>
          <ul className="space-y-3 leading-relaxed">
            {editorialBullets.map((b, i) => (
              <li key={i}>
                {b.topic ? (
                  <span className="mr-2 inline-block rounded border border-gray-300 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {b.topic}
                  </span>
                ) : null}
                {b.text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            <a href="/ai-disclosure" className="underline hover:no-underline">
              {t(labelEditorialAttribution, lang)}
            </a>
          </p>
        </section>
      )}

      {/* Tech Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{t(h2Tech, lang)}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {t(leadTech(periodLabel, nonVideoTechPosts.length), lang)}
          {nonVideoTechPosts.length > 0 && ` ${nonVideoTechPosts[0].content.slice(0, 120)}...`}
        </p>
        {nonVideoTechPosts.length === 0 ? (
          <p className="text-gray-600">{t(noTech, lang)}</p>
        ) : (
          <div className="space-y-6">
            {nonVideoTechPosts.map((post) => (
              <article id={`story-tech-${post.id}`} key={post.id} className="scroll-mt-6 border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">
                  <a href={articleHref(lang, weekId, techStoryId(post))} className="hover:underline">
                    {snippetFromContent(post.content, 100)}
                  </a>
                </h3>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                <div className="mt-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
                  <span>{t(labelCategory, lang)} {post.category}</span>
                  <span className="text-gray-400">|</span>
                  <span className="flex items-center gap-1">
                    {t(labelImpact, lang)}
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs ${impactBadgeClass(post.impact)}`}>
                      {post.impact}
                    </span>
                  </span>
                  {post.source || post.sourceUrl ? (
                    <>
                      <span className="text-gray-400">|</span>
                      <span>
                        {t(labelSource, lang)}{' '}
                        {post.sourceUrl ? (
                          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                            {post.source || post.sourceUrl}
                          </a>
                        ) : (
                          post.source
                        )}
                      </span>
                    </>
                  ) : null}
                  <span className="text-gray-400">|</span>
                  <a href={articleHref(lang, weekId, techStoryId(post))} className="underline hover:no-underline">
                    {articleLabel}
                  </a>
                </div>
                {Array.from(new Set([post.category, ...(post.tags || []).slice(0, 3)])).filter(Boolean).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(new Set([post.category, ...(post.tags || []).slice(0, 3)])).filter(Boolean).map((topic) => (
                      <a
                        key={`${post.id}-${topic}`}
                        href={`/${lang}/topic/${toTopicSlug(topic)}`}
                        className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:border-gray-500 hover:text-gray-900"
                      >
                        {topic}
                      </a>
                    ))}
                  </div>
                ) : null}
                <ArticleSchema post={post} inLanguage={lang} url={`https://www.forager.example${articleHref(lang, weekId, techStoryId(post))}`} />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Video Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{t(h2Videos, lang)}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {t(leadVideos(videoTechPosts.length), lang)}
        </p>
        {videoTechPosts.length === 0 ? (
          <p className="text-gray-600">{t(noVideos, lang)}</p>
        ) : (
          <div className="space-y-6">
            {videoTechPosts.map((post, index) => (
              <article key={post.id} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">
                  <a href={articleHref(lang, weekId, techStoryId(post))} className="hover:underline">
                    {snippetFromContent(post.content, 100)}
                  </a>
                </h3>
                {post.videoId ? (
                  <a
                    href={`https://youtube.com/watch?v=${post.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3"
                  >
                    <img
                      src={post.videoThumbnailUrl || `https://img.youtube.com/vi/${post.videoId}/hqdefault.jpg`}
                      alt={snippetFromContent(post.content, 100)}
                      width={480}
                      height={360}
                      className="w-full h-auto rounded"
                      {...(index === 0 ? { fetchPriority: 'high' as any } : { loading: 'lazy' as any })}
                    />
                  </a>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                <p className="mt-3 text-sm">
                  <a href={articleHref(lang, weekId, techStoryId(post))} className="underline hover:no-underline">
                    {articleLabel}
                  </a>
                </p>
                <VideoSchema video={post} />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Investment Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{t(h2Investment, lang)}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {t(leadInvestment(primaryMarket.length, secondaryMarket.length, maDeals.length), lang)}
        </p>

        <h3 className="text-xl font-semibold mb-2">{t(h3PrimaryMarket, lang)}</h3>
        {primaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">{t(noPrimary, lang)}</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thCompany, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thAmount, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thRound, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thInvestors, lang)}</th>
                </tr>
              </thead>
              <tbody>
                {primaryMarket.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">
                      <a href={articleHref(lang, weekId, primaryStoryId(p))} className="underline hover:no-underline">{p.company}</a>
                    </td>
                    <td className="border border-gray-200 px-2 py-1">{p.amount}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.round}</td>
                    <td className="border border-gray-200 px-2 py-1">{Array.isArray(p.investors) ? p.investors.join(', ') : p.investors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="text-xl font-semibold mb-2">{t(h3SecondaryMarket, lang)}</h3>
        {secondaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">{t(noSecondary, lang)}</p>
        ) : (() => {
          {/* Live quotes are paused (stock endpoints 410); new collections
              persist blank price/change. Only render quote columns when the
              period actually has values (older periods). */}
          const hasQuotes = secondaryMarket.some((p: any) => p.price && p.price !== 'N/A')
          return (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thTicker, lang)}</th>
                  {hasQuotes && <th className="border border-gray-200 px-2 py-1 text-left">{t(thPrice, lang)}</th>}
                  {hasQuotes && <th className="border border-gray-200 px-2 py-1 text-left">{t(thChange, lang)}</th>}
                </tr>
              </thead>
              <tbody>
                {secondaryMarket.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">
                      <a href={articleHref(lang, weekId, secondaryStoryId(p))} className="underline hover:no-underline">{p.ticker}</a>
                    </td>
                    {hasQuotes && <td className="border border-gray-200 px-2 py-1">{p.price}</td>}
                    {hasQuotes && <td className={`border border-gray-200 px-2 py-1 ${String(p.change).startsWith('-') ? 'text-red-600' : 'text-green-700'}`}>{p.change}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        })()}

        <h3 className="text-xl font-semibold mb-2">{t(h3MA, lang)}</h3>
        {maDeals.length === 0 ? (
          <p className="text-gray-600">{t(noMA, lang)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thAcquirer, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thTarget, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thDealValue, lang)}</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">{t(thDealType, lang)}</th>
                </tr>
              </thead>
              <tbody>
                {maDeals.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">
                      <a href={articleHref(lang, weekId, maStoryId(p))} className="underline hover:no-underline">{p.acquirer}</a>
                    </td>
                    <td className="border border-gray-200 px-2 py-1">{p.target}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.dealValue}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.dealType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tips Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{t(h2Tips, lang)}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {t(leadTips(tips.length), lang)}
          {tips.length > 0 && ` ${(tips[0] as any).content?.slice(0, 100)}...`}
        </p>
        {tips.length === 0 ? (
          <p className="text-gray-600">{t(noTips, lang)}</p>
        ) : (
          <div className="space-y-6">
            {tips.map((tip: TipPost) => (
              <article key={tip.id} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">
                  <a href={articleHref(lang, weekId, tipStoryId(tip))} className="hover:underline">{tip.category}</a>
                </h3>
                <p className="mt-2 leading-relaxed">{tip.content}</p>
                <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm overflow-x-auto">{tip.tip}</pre>
                <p className="mt-3 text-sm">
                  <a href={articleHref(lang, weekId, tipStoryId(tip))} className="underline hover:no-underline">
                    {articleLabel}
                  </a>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <nav className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
        {prevId ? <a href={`/${lang}/week/${prevId}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t(navPrev, lang)}</a> : <span />}
        <a href={`/${lang}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t(navHome, lang)}</a>
        {nextId ? <a href={`/${lang}/week/${nextId}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t(navNext, lang)}</a> : <span />}
      </nav>
      <footer className="mt-4">
        <a href={`/${lang}`} className="underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          {t(footerInteractive, lang)}
        </a>
        <span className="mx-2 text-gray-400">|</span>
        <a href="/contact" className="underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          {t(labelContact, lang)}
        </a>
        <span className="mx-2 text-gray-400">|</span>
        <a href="/datenschutz" className="underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          {t(labelPrivacy, lang)}
        </a>
      </footer>
    </article>
    </main>
  )
}
