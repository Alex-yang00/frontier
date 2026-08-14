import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'

export const revalidate = 86400

const BASE_URL = 'https://www.forager.example'

type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// ---------------------------------------------------------------------------
// 2026-08-01: this tool is PAUSED. The previous page marketed real-time
// Polygon-powered market data — but Polygon/Massive individual-tier Market
// Data Terms license data for personal, non-commercial use only, so the
// public display was disabled (see the data-rights register and the stock
// router kill switch). Per the Codex review (R6), all live-data claims and
// the SoftwareApplication schema were removed. The page stays as a small,
// honest, noindexed stub until a licensed data source is in place.
// ---------------------------------------------------------------------------

const META_TITLES: L = {
  de: 'KI-Aktien-Tracker (pausiert) | Forager',
  en: 'AI Stock Tracker (paused) | Forager',
  zh: 'AI 股票追踪器(暂停中)| Forager',
  fr: 'Tracker Actions IA (en pause) | Forager',
  es: 'Rastreador Acciones IA (en pausa) | Forager',
  pt: 'Rastreador Ações IA (em pausa) | Forager',
  ja: 'AI株式トラッカー(一時停止中)| Forager',
  ko: 'AI 주식 추적기(일시 중지)| Forager',
}

const META_DESCRIPTIONS: L = {
  de: 'Die Live-Marktdaten sind pausiert, während wir die Datenlizenzierung prüfen. Deal- und Finanzierungsdaten bleiben im AI Funding Tracker verfügbar.',
  en: 'Live market data is paused while we review data licensing. Deal and funding data remains available in the AI Funding Tracker.',
  zh: '实时行情数据在数据授权审查期间暂停。交易与融资数据仍可在 AI Funding Tracker 查看。',
  fr: 'Les données de marché en direct sont en pause pendant la revue de licence. Les données de financement restent disponibles dans le AI Funding Tracker.',
  es: 'Los datos de mercado en vivo están en pausa durante la revisión de licencias. Los datos de financiación siguen disponibles en el AI Funding Tracker.',
  pt: 'Os dados de mercado ao vivo estão em pausa durante a revisão de licenciamento. Os dados de financiamento continuam disponíveis no AI Funding Tracker.',
  ja: 'ライブ市場データはライセンス審査のため一時停止中です。ディールと資金調達データは AI Funding Tracker でご覧いただけます。',
  ko: '실시간 시장 데이터는 라이선스 검토 기간 동안 일시 중지됩니다. 딜 및 자금 조달 데이터는 AI Funding Tracker에서 확인할 수 있습니다.',
}

const HEADINGS: L = {
  de: 'KI-Aktien-Tracker — pausiert',
  en: 'AI Stock Tracker — paused',
  zh: 'AI 股票追踪器 — 暂停中',
  fr: 'Tracker Actions IA — en pause',
  es: 'Rastreador Acciones IA — en pausa',
  pt: 'Rastreador Ações IA — em pausa',
  ja: 'AI株式トラッカー — 一時停止中',
  ko: 'AI 주식 추적기 — 일시 중지',
}

const BODIES: L = {
  de: 'Wir haben die öffentliche Anzeige von Live-Marktdaten am 1. August 2026 pausiert, während wir die Lizenzbedingungen unseres Marktdaten-Anbieters prüfen. Diese Seite kommt zurück, sobald eine ordnungsgemäß lizenzierte Datenquelle steht.',
  en: 'We paused the public display of live market data on August 1, 2026 while we review our market-data provider’s licensing terms. This page will return once a properly licensed data source is in place.',
  zh: '我们于 2026 年 8 月 1 日暂停了实时行情数据的公开展示,以审查行情数据供应商的授权条款。在获得合规授权的数据源后,本页面将恢复。',
  fr: 'Nous avons suspendu l’affichage public des données de marché en direct le 1er août 2026, le temps de revoir les conditions de licence de notre fournisseur. Cette page reviendra dès qu’une source de données correctement licenciée sera en place.',
  es: 'Pausamos la visualización pública de datos de mercado en vivo el 1 de agosto de 2026 mientras revisamos los términos de licencia de nuestro proveedor. Esta página volverá cuando haya una fuente de datos debidamente licenciada.',
  pt: 'Pausamos a exibição pública de dados de mercado ao vivo em 1º de agosto de 2026 enquanto revisamos os termos de licença do nosso provedor. Esta página voltará quando houver uma fonte de dados devidamente licenciada.',
  ja: '2026年8月1日より、市場データプロバイダーのライセンス条件を確認するため、ライブ市場データの公開表示を一時停止しています。適切にライセンスされたデータソースが整い次第、このページは復活します。',
  ko: '시장 데이터 제공업체의 라이선스 조건을 검토하기 위해 2026년 8월 1일부터 실시간 시장 데이터의 공개 표시를 일시 중지했습니다. 적합한 라이선스 데이터 소스가 마련되는 대로 이 페이지는 복원됩니다.',
}

const CTA_FUNDING: L = {
  de: 'Zum AI Funding Tracker (Deals & Finanzierungen)',
  en: 'Go to the AI Funding Tracker (deals & funding rounds)',
  zh: '前往 AI Funding Tracker(交易与融资数据)',
  fr: 'Voir le AI Funding Tracker (deals & levées de fonds)',
  es: 'Ir al AI Funding Tracker (deals y rondas)',
  pt: 'Ir para o AI Funding Tracker (deals e rodadas)',
  ja: 'AI Funding Tracker へ(ディール&資金調達)',
  ko: 'AI Funding Tracker로 이동(딜 & 펀딩)',
}

const CTA_HOME: L = {
  de: 'Zu den täglichen KI-News',
  en: 'Go to the daily AI briefing',
  zh: '前往每日 AI 简报',
  fr: 'Voir le briefing IA quotidien',
  es: 'Ir al briefing diario de IA',
  pt: 'Ir para o briefing diário de IA',
  ja: '毎日のAIブリーフィングへ',
  ko: '데일리 AI 브리핑으로 이동',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}
  const pageUrl = `${BASE_URL}/${lang}/tools/ai-stock-tracker`

  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools/ai-stock-tracker`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools/ai-stock-tracker`
  }

  return {
    // Noindex while live market data is paused pending licensing review.
    robots: { index: false, follow: true },
    title: { absolute: t(META_TITLES, lang) },
    description: t(META_DESCRIPTIONS, lang),
    alternates: {
      canonical: pageUrl,
      languages: hreflangEntries,
    },
  }
}

export default async function AIStockTrackerToolPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-16">
      <p className="mb-1 font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        Forager · Tools
      </p>
      <h1 className="font-display text-3xl font-normal leading-tight text-foreground">
        {t(HEADINGS, lang)}
      </h1>
      <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
        {t(BODIES, lang)}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/funding"
          className="inline-block border border-foreground bg-foreground px-4 py-2.5 text-center font-sans text-xs font-bold uppercase tracking-[0.08em] text-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t(CTA_FUNDING, lang)}
        </Link>
        <Link
          href={`/${lang}`}
          className="inline-block border border-border px-4 py-2.5 text-center font-sans text-xs font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t(CTA_HOME, lang)}
        </Link>
      </div>
    </main>
  )
}
