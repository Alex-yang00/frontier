import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import { Unlock, Globe, Rss, TrendingUp, Calendar, Braces, ArrowRight, Code } from 'lucide-react'

export const revalidate = 86400

const BASE_URL = 'https://www.forager.example'
const API_BASE_URL = 'https://api.forager.example'

type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const META_TITLES: L = {
  de: 'KI-News-API in 8 Sprachen | Forager',
  en: 'Free AI News API | Forager',
  zh: '\u514d\u8d39AI\u65b0\u95fbAPI \u2014 8\u79cd\u8bed\u8a00\u7684\u7cbe\u9009AI\u65b0\u95fb\u6570\u636e | Forager',
  fr: 'API Actualit\u00e9s IA | Forager',
  es: 'API de Noticias IA | Forager',
  pt: 'API de Not\u00edcias IA | Forager',
  ja: '\u7121\u6599AI\u30cb\u30e5\u30fc\u30b9API \u2014 8\u8a00\u8a9e\u306e\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3AI\u30cb\u30e5\u30fc\u30b9\u30c7\u30fc\u30bf | Forager',
  ko: '\ubb34\ub8cc AI \ub274\uc2a4 API \u2014 8\uac1c \uc5b8\uc5b4 \ud050\ub808\uc774\uc158 AI \ub274\uc2a4 \ub370\uc774\ud130 | Forager',
}

