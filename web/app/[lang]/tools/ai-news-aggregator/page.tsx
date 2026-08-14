import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import { Rss, Globe, Calendar, TrendingUp, Lightbulb, Play, ArrowRight, Check, X } from 'lucide-react'

export const revalidate = 3600

const BASE_URL = 'https://www.forager.example'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.forager.example/api'

type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const META_TITLES: L = {
  de: 'KI-News-Aggregator | Forager',
  en: 'AI News Aggregator | Forager',
  zh: '\u514d\u8d39AI\u65b0\u95fb\u805a\u5408\u5668 \u2014 35+\u4fe1\u606f\u6e90, 8\u79cd\u8bed\u8a00, \u6bcf\u65e5\u66f4\u65b0 | Forager',
  fr: 'Agr\u00e9gateur Actualit\u00e9s IA | Forager',
  es: 'Agregador de Noticias IA | Forager',
  pt: 'Agregador de Not\u00edcias IA | Forager',
  ja: '\u7121\u6599AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc \u2014 35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u30018\u8a00\u8a9e\u3001\u6bce\u65e5\u66f4\u65b0 | Forager',
  ko: '\ubb34\ub8cc AI \ub274\uc2a4 \uc9d1\ud569\uae30 \u2014 35\uac1c+ \uc18c\uc2a4, 8\uac1c \uc5b8\uc5b4, \ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8 | Forager',
}