const META_DESCRIPTIONS: L = {
  de: 'Kostenlose REST API f\u00fcr kuratierte KI-News aus 35+ Quellen: Technologie, Investments, Tipps und Videos in 8 Sprachen.',
  en: 'Free REST API for curated AI news from 35+ sources. Technology, investments, tips, videos in 8 languages. JSON responses, no authentication required.',
  zh: '\u514d\u8d39REST API\uff0c\u6765\u81ea35+\u6765\u6e90\u7684\u7cbe\u9009AI\u65b0\u95fb\u3002\u6280\u672f\u3001\u6295\u8d44\u3001\u6280\u5de7\u3001\u89c6\u9891\uff0c\u652f\u63018\u79cd\u8bed\u8a00\u3002JSON\u54cd\u5e94\uff0c\u65e0\u9700\u8ba4\u8bc1\u3002',
  fr: 'API REST gratuite pour actualit\u00e9s IA de 35+ sources: technologie, investissements, conseils et vid\u00e9os en 8 langues.',
  es: 'API REST gratuita para noticias IA de 35+ fuentes. Tecnolog\u00eda, inversiones, consejos, videos en 8 idiomas. Respuestas JSON, sin autenticaci\u00f3n.',
  pt: 'API REST gratuita para not\u00edcias IA de 35+ fontes: tecnologia, investimentos, dicas e v\u00eddeos em 8 idiomas.',
  ja: '35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u306eAI\u30cb\u30e5\u30fc\u30b9\u7528\u7121\u6599REST API\u3002\u30c6\u30af\u30ce\u30ed\u30b8\u30fc\u3001\u6295\u8cc7\u3001\u30d2\u30f3\u30c8\u3001\u52d5\u753b\u30928\u8a00\u8a9e\u3067\u3002JSON\u5fdc\u7b54\u3001\u8a8d\u8a3c\u4e0d\u8981\u3002',
  ko: '35\uac1c+ \uc18c\uc2a4\uc758 \ud050\ub808\uc774\uc158 AI \ub274\uc2a4\ub97c \uc704\ud55c \ubb34\ub8cc REST API. \uae30\uc220, \ud22c\uc790, \ud301, \ub3d9\uc601\uc0c1\uc744 8\uac1c \uc5b8\uc5b4\ub85c. JSON \uc751\ub2f5, \uc778\uc99d \ubd88\ud544\uc694.',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const pageUrl = `${BASE_URL}/${lang}/tools/ai-news-api`

  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools/ai-news-api`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools/ai-news-api`
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
          alt: 'Forager News API',
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
          alt: 'Forager News API',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

const H1: L = {
  de: 'Kostenlose KI-News-API',
  en: 'Free AI News API',
  zh: '\u514d\u8d39AI\u65b0\u95fbAPI',
  fr: 'API Actualit\u00e9s IA Gratuite',
  es: 'API Noticias IA Gratis',
  pt: 'API Not\u00edcias IA Gr\u00e1tis',
  ja: '\u7121\u6599AI\u30cb\u30e5\u30fc\u30b9API',
  ko: '\ubb34\ub8cc AI \ub274\uc2a4 API',
}

const SUBTITLE: L = {
  de: 'Greifen Sie \u00fcber unsere REST API auf kuratierte KI-Nachrichten-Daten aus 35+ Quellen zu. Technologie, Investments, Tipps, Videos \u2014 alles in 8 Sprachen, im JSON-Format, ohne Authentifizierung.',
  en: 'Access curated AI news data from 35+ sources via REST API. Technology, investments, tips, videos \u2014 all in 8 languages, JSON format, no authentication required.',
  zh: '\u901a\u8fc7 REST API \u8bbf\u95ee\u6765\u81ea 35+ \u6e90\u7684\u7cbe\u9009 AI \u65b0\u95fb\u6570\u636e\u3002\u6280\u672f\u3001\u6295\u8d44\u3001\u6280\u5de7\u3001\u89c6\u9891 \u2014 \u5168\u90e8 8 \u79cd\u8bed\u8a00\uff0cJSON \u683c\u5f0f\uff0c\u65e0\u9700\u8ba4\u8bc1\u3002',
  fr: 'Acc\u00e9dez aux donn\u00e9es d\u2019actualit\u00e9s IA de 35+ sources via API REST. Technologies, investissements, conseils, vid\u00e9os \u2014 en 8 langues, format JSON, sans authentification.',
  es: 'Acceda a datos de noticias IA curados de 35+ fuentes v\u00eda API REST. Tecnolog\u00eda, inversiones, consejos, videos \u2014 en 8 idiomas, formato JSON, sin autenticaci\u00f3n.',
  pt: 'Acesse dados curados de not\u00edcias IA de 35+ fontes via API REST. Tecnologia, investimentos, dicas, v\u00eddeos \u2014 em 8 idiomas, formato JSON, sem autentica\u00e7\u00e3o.',
  ja: 'REST API \u3067 35 \u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u7cbe\u9078\u3055\u308c\u305f AI \u30cb\u30e5\u30fc\u30b9\u30c7\u30fc\u30bf\u306b\u30a2\u30af\u30bb\u30b9\u3002\u30c6\u30af\u30ce\u30ed\u30b8\u30fc\u3001\u6295\u8cc7\u3001\u30d2\u30f3\u30c8\u3001\u52d5\u753b \u2014 8 \u8a00\u8a9e\u3001JSON \u5f62\u5f0f\u3001\u8a8d\u8a3c\u4e0d\u8981\u3002',
  ko: 'REST API\ub97c \ud1b5\ud574 35\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\uc5d0\uc11c \ud050\ub808\uc774\uc158\ub41c AI \ub274\uc2a4 \ub370\uc774\ud130\uc5d0 \uc561\uc138\uc2a4\ud558\uc138\uc694. \uae30\uc220, \ud22c\uc790, \ud301, \ub3d9\uc601\uc0c1 \u2014 8\uac1c \uc5b8\uc5b4, JSON \ud615\uc2dd, \uc778\uc99d \ubd88\ud544\uc694.',
}

const CTA_GET_KEY: L = {
  de: 'Loslegen \u2014 kein API-Key n\u00f6tig',
  en: 'Start now \u2014 no API key needed',
  zh: '\u7acb\u5373\u4f7f\u7528 \u2014 \u65e0\u9700 API \u5bc6\u94a5',
  fr: 'Commencer \u2014 aucune cl\u00e9 API requise',
  es: 'Empezar \u2014 sin clave API',
  pt: 'Come\u00e7ar \u2014 sem chave API',
  ja: '\u4eca\u3059\u3050\u5229\u7528 \u2014 API\u30ad\u30fc\u4e0d\u8981',
  ko: '\ubc14\ub85c \uc0ac\uc6a9 \u2014 API \ud0a4 \ubd88\ud544\uc694',
}

const CTA_VIEW_DOCS: L = {
  de: 'Dokumentation ansehen',
  en: 'View Documentation',
  zh: '\u67e5\u770b\u6587\u6863',
  fr: 'Voir la documentation',
  es: 'Ver documentaci\u00f3n',
  pt: 'Ver documenta\u00e7\u00e3o',
  ja: '\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8\u3092\u898b\u308b',
  ko: '\ubb38\uc11c \ubcf4\uae30',
}

const STAT_REST: L = { de: 'REST API', en: 'REST API', zh: 'REST API', fr: 'REST API', es: 'REST API', pt: 'REST API', ja: 'REST API', ko: 'REST API' }
const STAT_LANGUAGES: L = { de: '8 Sprachen', en: '8 Languages', zh: '8 \u79cd\u8bed\u8a00', fr: '8 Langues', es: '8 Idiomas', pt: '8 Idiomas', ja: '8 \u8a00\u8a9e', ko: '8\uac1c \uc5b8\uc5b4' }
const STAT_JSON: L = { de: 'JSON-Antwort', en: 'JSON Response', zh: 'JSON \u54cd\u5e94', fr: 'R\u00e9ponse JSON', es: 'Respuesta JSON', pt: 'Resposta JSON', ja: 'JSON\u5fdc\u7b54', ko: 'JSON \uc751\ub2f5' }
const STAT_FREE: L = { de: 'Kostenlos', en: 'Free Tier', zh: '\u514d\u8d39\u5c42', fr: 'Gratuit', es: 'Gratuito', pt: 'Gratuito', ja: '\u7121\u6599\u30d7\u30e9\u30f3', ko: '\ubb34\ub8cc \ud50c\ub79c' }

// Section B: Endpoints
const H2_ENDPOINTS: L = {
  de: 'Welche Endpunkte bietet die KI-News-API?',
  en: 'What endpoints does the AI news API provide?',
  zh: 'AI\u65b0\u95fbAPI\u63d0\u4f9b\u54ea\u4e9b\u7aef\u70b9\uff1f',
  fr: "Quels endpoints l'API d'actualit\u00e9s IA fournit-elle ?",
  es: '\u00bfQu\u00e9 endpoints ofrece la API de noticias IA?',
  pt: 'Quais endpoints a API de not\u00edcias IA oferece?',
  ja: 'AI\u30cb\u30e5\u30fc\u30b9API\u306f\u3069\u306e\u3088\u3046\u306a\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u3092\u63d0\u4f9b\u3057\u307e\u3059\u304b\uff1f',
  ko: 'AI \ub274\uc2a4 API\ub294 \uc5b4\ub5a4 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub97c \uc81c\uacf5\ud558\ub098\uc694?',
}

const ENDPOINTS_LEAD: L = {
  de: 'Unsere REST API gibt Ihnen programmatischen Zugriff auf kuratierte KI-Nachrichten-Daten. Die Inhalts-Endpunkte liefern JSON mit allen verf\u00fcgbaren \u00dcbersetzungen (bis zu 8 Sprachen); /weeks liefert die Periodenliste. Period-IDs verwenden das Format YYYY-MM-DD (t\u00e4glich) oder YYYY-kwWW (w\u00f6chentlich).',
  en: 'Our REST API gives you programmatic access to curated AI news data. Content endpoints return JSON with all available translations (up to 8 languages); /weeks returns the period list. Period IDs use the format YYYY-MM-DD (daily) or YYYY-kwWW (weekly).',
  zh: '\u6211\u4eec\u7684 REST API \u63d0\u4f9b\u5bf9\u7cbe\u9009 AI \u65b0\u95fb\u6570\u636e\u7684\u7a0b\u5e8f\u5316\u8bbf\u95ee\u3002\u5185\u5bb9\u7aef\u70b9\u8fd4\u56de\u5305\u542b\u6240\u6709\u5df2\u751f\u6210\u7ffb\u8bd1(\u6700\u591a 8 \u79cd\u8bed\u8a00)\u7684 JSON;/weeks \u8fd4\u56de\u65f6\u6bb5\u5217\u8868\u3002Period ID \u683c\u5f0f\u4e3a YYYY-MM-DD(\u6bcf\u65e5)\u6216 YYYY-kwWW(\u6bcf\u5468)\u3002',
  fr: 'Notre API REST vous donne un acc\u00e8s programmatique aux donn\u00e9es d\'actualit\u00e9s IA. Les endpoints de contenu renvoient du JSON avec toutes les traductions disponibles (jusqu\'\u00e0 8 langues) ; /weeks renvoie la liste des p\u00e9riodes. Les Period IDs utilisent le format YYYY-MM-DD (quotidien) ou YYYY-kwWW (hebdomadaire).',
  es: 'Nuestra API REST le da acceso program\u00e1tico a datos curados de noticias de IA. Los endpoints de contenido devuelven JSON con todas las traducciones disponibles (hasta 8 idiomas); /weeks devuelve la lista de per\u00edodos. Los Period IDs usan el formato YYYY-MM-DD (diario) o YYYY-kwWW (semanal).',
  pt: 'Nossa API REST d\u00e1 acesso program\u00e1tico a dados curados de not\u00edcias de IA. Os endpoints de conte\u00fado retornam JSON com todas as tradu\u00e7\u00f5es dispon\u00edveis (at\u00e9 8 idiomas); /weeks retorna a lista de per\u00edodos. Period IDs usam o formato YYYY-MM-DD (di\u00e1rio) ou YYYY-kwWW (semanal).',
  ja: 'REST API\u3067\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u6e08\u307fAI\u30cb\u30e5\u30fc\u30b9\u30c7\u30fc\u30bf\u306b\u30d7\u30ed\u30b0\u30e9\u30e0\u304b\u3089\u30a2\u30af\u30bb\u30b9\u3067\u304d\u307e\u3059\u3002\u30b3\u30f3\u30c6\u30f3\u30c4\u7cfb\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306f\u751f\u6210\u6e08\u307f\u306e\u3059\u3079\u3066\u306e\u7ffb\u8a33(\u6700\u59278\u8a00\u8a9e)\u3092\u542b\u3080JSON\u3092\u8fd4\u3057\u3001/weeks\u306f\u671f\u9593\u30ea\u30b9\u30c8\u3092\u8fd4\u3057\u307e\u3059\u3002Period ID\u306fYYYY-MM-DD(\u65e5\u6b21)\u307e\u305f\u306fYYYY-kwWW(\u9031\u6b21)\u5f62\u5f0f\u3002',
  ko: 'REST API\ub85c \ud050\ub808\uc774\uc158\ub41c AI \ub274\uc2a4 \ub370\uc774\ud130\uc5d0 \ud504\ub85c\uadf8\ub798\ubc0d \ubc29\uc2dd\uc73c\ub85c \uc561\uc138\uc2a4\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ucf58\ud150\uce20 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \uc0dd\uc131\ub41c \ubaa8\ub4e0 \ubc88\uc5ed(\ucd5c\ub300 8\uac1c \uc5b8\uc5b4)\uc744 \ud3ec\ud568\ud55c JSON\uc744 \ubc18\ud658\ud558\uace0, /weeks\ub294 \uae30\uac04 \ubaa9\ub85d\uc744 \ubc18\ud658\ud569\ub2c8\ub2e4. Period ID \ud615\uc2dd\uc740 YYYY-MM-DD(\uc77c\uac04) \ub610\ub294 YYYY-kwWW(\uc8fc\uac04)\uc785\ub2c8\ub2e4.',
}

const ENDPOINTS = [
  { path: '/api/weeks', description: { de: 'Alle verf\u00fcgbaren Perioden auflisten (Wochen mit verschachtelten Tagen)', en: 'List all available periods (weeks with nested days)', zh: '\u5217\u51fa\u6240\u6709\u53ef\u7528\u671f\u95f4\uff08\u542b\u5d4c\u5957\u65e5\u671f\u7684\u5468\uff09', fr: 'Lister toutes les p\u00e9riodes disponibles (semaines avec jours imbriqu\u00e9s)', es: 'Listar todos los per\u00edodos disponibles (semanas con d\u00edas anidados)', pt: 'Listar todos os per\u00edodos dispon\u00edveis (semanas com dias aninhados)', ja: '\u5229\u7528\u53ef\u80fd\u306a\u5168\u671f\u9593\u3092\u30ea\u30b9\u30c8\uff08\u65e5\u4ed8\u5185\u5305\u306e\u9031\uff09', ko: '\uc0ac\uc6a9 \uac00\ub2a5\ud55c \ubaa8\ub4e0 \uae30\uac04 \ub098\uc5f4(\ub0b4\uc7a5\ub41c \uc77c\uc790\uc758 \uc8fc\uac04)' } },
  { path: '/api/tech/{periodId}', description: { de: 'Technologie-Nachrichten + Video-Zusammenfassungen', en: 'Technology news + video summaries', zh: '\u6280\u672f\u65b0\u95fb + \u89c6\u9891\u6458\u8981', fr: 'Actualit\u00e9s technologiques + r\u00e9sum\u00e9s vid\u00e9o', es: 'Noticias tecnol\u00f3gicas + res\u00famenes de video', pt: 'Not\u00edcias de tecnologia + resumos de v\u00eddeo', ja: '\u30c6\u30af\u30ce\u30ed\u30b8\u30fc\u30cb\u30e5\u30fc\u30b9 + \u52d5\u753b\u8981\u7d04', ko: '\uae30\uc220 \ub274\uc2a4 + \ub3d9\uc601\uc0c1 \uc694\uc57d' } },
  { path: '/api/investment/{periodId}', description: { de: 'Finanzierungsrunden, M&A, Marktnachrichten', en: 'Funding rounds, M&A, market news', zh: '\u878d\u8d44\u8f6e\u6b21\u3001\u5e76\u8d2d\u3001\u5e02\u573a\u8d44\u8baf', fr: 'Tours de financement, M&A, actualit\u00e9s de march\u00e9', es: 'Rondas de financiaci\u00f3n, M&A, noticias de mercado', pt: 'Rodadas de financiamento, M&A, not\u00edcias de mercado', ja: '\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u3001\u5e02\u5834\u30cb\u30e5\u30fc\u30b9', ko: '\ud380\ub529 \ub77c\uc6b4\ub4dc, M&A, \uc2dc\uc7a5 \ub274\uc2a4' } },
  { path: '/api/tips/{periodId}', description: { de: 'Praktische KI-Tipps aus Reddit + Blogs', en: 'Practical AI tips from Reddit + blogs', zh: '\u6765\u81ea Reddit + \u535a\u5ba2\u7684\u5b9e\u7528 AI \u6280\u5de7', fr: 'Conseils IA pratiques de Reddit + blogs', es: 'Consejos pr\u00e1cticos de IA de Reddit + blogs', pt: 'Dicas pr\u00e1ticas de IA do Reddit + blogs', ja: 'Reddit + \u30d6\u30ed\u30b0\u304b\u3089\u306e\u5b9f\u8df5\u7684AI\u30d2\u30f3\u30c8', ko: 'Reddit + \ube14\ub85c\uadf8\uc758 \uc2e4\uc6a9 AI \ud301' } },
  { path: '/api/videos/{periodId}', description: { de: 'Kuratierte YouTube-Video-Zusammenfassungen', en: 'Curated YouTube video summaries', zh: '\u7cbe\u9009 YouTube \u89c6\u9891\u6458\u8981', fr: 'R\u00e9sum\u00e9s vid\u00e9o YouTube s\u00e9lectionn\u00e9s', es: 'Res\u00famenes de videos de YouTube curados', pt: 'Resumos de v\u00eddeos curados do YouTube', ja: '\u53b3\u9078YouTube\u52d5\u753b\u8981\u7d04', ko: '\ud050\ub808\uc774\uc158 YouTube \ub3d9\uc601\uc0c1 \uc694\uc57d' } },
  { path: '/api/trends/{periodId}', description: { de: 'Trendende KI-Themen', en: 'Trending AI topics', zh: '\u70ed\u95e8 AI \u8bdd\u9898', fr: 'Sujets IA tendance', es: 'Temas de IA en tendencia', pt: 'T\u00f3picos de IA em alta', ja: '\u30c8\u30ec\u30f3\u30c9AI\u30c8\u30d4\u30c3\u30af', ko: '\ud2b8\ub80c\ub529 AI \ud1a0\ud53d' } },
]

// Section C: Code Examples
const H2_CODE: L = {
  de: 'Wie verwende ich die KI-News-API?',
  en: 'How do I use the AI news API?',
  zh: '\u5982\u4f55\u4f7f\u7528AI\u65b0\u95fbAPI\uff1f',
  fr: "Comment utiliser l'API d'actualit\u00e9s IA ?",
  es: '\u00bfC\u00f3mo uso la API de noticias IA?',
  pt: 'Como usar a API de not\u00edcias IA?',
  ja: 'AI\u30cb\u30e5\u30fc\u30b9API\u306e\u4f7f\u3044\u65b9\u306f\uff1f',
  ko: 'AI \ub274\uc2a4 API\ub97c \uc5b4\ub5bb\uac8c \uc0ac\uc6a9\ud558\ub098\uc694?',
}

const CODE_LEAD: L = {
  de: 'Beginnen Sie in Sekunden mit unserer API. Hier sind Beispiele in drei g\u00e4ngigen Sprachen \u2014 keine Bibliotheken, keine Einrichtung, nur ein einfacher HTTP-Aufruf:',
  en: 'Get started in seconds with our API. Here are examples in three popular languages \u2014 no libraries, no setup, just a simple HTTP call:',
  zh: '\u51e0\u79d2\u5373\u53ef\u5f00\u59cb\u4f7f\u7528\u6211\u4eec\u7684 API\u3002\u4ee5\u4e0b\u662f\u4e09\u79cd\u6d41\u884c\u8bed\u8a00\u7684\u793a\u4f8b \u2014 \u65e0\u9700\u5e93\u3001\u65e0\u9700\u8bbe\u7f6e\uff0c\u53ea\u9700\u7b80\u5355\u7684 HTTP \u8c03\u7528\uff1a',
  fr: "D\u00e9marrez en quelques secondes avec notre API. Voici des exemples dans trois langages courants \u2014 pas de biblioth\u00e8ques, pas de configuration, juste un appel HTTP :",
  es: 'Empiece en segundos con nuestra API. Aqu\u00ed hay ejemplos en tres lenguajes populares \u2014 sin bibliotecas, sin configuraci\u00f3n, solo una llamada HTTP:',
  pt: 'Comece em segundos com nossa API. Aqui est\u00e3o exemplos em tr\u00eas linguagens populares \u2014 sem bibliotecas, sem configura\u00e7\u00e3o, apenas uma chamada HTTP:',
  ja: '\u5f53\u793eAPI\u3067\u6570\u79d2\u3067\u59cb\u3081\u3089\u308c\u307e\u3059\u30023\u3064\u306e\u4eba\u6c17\u8a00\u8a9e\u306e\u4f8b \u2014 \u30e9\u30a4\u30d6\u30e9\u30ea\u4e0d\u8981\u3001\u30bb\u30c3\u30c8\u30a2\u30c3\u30d7\u4e0d\u8981\u3001\u30b7\u30f3\u30d7\u30eb\u306aHTTP\u30b3\u30fc\u30eb\u3060\u3051\uff1a',
  ko: '\uc6b0\ub9ac API\ub85c \uba87 \ucd08 \ub9cc\uc5d0 \uc2dc\uc791\ud558\uc138\uc694. \uc138 \uac00\uc9c0 \uc778\uae30 \uc5b8\uc5b4\uc758 \uc608\uc2dc \u2014 \ub77c\uc774\ube0c\ub7ec\ub9ac \uc5c6\uc774, \uc124\uc815 \uc5c6\uc774, \ub2e8\uc21c\ud55c HTTP \ud638\ucd9c\ub9cc\uc73c\ub85c:',
}

// Section D: Response Format
const H2_RESPONSE: L = {
  de: 'Wie sieht die API-Antwort aus?',
  en: 'What does the API response look like?',
  zh: 'API\u54cd\u5e94\u662f\u4ec0\u4e48\u6837\u7684\uff1f',
  fr: "\u00c0 quoi ressemble la r\u00e9ponse de l'API ?",
  es: '\u00bfC\u00f3mo se ve la respuesta de la API?',
  pt: 'Como \u00e9 a resposta da API?',
  ja: 'API\u30ec\u30b9\u30dd\u30f3\u30b9\u306f\u3069\u306e\u3088\u3046\u306a\u3082\u306e\u3067\u3059\u304b\uff1f',
  ko: 'API \uc751\ub2f5\uc740 \uc5b4\ub5a4 \ubaa8\uc2b5\uc778\uac00\uc694?',
}

const RESPONSE_LEAD: L = {
  de: 'Die Feed-Endpunkte liefern mehrsprachiges JSON mit allen verf\u00fcgbaren \u00dcbersetzungen (bis zu 8 Sprachen). Hier ist ein Beispiel einer typischen Antwort:',
  en: 'Feed endpoints return multilingual JSON with all available translations (up to 8 languages). Here is an example of a typical response:',
  zh: '\u5185\u5bb9\u7aef\u70b9\u8fd4\u56de\u591a\u8bed\u8a00 JSON,\u5305\u542b\u6240\u6709\u5df2\u751f\u6210\u7684\u7ffb\u8bd1(\u6700\u591a 8 \u79cd\u8bed\u8a00)\u3002\u4ee5\u4e0b\u662f\u5178\u578b\u54cd\u5e94\u793a\u4f8b:',
  fr: 'Les endpoints de contenu renvoient un JSON multilingue avec toutes les traductions disponibles (jusqu\'\u00e0 8 langues). Voici un exemple de r\u00e9ponse typique :',
  es: 'Los endpoints de contenido devuelven JSON multiling\u00fce con todas las traducciones disponibles (hasta 8 idiomas). Aqu\u00ed hay un ejemplo de respuesta t\u00edpica:',
  pt: 'Os endpoints de conte\u00fado retornam JSON multil\u00edngue com todas as tradu\u00e7\u00f5es dispon\u00edveis (at\u00e9 8 idiomas). Aqui est\u00e1 um exemplo de resposta t\u00edpica:',
  ja: '\u30b3\u30f3\u30c6\u30f3\u30c4\u7cfb\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306f\u3001\u751f\u6210\u6e08\u307f\u306e\u3059\u3079\u3066\u306e\u7ffb\u8a33(\u6700\u59278\u8a00\u8a9e)\u3092\u542b\u3080\u591a\u8a00\u8a9eJSON\u3092\u8fd4\u3057\u307e\u3059\u3002\u5178\u578b\u7684\u306a\u30ec\u30b9\u30dd\u30f3\u30b9\u4f8b:',
  ko: '\ucf58\ud150\uce20 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \uc0dd\uc131\ub41c \ubaa8\ub4e0 \ubc88\uc5ed(\ucd5c\ub300 8\uac1c \uc5b8\uc5b4)\uc744 \ud3ec\ud568\ud55c \ub2e4\uad6d\uc5b4 JSON\uc744 \ubc18\ud658\ud569\ub2c8\ub2e4. \uc77c\ubc18\uc801\uc778 \uc751\ub2f5 \uc608\uc2dc:',
}

// Section E: Features Grid
const H2_FEATURES: L = {
  de: 'Warum die Forager News API nutzen?',
  en: 'Why use the Forager News API?',
  zh: '\u4e3a\u4ec0\u4e48\u4f7f\u7528 Forager \u65b0\u95fb API\uff1f',
  fr: "Pourquoi utiliser l'API Forager News ?",
  es: '\u00bfPor qu\u00e9 usar la API Forager News?',
  pt: 'Por que usar a API Forager News?',
  ja: '\u306a\u305cForager\u30cb\u30e5\u30fc\u30b9API\u3092\u4f7f\u3046\u306e\u304b\uff1f',
  ko: '\uc65c Forager \ub274\uc2a4 API\ub97c \uc0ac\uc6a9\ud574\uc57c \ud558\ub098\uc694?',
}

const FEATURE_TITLES: Record<string, L> = {
  noAuth: { de: 'Keine Authentifizierung n\u00f6tig', en: 'No Auth Required', zh: '\u65e0\u9700\u8ba4\u8bc1', fr: 'Sans authentification', es: 'Sin autenticaci\u00f3n', pt: 'Sem autentica\u00e7\u00e3o', ja: '\u8a8d\u8a3c\u4e0d\u8981', ko: '\uc778\uc99d \ubd88\ud544\uc694' },
  languages: { de: '8 Sprachen Daten', en: '8 Language Data', zh: '8 \u79cd\u8bed\u8a00\u6570\u636e', fr: 'Donn\u00e9es en 8 langues', es: 'Datos en 8 idiomas', pt: 'Dados em 8 idiomas', ja: '8\u8a00\u8a9e\u30c7\u30fc\u30bf', ko: '8\uac1c \uc5b8\uc5b4 \ub370\uc774\ud130' },
  sources: { de: '35+ Quellen', en: '35+ Sources', zh: '35+ \u4fe1\u606f\u6e90', fr: '35+ Sources', es: '35+ Fuentes', pt: '35+ Fontes', ja: '35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9', ko: '35\uac1c+ \uc18c\uc2a4' },
  stock: { de: 'Aktiendaten (pausiert)', en: 'Stock Data (paused)', zh: '\u80a1\u7968\u6570\u636e(\u6682\u505c\u4e2d)', fr: 'Donn\u00e9es boursi\u00e8res (en pause)', es: 'Datos burs\u00e1tiles (en pausa)', pt: 'Dados de a\u00e7\u00f5es (em pausa)', ja: '\u682a\u4fa1\u30c7\u30fc\u30bf(\u4e00\u6642\u505c\u6b62\u4e2d)', ko: '\uc8fc\uc2dd \ub370\uc774\ud130(\uc77c\uc2dc \uc911\uc9c0)' },
  daily: { de: 'T\u00e4gliche Updates', en: 'Daily Updates', zh: '\u6bcf\u65e5\u66f4\u65b0', fr: 'Mises \u00e0 jour quotidiennes', es: 'Actualizaciones diarias', pt: 'Atualiza\u00e7\u00f5es di\u00e1rias', ja: '\u6bce\u65e5\u66f4\u65b0', ko: '\ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8' },
  json: { de: 'JSON-Format', en: 'JSON Format', zh: 'JSON \u683c\u5f0f', fr: 'Format JSON', es: 'Formato JSON', pt: 'Formato JSON', ja: 'JSON\u5f62\u5f0f', ko: 'JSON \ud615\uc2dd' },
}

const FEATURE_DESCRIPTIONS: Record<string, L> = {
  noAuth: {
    de: 'Der kostenlose Zugang erfordert keine API-Schl\u00fcssel oder Registrierung. Einfach den Endpunkt aufrufen und Daten erhalten.',
    en: 'Free tier requires no API keys or registration. Simply call the endpoint and get data.',
    zh: '\u514d\u8d39\u5c42\u65e0\u9700 API \u5bc6\u94a5\u6216\u6ce8\u518c\u3002\u53ea\u9700\u8c03\u7528\u7aef\u70b9\u5373\u53ef\u83b7\u53d6\u6570\u636e\u3002',
    fr: "Le niveau gratuit ne n\u00e9cessite aucune cl\u00e9 API ni inscription. Appelez simplement l'endpoint pour obtenir des donn\u00e9es.",
    es: 'El nivel gratuito no requiere claves API ni registro. Simplemente llame al endpoint y obtenga datos.',
    pt: 'O n\u00edvel gratuito n\u00e3o requer chaves API nem registro. Simplesmente chame o endpoint e obtenha dados.',
    ja: '\u7121\u6599\u30d7\u30e9\u30f3\u306fAPI\u30ad\u30fc\u3084\u767b\u9332\u4e0d\u8981\u3002\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u3092\u547c\u3073\u51fa\u3059\u3060\u3051\u3067\u30c7\u30fc\u30bf\u3092\u53d6\u5f97\u3002',
    ko: '\ubb34\ub8cc \ud50c\ub79c\uc740 API \ud0a4\ub098 \ub4f1\ub85d\uc774 \ud544\uc694 \uc5c6\uc2b5\ub2c8\ub2e4. \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub97c \ud638\ucd9c\ud558\uba74 \ub370\uc774\ud130\ub97c \ubc1b\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  },
  languages: {
    de: 'Die Inhalts-Endpunkte liefern alle verf\u00fcgbaren \u00dcbersetzungen \u2014 bis zu 8 Sprachen: Deutsch, Englisch, Chinesisch, Franz\u00f6sisch, Spanisch, Portugiesisch, Japanisch und Koreanisch.',
    en: 'Content endpoints include all available translations \u2014 up to 8 languages: German, English, Chinese, French, Spanish, Portuguese, Japanese, and Korean.',
    zh: '\u5185\u5bb9\u7aef\u70b9\u5305\u542b\u6240\u6709\u5df2\u751f\u6210\u7684\u7ffb\u8bd1 \u2014 \u6700\u591a 8 \u79cd\u8bed\u8a00:\u5fb7\u8bed\u3001\u82f1\u8bed\u3001\u4e2d\u6587\u3001\u6cd5\u8bed\u3001\u897f\u73ed\u7259\u8bed\u3001\u8461\u8404\u7259\u8bed\u3001\u65e5\u8bed\u548c\u97e9\u8bed\u3002',
    fr: 'Les endpoints de contenu incluent toutes les traductions disponibles \u2014 jusqu\'\u00e0 8 langues : allemand, anglais, chinois, fran\u00e7ais, espagnol, portugais, japonais et cor\u00e9en.',
    es: 'Los endpoints de contenido incluyen todas las traducciones disponibles \u2014 hasta 8 idiomas: alem\u00e1n, ingl\u00e9s, chino, franc\u00e9s, espa\u00f1ol, portugu\u00e9s, japon\u00e9s y coreano.',
    pt: 'Os endpoints de conte\u00fado incluem todas as tradu\u00e7\u00f5es dispon\u00edveis \u2014 at\u00e9 8 idiomas: alem\u00e3o, ingl\u00eas, chin\u00eas, franc\u00eas, espanhol, portugu\u00eas, japon\u00eas e coreano.',
    ja: '\u30b3\u30f3\u30c6\u30f3\u30c4\u7cfb\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306f\u751f\u6210\u6e08\u307f\u306e\u3059\u3079\u3066\u306e\u7ffb\u8a33\u3092\u542b\u307f\u307e\u3059 \u2014 \u6700\u59278\u8a00\u8a9e:\u30c9\u30a4\u30c4\u8a9e\u3001\u82f1\u8a9e\u3001\u4e2d\u56fd\u8a9e\u3001\u30d5\u30e9\u30f3\u30b9\u8a9e\u3001\u30b9\u30da\u30a4\u30f3\u8a9e\u3001\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e\u3001\u65e5\u672c\u8a9e\u3001\u97d3\u56fd\u8a9e\u3002',
    ko: '\ucf58\ud150\uce20 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \uc0dd\uc131\ub41c \ubaa8\ub4e0 \ubc88\uc5ed\uc744 \ud3ec\ud568\ud569\ub2c8\ub2e4 \u2014 \ucd5c\ub300 8\uac1c \uc5b8\uc5b4: \ub3c5\uc77c\uc5b4, \uc601\uc5b4, \uc911\uad6d\uc5b4, \ud504\ub791\uc2a4\uc5b4, \uc2a4\ud398\uc778\uc5b4, \ud3ec\ub974\ud22c\uac08\uc5b4, \uc77c\ubcf8\uc5b4, \ud55c\uad6d\uc5b4.',
  },
  sources: {
    de: 'Kuratierte Inhalte von TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit und YouTube.',
    en: 'Curated content from TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit, and YouTube.',
    zh: '\u6765\u81ea TechCrunch\u3001MIT Technology Review\u3001Ars Technica\u3001Hacker News\u3001Reddit \u548c YouTube \u7684\u7cbe\u9009\u5185\u5bb9\u3002',
    fr: 'Contenu s\u00e9lectionn\u00e9 de TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit et YouTube.',
    es: 'Contenido curado de TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit y YouTube.',
    pt: 'Conte\u00fado curado de TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit e YouTube.',
    ja: 'TechCrunch\u3001MIT Technology Review\u3001Ars Technica\u3001Hacker News\u3001Reddit\u3001YouTube\u304b\u3089\u306e\u53b3\u9078\u30b3\u30f3\u30c6\u30f3\u30c4\u3002',
    ko: 'TechCrunch, MIT Technology Review, Ars Technica, Hacker News, Reddit, YouTube\uc758 \ud050\ub808\uc774\uc158 \ucf58\ud150\uce20.',
  },
  stock: {
    de: 'Aktiendaten sind pausiert, während wir die Marktdaten-Lizenzierung prüfen (Stock-Endpunkte liefern HTTP 410).',
    en: 'Stock data is paused while we review market-data licensing (stock endpoints return HTTP 410).',
    zh: '行情数据在市场数据授权审查期间暂停(stock 端点返回 HTTP 410)。',
    fr: 'Les données boursières sont en pause pendant la revue de licence (les endpoints stock renvoient HTTP 410).',
    es: 'Los datos bursátiles están en pausa durante la revisión de licencias (los endpoints stock devuelven HTTP 410).',
    pt: 'Os dados de ações estão em pausa durante a revisão de licenciamento (endpoints stock retornam HTTP 410).',
    ja: '株価データはライセンス審査のため一時停止中です(stock エンドポイントは HTTP 410 を返します)。',
    ko: '주식 데이터는 라이선스 검토 기간 동안 일시 중지됩니다(stock 엔드포인트는 HTTP 410 반환).',
  },
  daily: {
    de: 'Daten werden t\u00e4glich am sp\u00e4ten Abend (Berliner Zeit) automatisch aktualisiert. W\u00f6chentliche Zusammenfassungen sind ebenfalls verf\u00fcgbar.',
    en: 'Data is automatically updated daily in the late evening (Berlin time). Weekly digests are also available.',
    zh: '\u6570\u636e\u6bcf\u5929\u67cf\u6797\u65f6\u95f4\u6df1\u591c\u81ea\u52a8\u66f4\u65b0\u3002\u8fd8\u63d0\u4f9b\u6bcf\u5468\u6458\u8981\u3002',
    fr: 'Les donn\u00e9es sont mises \u00e0 jour automatiquement chaque jour en fin de soir\u00e9e (heure de Berlin). Des r\u00e9sum\u00e9s hebdomadaires sont aussi disponibles.',
    es: 'Los datos se actualizan autom\u00e1ticamente cada d\u00eda a \u00faltima hora de la tarde (hora de Berl\u00edn). Res\u00famenes semanales tambi\u00e9n disponibles.',
    pt: 'Os dados s\u00e3o atualizados automaticamente di\u00e1riamente no fim da noite (hor\u00e1rio de Berlim). Resumos semanais tamb\u00e9m dispon\u00edveis.',
    ja: '\u30c7\u30fc\u30bf\u306f\u6bce\u65e5\u30d9\u30eb\u30ea\u30f3\u6642\u9593\u306e\u6df1\u591c\u306b\u81ea\u52d5\u66f4\u65b0\u3002\u9031\u9593\u30c0\u30a4\u30b8\u30a7\u30b9\u30c8\u3082\u5229\u7528\u53ef\u80fd\u3002',
    ko: '\ub370\uc774\ud130\ub294 \ub9e4\uc77c \ubca0\ub97c\ub9b0 \uc2dc\uac04 \ub2a6\uc740 \uc800\ub141\uc5d0 \uc790\ub3d9 \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4. \uc8fc\uac04 \ub2e4\uc774\uc81c\uc2a4\ud2b8\ub3c4 \uc81c\uacf5\ub429\ub2c8\ub2e4.',
  },
  json: {
    de: 'Alle Antworten sind sauber strukturiertes JSON. Einfach zu parsen und direkt einsatzbereit f\u00fcr jede Anwendung.',
    en: 'All responses are cleanly structured JSON. Easy to parse and ready to use directly in any application.',
    zh: '\u6240\u6709\u54cd\u5e94\u90fd\u662f\u7ed3\u6784\u6e05\u6670\u7684 JSON\u3002\u6613\u4e8e\u89e3\u6790\uff0c\u53ef\u76f4\u63a5\u5728\u4efb\u4f55\u5e94\u7528\u4e2d\u4f7f\u7528\u3002',
    fr: 'Toutes les r\u00e9ponses sont du JSON clairement structur\u00e9. Facile \u00e0 parser et pr\u00eat \u00e0 utiliser dans toute application.',
    es: 'Todas las respuestas son JSON limpiamente estructurado. F\u00e1cil de parsear y listo para usar en cualquier aplicaci\u00f3n.',
    pt: 'Todas as respostas s\u00e3o JSON claramente estruturado. F\u00e1cil de parsear e pronto para usar em qualquer aplica\u00e7\u00e3o.',
    ja: '\u5168\u30ec\u30b9\u30dd\u30f3\u30b9\u306f\u304d\u308c\u3044\u306b\u69cb\u9020\u5316\u3055\u308c\u305fJSON\u3002\u30d1\u30fc\u30b9\u304c\u7c21\u5358\u3067\u3001\u3042\u3089\u3086\u308b\u30a2\u30d7\u30ea\u3067\u3059\u3050\u306b\u4f7f\u7528\u53ef\u80fd\u3002',
    ko: '\ubaa8\ub4e0 \uc751\ub2f5\uc740 \uae54\ub054\ud558\uac8c \uad6c\uc870\ud654\ub41c JSON\uc785\ub2c8\ub2e4. \ud30c\uc2f1\uc774 \uc27d\uace0 \ubaa8\ub4e0 \uc560\ud50c\ub9ac\ucf00\uc774\uc158\uc5d0\uc11c \ubc14\ub85c \uc0ac\uc6a9 \uac00\ub2a5\ud569\ub2c8\ub2e4.',
  },
}

// Section F: FAQ
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
      de: 'Was ist die KI-News-API?',
      en: 'What is the AI news API?',
      zh: '\u4ec0\u4e48\u662fAI\u65b0\u95fbAPI\uff1f',
      fr: "Qu'est-ce que l'API d'actualit\u00e9s IA ?",
      es: '\u00bfQu\u00e9 es la API de noticias IA?',
      pt: 'O que \u00e9 a API de not\u00edcias IA?',
      ja: 'AI\u30cb\u30e5\u30fc\u30b9API\u3068\u306f\uff1f',
      ko: 'AI \ub274\uc2a4 API\ub780 \ubb34\uc5c7\uc778\uac00\uc694?',
    },
    a: {
      de: 'Die Forager News API ist eine kostenlose REST-Schnittstelle, die kuratierten Zugang zu KI-Nachrichten-Daten aus 35+ Quellen bietet. Sie liefert Technologie-News, Investments, praktische Tipps und Video-Zusammenfassungen in 8 Sprachen als JSON.',
      en: 'The Forager News API is a free REST interface that provides curated access to AI news data from 35+ sources. It delivers technology news, investment data, practical tips, and video summaries in 8 languages as JSON.',
      zh: 'Forager \u65b0\u95fb API \u662f\u4e00\u4e2a\u514d\u8d39\u7684 REST \u63a5\u53e3\uff0c\u63d0\u4f9b\u5bf9\u6765\u81ea 35+ \u6e90\u7684\u7cbe\u9009 AI \u65b0\u95fb\u6570\u636e\u7684\u8bbf\u95ee\u3002\u5b83\u4ee5 JSON \u683c\u5f0f\u63d0\u4f9b\u6280\u672f\u65b0\u95fb\u3001\u6295\u8d44\u6570\u636e\u3001\u5b9e\u7528\u6280\u5de7\u548c\u89c6\u9891\u6458\u8981\uff0c\u652f\u6301 8 \u79cd\u8bed\u8a00\u3002',
      fr: "L'API Forager News est une interface REST gratuite qui fournit un acc\u00e8s curate aux donn\u00e9es d'actualit\u00e9s IA de 35+ sources. Elle d\u00e9livre des news tech, des donn\u00e9es d'investissement, des conseils et des r\u00e9sum\u00e9s vid\u00e9o en 8 langues au format JSON.",
      es: 'La API Forager News es una interfaz REST gratuita que proporciona acceso curado a datos de noticias IA de 35+ fuentes. Entrega noticias tecnol\u00f3gicas, datos de inversi\u00f3n, consejos pr\u00e1cticos y res\u00famenes de video en 8 idiomas como JSON.',
      pt: 'A API Forager News \u00e9 uma interface REST gratuita que fornece acesso curado a dados de not\u00edcias IA de 35+ fontes. Entrega not\u00edcias tecnol\u00f3gicas, dados de investimento, dicas pr\u00e1ticas e resumos de v\u00eddeo em 8 idiomas como JSON.',
      ja: 'Forager\u30cb\u30e5\u30fc\u30b9API\u306f\u300135\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u306e\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u30c7\u30fc\u30bf\u3078\u306e\u30a2\u30af\u30bb\u30b9\u3092\u63d0\u4f9b\u3059\u308b\u7121\u6599REST\u30a4\u30f3\u30bf\u30fc\u30d5\u30a7\u30fc\u30b9\u3067\u3059\u3002\u30c6\u30c3\u30af\u30cb\u30e5\u30fc\u30b9\u3001\u6295\u8cc7\u30c7\u30fc\u30bf\u3001\u5b9f\u8df5\u30d2\u30f3\u30c8\u3001\u52d5\u753b\u8981\u7d04\u30928\u8a00\u8a9e\u306eJSON\u3067\u63d0\u4f9b\u3002',
      ko: 'Forager \ub274\uc2a4 API\ub294 35\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\uc5d0\uc11c \ud050\ub808\uc774\uc158\ub41c AI \ub274\uc2a4 \ub370\uc774\ud130\uc5d0 \uc561\uc138\uc2a4\ub97c \uc81c\uacf5\ud558\ub294 \ubb34\ub8cc REST \uc778\ud130\ud398\uc774\uc2a4\uc785\ub2c8\ub2e4. \uae30\uc220 \ub274\uc2a4, \ud22c\uc790 \ub370\uc774\ud130, \uc2e4\uc6a9 \ud301, \ub3d9\uc601\uc0c1 \uc694\uc57d\uc744 8\uac1c \uc5b8\uc5b4\ub85c JSON\uc73c\ub85c \uc81c\uacf5\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Ist die API kostenlos?',
      en: 'Is the API free?',
      zh: 'API \u662f\u514d\u8d39\u7684\u5417\uff1f',
      fr: "L'API est-elle gratuite ?",
      es: '\u00bfEs gratuita la API?',
      pt: 'A API \u00e9 gratuita?',
      ja: 'API\u306f\u7121\u6599\u3067\u3059\u304b\uff1f',
      ko: 'API\ub294 \ubb34\ub8cc\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ja, die API ist kostenlos. Die \u00f6ffentlichen Endpunkte erfordern keine Authentifizierung. Wir bitten um faire Nutzung; f\u00fcr intensive kommerzielle Nutzung kontaktieren Sie uns bitte.',
      en: 'Yes, the API is free. The public endpoints require no authentication. Please use it fairly; for heavy commercial use, get in touch with us.',
      zh: '\u662f\u7684,API \u514d\u8d39\u3002\u516c\u5f00\u7aef\u70b9\u65e0\u9700\u8ba4\u8bc1\u3002\u8bf7\u5408\u7406\u4f7f\u7528;\u5982\u9700\u5927\u89c4\u6a21\u5546\u4e1a\u7528\u9014,\u8bf7\u4e0e\u6211\u4eec\u8054\u7cfb\u3002',
      fr: 'Oui, l\'API est gratuite. Les endpoints publics ne n\u00e9cessitent aucune authentification. Merci d\'en faire un usage raisonnable ; pour un usage commercial intensif, contactez-nous.',
      es: 'S\u00ed, la API es gratuita. Los endpoints p\u00fablicos no requieren autenticaci\u00f3n. \u00dasela de forma razonable; para uso comercial intensivo, cont\u00e1ctenos.',
      pt: 'Sim, a API \u00e9 gratuita. Os endpoints p\u00fablicos n\u00e3o exigem autentica\u00e7\u00e3o. Use com modera\u00e7\u00e3o; para uso comercial intensivo, entre em contato conosco.',
      ja: '\u306f\u3044\u3001API\u306f\u7121\u6599\u3067\u3059\u3002\u516c\u958b\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306b\u8a8d\u8a3c\u306f\u4e0d\u8981\u3067\u3059\u3002\u30d5\u30a7\u30a2\u306a\u5229\u7528\u3092\u304a\u9858\u3044\u3057\u307e\u3059\u3002\u5927\u898f\u6a21\u306a\u5546\u7528\u5229\u7528\u306f\u304a\u554f\u3044\u5408\u308f\u305b\u304f\u3060\u3055\u3044\u3002',
      ko: '\ub124, API\ub294 \ubb34\ub8cc\uc785\ub2c8\ub2e4. \uacf5\uac1c \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \uc778\uc99d\uc774 \ud544\uc694 \uc5c6\uc2b5\ub2c8\ub2e4. \uacf5\uc815\ud55c \uc0ac\uc6a9\uc744 \ubd80\ud0c1\ub4dc\ub9ac\uba70, \ub300\uaddc\ubaa8 \uc0c1\uc5c5\uc801 \uc0ac\uc6a9\uc740 \ubb38\uc758\ud574 \uc8fc\uc138\uc694.',
    },
  },
  {
    q: {
      de: 'Brauche ich eine Authentifizierung?',
      en: 'Do I need authentication?',
      zh: '\u6211\u9700\u8981\u8ba4\u8bc1\u5417\uff1f',
      fr: "Ai-je besoin d'une authentification ?",
      es: '\u00bfNecesito autenticaci\u00f3n?',
      pt: 'Preciso de autentica\u00e7\u00e3o?',
      ja: '\u8a8d\u8a3c\u306f\u5fc5\u8981\u3067\u3059\u304b\uff1f',
      ko: '\uc778\uc99d\uc774 \ud544\uc694\ud55c\uac00\uc694?',
    },
    a: {
      de: 'Nein \u2014 die \u00f6ffentlichen Endpunkte erfordern keine Authentifizierung und keinen API-Schl\u00fcssel. Rufen Sie die Endpunkte einfach direkt auf.',
      en: 'No \u2014 the public endpoints require no authentication and no API key. Just call the endpoints directly.',
      zh: '\u4e0d\u9700\u8981 \u2014 \u516c\u5f00\u7aef\u70b9\u65e0\u9700\u8ba4\u8bc1\u3001\u65e0\u9700 API \u5bc6\u94a5,\u76f4\u63a5\u8c03\u7528\u5373\u53ef\u3002',
      fr: 'Non \u2014 les endpoints publics ne n\u00e9cessitent ni authentification ni cl\u00e9 API. Appelez-les simplement directement.',
      es: 'No \u2014 los endpoints p\u00fablicos no requieren autenticaci\u00f3n ni clave API. Simplemente ll\u00e1melos directamente.',
      pt: 'N\u00e3o \u2014 os endpoints p\u00fablicos n\u00e3o exigem autentica\u00e7\u00e3o nem chave API. Basta cham\u00e1-los diretamente.',
      ja: '\u3044\u3044\u3048 \u2014 \u516c\u958b\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306b\u8a8d\u8a3c\u3082API\u30ad\u30fc\u3082\u4e0d\u8981\u3067\u3059\u3002\u305d\u306e\u307e\u307e\u76f4\u63a5\u547c\u3073\u51fa\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
      ko: '\uc544\ub2c8\uc694 \u2014 \uacf5\uac1c \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \uc778\uc99d\ub3c4 API \ud0a4\ub3c4 \ud544\uc694 \uc5c6\uc2b5\ub2c8\ub2e4. \ubc14\ub85c \ud638\ucd9c\ud558\uba74 \ub429\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Welche Datenformate werden unterst\u00fctzt?',
      en: 'What data formats are supported?',
      zh: '\u652f\u6301\u54ea\u4e9b\u6570\u636e\u683c\u5f0f\uff1f',
      fr: 'Quels formats de donn\u00e9es sont pris en charge ?',
      es: '\u00bfQu\u00e9 formatos de datos se admiten?',
      pt: 'Quais formatos de dados s\u00e3o suportados?',
      ja: '\u3069\u306e\u30c7\u30fc\u30bf\u5f62\u5f0f\u304c\u30b5\u30dd\u30fc\u30c8\u3055\u308c\u3066\u3044\u307e\u3059\u304b\uff1f',
      ko: '\uc5b4\ub5a4 \ub370\uc774\ud130 \ud615\uc2dd\uc774 \uc9c0\uc6d0\ub418\ub098\uc694?',
    },
    a: {
      de: 'Alle Endpunkte liefern JSON. Die Inhalts-Endpunkte (tech/investment/tips/trends) organisieren die Daten nach Sprachschl\u00fcsseln mit bis zu 8 Sprachen (DE, EN, ZH, FR, ES, PT, JA, KO); /weeks liefert einfache Periodenobjekte.',
      en: 'All endpoints return JSON. The content endpoints (tech/investment/tips/trends) organize data under language keys with up to 8 languages (DE, EN, ZH, FR, ES, PT, JA, KO); /weeks returns plain period objects.',
      zh: '\u6240\u6709\u7aef\u70b9\u8fd4\u56de JSON\u3002\u5185\u5bb9\u7aef\u70b9(tech/investment/tips/trends)\u6309\u8bed\u8a00\u952e\u7ec4\u7ec7\u6570\u636e,\u6700\u591a 8 \u79cd\u8bed\u8a00(DE\u3001EN\u3001ZH\u3001FR\u3001ES\u3001PT\u3001JA\u3001KO);/weeks \u8fd4\u56de\u666e\u901a\u65f6\u6bb5\u5bf9\u8c61\u3002',
      fr: 'Tous les endpoints renvoient du JSON. Les endpoints de contenu (tech/investment/tips/trends) organisent les donn\u00e9es par cl\u00e9s de langue avec jusqu\'\u00e0 8 langues (DE, EN, ZH, FR, ES, PT, JA, KO) ; /weeks renvoie de simples objets de p\u00e9riode.',
      es: 'Todos los endpoints devuelven JSON. Los endpoints de contenido (tech/investment/tips/trends) organizan los datos por claves de idioma con hasta 8 idiomas (DE, EN, ZH, FR, ES, PT, JA, KO); /weeks devuelve objetos de per\u00edodo simples.',
      pt: 'Todos os endpoints retornam JSON. Os endpoints de conte\u00fado (tech/investment/tips/trends) organizam os dados por chaves de idioma com at\u00e9 8 idiomas (DE, EN, ZH, FR, ES, PT, JA, KO); /weeks retorna objetos de per\u00edodo simples.',
      ja: '\u3059\u3079\u3066\u306e\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306fJSON\u3092\u8fd4\u3057\u307e\u3059\u3002\u30b3\u30f3\u30c6\u30f3\u30c4\u7cfb\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8(tech/investment/tips/trends)\u306f\u8a00\u8a9e\u30ad\u30fc\u3054\u3068\u306b\u6700\u59278\u8a00\u8a9e(DE\u3001EN\u3001ZH\u3001FR\u3001ES\u3001PT\u3001JA\u3001KO)\u3067\u30c7\u30fc\u30bf\u3092\u6574\u7406\u3057\u3001/weeks\u306f\u901a\u5e38\u306e\u671f\u9593\u30aa\u30d6\u30b8\u30a7\u30af\u30c8\u3092\u8fd4\u3057\u307e\u3059\u3002',
      ko: '\ubaa8\ub4e0 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 JSON\uc744 \ubc18\ud658\ud569\ub2c8\ub2e4. \ucf58\ud150\uce20 \uc5d4\ub4dc\ud3ec\uc778\ud2b8(tech/investment/tips/trends)\ub294 \uc5b8\uc5b4 \ud0a4\ub85c \ucd5c\ub300 8\uac1c \uc5b8\uc5b4(DE, EN, ZH, FR, ES, PT, JA, KO)\uc758 \ub370\uc774\ud130\ub97c \uad6c\uc131\ud558\uba70, /weeks\ub294 \uc77c\ubc18 \uae30\uac04 \uac1d\uccb4\ub97c \ubc18\ud658\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Wie oft werden die Daten aktualisiert?',
      en: 'How often is the data updated?',
      zh: '\u6570\u636e\u591a\u4e45\u66f4\u65b0\u4e00\u6b21\uff1f',
      fr: '\u00c0 quelle fr\u00e9quence les donn\u00e9es sont-elles mises \u00e0 jour ?',
      es: '\u00bfCon qu\u00e9 frecuencia se actualizan los datos?',
      pt: 'Com que frequ\u00eancia os dados s\u00e3o atualizados?',
      ja: '\u30c7\u30fc\u30bf\u306f\u3069\u306e\u304f\u3089\u3044\u306e\u983b\u5ea6\u3067\u66f4\u65b0\u3055\u308c\u307e\u3059\u304b\uff1f',
      ko: '\ub370\uc774\ud130\ub294 \uc5bc\ub9c8\ub098 \uc790\uc8fc \uc5c5\ub370\uc774\ud2b8\ub418\ub098\uc694?',
    },
    a: {
      de: 'Daten werden t\u00e4glich automatisch am sp\u00e4ten Abend (Berliner Zeit) aktualisiert. Unsere Pipeline sammelt, klassifiziert, verarbeitet und \u00fcbersetzt Inhalte aus 35+ Quellen. Zus\u00e4tzlich sind w\u00f6chentliche Zusammenfassungen verf\u00fcgbar.',
      en: 'Data is updated automatically every day in the late evening (Berlin time). Our pipeline collects, classifies, processes, and translates content from 35+ sources. Weekly digests are also available.',
      zh: '\u6570\u636e\u6bcf\u5929\u67cf\u6797\u65f6\u95f4\u6df1\u591c\u81ea\u52a8\u66f4\u65b0\u3002\u6211\u4eec\u7684\u7ba1\u9053\u4ece 35+ \u4fe1\u606f\u6e90\u6536\u96c6\u3001\u5206\u7c7b\u3001\u5904\u7406\u548c\u7ffb\u8bd1\u5185\u5bb9\u3002\u8fd8\u63d0\u4f9b\u6bcf\u5468\u6458\u8981\u3002',
      fr: 'Les donn\u00e9es sont mises \u00e0 jour automatiquement chaque jour en fin de soir\u00e9e (heure de Berlin). Notre pipeline collecte, classe, traite et traduit le contenu de 35+ sources. Des r\u00e9sum\u00e9s hebdomadaires sont aussi disponibles.',
      es: 'Los datos se actualizan autom\u00e1ticamente todos los d\u00edas a \u00faltima hora de la tarde (hora de Berl\u00edn). Nuestro pipeline recopila, clasifica, procesa y traduce contenido de 35+ fuentes. Res\u00famenes semanales tambi\u00e9n disponibles.',
      pt: 'Os dados s\u00e3o atualizados automaticamente todos os dias no fim da noite (hor\u00e1rio de Berlim). Nosso pipeline coleta, classifica, processa e traduz conte\u00fado de 35+ fontes. Resumos semanais tamb\u00e9m dispon\u00edveis.',
      ja: '\u30c7\u30fc\u30bf\u306f\u6bce\u65e5\u30d9\u30eb\u30ea\u30f3\u6642\u9593\u306e\u6df1\u591c\u306b\u81ea\u52d5\u66f4\u65b0\u3002\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u304c35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u30b3\u30f3\u30c6\u30f3\u30c4\u3092\u53ce\u96c6\u30fb\u5206\u985e\u30fb\u51e6\u7406\u30fb\u7ffb\u8a33\u3002\u9031\u9593\u30c0\u30a4\u30b8\u30a7\u30b9\u30c8\u3082\u5229\u7528\u53ef\u80fd\u3002',
      ko: '\ub370\uc774\ud130\ub294 \ub9e4\uc77c \ubca0\ub97c\ub9b0 \uc2dc\uac04 \ub2a6\uc740 \uc800\ub141\uc5d0 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4. \ud30c\uc774\ud504\ub77c\uc778\uc774 35\uac1c \uc774\uc0c1\uc758 \uc18c\uc2a4\uc5d0\uc11c \ucf58\ud150\uce20\ub97c \uc218\uc9d1, \ubd84\ub958, \ucc98\ub9ac, \ubc88\uc5ed\ud569\ub2c8\ub2e4. \uc8fc\uac04 \ub2e4\uc774\uc81c\uc2a4\ud2b8\ub3c4 \uc81c\uacf5\ub429\ub2c8\ub2e4.',
    },
  },
]

// Section G: Final CTA
const H2_CTA_FINAL: L = {
  de: 'Jetzt mit KI-News-Daten starten',
  en: 'Start Building with AI News Data',
  zh: '\u7acb\u5373\u5f00\u59cb\u4f7f\u7528AI\u65b0\u95fb\u6570\u636e',
  fr: 'Commencez \u00e0 d\u00e9velopper avec les donn\u00e9es IA',
  es: 'Empiece a construir con datos de noticias IA',
  pt: 'Comece a construir com dados de not\u00edcias IA',
  ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30c7\u30fc\u30bf\u3067\u958b\u767a\u3092\u59cb\u3081\u308b',
  ko: 'AI \ub274\uc2a4 \ub370\uc774\ud130\ub85c \uac1c\ubc1c \uc2dc\uc791\ud558\uae30',
}

const CTA_FULL_DOCS: L = {
  de: 'Vollst\u00e4ndige Dokumentation',
  en: 'Read Full Docs',
  zh: '\u9605\u8bfb\u5b8c\u6574\u6587\u6863',
  fr: 'Lire la documentation compl\u00e8te',
  es: 'Leer documentaci\u00f3n completa',
  pt: 'Ler documenta\u00e7\u00e3o completa',
  ja: '\u5b8c\u5168\u306a\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8\u3092\u8aad\u3080',
  ko: '\uc804\uccb4 \ubb38\uc11c \uc77d\uae30',
}