const META_DESCRIPTIONS: L = {
  de: 'Forager kuratiert t\u00e4glich KI-News aus 35+ Quellen: Technologie, Investments, Tipps und Videos in 8 Sprachen.',
  en: "Forager's free AI news aggregator curates daily news from 35+ sources. Technology breakthroughs, investments, tips & videos in 8 languages.",
  zh: 'Forager\u514d\u8d39AI\u65b0\u95fb\u805a\u5408\u5668\uff0c\u6bcf\u65e5\u4ece35+\u4fe1\u606f\u6e90\u7cbe\u9009\u65b0\u95fb\u3002\u6db5\u76d6\u6280\u672f\u7a81\u7834\u3001\u6295\u8d44\u52a8\u6001\u3001\u5b9e\u7528\u6280\u5de7\u548c\u89c6\u9891\uff0c\u652f\u6301\u0038\u79cd\u8bed\u8a00\u3002',
  fr: "Forager s\u00e9lectionne chaque jour des actualit\u00e9s IA de 35+ sources: technologie, investissements et conseils.",
  es: 'El agregador de noticias IA gratuito de Forager selecciona noticias diarias de 35+ fuentes. Tecnolog\u00eda, inversiones, consejos y videos en 8 idiomas.',
  pt: 'Forager seleciona not\u00edcias IA di\u00e1rias de 35+ fontes: tecnologia, investimentos, dicas e v\u00eddeos.',
  ja: 'Forager\u306e\u7121\u6599AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u306f35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u6bce\u65e5\u30cb\u30e5\u30fc\u30b9\u3092\u53b3\u9078\u3002\u30c6\u30af\u30ce\u30ed\u30b8\u30fc\u3001\u6295\u8cc7\u3001\u30d2\u30f3\u30c8\u3001\u52d5\u753b\u30928\u8a00\u8a9e\u3067\u63d0\u4f9b\u3002',
  ko: 'Forager\uc758 \ubb34\ub8cc AI \ub274\uc2a4 \uc9d1\ud569\uae30\ub294 35\uac1c \uc774\uc0c1 \uc18c\uc2a4\uc5d0\uc11c \ub9e4\uc77c \ub274\uc2a4\ub97c \uc120\ubcc4\ud569\ub2c8\ub2e4. \uae30\uc220, \ud22c\uc790, \ud301, \ub3d9\uc601\uc0c1\uc744 8\uac1c \uc5b8\uc5b4\ub85c \uc81c\uacf5\ud569\ub2c8\ub2e4.',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const pageUrl = `${BASE_URL}/${lang}/tools/ai-news-aggregator`

  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools/ai-news-aggregator`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools/ai-news-aggregator`
  }

  return {
    title: { absolute: t(META_TITLES, lang) },
    description: t(META_DESCRIPTIONS, lang),
    alternates: {
      canonical: pageUrl,
      languages: hreflangEntries,
    },
    openGraph: {
      title: t(META_TITLES, lang),
      description: t(META_DESCRIPTIONS, lang),
      url: pageUrl,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Forager News Aggregator',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t(META_TITLES, lang),
      description: t(META_DESCRIPTIONS, lang),
      images: [
        {
          url: '/og-image.jpg',
          alt: 'Forager News Aggregator',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

const H1: L = {
  de: 'Kostenloser KI-News-Aggregator',
  en: 'Free AI News Aggregator',
  zh: '\u514d\u8d39AI\u65b0\u95fb\u805a\u5408\u5668',
  fr: "Agr\u00e9gateur d'Actualit\u00e9s IA Gratuit",
  es: 'Agregador de Noticias IA Gratuito',
  pt: 'Agregador de Not\u00edcias IA Gratuito',
  ja: '\u7121\u6599AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc',
  ko: '\ubb34\ub8cc AI \ub274\uc2a4 \uc9d1\ud569\uae30',
}

const SUBTITLE: L = {
  de: 'Forager kuratiert t\u00e4glich die wichtigsten KI-Nachrichten aus 35+ Quellen \u2014 Technologie-Durchbr\u00fcche, Investment-Signale, praktische Tipps und YouTube-Videos. Alles kostenlos, in 8 Sprachen, automatisch per KI-Pipeline aufbereitet.',
  en: 'Forager curates the most important AI news daily from 35+ sources \u2014 technology breakthroughs, investment signals, practical tips, and YouTube videos. Completely free, in 8 languages, processed automatically by our AI pipeline.',
  zh: 'Forager \u6bcf\u65e5\u4ece 35+ \u4fe1\u606f\u6e90\u7cbe\u9009\u6700\u91cd\u8981\u7684 AI \u65b0\u95fb \u2014 \u6280\u672f\u7a81\u7834\u3001\u6295\u8d44\u4fe1\u53f7\u3001\u5b9e\u7528\u6280\u5de7\u548c YouTube \u89c6\u9891\u3002\u5b8c\u5168\u514d\u8d39\uff0c\u652f\u6301 8 \u79cd\u8bed\u8a00\uff0c\u7531 AI \u7ba1\u9053\u81ea\u52a8\u5904\u7406\u3002',
  fr: "Forager s\u00e9lectionne chaque jour les actualit\u00e9s IA les plus importantes de 35+ sources \u2014 perc\u00e9es technologiques, signaux d'investissement, conseils pratiques et vid\u00e9os YouTube. Enti\u00e8rement gratuit, en 8 langues.",
  es: 'Forager selecciona diariamente las noticias de IA m\u00e1s importantes de 35+ fuentes \u2014 avances tecnol\u00f3gicos, se\u00f1ales de inversi\u00f3n, consejos pr\u00e1cticos y videos de YouTube. Completamente gratuito, en 8 idiomas.',
  pt: 'Forager seleciona diariamente as not\u00edcias de IA mais importantes de 35+ fontes \u2014 avan\u00e7os tecnol\u00f3gicos, sinais de investimento, dicas pr\u00e1ticas e v\u00eddeos do YouTube. Totalmente gratuito, em 8 idiomas.',
  ja: 'Forager \u306f 35 \u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u6bce\u65e5\u6700\u3082\u91cd\u8981\u306a AI \u30cb\u30e5\u30fc\u30b9\u3092\u53b3\u9078 \u2014 \u6280\u8853\u7684\u30d6\u30ec\u30fc\u30af\u30b9\u30eb\u30fc\u3001\u6295\u8cc7\u30b7\u30b0\u30ca\u30eb\u3001\u5b9f\u8df5\u30d2\u30f3\u30c8\u3001YouTube \u52d5\u753b\u3002\u5b8c\u5168\u7121\u6599\u30018 \u8a00\u8a9e\u5bfe\u5fdc\u3002',
  ko: 'Forager\ub294 35\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\uc5d0\uc11c \ub9e4\uc77c \uac00\uc7a5 \uc911\uc694\ud55c AI \ub274\uc2a4\ub97c \uc120\ubcc4\ud569\ub2c8\ub2e4 \u2014 \uae30\uc220 \ub3cc\ud30c\uad6c, \ud22c\uc790 \uc2e0\ud638, \uc2e4\uc6a9 \ud301, YouTube \ub3d9\uc601\uc0c1. \uc644\uc804 \ubb34\ub8cc, 8\uac1c \uc5b8\uc5b4 \uc9c0\uc6d0.',
}

const CTA_START: L = {
  de: 'Jetzt lesen',
  en: 'Start Reading',
  zh: '\u5f00\u59cb\u9605\u8bfb',
  fr: 'Commencer la lecture',
  es: 'Empezar a leer',
  pt: 'Come\u00e7ar a ler',
  ja: '\u8aad\u307f\u59cb\u3081\u308b',
  ko: '\uc77d\uae30 \uc2dc\uc791',
}

const CTA_SUBSCRIBE: L = {
  de: 'Newsletter abonnieren',
  en: 'Subscribe to Newsletter',
  zh: '\u8ba2\u9605\u901a\u8baf',
  fr: "S'abonner \u00e0 la newsletter",
  es: 'Suscribirse al bolet\u00edn',
  pt: 'Assinar newsletter',
  ja: '\u30cb\u30e5\u30fc\u30b9\u30ec\u30bf\u30fc\u8cfc\u8aad',
  ko: '\ub274\uc2a4\ub808\ud130 \uad6c\ub3c5',
}

const STAT_SOURCES: L = { de: '35+ Quellen', en: '35+ Sources', zh: '35+ \u4fe1\u606f\u6e90', fr: '35+ Sources', es: '35+ Fuentes', pt: '35+ Fontes', ja: '35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9', ko: '35\uac1c+ \uc18c\uc2a4' }
const STAT_LANGUAGES: L = { de: '8 Sprachen', en: '8 Languages', zh: '8 \u79cd\u8bed\u8a00', fr: '8 Langues', es: '8 Idiomas', pt: '8 Idiomas', ja: '8 \u8a00\u8a9e', ko: '8\uac1c \uc5b8\uc5b4' }
const STAT_DAILY: L = { de: 'T\u00e4glich aktualisiert', en: 'Updated Daily', zh: '\u6bcf\u65e5\u66f4\u65b0', fr: 'Mis \u00e0 jour quotidiennement', es: 'Actualizado diariamente', pt: 'Atualizado diariamente', ja: '\u6bce\u65e5\u66f4\u65b0', ko: '\ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8' }
const STAT_FREE: L = { de: '100% Kostenlos', en: '100% Free', zh: '100% \u514d\u8d39', fr: '100% Gratuit', es: '100% Gratuito', pt: '100% Gratuito', ja: '100% \u7121\u6599', ko: '100% \ubb34\ub8cc' }

// Section B
const H2_PREVIEW: L = {
  de: 'Was liefert unser KI-News-Aggregator?',
  en: 'What does our AI news aggregator deliver?',
  zh: '\u6211\u4eec\u7684AI\u65b0\u95fb\u805a\u5408\u5668\u63d0\u4f9b\u4ec0\u4e48\uff1f',
  fr: "Que propose notre agr\u00e9gateur d'actualit\u00e9s IA ?",
  es: '\u00bfQu\u00e9 ofrece nuestro agregador de noticias IA?',
  pt: 'O que nosso agregador de not\u00edcias IA oferece?',
  ja: '\u79c1\u305f\u3061\u306eAI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u306f\u4f55\u3092\u63d0\u4f9b\u3057\u307e\u3059\u304b\uff1f',
  ko: '\uc6b0\ub9ac\uc758 AI \ub274\uc2a4 \uc9d1\ud569\uae30\ub294 \ubb34\uc5c7\uc744 \uc81c\uacf5\ud558\ub098\uc694?',
}

const PREVIEW_LEAD: L = {
  de: 'Unser KI-News-Aggregator liefert t\u00e4glich kuratierte Nachrichten aus Technologie, Investment und Praxis. Hier ist ein Vorgeschmack auf aktuelle Meldungen:',
  en: 'Our AI news aggregator delivers daily curated news across technology, investment, and practical AI. Here is a preview of the latest headlines:',
  zh: '\u6211\u4eec\u7684AI\u65b0\u95fb\u805a\u5408\u5668\u6bcf\u65e5\u63d0\u4f9b\u6db5\u76d6\u6280\u672f\u3001\u6295\u8d44\u548c\u5b9e\u7528AI\u7684\u7cbe\u9009\u65b0\u95fb\u3002\u4ee5\u4e0b\u662f\u6700\u65b0\u5934\u6761\u9884\u89c8\uff1a',
  fr: "Notre agr\u00e9gateur d'actualit\u00e9s IA fournit chaque jour des nouvelles s\u00e9lectionn\u00e9es en technologie, investissement et IA pratique. Voici un aper\u00e7u des derni\u00e8res actualit\u00e9s :",
  es: 'Nuestro agregador de noticias IA entrega noticias curadas diariamente sobre tecnolog\u00eda, inversi\u00f3n e IA pr\u00e1ctica. Aqu\u00ed hay una vista previa de los \u00faltimos titulares:',
  pt: 'Nosso agregador de not\u00edcias IA entrega not\u00edcias curadas diariamente sobre tecnologia, investimento e IA pr\u00e1tica. Aqui est\u00e1 uma pr\u00e9via das \u00faltimas manchetes:',
  ja: '\u79c1\u305f\u3061\u306eAI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u306f\u3001\u30c6\u30af\u30ce\u30ed\u30b8\u30fc\u3001\u6295\u8cc7\u3001\u5b9f\u8df5\u7684AI\u306e\u53b3\u9078\u30cb\u30e5\u30fc\u30b9\u3092\u6bce\u65e5\u63d0\u4f9b\u3057\u307e\u3059\u3002\u6700\u65b0\u306e\u30d8\u30c3\u30c9\u30e9\u30a4\u30f3\u3092\u3054\u89a7\u304f\u3060\u3055\u3044\uff1a',
  ko: '\uc6b0\ub9ac\uc758 AI \ub274\uc2a4 \uc9d1\ud569\uae30\ub294 \uae30\uc220, \ud22c\uc790, \uc2e4\uc6a9 AI \ubd84\uc57c\uc758 \uc5c4\uc120\ub41c \ub274\uc2a4\ub97c \ub9e4\uc77c \uc81c\uacf5\ud569\ub2c8\ub2e4. \ucd5c\uc2e0 \ud5e4\ub4dc\ub77c\uc778 \ubbf8\ub9ac\ubcf4\uae30:',
}

const PREVIEW_EMPTY: L = {
  de: 'Aktuelle Meldungen werden geladen\u2026 Besuchen Sie die Startseite f\u00fcr den vollen Newsfeed.',
  en: 'Latest posts are loading\u2026 Visit the homepage for the full news feed.',
  zh: '\u6700\u65b0\u6d88\u606f\u52a0\u8f7d\u4e2d\u2026 \u8bbf\u95ee\u9996\u9875\u67e5\u770b\u5b8c\u6574\u65b0\u95fb\u6d41\u3002',
  fr: "Les derni\u00e8res actualit\u00e9s sont en cours de chargement\u2026 Visitez la page d'accueil pour le flux complet.",
  es: 'Las \u00faltimas noticias se est\u00e1n cargando\u2026 Visite la p\u00e1gina de inicio para el feed completo.',
  pt: 'As \u00faltimas not\u00edcias est\u00e3o carregando\u2026 Visite a p\u00e1gina inicial para o feed completo.',
  ja: '\u6700\u65b0\u306e\u6295\u7a3f\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u2026 \u30db\u30fc\u30e0\u30da\u30fc\u30b8\u3067\u5168\u30cb\u30e5\u30fc\u30b9\u30d5\u30a3\u30fc\u30c9\u3092\u3054\u89a7\u304f\u3060\u3055\u3044\u3002',
  ko: '\ucd5c\uc2e0 \uac8c\uc2dc\ubb3c\uc744 \ub85c\ub4dc \uc911\u2026 \uc804\uccb4 \ub274\uc2a4 \ud53c\ub4dc\ub294 \ud648\ud398\uc774\uc9c0\ub97c \ubc29\ubb38\ud558\uc138\uc694.',
}

const VIEW_ALL: L = {
  de: 'Alle KI-News ansehen',
  en: 'View All AI News',
  zh: '\u67e5\u770b\u6240\u6709AI\u65b0\u95fb',
  fr: 'Voir toutes les actualit\u00e9s IA',
  es: 'Ver todas las noticias de IA',
  pt: 'Ver todas as not\u00edcias de IA',
  ja: '\u3059\u3079\u3066\u306eAI\u30cb\u30e5\u30fc\u30b9\u3092\u898b\u308b',
  ko: '\ubaa8\ub4e0 AI \ub274\uc2a4 \ubcf4\uae30',
}

// Section C
const H2_FEATURES: L = {
  de: 'Warum Forager w\u00e4hlen?',
  en: 'Why choose Forager?',
  zh: '\u4e3a\u4ec0\u4e48\u9009\u62e9 Forager\uff1f',
  fr: 'Pourquoi choisir Forager ?',
  es: '\u00bfPor qu\u00e9 elegir Forager?',
  pt: 'Por que escolher Forager?',
  ja: '\u306a\u305cForager\u3092\u9078\u3076\u306e\u304b\uff1f',
  ko: '\uc65c Forager\ub97c \uc120\ud0dd\ud574\uc57c \ud558\ub098\uc694?',
}

const FEATURE_TITLES: Record<string, L> = {
  sources: { de: '35+ kuratierte Quellen', en: '35+ Curated Sources', zh: '35+ \u7cbe\u9009\u4fe1\u606f\u6e90', fr: '35+ Sources s\u00e9lectionn\u00e9es', es: '35+ Fuentes curadas', pt: '35+ Fontes selecionadas', ja: '35\u4ee5\u4e0a\u306e\u53b3\u9078\u30bd\u30fc\u30b9', ko: '35\uac1c+ \uc5c4\uc120\ub41c \uc18c\uc2a4' },
  languages: { de: '8 Sprachen', en: '8 Language Support', zh: '8 \u79cd\u8bed\u8a00\u652f\u6301', fr: '8 Langues', es: '8 Idiomas', pt: '8 Idiomas', ja: '8 \u8a00\u8a9e\u5bfe\u5fdc', ko: '8\uac1c \uc5b8\uc5b4 \uc9c0\uc6d0' },
  updates: { de: 'T\u00e4gliche & w\u00f6chentliche Updates', en: 'Daily & Weekly Updates', zh: '\u6bcf\u65e5\u548c\u6bcf\u5468\u66f4\u65b0', fr: 'Mises \u00e0 jour quotidiennes et hebdomadaires', es: 'Actualizaciones diarias y semanales', pt: 'Atualiza\u00e7\u00f5es di\u00e1rias e semanais', ja: '\u6bce\u65e5\uff06\u6bce\u9031\u66f4\u65b0', ko: '\ub9e4\uc77c & \ub9e4\uc8fc \uc5c5\ub370\uc774\ud2b8' },
  investment: { de: 'KI-Investment-Tracking', en: 'AI Investment Tracking', zh: 'AI\u6295\u8d44\u8ddf\u8e2a', fr: "Suivi d'investissement IA", es: 'Seguimiento de inversi\u00f3n IA', pt: 'Rastreamento de investimento IA', ja: 'AI\u6295\u8cc7\u30c8\u30e9\u30c3\u30ad\u30f3\u30b0', ko: 'AI \ud22c\uc790 \ucd94\uc801' },
  tips: { de: 'Praktische KI-Tipps', en: 'Practical AI Tips', zh: '\u5b9e\u7528AI\u6280\u5de7', fr: 'Conseils IA pratiques', es: 'Consejos pr\u00e1cticos de IA', pt: 'Dicas pr\u00e1ticas de IA', ja: '\u5b9f\u8df5\u7684\u306aAI\u30d2\u30f3\u30c8', ko: '\uc2e4\uc6a9 AI \ud301' },
  videos: { de: 'Video-Kuratierung', en: 'Video Curation', zh: '\u89c6\u9891\u7cbe\u9009', fr: 'Curation vid\u00e9o', es: 'Curaci\u00f3n de videos', pt: 'Cura\u00e7\u00e3o de v\u00eddeos', ja: '\u52d5\u753b\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3', ko: '\ub3d9\uc601\uc0c1 \ud050\ub808\uc774\uc158' },
}

const FEATURE_DESCRIPTIONS: Record<string, L> = {
  sources: {
    de: 'RSS-Feeds von TechCrunch, MIT Technology Review, Ars Technica, Hacker News und mehr. Jede Quelle wird auf KI-Relevanz gepr\u00fcft.',
    en: 'RSS feeds from TechCrunch, MIT Technology Review, Ars Technica, Hacker News and more. Every source is checked for AI relevance.',
    zh: '\u6765\u81ea TechCrunch\u3001MIT Technology Review\u3001Ars Technica\u3001Hacker News \u7b49\u7684 RSS \u8ba2\u9605\u3002\u6bcf\u4e2a\u6e90\u90fd\u7ecf\u8fc7 AI \u76f8\u5173\u6027\u68c0\u67e5\u3002',
    fr: 'Flux RSS de TechCrunch, MIT Technology Review, Ars Technica, Hacker News et plus. Chaque source est v\u00e9rifi\u00e9e pour sa pertinence IA.',
    es: 'Feeds RSS de TechCrunch, MIT Technology Review, Ars Technica, Hacker News y m\u00e1s. Cada fuente se verifica por relevancia en IA.',
    pt: 'Feeds RSS do TechCrunch, MIT Technology Review, Ars Technica, Hacker News e mais. Cada fonte \u00e9 verificada por relev\u00e2ncia em IA.',
    ja: 'TechCrunch\u3001MIT Technology Review\u3001Ars Technica\u3001Hacker News\u306a\u3069\u306eRSS\u30d5\u30a3\u30fc\u30c9\u3002\u5404\u30bd\u30fc\u30b9\u306fAI\u95a2\u9023\u6027\u304c\u78ba\u8a8d\u3055\u308c\u3066\u3044\u307e\u3059\u3002',
    ko: 'TechCrunch, MIT Technology Review, Ars Technica, Hacker News \ub4f1\uc758 RSS \ud53c\ub4dc. \ubaa8\ub4e0 \uc18c\uc2a4\ub294 AI \uad00\ub828\uc131\uc774 \uac80\uc99d\ub429\ub2c8\ub2e4.',
  },
  languages: {
    de: 'Englisch nativ generiert. Deutsch, Chinesisch, Franz\u00f6sisch, Spanisch, Portugiesisch, Japanisch und Koreanisch per KI-\u00dcbersetzungspipeline.',
    en: 'English natively generated. German, Chinese, French, Spanish, Portuguese, Japanese, and Korean via our AI translation pipeline.',
    zh: '\u82f1\u8bed\u539f\u751f\u751f\u6210\u3002\u5fb7\u8bed\u3001\u4e2d\u6587\u3001\u6cd5\u8bed\u3001\u897f\u73ed\u7259\u8bed\u3001\u8461\u8404\u7259\u8bed\u3001\u65e5\u8bed\u548c\u97e9\u8bed\u901a\u8fc7\u6211\u4eec\u7684AI\u7ffb\u8bd1\u7ba1\u9053\u63d0\u4f9b\u3002',
    fr: "Anglais g\u00e9n\u00e9r\u00e9 nativement. Allemand, chinois, fran\u00e7ais, espagnol, portugais, japonais et cor\u00e9en via notre pipeline de traduction IA.",
    es: 'Ingl\u00e9s generado nativamente. Alem\u00e1n, chino, franc\u00e9s, espa\u00f1ol, portugu\u00e9s, japon\u00e9s y coreano mediante nuestra pipeline de traducci\u00f3n IA.',
    pt: 'Ingl\u00eas gerado nativamente. Alem\u00e3o, chin\u00eas, franc\u00eas, espanhol, portugu\u00eas, japon\u00eas e coreano via nosso pipeline de tradu\u00e7\u00e3o IA.',
    ja: '\u82f1\u8a9e\u306f\u30cd\u30a4\u30c6\u30a3\u30d6\u751f\u6210\u3002\u30c9\u30a4\u30c4\u8a9e\u3001\u4e2d\u56fd\u8a9e\u3001\u30d5\u30e9\u30f3\u30b9\u8a9e\u3001\u30b9\u30da\u30a4\u30f3\u8a9e\u3001\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e\u3001\u65e5\u672c\u8a9e\u3001\u97d3\u56fd\u8a9e\u306fAI\u7ffb\u8a33\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u7d4c\u7531\u3002',
    ko: '\uc601\uc5b4\ub294 \ub124\uc774\ud2f0\ube0c \uc0dd\uc131. \ub3c5\uc77c\uc5b4, \uc911\uad6d\uc5b4, \ud504\ub791\uc2a4\uc5b4, \uc2a4\ud398\uc778\uc5b4, \ud3ec\ub974\ud22c\uac08\uc5b4, \uc77c\ubcf8\uc5b4, \ud55c\uad6d\uc5b4\ub294 AI \ubc88\uc5ed \ud30c\uc774\ud504\ub77c\uc778\uc744 \ud1b5\ud574 \uc81c\uacf5.',
  },
  updates: {
    de: 'Automatische Sammlung t\u00e4glich am sp\u00e4ten Abend (Berliner Zeit). W\u00f6chentliche Zusammenfassungen mit h\u00f6herer Artikelzahl verf\u00fcgbar.',
    en: 'Automated collection daily in the late evening (Berlin time). Weekly digests with higher article counts also available.',
    zh: '\u6bcf\u5929\u67cf\u6797\u65f6\u95f4\u6df1\u591c\u81ea\u52a8\u91c7\u96c6\u3002\u8fd8\u63d0\u4f9b\u6587\u7ae0\u6570\u91cf\u66f4\u591a\u7684\u6bcf\u5468\u6458\u8981\u3002',
    fr: 'Collecte automatique quotidienne en fin de soir\u00e9e (heure de Berlin). R\u00e9sum\u00e9s hebdomadaires avec plus d\'articles \u00e9galement disponibles.',
    es: 'Recolecci\u00f3n autom\u00e1tica diaria a \u00faltima hora de la tarde (hora de Berl\u00edn). Res\u00famenes semanales con m\u00e1s art\u00edculos tambi\u00e9n disponibles.',
    pt: 'Coleta autom\u00e1tica di\u00e1ria no fim da noite (hor\u00e1rio de Berlim). Resumos semanais com mais artigos tamb\u00e9m dispon\u00edveis.',
    ja: '\u6bce\u65e5\u30d9\u30eb\u30ea\u30f3\u6642\u9593\u306e\u6df1\u591c\u306b\u81ea\u52d5\u53ce\u96c6\u3002\u8a18\u4e8b\u6570\u304c\u591a\u3044\u9031\u9593\u30c0\u30a4\u30b8\u30a7\u30b9\u30c8\u3082\u5229\u7528\u53ef\u80fd\u3002',
    ko: '\ub9e4\uc77c \ubca0\ub97c\ub9b0 \uc2dc\uac04 \ub2a6\uc740 \uc800\ub141\uc5d0 \uc790\ub3d9 \uc218\uc9d1. \ub354 \ub9ce\uc740 \uae30\uc0ac\ub97c \ud3ec\ud568\ud55c \uc8fc\uac04 \ub2e4\uc774\uc81c\uc2a4\ud2b8\ub3c4 \uc81c\uacf5.',
  },
  investment: {
    de: 'Finanzierungsrunden, M&A-Deals und Marktbewegungen im KI-Sektor — mit Quellenlinks.',
    en: 'Funding rounds, M&A deals, and market movements in the AI sector — with source links.',
    zh: 'AI \u9886\u57df\u7684\u878d\u8d44\u8f6e\u6b21\u3001\u5e76\u8d2d\u4ea4\u6613\u548c\u5e02\u573a\u52a8\u5411 \u2014\u2014 \u9644\u6765\u6e90\u94fe\u63a5\u3002',
    fr: "Tours de financement, op\u00e9rations M&A et mouvements de march\u00e9 dans le secteur IA \u2014 avec liens vers les sources.",
    es: 'Rondas de financiaci\u00f3n, operaciones M&A y movimientos de mercado en el sector IA \u2014 con enlaces a las fuentes.',
    pt: 'Rodadas de financiamento, opera\u00e7\u00f5es M&A e movimentos de mercado no setor IA \u2014 com links das fontes.',
    ja: 'AI\u30bb\u30af\u30bf\u30fc\u306e\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u30c7\u30a3\u30fc\u30eb\u3001\u5e02\u5834\u52d5\u5411 \u2014 \u30bd\u30fc\u30b9\u30ea\u30f3\u30af\u4ed8\u304d\u3002',
    ko: 'AI \ubd84\uc57c\uc758 \ud380\ub529 \ub77c\uc6b4\ub4dc, M&A \uac70\ub798, \uc2dc\uc7a5 \ub3d9\ud5a5 \u2014 \ucd9c\ucc98 \ub9c1\ud06c \ud3ec\ud568.',
  },
  tips: {
    de: 'Tipps aus kuratierten Reddit-Communities und Experten-Blogs. Prompt-Engineering, lokale LLMs, Workflow-Automatisierung und mehr.',
    en: 'Tips from curated Reddit communities and expert blogs. Prompt engineering, local LLMs, workflow automation, and more.',
    zh: '\u6765\u81ea\u7cbe\u9009 Reddit \u793e\u533a\u548c\u4e13\u5bb6\u535a\u5ba2\u7684\u6280\u5de7\u3002\u63d0\u793a\u8bcd\u5de5\u7a0b\u3001\u672c\u5730 LLM\u3001\u5de5\u4f5c\u6d41\u81ea\u52a8\u5316\u7b49\u3002',
    fr: "Conseils de communaut\u00e9s Reddit s\u00e9lectionn\u00e9es et de blogs d'experts. Ing\u00e9nierie de prompts, LLM locaux, automatisation de workflows et plus.",
    es: 'Consejos de comunidades Reddit seleccionadas y blogs de expertos. Ingenier\u00eda de prompts, LLMs locales, automatizaci\u00f3n de flujos de trabajo y m\u00e1s.',
    pt: 'Dicas de comunidades Reddit selecionadas e blogs de especialistas. Engenharia de prompts, LLMs locais, automa\u00e7\u00e3o de fluxos de trabalho e mais.',
    ja: '\u53b3\u9078\u3055\u308c\u305fReddit\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u3068\u5c02\u9580\u5bb6\u30d6\u30ed\u30b0\u304b\u3089\u306e\u30d2\u30f3\u30c8\u3002\u30d7\u30ed\u30f3\u30d7\u30c8\u30a8\u30f3\u30b8\u30cb\u30a2\u30ea\u30f3\u30b0\u3001\u30ed\u30fc\u30ab\u30ebLLM\u3001\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u81ea\u52d5\u5316\u306a\u3069\u3002',
    ko: '\uc5c4\uc120\ub41c Reddit \ucee4\ubba4\ub2c8\ud2f0\uc640 \uc804\ubb38\uac00 \ube14\ub85c\uadf8\uc758 \ud301. \ud504\ub86c\ud504\ud2b8 \uc5d4\uc9c0\ub2c8\uc5b4\ub9c1, \ub85c\uceec LLM, \uc6cc\ud06c\ud50c\ub85c\uc6b0 \uc790\ub3d9\ud654 \ub4f1.',
  },
  videos: {
    de: 'Kuratierte YouTube-Videos mit KI-generierten Zusammenfassungen, Kernaussagen und eingebetteten Playern.',
    en: 'Curated YouTube videos with AI-generated summaries, key takeaways, and embedded players.',
    zh: '\u7cbe\u9009\u7684 YouTube \u89c6\u9891\uff0c\u914d\u6709 AI \u751f\u6210\u7684\u6458\u8981\u3001\u6838\u5fc3\u8981\u70b9\u548c\u5d4c\u5165\u5f0f\u64ad\u653e\u5668\u3002',
    fr: 'Vid\u00e9os YouTube s\u00e9lectionn\u00e9es avec r\u00e9sum\u00e9s g\u00e9n\u00e9r\u00e9s par IA, points cl\u00e9s et lecteurs int\u00e9gr\u00e9s.',
    es: 'Videos de YouTube seleccionados con res\u00famenes generados por IA, puntos clave y reproductores integrados.',
    pt: 'V\u00eddeos do YouTube selecionados com resumos gerados por IA, pontos-chave e players integrados.',
    ja: 'AI\u751f\u6210\u306e\u8981\u7d04\u3001\u4e3b\u8981\u30dd\u30a4\u30f3\u30c8\u3001\u57cb\u3081\u8fbc\u307f\u30d7\u30ec\u30fc\u30e4\u30fc\u4ed8\u304d\u306e\u53b3\u9078YouTube\u52d5\u753b\u3002',
    ko: 'AI \uc0dd\uc131 \uc694\uc57d, \ud575\uc2ec \ud3ec\uc778\ud2b8, \uc784\ubca0\ub514\ub4dc \ud50c\ub808\uc774\uc5b4\uac00 \ud3ec\ud568\ub41c \uc5c4\uc120\ub41c YouTube \ub3d9\uc601\uc0c1.',
  },
}

// Section D
const H2_HOW: L = {
  de: 'Wie funktioniert die KI-Kuratierungspipeline?',
  en: 'How does the AI curation pipeline work?',
  zh: 'AI\u7b56\u5c55\u7ba1\u9053\u5982\u4f55\u8fd0\u4f5c\uff1f',
  fr: 'Comment fonctionne le pipeline de curation IA ?',
  es: '\u00bfC\u00f3mo funciona el pipeline de curaci\u00f3n IA?',
  pt: 'Como funciona o pipeline de cura\u00e7\u00e3o IA?',
  ja: 'AI\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u306f\u3069\u306e\u3088\u3046\u306b\u6a5f\u80fd\u3057\u307e\u3059\u304b\uff1f',
  ko: 'AI \ud050\ub808\uc774\uc158 \ud30c\uc774\ud504\ub77c\uc778\uc740 \uc5b4\ub5bb\uac8c \uc791\ub3d9\ud558\ub098\uc694?',
}

const STEP_TITLES: L[] = [
  { de: 'Sammeln', en: 'Collect', zh: '\u6536\u96c6', fr: 'Collecter', es: 'Recopilar', pt: 'Coletar', ja: '\u53ce\u96c6', ko: '\uc218\uc9d1' },
  { de: 'Klassifizieren', en: 'Classify', zh: '\u5206\u7c7b', fr: 'Classifier', es: 'Clasificar', pt: 'Classificar', ja: '\u5206\u985e', ko: '\ubd84\ub958' },
  { de: 'Zusammenfassen', en: 'Summarize', zh: '\u6458\u8981', fr: 'R\u00e9sumer', es: 'Resumir', pt: 'Resumir', ja: '\u8981\u7d04', ko: '\uc694\uc57d' },
  { de: '\u00dcbersetzen', en: 'Translate', zh: '\u7ffb\u8bd1', fr: 'Traduire', es: 'Traducir', pt: 'Traduzir', ja: '\u7ffb\u8a33', ko: '\ubc88\uc5ed' },
]

const STEP_DESCRIPTIONS: L[] = [
  {
    de: 'Wir sammeln t\u00e4glich Daten aus 30+ RSS-Feeds, Hacker News und YouTube.',
    en: 'We fetch from 30+ RSS feeds, Hacker News, and YouTube daily.',
    zh: '\u6211\u4eec\u6bcf\u5929\u4ece 30+ RSS \u8ba2\u9605\u6e90\u3001Hacker News \u548c YouTube \u83b7\u53d6\u6570\u636e\u3002',
    fr: 'Nous collectons quotidiennement les donn\u00e9es de 30+ flux RSS, Hacker News et YouTube.',
    es: 'Recopilamos datos diariamente de 30+ feeds RSS, Hacker News y YouTube.',
    pt: 'Coletamos dados diariamente de 30+ feeds RSS, Hacker News e YouTube.',
    ja: '30\u4ee5\u4e0a\u306eRSS\u30d5\u30a3\u30fc\u30c9\u3001Hacker News\u3001YouTube\u304b\u3089\u6bce\u65e5\u30c7\u30fc\u30bf\u3092\u53d6\u5f97\u3002',
    ko: '30\uac1c \uc774\uc0c1\uc758 RSS \ud53c\ub4dc, Hacker News, YouTube\uc5d0\uc11c \ub9e4\uc77c \ub370\uc774\ud130\ub97c \uc218\uc9d1\ud569\ub2c8\ub2e4.',
  },
  {
    de: 'KI-Modelle kategorisieren jeden Artikel nach Thema und Relevanz.',
    en: 'AI models categorize each article by topic and relevance.',
    zh: 'AI \u6a21\u578b\u6309\u4e3b\u9898\u548c\u76f8\u5173\u6027\u5bf9\u6bcf\u7bc7\u6587\u7ae0\u8fdb\u884c\u5206\u7c7b\u3002',
    fr: 'Les mod\u00e8les IA cat\u00e9gorisent chaque article par sujet et pertinence.',
    es: 'Los modelos de IA categorizan cada art\u00edculo por tema y relevancia.',
    pt: 'Modelos de IA categorizam cada artigo por tema e relev\u00e2ncia.',
    ja: 'AI\u30e2\u30c7\u30eb\u304c\u5404\u8a18\u4e8b\u3092\u30c8\u30d4\u30c3\u30af\u3068\u95a2\u9023\u6027\u3067\u5206\u985e\u3002',
    ko: 'AI \ubaa8\ub378\uc774 \uac01 \uae30\uc0ac\ub97c \uc8fc\uc81c\uc640 \uad00\ub828\uc131\ubcc4\ub85c \ubd84\ub958\ud569\ub2c8\ub2e4.',
  },
  {
    de: 'LLMs generieren pr\u00e4gnante Zusammenfassungen f\u00fcr jede Meldung.',
    en: 'LLMs generate concise summaries for each article.',
    zh: 'LLM \u4e3a\u6bcf\u7bc7\u6587\u7ae0\u751f\u6210\u7b80\u6d01\u6458\u8981\u3002',
    fr: 'Les LLM g\u00e9n\u00e8rent des r\u00e9sum\u00e9s concis pour chaque article.',
    es: 'Los LLMs generan res\u00famenes concisos para cada art\u00edculo.',
    pt: 'LLMs geram resumos concisos para cada artigo.',
    ja: 'LLM\u304c\u5404\u8a18\u4e8b\u306e\u7c21\u6f54\u306a\u8981\u7d04\u3092\u751f\u6210\u3002',
    ko: 'LLM\uc774 \uac01 \uae30\uc0ac\uc758 \uac04\uacb0\ud55c \uc694\uc57d\uc744 \uc0dd\uc131\ud569\ub2c8\ub2e4.',
  },
  {
    de: 'Inhalte werden aus dem Englischen in 7 weitere Sprachen \u00fcbersetzt (8 insgesamt).',
    en: 'Content is generated in English and translated into 7 further languages (8 total).',
    zh: '\u5185\u5bb9\u4ee5\u82f1\u8bed\u751f\u6210,\u5e76\u7ffb\u8bd1\u6210\u53e6\u5916 7 \u79cd\u8bed\u8a00(\u5171 8 \u79cd)\u3002',
    fr: 'Le contenu est g\u00e9n\u00e9r\u00e9 en anglais puis traduit en 7 autres langues (8 au total).',
    es: 'El contenido se genera en ingl\u00e9s y se traduce a otros 7 idiomas (8 en total).',
    pt: 'O conte\u00fado \u00e9 gerado em ingl\u00eas e traduzido para outros 7 idiomas (8 no total).',
    ja: '\u30b3\u30f3\u30c6\u30f3\u30c4\u306f\u82f1\u8a9e\u3067\u751f\u6210\u3055\u308c\u3001\u3055\u3089\u306b7\u8a00\u8a9e\u306b\u7ffb\u8a33(\u5408\u8a088\u8a00\u8a9e)\u3002',
    ko: '\ucf58\ud150\uce20\ub294 \uc601\uc5b4\ub85c \uc0dd\uc131\ub418\uc5b4 7\uac1c \uc5b8\uc5b4\ub85c \ucd94\uac00 \ubc88\uc5ed\ub429\ub2c8\ub2e4(\ucd1d 8\uac1c).',
  },
]

// Section E
const H2_COMPARE: L = {
  de: 'Wie schneidet Forager ab?',
  en: 'How does Forager compare?',
  zh: 'Forager \u4e0e\u5176\u4ed6\u5e73\u53f0\u6bd4\u8f83\u5982\u4f55\uff1f',
  fr: 'Comment Forager se compare-t-il ?',
  es: '\u00bfC\u00f3mo se compara Forager?',
  pt: 'Como o Forager se compara?',
  ja: 'Forager\u306f\u4ed6\u3068\u3069\u3046\u6bd4\u8f03\u3055\u308c\u307e\u3059\u304b\uff1f',
  ko: 'Forager\ub294 \uc5b4\ub5bb\uac8c \ube44\uad50\ub418\ub098\uc694?',
}

const COMPARE_ROWS: { label: L; forager: boolean; techcrunch: boolean; decoder: boolean; tldr: boolean; thebatch: boolean }[] = [
  {
    label: { de: 'Mehrsprachig (8+)', en: 'Multilingual (8+)', zh: '\u591a\u8bed\u8a00 (8+)', fr: 'Multilingue (8+)', es: 'Multiling\u00fce (8+)', pt: 'Multilingual (8+)', ja: '\u591a\u8a00\u8a9e (8+)', ko: '\ub2e4\uad6d\uc5b4 (8+)' },
    forager: true, techcrunch: false, decoder: false, tldr: false, thebatch: false,
  },
  {
    label: { de: 'T\u00e4gliche Updates', en: 'Daily Updates', zh: '\u6bcf\u65e5\u66f4\u65b0', fr: 'Mises \u00e0 jour quotidiennes', es: 'Actualizaciones diarias', pt: 'Atualiza\u00e7\u00f5es di\u00e1rias', ja: '\u6bce\u65e5\u66f4\u65b0', ko: '\ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8' },
    forager: true, techcrunch: true, decoder: true, tldr: true, thebatch: false,
  },
  {
    label: { de: 'W\u00f6chentlicher Digest', en: 'Weekly Digest', zh: '\u6bcf\u5468\u6458\u8981', fr: 'Digest hebdomadaire', es: 'Resumen semanal', pt: 'Resumo semanal', ja: '\u9031\u9593\u30c0\u30a4\u30b8\u30a7\u30b9\u30c8', ko: '\uc8fc\uac04 \ub2e4\uc774\uc81c\uc2a4\ud2b8' },
    forager: true, techcrunch: false, decoder: false, tldr: true, thebatch: true,
  },
  {
    label: { de: 'Investment-News', en: 'Investment News', zh: '\u6295\u8d44\u65b0\u95fb', fr: "Actualit\u00e9s d'investissement", es: 'Noticias de inversi\u00f3n', pt: 'Not\u00edcias de investimento', ja: '\u6295\u8cc7\u30cb\u30e5\u30fc\u30b9', ko: '\ud22c\uc790 \ub274\uc2a4' },
    forager: true, techcrunch: true, decoder: false, tldr: false, thebatch: false,
  },
  {
    label: { de: 'Praktische Tipps', en: 'Practical Tips', zh: '\u5b9e\u7528\u6280\u5de7', fr: 'Conseils pratiques', es: 'Consejos pr\u00e1cticos', pt: 'Dicas pr\u00e1ticas', ja: '\u5b9f\u8df5\u30d2\u30f3\u30c8', ko: '\uc2e4\uc6a9 \ud301' },
    forager: true, techcrunch: false, decoder: false, tldr: false, thebatch: false,
  },
  {
    label: { de: 'Video-Kuratierung', en: 'Video Curation', zh: '\u89c6\u9891\u7cbe\u9009', fr: 'Curation vid\u00e9o', es: 'Curaci\u00f3n de videos', pt: 'Cura\u00e7\u00e3o de v\u00eddeos', ja: '\u52d5\u753b\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3', ko: '\ub3d9\uc601\uc0c1 \ud050\ub808\uc774\uc158' },
    forager: true, techcrunch: false, decoder: false, tldr: false, thebatch: false,
  },
  {
    label: { de: 'Kostenloser Zugang', en: 'Free Access', zh: '\u514d\u8d39\u8bbf\u95ee', fr: 'Acc\u00e8s gratuit', es: 'Acceso gratuito', pt: 'Acesso gratuito', ja: '\u7121\u6599\u30a2\u30af\u30bb\u30b9', ko: '\ubb34\ub8cc \uc561\uc138\uc2a4' },
    forager: true, techcrunch: false, decoder: true, tldr: true, thebatch: true,
  },
  {
    label: { de: 'API-Zugang', en: 'API Access', zh: 'API \u8bbf\u95ee', fr: 'Acc\u00e8s API', es: 'Acceso API', pt: 'Acesso API', ja: 'API\u30a2\u30af\u30bb\u30b9', ko: 'API \uc561\uc138\uc2a4' },
    forager: true, techcrunch: false, decoder: false, tldr: false, thebatch: false,
  },
]

// Section F
const H2_FAQ: L = {
  de: 'H\u00e4ufig gestellte Fragen',
  en: 'Frequently Asked Questions',
  zh: '\u5e38\u89c1\u95ee\u9898',
  fr: 'Questions fr\u00e9quemment pos\u00e9es',
  es: 'Preguntas frecuentes',
  pt: 'Perguntas frequentes',
  ja: '\u3088\u304f\u3042\u308b\u8cea\u554f',
  ko: '\uc790\uc8fc \ubb3b\ub294 \uc9c8\ubb38',
}

const FAQ_ITEMS: Array<{ q: L; a: L }> = [
  {
    q: {
      de: 'Was ist ein KI-News-Aggregator?',
      en: 'What is an AI news aggregator?',
      zh: '\u4ec0\u4e48\u662fAI\u65b0\u95fb\u805a\u5408\u5668\uff1f',
      fr: "Qu'est-ce qu'un agr\u00e9gateur d'actualit\u00e9s IA ?",
      es: '\u00bfQu\u00e9 es un agregador de noticias de IA?',
      pt: 'O que \u00e9 um agregador de not\u00edcias de IA?',
      ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u3068\u306f\uff1f',
      ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30\ub780 \ubb34\uc5c7\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ein KI-News-Aggregator sammelt automatisch Nachrichten aus verschiedenen Quellen, klassifiziert sie mithilfe k\u00fcnstlicher Intelligenz und stellt sie \u00fcbersichtlich zusammen. Forager kuratiert t\u00e4glich Inhalte aus 35+ Quellen und liefert Zusammenfassungen in 8 Sprachen.',
      en: 'An AI news aggregator automatically collects news from multiple sources, classifies them using artificial intelligence, and presents them in a structured format. Forager curates daily content from 35+ sources and delivers summaries in 8 languages.',
      zh: 'AI\u65b0\u95fb\u805a\u5408\u5668\u81ea\u52a8\u4ece\u591a\u4e2a\u6765\u6e90\u6536\u96c6\u65b0\u95fb\uff0c\u4f7f\u7528\u4eba\u5de5\u667a\u80fd\u8fdb\u884c\u5206\u7c7b\uff0c\u5e76\u4ee5\u7ed3\u6784\u5316\u683c\u5f0f\u5448\u73b0\u3002Forager \u6bcf\u65e5\u4ece 35+ \u4fe1\u606f\u6e90\u7cbe\u9009\u5185\u5bb9\uff0c\u63d0\u4f9b 8 \u79cd\u8bed\u8a00\u7684\u6458\u8981\u3002',
      fr: "Un agr\u00e9gateur d'actualit\u00e9s IA collecte automatiquement les nouvelles de multiples sources, les classe \u00e0 l'aide de l'intelligence artificielle et les pr\u00e9sente de mani\u00e8re structur\u00e9e. Forager s\u00e9lectionne quotidiennement le contenu de 35+ sources en 8 langues.",
      es: 'Un agregador de noticias de IA recopila autom\u00e1ticamente noticias de m\u00faltiples fuentes, las clasifica mediante inteligencia artificial y las presenta de forma estructurada. Forager selecciona diariamente contenido de 35+ fuentes en 8 idiomas.',
      pt: 'Um agregador de not\u00edcias de IA coleta automaticamente not\u00edcias de m\u00faltiplas fontes, classifica-as usando intelig\u00eancia artificial e as apresenta de forma estruturada. Forager seleciona diariamente conte\u00fado de 35+ fontes em 8 idiomas.',
      ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u306f\u3001\u8907\u6570\u306e\u30bd\u30fc\u30b9\u304b\u3089\u81ea\u52d5\u7684\u306b\u30cb\u30e5\u30fc\u30b9\u3092\u53ce\u96c6\u3057\u3001\u4eba\u5de5\u77e5\u80fd\u3067\u5206\u985e\u3057\u3001\u69cb\u9020\u5316\u3055\u308c\u305f\u5f62\u5f0f\u3067\u63d0\u4f9b\u3057\u307e\u3059\u3002Forager\u306f35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u6bce\u65e5\u30b3\u30f3\u30c6\u30f3\u30c4\u3092\u53b3\u9078\u3057\u30018\u8a00\u8a9e\u3067\u8981\u7d04\u3092\u63d0\u4f9b\u3002',
      ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30\ub294 \uc5ec\ub7ec \uc18c\uc2a4\uc5d0\uc11c \uc790\ub3d9\uc73c\ub85c \ub274\uc2a4\ub97c \uc218\uc9d1\ud558\uace0, \uc778\uacf5\uc9c0\ub2a5\uc744 \uc0ac\uc6a9\ud558\uc5ec \ubd84\ub958\ud558\uba70, \uad6c\uc870\ud654\ub41c \ud615\uc2dd\uc73c\ub85c \uc81c\uacf5\ud569\ub2c8\ub2e4. Forager\ub294 35\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\uc5d0\uc11c \ub9e4\uc77c \ucf58\ud150\uce20\ub97c \uc120\ubcc4\ud558\uc5ec 8\uac1c \uc5b8\uc5b4\ub85c \uc694\uc57d\uc744 \uc81c\uacf5\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Ist Forager kostenlos?',
      en: 'Is Forager free?',
      zh: 'Forager \u514d\u8d39\u5417\uff1f',
      fr: 'Forager est-il gratuit ?',
      es: '\u00bfEs Forager gratuito?',
      pt: 'O Forager \u00e9 gratuito?',
      ja: 'Forager\u306f\u7121\u6599\u3067\u3059\u304b\uff1f',
      ko: 'Forager\ub294 \ubb34\ub8cc\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ja, Forager ist vollst\u00e4ndig kostenlos nutzbar. Alle Nachrichtenfeeds, die mehrsprachigen Inhalte und der Newsletter sind ohne Registrierung oder Bezahlung zug\u00e4nglich.',
      en: 'Yes, Forager is completely free to use. All news feeds, multilingual content, and the newsletter are accessible without registration or payment.',
      zh: '\u662f\u7684\uff0cForager \u5b8c\u5168\u514d\u8d39\u4f7f\u7528\u3002\u6240\u6709\u65b0\u95fb\u6d41\u3001\u591a\u8bed\u8a00\u5185\u5bb9\u548c\u901a\u8baf\u5747\u65e0\u9700\u6ce8\u518c\u6216\u4ed8\u8d39\u5373\u53ef\u8bbf\u95ee\u3002',
      fr: "Oui, Forager est enti\u00e8rement gratuit. Tous les flux d'actualit\u00e9s, le contenu multilingue et la newsletter sont accessibles sans inscription ni paiement.",
      es: 'S\u00ed, Forager es completamente gratuito. Todos los feeds de noticias, el contenido multiling\u00fce y el bolet\u00edn son accesibles sin registro ni pago.',
      pt: 'Sim, Forager \u00e9 completamente gratuito. Todos os feeds de not\u00edcias, conte\u00fado multilingual e newsletter s\u00e3o acess\u00edveis sem registro ou pagamento.',
      ja: '\u306f\u3044\u3001Forager\u306f\u5b8c\u5168\u7121\u6599\u3067\u3059\u3002\u3059\u3079\u3066\u306e\u30cb\u30e5\u30fc\u30b9\u30d5\u30a3\u30fc\u30c9\u3001\u591a\u8a00\u8a9e\u30b3\u30f3\u30c6\u30f3\u30c4\u3001\u30cb\u30e5\u30fc\u30b9\u30ec\u30bf\u30fc\u306f\u767b\u9332\u3084\u652f\u6255\u3044\u306a\u3057\u3067\u30a2\u30af\u30bb\u30b9\u53ef\u80fd\u3067\u3059\u3002',
      ko: '\ub124, Forager\ub294 \uc644\uc804\ud788 \ubb34\ub8cc\uc785\ub2c8\ub2e4. \ubaa8\ub4e0 \ub274\uc2a4 \ud53c\ub4dc, \ub2e4\uad6d\uc5b4 \ucf58\ud150\uce20, \ub274\uc2a4\ub808\ud130\ub294 \ub4f1\ub85d\uc774\ub098 \uacb0\uc81c \uc5c6\uc774 \uc811\uadfc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Wie viele Quellen aggregiert Forager?',
      en: 'How many sources does it aggregate?',
      zh: 'Forager \u805a\u5408\u4e86\u591a\u5c11\u4e2a\u6e90\uff1f',
      fr: 'Combien de sources agr\u00e8ge Forager ?',
      es: '\u00bfCu\u00e1ntas fuentes agrega Forager?',
      pt: 'Quantas fontes o Forager agrega?',
      ja: 'Forager\u306f\u3044\u304f\u3064\u306e\u30bd\u30fc\u30b9\u3092\u96c6\u7d04\u3057\u307e\u3059\u304b\uff1f',
      ko: 'Forager\ub294 \uba87 \uac1c\uc758 \uc18c\uc2a4\ub97c \uc9d1\uacc4\ud558\ub098\uc694?',
    },
    a: {
      de: 'Forager aggregiert \u00fcber 30 RSS-Feeds von f\u00fchrenden Tech-Publikationen wie TechCrunch, MIT Technology Review und Ars Technica, dazu Hacker-News-Frontpage-Beitr\u00e4ge und YouTube-Kan\u00e4le. Insgesamt werden \u00fcber 40 Quellen \u00fcberwacht.',
      en: 'Forager aggregates 30+ RSS feeds from leading tech publications like TechCrunch, MIT Technology Review, and Ars Technica, plus Hacker News front-page stories and YouTube channels. Over 40 sources are monitored in total.',
      zh: 'Forager \u805a\u5408\u6765\u81ea TechCrunch\u3001MIT Technology Review\u3001Ars Technica \u7b49\u9886\u5148\u79d1\u6280\u51fa\u7248\u7269\u7684 30+ RSS \u8ba2\u9605\u6e90\uff0c\u52a0\u4e0a Hacker News \u5934\u6761\u548c YouTube \u9891\u9053\u3002\u603b\u5171\u76d1\u63a7\u8d85\u8fc7 40 \u4e2a\u6e90\u3002',
      fr: "Forager agr\u00e8ge 30+ flux RSS de publications tech de r\u00e9f\u00e9rence comme TechCrunch, MIT Technology Review et Ars Technica, plus les articles en une de Hacker News et des cha\u00eenes YouTube. Plus de 40 sources sont surveill\u00e9es.",
      es: 'Forager agrega 30+ feeds RSS de publicaciones tech l\u00edderes como TechCrunch, MIT Technology Review y Ars Technica, adem\u00e1s de historias de portada de Hacker News y canales de YouTube. M\u00e1s de 40 fuentes monitoreadas en total.',
      pt: 'Forager agrega 30+ feeds RSS de publica\u00e7\u00f5es tech l\u00edderes como TechCrunch, MIT Technology Review e Ars Technica, al\u00e9m de hist\u00f3rias da p\u00e1gina inicial do Hacker News e canais do YouTube. Mais de 40 fontes monitoradas no total.',
      ja: 'Forager\u306fTechCrunch\u3001MIT Technology Review\u3001Ars Technica\u306a\u3069\u306e\u4e3b\u8981\u30c6\u30c3\u30af\u51fa\u7248\u7269\u304b\u3089\u306e30\u4ee5\u4e0a\u306eRSS\u30d5\u30a3\u30fc\u30c9\u306b\u52a0\u3048\u3001Hacker News\u306e\u30c8\u30c3\u30d7\u8a18\u4e8b\u3084YouTube\u30c1\u30e3\u30f3\u30cd\u30eb\u3092\u96c6\u7d04\u3002\u5408\u8a0840\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u3092\u76e3\u8996\u3002',
      ko: 'Forager\ub294 TechCrunch, MIT Technology Review, Ars Technica \ub4f1 \uc8fc\uc694 \ud14c\ud06c \ucd9c\ud310\ubb3c\uc758 30\uac1c \uc774\uc0c1 RSS \ud53c\ub4dc\uc640 Hacker News \ud1b1\uae30\uc0ac, YouTube \ucc44\ub110\uc744 \uc9d1\uacc4\ud569\ub2c8\ub2e4. \ucd1d 40\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\ub97c \ubaa8\ub2c8\ud130\ub9c1\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Welche Sprachen werden unterst\u00fctzt?',
      en: 'What languages are supported?',
      zh: '\u652f\u6301\u54ea\u4e9b\u8bed\u8a00\uff1f',
      fr: 'Quelles langues sont prises en charge ?',
      es: '\u00bfQu\u00e9 idiomas se admiten?',
      pt: 'Quais idiomas s\u00e3o suportados?',
      ja: '\u3069\u306e\u8a00\u8a9e\u304c\u30b5\u30dd\u30fc\u30c8\u3055\u308c\u3066\u3044\u307e\u3059\u304b\uff1f',
      ko: '\uc5b4\ub5a4 \uc5b8\uc5b4\uac00 \uc9c0\uc6d0\ub418\ub098\uc694?',
    },
    a: {
      de: 'Forager unterst\u00fctzt 8 Sprachen: Deutsch, Englisch, Chinesisch (vereinfacht), Franz\u00f6sisch, Spanisch, Portugiesisch, Japanisch und Koreanisch. Englisch wird nativ generiert, die \u00fcbrigen 7 Sprachen werden automatisch \u00fcbersetzt.',
      en: 'Forager supports 8 languages: German, English, Chinese (Simplified), French, Spanish, Portuguese, Japanese, and Korean. English is natively generated; the other 7 languages are automatically translated.',
      zh: 'Forager \u652f\u6301 8 \u79cd\u8bed\u8a00\uff1a\u5fb7\u8bed\u3001\u82f1\u8bed\u3001\u4e2d\u6587\uff08\u7b80\u4f53\uff09\u3001\u6cd5\u8bed\u3001\u897f\u73ed\u7259\u8bed\u3001\u8461\u8404\u7259\u8bed\u3001\u65e5\u8bed\u548c\u97e9\u8bed\u3002\u82f1\u8bed\u539f\u751f\u751f\u6210\uff0c\u5176\u4ed6 7 \u79cd\u8bed\u8a00\u81ea\u52a8\u7ffb\u8bd1\u3002',
      fr: 'Forager prend en charge 8 langues : allemand, anglais, chinois (simplifi\u00e9), fran\u00e7ais, espagnol, portugais, japonais et cor\u00e9en. L\'anglais est g\u00e9n\u00e9r\u00e9 nativement ; les 7 autres langues sont traduites automatiquement.',
      es: 'Forager admite 8 idiomas: alem\u00e1n, ingl\u00e9s, chino (simplificado), franc\u00e9s, espa\u00f1ol, portugu\u00e9s, japon\u00e9s y coreano. El ingl\u00e9s se genera nativamente; los otros 7 idiomas se traducen autom\u00e1ticamente.',
      pt: 'Forager suporta 8 idiomas: alem\u00e3o, ingl\u00eas, chin\u00eas (simplificado), franc\u00eas, espanhol, portugu\u00eas, japon\u00eas e coreano. O ingl\u00eas \u00e9 gerado nativamente; os outros 7 idiomas s\u00e3o traduzidos automaticamente.',
      ja: 'Forager\u306f8\u8a00\u8a9e\u3092\u30b5\u30dd\u30fc\u30c8\uff1a\u30c9\u30a4\u30c4\u8a9e\u3001\u82f1\u8a9e\u3001\u4e2d\u56fd\u8a9e\uff08\u7c21\u4f53\u5b57\uff09\u3001\u30d5\u30e9\u30f3\u30b9\u8a9e\u3001\u30b9\u30da\u30a4\u30f3\u8a9e\u3001\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e\u3001\u65e5\u672c\u8a9e\u3001\u97d3\u56fd\u8a9e\u3002\u82f1\u8a9e\u306f\u30cd\u30a4\u30c6\u30a3\u30d6\u751f\u6210\u3001\u4ed6\u306e7\u8a00\u8a9e\u306f\u81ea\u52d5\u7ffb\u8a33\u3002',
      ko: 'Forager\ub294 8\uac1c \uc5b8\uc5b4\ub97c \uc9c0\uc6d0\ud569\ub2c8\ub2e4: \ub3c5\uc77c\uc5b4, \uc601\uc5b4, \uc911\uad6d\uc5b4(\uac04\uccb4), \ud504\ub791\uc2a4\uc5b4, \uc2a4\ud398\uc778\uc5b4, \ud3ec\ub974\ud22c\uac08\uc5b4, \uc77c\ubcf8\uc5b4, \ud55c\uad6d\uc5b4. \uc601\uc5b4\ub294 \ub124\uc774\ud2f0\ube0c \uc0dd\uc131, \ub098\uba38\uc9c0 7\uac1c \uc5b8\uc5b4\ub294 \uc790\ub3d9 \ubc88\uc5ed\ub429\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Kann ich KI-Nachrichten per API abrufen?',
      en: 'Can I get AI news via API?',
      zh: '\u6211\u53ef\u4ee5\u901a\u8fc7 API \u83b7\u53d6 AI \u65b0\u95fb\u5417\uff1f',
      fr: "Puis-je obtenir des actualit\u00e9s IA via API ?",
      es: '\u00bfPuedo obtener noticias de IA a trav\u00e9s de API?',
      pt: 'Posso obter not\u00edcias de IA via API?',
      ja: 'API\u3067AI\u30cb\u30e5\u30fc\u30b9\u3092\u53d6\u5f97\u3067\u304d\u307e\u3059\u304b\uff1f',
      ko: 'API\ub97c \ud1b5\ud574 AI \ub274\uc2a4\ub97c \ubc1b\uc744 \uc218 \uc788\ub098\uc694?',
    },
    a: {
      de: 'Ja! Forager bietet eine kostenlose REST-API \u2014 die \u00f6ffentlichen Endpunkte ben\u00f6tigen keinen API-Schl\u00fcssel. Tech-, Investment- und Tips-Daten sind direkt programmatisch abrufbar.',
      en: 'Yes! Forager offers a free REST API \u2014 the public endpoints require no API key. Tech, investment, and tips data can be accessed programmatically right away.',
      zh: '\u662f\u7684\uff01Forager \u63d0\u4f9b\u514d\u8d39 REST API \u2014 \u516c\u5f00\u7aef\u70b9\u65e0\u9700 API \u5bc6\u94a5\uff0c\u53ef\u76f4\u63a5\u7a0b\u5e8f\u5316\u8bbf\u95ee\u6280\u672f\u3001\u6295\u8d44\u548c\u6280\u5de7\u6570\u636e\u3002',
      fr: "Oui ! Forager propose une API REST gratuite \u2014 les endpoints publics ne n\u00e9cessitent aucune cl\u00e9 API. Les donn\u00e9es tech, investissement et conseils sont accessibles directement.",
      es: '\u00a1S\u00ed! Forager ofrece una API REST gratuita \u2014 los endpoints p\u00fablicos no requieren clave API. Los datos de tecnolog\u00eda, inversi\u00f3n y consejos son accesibles directamente.',
      pt: 'Sim! Forager oferece uma API REST gratuita \u2014 os endpoints p\u00fablicos n\u00e3o exigem chave API. Os dados de tecnologia, investimento e dicas s\u00e3o acess\u00edveis diretamente.',
      ja: '\u306f\u3044\uff01Forager\u306f\u7121\u6599\u306eREST API\u3092\u63d0\u4f9b\u3057\u3066\u3044\u307e\u3059\u3002\u516c\u958b\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306bAPI\u30ad\u30fc\u306f\u4e0d\u8981 \u2014 \u30c6\u30c3\u30af\u3001\u6295\u8cc7\u3001\u30d2\u30f3\u30c8\u306e\u30c7\u30fc\u30bf\u306b\u76f4\u63a5\u30a2\u30af\u30bb\u30b9\u3067\u304d\u307e\u3059\u3002',
      ko: '\ub124! Forager\ub294 \ubb34\ub8cc REST API\ub97c \uc81c\uacf5\ud569\ub2c8\ub2e4. \uacf5\uac1c \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 API \ud0a4\uac00 \ud544\uc694 \uc5c6\uc2b5\ub2c8\ub2e4 \u2014 \uae30\uc220, \ud22c\uc790, \ud301 \ub370\uc774\ud130\uc5d0 \ubc14\ub85c \uc561\uc138\uc2a4\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
    },
  },
]

// Section G
const H2_CTA_FINAL: L = {
  de: 'Jetzt KI-Nachrichten lesen',
  en: 'Start reading AI news now',
  zh: '\u7acb\u5373\u5f00\u59cb\u9605\u8bfb AI \u65b0\u95fb',
  fr: "Commencez \u00e0 lire les actualit\u00e9s IA maintenant",
  es: 'Empiece a leer noticias de IA ahora',
  pt: 'Comece a ler not\u00edcias de IA agora',
  ja: '\u4eca\u3059\u3050AI\u30cb\u30e5\u30fc\u30b9\u3092\u8aad\u307f\u59cb\u3081\u308b',
  ko: '\uc9c0\uae08 AI \ub274\uc2a4 \uc77d\uae30 \uc2dc\uc791',
}

const TRUST_LINE: L = {
  de: 'Von KI-Fachleuten weltweit genutzt',
  en: 'Trusted by AI professionals worldwide',
  zh: '\u53d7\u5168\u7403 AI \u4e13\u4e1a\u4eba\u58eb\u4fe1\u8d56',
  fr: 'Utilis\u00e9 par des professionnels de l\u2019IA dans le monde entier',
  es: 'Usado por profesionales de IA en todo el mundo',
  pt: 'Usado por profissionais de IA em todo o mundo',
  ja: '\u4e16\u754c\u4e2d\u306eAI\u5c02\u9580\u5bb6\u306b\u4fe1\u983c\u3055\u308c\u3066\u3044\u307e\u3059',
  ko: '\uc804 \uc138\uacc4 AI \uc804\ubb38\uac00\ub4e4\uc774 \uc2e0\ub8b0\ud569\ub2c8\ub2e4',
}

// Breadcrumb label
const HOME_LABEL: L = { de: 'Startseite', en: 'Home', zh: '\u9996\u9875', fr: 'Accueil', es: 'Inicio', pt: 'In\u00edcio', ja: '\u30db\u30fc\u30e0', ko: '\ud648' }
const TOOL_LABEL: L = { de: 'KI-News-Aggregator', en: 'AI News Aggregator', zh: 'AI\u65b0\u95fb\u805a\u5408\u5668', fr: "Agr\u00e9gateur d'actualit\u00e9s IA", es: 'Agregador de noticias IA', pt: 'Agregador de not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc', ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30' }

const SOURCE_LABEL: L = { de: 'Quelle', en: 'Source', zh: '\u6765\u6e90', fr: 'Source', es: 'Fuente', pt: 'Fonte', ja: '\u30bd\u30fc\u30b9', ko: '\uc18c\uc2a4' }

// Cross-tool navigation
const H2_OTHER_TOOLS: L = {
  de: 'Weitere kostenlose KI-Tools',
  en: 'More Free AI Tools',
  zh: '\u66f4\u591a\u514d\u8d39AI\u5de5\u5177',
  fr: "Plus d'outils IA gratuits",
  es: 'M\u00e1s herramientas IA gratuitas',
  pt: 'Mais ferramentas IA gratuitas',
  ja: '\u305d\u306e\u4ed6\u306e\u7121\u6599AI\u30c4\u30fc\u30eb',
  ko: '\ub354 \ub9ce\uc740 \ubb34\ub8cc AI \ub3c4\uad6c',
}
const ALL_TOOLS_LABEL: L = {
  de: 'Alle Tools ansehen',
  en: 'View All Tools',
  zh: '\u67e5\u770b\u6240\u6709\u5de5\u5177',
  fr: 'Voir tous les outils',
  es: 'Ver todas las herramientas',
  pt: 'Ver todas as ferramentas',
  ja: '\u3059\u3079\u3066\u306e\u30c4\u30fc\u30eb\u3092\u898b\u308b',
  ko: '\ubaa8\ub4e0 \ub3c4\uad6c \ubcf4\uae30',
}
const CROSS_REPORT_NAME: L = { de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI\u62a5\u544a\u751f\u6210\u5668', fr: 'G\u00e9n\u00e9rateur de rapports IA', es: 'Generador de informes IA', pt: 'Gerador de relat\u00f3rios IA', ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc', ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30' }
const CROSS_REPORT_DESC: L = { de: 'Streaming-Berichte, 5 Exportformate.', en: 'Streaming reports, 5 export formats.', zh: '\u6d41\u5f0f\u62a5\u544a\uff0c5\u79cd\u5bfc\u51fa\u683c\u5f0f\u3002', fr: 'Rapports en streaming, 5 formats.', es: 'Informes en streaming, 5 formatos.', pt: 'Relat\u00f3rios em streaming, 5 formatos.', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u30ec\u30dd\u30fc\u30c8\u30015\u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u3002', ko: '\uc2a4\ud2b8\ub9ac\ubc0d \ubcf4\uace0\uc11c, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd.' }
const CROSS_STOCK_NAME: L = { de: 'AI Funding Tracker', en: 'AI Funding Tracker', zh: 'AI Funding Tracker', fr: 'AI Funding Tracker', es: 'AI Funding Tracker', pt: 'AI Funding Tracker', ja: 'AI Funding Tracker', ko: 'AI Funding Tracker' }
const CROSS_STOCK_DESC: L = { de: 'Finanzierungsrunden, M&A-Deals, kostenloser CSV-Export.', en: 'Funding rounds, M&A deals, free CSV export.', zh: '\u878d\u8d44\u8f6e\u6b21\u3001\u5e76\u8d2d\u4ea4\u6613\u3001\u514d\u8d39 CSV \u5bfc\u51fa\u3002', fr: 'Lev\u00e9es de fonds, op\u00e9rations M&A, export CSV gratuit.', es: 'Rondas de financiaci\u00f3n, operaciones M&A, exportaci\u00f3n CSV gratuita.', pt: 'Rodadas de financiamento, opera\u00e7\u00f5es M&A, exporta\u00e7\u00e3o CSV gratuita.', ja: '\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u30c7\u30a3\u30fc\u30eb\u3001\u7121\u6599CSV\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u3002', ko: '\ud380\ub529 \ub77c\uc6b4\ub4dc, M&A \uac70\ub798, \ubb34\ub8cc CSV \ub0b4\ubcf4\ub0b4\uae30.' }
const CROSS_API_NAME: L = { de: 'KI-News-API', en: 'AI News API', zh: 'AI\u65b0\u95fbAPI', fr: 'API actualit\u00e9s IA', es: 'API noticias IA', pt: 'API not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9API', ko: 'AI \ub274\uc2a4 API' }
const CROSS_API_DESC: L = { de: 'REST API, JSON, keine Authentifizierung.', en: 'REST API, JSON, no authentication required.', zh: 'REST API\u3001JSON\u3001\u65e0\u9700\u8ba4\u8bc1\u3002', fr: 'API REST, JSON, sans authentification.', es: 'API REST, JSON, sin autenticaci\u00f3n.', pt: 'API REST, JSON, sem autentica\u00e7\u00e3o.', ja: 'REST API\u3001JSON\u3001\u8a8d\u8a3c\u4e0d\u8981\u3002', ko: 'REST API, JSON, \uc778\uc99d \ubd88\ud544\uc694.' }

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AINewsAggregatorToolPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  // -- Fetch live preview data ------------------------------------------------
  type PreviewPost = { content: string; source: string; timestamp: string; sourceUrl?: string }
  let previewPosts: PreviewPost[] = []
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (weeksRes.ok) {
      const weeksData = await weeksRes.json()
      const latestId = weeksData?.days?.[0]?.id || weeksData?.weeks?.[0]?.id
      if (latestId) {
        const techRes = await fetch(`${API_BASE}/tech/${latestId}`, { next: { revalidate: 3600 } })
        if (techRes.ok) {
          const techData = await techRes.json()
          const posts = techData?.[lang] || techData?.en || techData?.de || []
          previewPosts = posts
            .filter((p: Record<string, unknown>) => !p.isVideo)
            .slice(0, 5)
            .map((p: Record<string, unknown>) => ({
              content: String(p.content ?? ''),
              source: String(p.source ?? ''),
              timestamp: String(p.timestamp ?? ''),
              sourceUrl: p.sourceUrl ? String(p.sourceUrl) : undefined,
            }))
        }
      }
    }
  } catch {
    /* gracefully degrade - show static content */
  }

  // -- JSON-LD schemas --------------------------------------------------------
  const pageUrl = `${BASE_URL}/${lang}/tools/ai-news-aggregator`

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Forager News Aggregator',
    description: t(META_DESCRIPTIONS, lang),
    url: pageUrl,
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
      url: BASE_URL,
    },
    inLanguage: ['de', 'en', 'zh-Hans', 'fr', 'es', 'pt', 'ja', 'ko'],
    featureList: [
      '35+ news sources',
      '8 language support',
      'Daily updates',
      'AI investment tracking',
      'YouTube video curation',
      'REST API access',
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: t(item.q, lang),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(item.a, lang),
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(HOME_LABEL, lang), item: `${BASE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${BASE_URL}/${lang}/tools` },
      { '@type': 'ListItem', position: 3, name: t(TOOL_LABEL, lang), item: pageUrl },
    ],
  }

  // -- Feature icon mapping ---------------------------------------------------
  const featureKeys = ['sources', 'languages', 'updates', 'investment', 'tips', 'videos'] as const
  const featureIcons: Record<string, React.ReactNode> = {
    sources: <Rss className="h-6 w-6" />,
    languages: <Globe className="h-6 w-6" />,
    updates: <Calendar className="h-6 w-6" />,
    investment: <TrendingUp className="h-6 w-6" />,
    tips: <Lightbulb className="h-6 w-6" />,
    videos: <Play className="h-6 w-6" />,
  }

  const featureAccents: Record<string, string> = {
    sources: 'text-[var(--tech-accent)]',
    languages: 'text-[var(--tips-accent)]',
    updates: 'text-[var(--invest-accent)]',
    investment: 'text-[var(--invest-accent)]',
    tips: 'text-[var(--tips-accent)]',
    videos: 'text-[var(--video-accent,theme(colors.rose.500))]',
  }

  return (
    <>
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main id="main-content">
      <article className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ================================================================= */}
        {/* Section A: Hero                                                   */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight">
            {t(H1, lang)}
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
            {t(SUBTITLE, lang)}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_START, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/${lang}#newsletter`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_SUBSCRIBE, lang)}
            </Link>
          </div>

          {/* Stat badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[STAT_SOURCES, STAT_LANGUAGES, STAT_DAILY, STAT_FREE].map((stat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium"
              >
                {t(stat, lang)}
              </span>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section B: Live News Preview                                      */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_PREVIEW, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(PREVIEW_LEAD, lang)}
          </p>

          {previewPosts.length > 0 ? (
            <div className="mt-8 grid gap-4">
              {previewPosts.map((post, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80"
                >
                  <p className="leading-relaxed">
                    {post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-[var(--tech-accent)]">
                      {t(SOURCE_LABEL, lang)}: {post.source}
                    </span>
                    {post.timestamp && (
                      <time dateTime={post.timestamp}>
                        {new Date(post.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-muted-foreground italic">{t(PREVIEW_EMPTY, lang)}</p>
          )}

          <div className="mt-8">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(VIEW_ALL, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section C: Features Grid                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_FEATURES, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border/50 bg-card/50 p-6"
              >
                <div className={`mb-4 ${featureAccents[key]}`} aria-hidden="true">
                  {featureIcons[key]}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t(FEATURE_TITLES[key], lang)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(FEATURE_DESCRIPTIONS[key], lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section D: How It Works                                           */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_HOW, lang)}
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEP_TITLES.map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(step, lang)}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {t(STEP_DESCRIPTIONS[i], lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section E: Comparison Table                                       */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_COMPARE, lang)}
          </h2>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border/50 px-3 py-3 text-left font-semibold" />
                  <th className="border border-border/50 px-3 py-3 text-center font-semibold text-primary">
                    Forager
                  </th>
                  <th className="border border-border/50 px-3 py-3 text-center font-semibold">TechCrunch</th>
                  <th className="border border-border/50 px-3 py-3 text-center font-semibold">The Decoder</th>
                  <th className="border border-border/50 px-3 py-3 text-center font-semibold">TLDR</th>
                  <th className="border border-border/50 px-3 py-3 text-center font-semibold">The Batch</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td className="border border-border/50 px-3 py-3 font-medium">
                      {t(row.label, lang)}
                    </td>
                    {[row.forager, row.techcrunch, row.decoder, row.tldr, row.thebatch].map((val, ci) => (
                      <td key={ci} className="border border-border/50 px-3 py-3 text-center">
                        {val ? (
                          <Check className="inline-block h-5 w-5 text-green-500" aria-label="Yes" />
                        ) : (
                          <X className="inline-block h-5 w-5 text-muted-foreground/40" aria-label="No" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section F: FAQ                                                    */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_FAQ, lang)}
          </h2>

          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border/50 bg-card/50 overflow-hidden"
              >
                <summary className="cursor-pointer px-6 py-4 font-medium select-none list-none flex items-center justify-between gap-4 hover:bg-accent/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">
                  <span>{t(item.q, lang)}</span>
                  <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden="true">+</span>
                </summary>
                <div className="px-6 pb-4 text-muted-foreground leading-relaxed">
                  {t(item.a, lang)}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Cross-Tool Navigation                                             */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_OTHER_TOOLS, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link
              href={`/${lang}/tools/ai-report-generator`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_REPORT_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_REPORT_DESC, lang)}</p>
            </Link>
            <Link
              href="/funding"
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_STOCK_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_STOCK_DESC, lang)}</p>
            </Link>
            <Link
              href={`/${lang}/tools/ai-news-api`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_API_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_API_DESC, lang)}</p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`/${lang}/tools`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(ALL_TOOLS_LABEL, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section G: Final CTA                                              */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16 my-8 rounded-2xl bg-primary/5 text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_CTA_FINAL, lang)}
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_START, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/${lang}#newsletter`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_SUBSCRIBE, lang)}
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t(TRUST_LINE, lang)}</p>
        </section>
      </article>
      </main>
    </>
  )
}