const TRUST_LINE: L = {
  de: 'Von Entwicklern weltweit genutzt',
  en: 'Trusted by developers worldwide',
  zh: '\u53d7\u5168\u7403\u5f00\u53d1\u8005\u4fe1\u8d56',
  fr: 'Utilis\u00e9 par des d\u00e9veloppeurs du monde entier',
  es: 'Usado por desarrolladores en todo el mundo',
  pt: 'Usado por desenvolvedores em todo o mundo',
  ja: '\u4e16\u754c\u4e2d\u306e\u958b\u767a\u8005\u306b\u4fe1\u983c\u3055\u308c\u3066\u3044\u307e\u3059',
  ko: '\uc804 \uc138\uacc4 \uac1c\ubc1c\uc790\ub4e4\uc774 \uc2e0\ub8b0\ud569\ub2c8\ub2e4',
}

// Breadcrumb labels
const HOME_LABEL: L = { de: 'Startseite', en: 'Home', zh: '\u9996\u9875', fr: 'Accueil', es: 'Inicio', pt: 'In\u00edcio', ja: '\u30db\u30fc\u30e0', ko: '\ud648' }
const TOOLS_LABEL: L = { de: 'Tools', en: 'Tools', zh: '\u5de5\u5177', fr: 'Outils', es: 'Herramientas', pt: 'Ferramentas', ja: '\u30c4\u30fc\u30eb', ko: '\ub3c4\uad6c' }
const TOOL_LABEL: L = { de: 'KI-News-API', en: 'AI News API', zh: 'AI\u65b0\u95fbAPI', fr: 'API Actualit\u00e9s IA', es: 'API Noticias IA', pt: 'API Not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9API', ko: 'AI \ub274\uc2a4 API' }

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
const CROSS_NEWS_NAME: L = { de: 'KI-News-Aggregator', en: 'AI News Aggregator', zh: 'AI\u65b0\u95fb\u805a\u5408\u5668', fr: "Agr\u00e9gateur d'actualit\u00e9s IA", es: 'Agregador de noticias IA', pt: 'Agregador de not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc', ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30' }
const CROSS_NEWS_DESC: L = { de: '35+ Quellen, 8 Sprachen, t\u00e4glich aktualisiert.', en: '35+ sources, 8 languages, updated daily.', zh: '35+\u4fe1\u606f\u6e90\uff0c8\u79cd\u8bed\u8a00\uff0c\u6bcf\u65e5\u66f4\u65b0\u3002', fr: '35+ sources, 8 langues, mis \u00e0 jour quotidiennement.', es: '35+ fuentes, 8 idiomas, actualizado diariamente.', pt: '35+ fontes, 8 idiomas, atualizado diariamente.', ja: '35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u30018\u8a00\u8a9e\u3001\u6bce\u65e5\u66f4\u65b0\u3002', ko: '35\uac1c+ \uc18c\uc2a4, 8\uac1c \uc5b8\uc5b4, \ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8.' }
const CROSS_REPORT_NAME: L = { de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI\u62a5\u544a\u751f\u6210\u5668', fr: 'G\u00e9n\u00e9rateur de rapports IA', es: 'Generador de informes IA', pt: 'Gerador de relat\u00f3rios IA', ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc', ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30' }
const CROSS_REPORT_DESC: L = { de: 'Streaming-Berichte, 5 Exportformate.', en: 'Streaming reports, 5 export formats.', zh: '\u6d41\u5f0f\u62a5\u544a\uff0c5\u79cd\u5bfc\u51fa\u683c\u5f0f\u3002', fr: 'Rapports en streaming, 5 formats.', es: 'Informes en streaming, 5 formatos.', pt: 'Relat\u00f3rios em streaming, 5 formatos.', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u30ec\u30dd\u30fc\u30c8\u30015\u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u3002', ko: '\uc2a4\ud2b8\ub9ac\ubc0d \ubcf4\uace0\uc11c, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd.' }
const CROSS_STOCK_NAME: L = { de: 'KI-Aktien-Tracker', en: 'AI Stock Tracker', zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668', fr: 'Tracker actions IA', es: 'Rastreador acciones IA', pt: 'Rastreador a\u00e7\u00f5es IA', ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc', ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30' }
const CROSS_STOCK_DESC: L = { de: 'Pausiert — Lizenzprüfung läuft.', en: 'Paused — licensing review in progress.', zh: '暂停中 — 授权审查进行中。', fr: 'En pause — revue de licence en cours.', es: 'En pausa — revisión de licencias en curso.', pt: 'Em pausa — revisão de licenciamento em andamento.', ja: '一時停止中 — ライセンス審査中。', ko: '일시 중지 — 라이선스 검토 중.' }

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AINewsAPIToolPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  // -- JSON-LD schemas --------------------------------------------------------
  const pageUrl = `${BASE_URL}/${lang}/tools/ai-news-api`

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Forager News API',
    description: t(META_DESCRIPTIONS, lang),
    url: pageUrl,
    applicationCategory: 'DeveloperApplication',
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
      'REST API',
      '8 language support',
      'JSON responses',
      'No authentication required',
      'Daily updates',
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
      { '@type': 'ListItem', position: 2, name: t(TOOLS_LABEL, lang), item: `${BASE_URL}/${lang}/tools` },
      { '@type': 'ListItem', position: 3, name: t(TOOL_LABEL, lang), item: pageUrl },
    ],
  }

  // -- Feature icon mapping ---------------------------------------------------
  const featureKeys = ['noAuth', 'languages', 'sources', 'stock', 'daily', 'json'] as const
  const featureIcons: Record<string, React.ReactNode> = {
    noAuth: <Unlock className="h-6 w-6" />,
    languages: <Globe className="h-6 w-6" />,
    sources: <Rss className="h-6 w-6" />,
    stock: <TrendingUp className="h-6 w-6" />,
    daily: <Calendar className="h-6 w-6" />,
    json: <Braces className="h-6 w-6" />,
  }

  const featureAccents: Record<string, string> = {
    noAuth: 'text-[var(--tips-accent)]',
    languages: 'text-[var(--tech-accent)]',
    sources: 'text-[var(--invest-accent)]',
    stock: 'text-[var(--invest-accent)]',
    daily: 'text-[var(--tech-accent)]',
    json: 'text-[var(--tips-accent)]',
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
              href="#endpoints"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_GET_KEY, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#endpoints"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_VIEW_DOCS, lang)}
            </a>
          </div>

          {/* Stat badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[STAT_REST, STAT_LANGUAGES, STAT_JSON, STAT_FREE].map((stat, i) => (
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
        {/* Section B: API Endpoints                                          */}
        {/* ================================================================= */}
        <section id="endpoints" className="py-12 sm:py-16 scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_ENDPOINTS, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(ENDPOINTS_LEAD, lang)}
          </p>

          <div className="mt-8 grid gap-3">
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="rounded-xl border border-border/50 bg-card/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    GET
                  </span>
                  <code className="font-mono text-sm font-medium">
                    {ep.path}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed sm:ml-auto sm:text-right">
                  {t(ep.description, lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section C: Code Examples                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_CODE, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(CODE_LEAD, lang)}
          </p>

          <div className="mt-8 space-y-6">
            {/* cURL */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Code className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                cURL
              </h3>
              <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="font-mono">{`curl -s ${API_BASE_URL}/api/tech/2026-02-26 | python -m json.tool`}</code>
              </pre>
            </div>

            {/* JavaScript */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Code className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                JavaScript
              </h3>
              <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="font-mono">{`// Fetch AI tech news for a specific day
const response = await fetch(
  '${API_BASE_URL}/api/tech/2026-02-26'
);
const data = await response.json();

// data.en = Array of English tech articles
// data.de = Array of German tech articles
// data.zh, data.fr, data.es, data.pt, data.ja, data.ko
console.log(data.en[0].content);`}</code>
              </pre>
            </div>

            {/* Python */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Code className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Python
              </h3>
              <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="font-mono">{`import json, urllib.request

# Fetch AI tech news for a specific day (standard library only)
with urllib.request.urlopen(
    '${API_BASE_URL}/api/tech/2026-02-26'
) as response:
    data = json.load(response)

# data['en'] = List of English tech articles
# data['de'] = List of German tech articles
for article in data['en']:
    print(article['content'])`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section D: Response Format                                        */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_RESPONSE, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(RESPONSE_LEAD, lang)}
          </p>

          <div className="mt-8">
            <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm">
              <code className="font-mono">{`{
  "de": [
    {
      "id": 1,
      "content": "OpenAI stellt GPT-5 vor...",
      "source": "TechCrunch",
      "category": "LLM",
      "impact": "high",
      "timestamp": "2026-02-26T14:30:00Z"
    }
  ],
  "en": [
    {
      "id": 1,
      "content": "OpenAI introduces GPT-5...",
      "source": "TechCrunch",
      "category": "LLM",
      "impact": "high",
      "timestamp": "2026-02-26T14:30:00Z"
    }
  ],
  "zh": [...],
  "fr": [...],
  "es": [...],
  "pt": [...],
  "ja": [...],
  "ko": [...]
}`}</code>
            </pre>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section E: Features Grid                                          */}
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
              href={`/${lang}/tools/ai-news-aggregator`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_NEWS_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_NEWS_DESC, lang)}</p>
            </Link>
            <Link
              href={`/${lang}/tools/ai-report-generator`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_REPORT_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_REPORT_DESC, lang)}</p>
            </Link>
            <Link
              href={`/${lang}/tools/ai-stock-tracker`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_STOCK_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_STOCK_DESC, lang)}</p>
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
              {t(CTA_GET_KEY, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_FULL_DOCS, lang)}
            </a>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t(TRUST_LINE, lang)}</p>
        </section>
      </article>
      </main>
    </>
  )
}
