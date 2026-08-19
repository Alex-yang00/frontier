import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import { FileText, Zap, Table, Download, Gift, Unlock, ArrowRight } from 'lucide-react'
import { SITE_URL as BASE_URL } from '@/lib/site'

export const revalidate = 86400


type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const META_TITLES: L = {
  de: 'KI-Bericht-Generator | Frontier',
  en: 'AI Report Generator | Frontier',
  zh: '\u514d\u8d39AI\u62a5\u544a\u751f\u6210\u5668 \u2014 \u4e00\u952e\u751f\u6210AI\u5468\u62a5\u548c\u65e5\u62a5 | Frontier',
  fr: 'G\u00e9n\u00e9rateur de Rapports IA | Frontier',
  es: 'Generador de Informes IA | Frontier',
  pt: 'Gerador de Relat\u00f3rios IA | Frontier',
  ja: '\u7121\u6599AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc \u2014 AI\u30ec\u30dd\u30fc\u30c8\u3092\u6570\u79d2\u3067\u4f5c\u6210 | Frontier',
  ko: '\ubb34\ub8cc AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30 \u2014 AI \ubcf4\uace0\uc11c\ub97c \uba87 \ucd08 \ub9cc\uc5d0 \uc0dd\uc131 | Frontier',
}

const META_DESCRIPTIONS: L = {
  de: 'Erstellen Sie KI-Berichte mit Frontier: Streaming-Generierung, Exportformate und t\u00e4gliche oder w\u00f6chentliche Analysen.',
  en: 'Generate free AI reports with Frontier. Streaming generation, 5 export formats (DOCX, HTML, Markdown, TXT, JSON), and period-based AI news analysis.',
  zh: '\u4f7f\u7528Frontier\u514d\u8d39\u751f\u6210AI\u62a5\u544a\u3002\u6d41\u5f0f\u751f\u6210\u30015\u79cd\u5bfc\u51fa\u683c\u5f0f\uff08DOCX\u3001HTML\u3001Markdown\u3001TXT\u3001JSON\uff09\u3002\u6bcf\u5468\u548c\u6bcf\u65e5AI\u65b0\u95fb\u5206\u6790\u3002',
  fr: "G\u00e9n\u00e9rez des rapports IA avec Frontier: streaming, exports et analyses IA quotidiennes ou hebdomadaires.",
  es: 'Genere informes de IA con Frontier: streaming, exportaciones y an\u00e1lisis diarios o semanales.',
  pt: 'Gere relat\u00f3rios de IA com Frontier: streaming, exporta\u00e7\u00f5es e an\u00e1lises di\u00e1rias ou semanais.',
  ja: 'Frontier\u3067\u7121\u6599AI\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210\u3002\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u751f\u6210\u30015\u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\uff08DOCX\u3001HTML\u3001Markdown\u3001TXT\u3001JSON\uff09\u3002\u9031\u520a\u30fb\u65e5\u520aAI\u5206\u6790\u3002',
  ko: 'Frontier\ub85c \ubb34\ub8cc AI \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud558\uc138\uc694. \uc2a4\ud2b8\ub9ac\ubc0d \uc0dd\uc131, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd (DOCX, HTML, Markdown, TXT, JSON). \uc8fc\uac04 \ubc0f \uc77c\uac04 AI \ubd84\uc11d.',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const pageUrl = `${BASE_URL}/${lang}/tools/ai-report-generator`

  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools/ai-report-generator`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools/ai-report-generator`
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
          alt: 'Frontier Report Generator',
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
          alt: 'Frontier Report Generator',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

const H1: L = {
  de: 'Kostenloser KI-Bericht-Generator',
  en: 'Free AI Report Generator',
  zh: '\u514d\u8d39AI\u62a5\u544a\u751f\u6210\u5668',
  fr: 'G\u00e9n\u00e9rateur de Rapports IA Gratuit',
  es: 'Generador de Informes IA Gratuito',
  pt: 'Gerador de Relat\u00f3rios IA Gratuito',
  ja: '\u7121\u6599AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc',
  ko: '\ubb34\ub8cc AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30',
}

const SUBTITLE: L = {
  de: 'Erstellen Sie professionelle KI-Berichte aus kuratierten Nachrichten \u2014 mit Streaming-Generierung, GFM-Tabellen und 5 Exportformaten. V\u00f6llig kostenlos, kein Login erforderlich.',
  en: 'Create professional AI reports from curated news \u2014 with streaming generation, GFM tables, and 5 export formats. Completely free, no login required.',
  zh: '\u4ece\u7cbe\u9009\u65b0\u95fb\u521b\u5efa\u4e13\u4e1a AI \u62a5\u544a \u2014 \u652f\u6301\u6d41\u5f0f\u751f\u6210\u3001GFM \u8868\u683c\u548c 5 \u79cd\u5bfc\u51fa\u683c\u5f0f\u3002\u5b8c\u5168\u514d\u8d39\uff0c\u65e0\u9700\u767b\u5f55\u3002',
  fr: "Cr\u00e9ez des rapports IA professionnels \u00e0 partir d'actualit\u00e9s s\u00e9lectionn\u00e9es \u2014 avec g\u00e9n\u00e9ration en streaming, tableaux GFM et 5 formats d'export. Enti\u00e8rement gratuit, sans inscription.",
  es: 'Cree informes de IA profesionales a partir de noticias curadas \u2014 con generaci\u00f3n en streaming, tablas GFM y 5 formatos de exportaci\u00f3n. Completamente gratuito, sin registro.',
  pt: 'Crie relat\u00f3rios de IA profissionais a partir de not\u00edcias selecionadas \u2014 com gera\u00e7\u00e3o em streaming, tabelas GFM e 5 formatos de exporta\u00e7\u00e3o. Totalmente gratuito, sem login.',
  ja: '\u53b3\u9078\u30cb\u30e5\u30fc\u30b9\u304b\u3089\u30d7\u30ed\u30d5\u30a7\u30c3\u30b7\u30e7\u30ca\u30eb\u306a AI \u30ec\u30dd\u30fc\u30c8\u3092\u4f5c\u6210 \u2014 \u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u751f\u6210\u3001GFM \u30c6\u30fc\u30d6\u30eb\u30015 \u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u3002\u5b8c\u5168\u7121\u6599\u3001\u30ed\u30b0\u30a4\u30f3\u4e0d\u8981\u3002',
  ko: '\uc5c4\uc120\ub41c \ub274\uc2a4\uc5d0\uc11c \uc804\ubb38\uc801\uc778 AI \ubcf4\uace0\uc11c\ub97c \uc791\uc131\ud558\uc138\uc694 \u2014 \uc2a4\ud2b8\ub9ac\ubc0d \uc0dd\uc131, GFM \ud14c\uc774\ube14, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd. \uc644\uc804 \ubb34\ub8cc, \ub85c\uadf8\uc778 \ubd88\ud544\uc694.',
}

const CTA_GENERATE: L = {
  de: 'Bericht erstellen',
  en: 'Generate Report',
  zh: '\u751f\u6210\u62a5\u544a',
  fr: 'G\u00e9n\u00e9rer un rapport',
  es: 'Generar informe',
  pt: 'Gerar relat\u00f3rio',
  ja: '\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210',
  ko: '\ubcf4\uace0\uc11c \uc0dd\uc131',
}

const CTA_SAMPLE: L = {
  de: 'Beispiel ansehen',
  en: 'View Sample',
  zh: '\u67e5\u770b\u793a\u4f8b',
  fr: 'Voir un exemple',
  es: 'Ver ejemplo',
  pt: 'Ver exemplo',
  ja: '\u30b5\u30f3\u30d7\u30eb\u3092\u898b\u308b',
  ko: '\uc0d8\ud50c \ubcf4\uae30',
}

const STAT_STREAMING: L = { de: 'Streaming-KI', en: 'Streaming AI', zh: '\u6d41\u5f0fAI', fr: 'IA en streaming', es: 'IA en streaming', pt: 'IA em streaming', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0AI', ko: '\uc2a4\ud2b8\ub9ac\ubc0d AI' }
const STAT_FORMATS: L = { de: '5 Exportformate', en: '5 Export Formats', zh: '5\u79cd\u5bfc\u51fa\u683c\u5f0f', fr: "5 Formats d'export", es: '5 Formatos', pt: '5 Formatos', ja: '5\u3064\u306e\u5f62\u5f0f', ko: '5\uac00\uc9c0 \ud615\uc2dd' }
const STAT_CONTEXT: L = { de: 'Wochen-Kontext', en: 'Week Context', zh: '\u5468\u62a5\u4e0a\u4e0b\u6587', fr: 'Contexte hebdo', es: 'Contexto semanal', pt: 'Contexto semanal', ja: '\u9031\u9593\u30b3\u30f3\u30c6\u30ad\u30b9\u30c8', ko: '\uc8fc\uac04 \ucee8\ud14d\uc2a4\ud2b8' }
const STAT_FREE: L = { de: '100% Kostenlos', en: '100% Free', zh: '100% \u514d\u8d39', fr: '100% Gratuit', es: '100% Gratuito', pt: '100% Gratuito', ja: '100% \u7121\u6599', ko: '100% \ubb34\ub8cc' }

// Section B — Sample Report Preview
const H2_PREVIEW: L = {
  de: 'Welche Art von KI-Berichten k\u00f6nnen Sie erstellen?',
  en: 'What kind of AI reports can you generate?',
  zh: '\u60a8\u53ef\u4ee5\u751f\u6210\u54ea\u79cd AI \u62a5\u544a\uff1f',
  fr: 'Quel type de rapports IA pouvez-vous g\u00e9n\u00e9rer ?',
  es: '\u00bfQu\u00e9 tipo de informes de IA puede generar?',
  pt: 'Que tipo de relat\u00f3rios de IA voc\u00ea pode gerar?',
  ja: '\u3069\u306e\u3088\u3046\u306a AI \u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210\u3067\u304d\u307e\u3059\u304b\uff1f',
  ko: '\uc5b4\ub5a4 \uc885\ub958\uc758 AI \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud560 \uc218 \uc788\ub098\uc694?',
}

const PREVIEW_LEAD: L = {
  de: 'Unser KI-Bericht-Generator erstellt strukturierte Markdown-Berichte mit Executive Summary, Technologie-Analyse, Investment-\u00dcberblick und Trend-Ausblick \u2014 alles basierend auf t\u00e4glich kuratierten Daten.',
  en: 'Our AI report generator creates structured Markdown reports with executive summary, technology analysis, investment overview, and trend outlook \u2014 all based on daily curated data.',
  zh: '\u6211\u4eec\u7684 AI \u62a5\u544a\u751f\u6210\u5668\u521b\u5efa\u7ed3\u6784\u5316\u7684 Markdown \u62a5\u544a,\u5305\u542b\u6267\u884c\u6458\u8981\u3001\u6280\u672f\u5206\u6790\u3001\u6295\u8d44\u6982\u89c8\u548c\u8d8b\u52bf\u5c55\u671b \u2014 \u5168\u90e8\u57fa\u4e8e\u6bcf\u65e5\u7cbe\u9009\u6570\u636e\u3002',
  fr: 'Notre g\u00e9n\u00e9rateur de rapports IA cr\u00e9e des rapports Markdown structur\u00e9s avec r\u00e9sum\u00e9 ex\u00e9cutif, analyse technologique, aper\u00e7u des investissements et perspectives \u2014 le tout bas\u00e9 sur des donn\u00e9es quotidiennes s\u00e9lectionn\u00e9es.',
  es: 'Nuestro generador de informes IA crea informes Markdown estructurados con resumen ejecutivo, an\u00e1lisis tecnol\u00f3gico, panorama de inversiones y perspectivas \u2014 todo basado en datos curados diariamente.',
  pt: 'Nosso gerador de relat\u00f3rios IA cria relat\u00f3rios Markdown estruturados com resumo executivo, an\u00e1lise tecnol\u00f3gica, panorama de investimentos e perspectivas \u2014 tudo baseado em dados curados diariamente.',
  ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f\u3001\u30a8\u30b0\u30bc\u30af\u30c6\u30a3\u30d6\u30b5\u30de\u30ea\u30fc\u3001\u6280\u8853\u5206\u6790\u3001\u6295\u8cc7\u6982\u6cc1\u3001\u30c8\u30ec\u30f3\u30c9\u5c55\u671b\u3092\u542b\u3080\u69cb\u9020\u5316Markdown\u30ec\u30dd\u30fc\u30c8\u3092\u4f5c\u6210 \u2014 \u3059\u3079\u3066\u6bce\u65e5\u30ad\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u3055\u308c\u305f\u30c7\u30fc\u30bf\u306b\u57fa\u3065\u304d\u307e\u3059\u3002',
  ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub294 \uacbd\uc601\uc9c4 \uc694\uc57d, \uae30\uc220 \ubd84\uc11d, \ud22c\uc790 \uac1c\uc694, \ud2b8\ub80c\ub4dc \uc804\ub9dd\uc744 \ud3ec\ud568\ud55c \uad6c\uc870\ud654\ub41c Markdown \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud569\ub2c8\ub2e4 \u2014 \ubaa8\ub450 \ub9e4\uc77c \ud050\ub808\uc774\uc158\ub41c \ub370\uc774\ud130 \uae30\ubc18.',
}

const TRY_IT: L = {
  de: 'Jetzt ausprobieren',
  en: 'Try It Now',
  zh: '\u7acb\u5373\u8bd5\u7528',
  fr: 'Essayer maintenant',
  es: 'Probar ahora',
  pt: 'Experimentar agora',
  ja: '\u4eca\u3059\u3050\u8a66\u3059',
  ko: '\uc9c0\uae08 \uc2dc\ub3c4',
}

// Section C — Export Formats
const H2_FORMATS: L = {
  de: 'Welche Exportformate sind verf\u00fcgbar?',
  en: 'Which export formats are available?',
  zh: '\u6709\u54ea\u4e9b\u5bfc\u51fa\u683c\u5f0f\uff1f',
  fr: "Quels formats d'export sont disponibles ?",
  es: '\u00bfQu\u00e9 formatos de exportaci\u00f3n est\u00e1n disponibles?',
  pt: 'Quais formatos de exporta\u00e7\u00e3o est\u00e3o dispon\u00edveis?',
  ja: '\u3069\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u304c\u5229\u7528\u3067\u304d\u307e\u3059\u304b\uff1f',
  ko: '\uc5b4\ub5a4 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd\uc744 \uc0ac\uc6a9\ud560 \uc218 \uc788\ub098\uc694?',
}

const FORMAT_NAMES: L[] = [
  { de: 'DOCX', en: 'DOCX', zh: 'DOCX', fr: 'DOCX', es: 'DOCX', pt: 'DOCX', ja: 'DOCX', ko: 'DOCX' },
  { de: 'HTML', en: 'HTML', zh: 'HTML', fr: 'HTML', es: 'HTML', pt: 'HTML', ja: 'HTML', ko: 'HTML' },
  { de: 'Markdown', en: 'Markdown', zh: 'Markdown', fr: 'Markdown', es: 'Markdown', pt: 'Markdown', ja: 'Markdown', ko: 'Markdown' },
  { de: 'TXT', en: 'TXT', zh: 'TXT', fr: 'TXT', es: 'TXT', pt: 'TXT', ja: 'TXT', ko: 'TXT' },
  { de: 'JSON', en: 'JSON', zh: 'JSON', fr: 'JSON', es: 'JSON', pt: 'JSON', ja: 'JSON', ko: 'JSON' },
]

const FORMAT_DESCRIPTIONS: L[] = [
  {
    de: 'Word-Dokument mit Formatierung \u2014 ideal f\u00fcr Pr\u00e4sentationen und Teamberichte.',
    en: 'Word document with formatting \u2014 ideal for presentations and team reports.',
    zh: '\u5e26\u683c\u5f0f\u7684 Word \u6587\u6863 \u2014 \u9002\u5408\u6f14\u793a\u548c\u56e2\u961f\u62a5\u544a\u3002',
    fr: 'Document Word avec mise en forme \u2014 id\u00e9al pour les pr\u00e9sentations et rapports d\'\u00e9quipe.',
    es: 'Documento Word con formato \u2014 ideal para presentaciones e informes de equipo.',
    pt: 'Documento Word com formata\u00e7\u00e3o \u2014 ideal para apresenta\u00e7\u00f5es e relat\u00f3rios de equipe.',
    ja: '\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u4ed8\u304dWord\u6587\u66f8 \u2014 \u30d7\u30ec\u30bc\u30f3\u30c6\u30fc\u30b7\u30e7\u30f3\u3084\u30c1\u30fc\u30e0\u30ec\u30dd\u30fc\u30c8\u306b\u6700\u9069\u3002',
    ko: '\uc11c\uc2dd\uc774 \uc9c0\uc815\ub41c Word \ubb38\uc11c \u2014 \ud504\ub808\uc820\ud14c\uc774\uc158 \ubc0f \ud300 \ubcf4\uace0\uc11c\uc5d0 \uc774\uc0c1\uc801.',
  },
  {
    de: 'Gestyltes HTML mit CSS \u2014 im Browser \u00f6ffnen oder in E-Mails einbetten.',
    en: 'Styled HTML with CSS \u2014 open in browser or embed in emails.',
    zh: '\u5e26 CSS \u6837\u5f0f\u7684 HTML \u2014 \u53ef\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u6216\u5d4c\u5165\u90ae\u4ef6\u3002',
    fr: 'HTML styl\u00e9 avec CSS \u2014 ouvrir dans le navigateur ou int\u00e9grer dans les e-mails.',
    es: 'HTML con estilos CSS \u2014 abrir en el navegador o insertar en correos.',
    pt: 'HTML estilizado com CSS \u2014 abrir no navegador ou incorporar em e-mails.',
    ja: 'CSS\u4ed8\u304d\u30b9\u30bf\u30a4\u30ebHTML \u2014 \u30d6\u30e9\u30a6\u30b6\u3067\u958b\u304f\u304b\u30e1\u30fc\u30eb\u306b\u57cb\u3081\u8fbc\u307f\u3002',
    ko: 'CSS\uac00 \uc801\uc6a9\ub41c HTML \u2014 \ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \uc5f4\uac70\ub098 \uc774\uba54\uc77c\uc5d0 \uc0bd\uc785.',
  },
  {
    de: 'Rohes Markdown mit GFM-Tabellen \u2014 perfekt f\u00fcr GitHub, Notion und Dokumentation.',
    en: 'Raw Markdown with GFM tables \u2014 perfect for GitHub, Notion, and documentation.',
    zh: '\u539f\u59cb Markdown \u5e26 GFM \u8868\u683c \u2014 \u9002\u5408 GitHub\u3001Notion \u548c\u6587\u6863\u3002',
    fr: 'Markdown brut avec tableaux GFM \u2014 parfait pour GitHub, Notion et la documentation.',
    es: 'Markdown sin procesar con tablas GFM \u2014 perfecto para GitHub, Notion y documentaci\u00f3n.',
    pt: 'Markdown bruto com tabelas GFM \u2014 perfeito para GitHub, Notion e documenta\u00e7\u00e3o.',
    ja: 'GFM\u30c6\u30fc\u30d6\u30eb\u4ed8\u304d\u306eMarkdown \u2014 GitHub\u3001Notion\u3001\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8\u306b\u6700\u9069\u3002',
    ko: 'GFM \ud14c\uc774\ube14\uc774 \ud3ec\ud568\ub41c Markdown \u2014 GitHub, Notion, \ubb38\uc11c\uc5d0 \uc644\ubcbd.',
  },
  {
    de: 'Einfacher Text \u2014 universell kompatibel, leicht zu teilen.',
    en: 'Plain text \u2014 universally compatible, easy to share.',
    zh: '\u7eaf\u6587\u672c \u2014 \u901a\u7528\u517c\u5bb9\uff0c\u6613\u4e8e\u5206\u4eab\u3002',
    fr: 'Texte brut \u2014 universellement compatible, facile \u00e0 partager.',
    es: 'Texto plano \u2014 universalmente compatible, f\u00e1cil de compartir.',
    pt: 'Texto simples \u2014 universalmente compat\u00edvel, f\u00e1cil de compartilhar.',
    ja: '\u30d7\u30ec\u30fc\u30f3\u30c6\u30ad\u30b9\u30c8 \u2014 \u6c4e\u7528\u4e92\u63db\u3001\u5171\u6709\u304c\u7c21\u5358\u3002',
    ko: '\uc77c\ubc18 \ud14d\uc2a4\ud2b8 \u2014 \ubc94\uc6a9 \ud638\ud658, \uc27d\uac8c \uacf5\uc720.',
  },
  {
    de: 'Strukturiertes JSON \u2014 f\u00fcr Entwickler und Automatisierung.',
    en: 'Structured JSON \u2014 for developers and automation.',
    zh: '\u7ed3\u6784\u5316 JSON \u2014 \u9002\u5408\u5f00\u53d1\u8005\u548c\u81ea\u52a8\u5316\u3002',
    fr: 'JSON structur\u00e9 \u2014 pour les d\u00e9veloppeurs et l\'automatisation.',
    es: 'JSON estructurado \u2014 para desarrolladores y automatizaci\u00f3n.',
    pt: 'JSON estruturado \u2014 para desenvolvedores e automa\u00e7\u00e3o.',
    ja: '\u69cb\u9020\u5316JSON \u2014 \u958b\u767a\u8005\u3068\u81ea\u52d5\u5316\u5411\u3051\u3002',
    ko: '\uad6c\uc870\ud654\ub41c JSON \u2014 \uac1c\ubc1c\uc790 \ubc0f \uc790\ub3d9\ud654\uc6a9.',
  },
]

// Section D — Features Grid
const H2_FEATURES: L = {
  de: 'Warum unseren KI-Bericht-Generator nutzen?',
  en: 'Why use our AI report generator?',
  zh: '\u4e3a\u4ec0\u4e48\u4f7f\u7528\u6211\u4eec\u7684 AI \u62a5\u544a\u751f\u6210\u5668\uff1f',
  fr: 'Pourquoi utiliser notre g\u00e9n\u00e9rateur de rapports IA ?',
  es: '\u00bfPor qu\u00e9 usar nuestro generador de informes IA?',
  pt: 'Por que usar nosso gerador de relat\u00f3rios IA?',
  ja: '\u306a\u305c\u5f53\u793e\u306eAI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u3092\u4f7f\u3046\u306e\u304b\uff1f',
  ko: '\uc65c \uc6b0\ub9ac\uc758 AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub97c \uc0ac\uc6a9\ud574\uc57c \ud558\ub098\uc694?',
}

const FEATURE_KEYS = ['streaming', 'context', 'tables', 'export', 'free', 'nologin'] as const

const FEATURE_TITLES: Record<string, L> = {
  streaming: { de: 'Streaming-Generierung', en: 'Streaming Generation', zh: '\u6d41\u5f0f\u751f\u6210', fr: 'G\u00e9n\u00e9ration en streaming', es: 'Generaci\u00f3n en streaming', pt: 'Gera\u00e7\u00e3o em streaming', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u751f\u6210', ko: '\uc2a4\ud2b8\ub9ac\ubc0d \uc0dd\uc131' },
  context: { de: 'Wochen- & Tageskontext', en: 'Week & Day Context', zh: '\u5468\u62a5\u548c\u65e5\u62a5\u4e0a\u4e0b\u6587', fr: 'Contexte hebdo & quotidien', es: 'Contexto semanal y diario', pt: 'Contexto semanal e di\u00e1rio', ja: '\u9031\u9593\u30fb\u65e5\u6b21\u30b3\u30f3\u30c6\u30ad\u30b9\u30c8', ko: '\uc8fc\uac04 & \uc77c\uac04 \ucee8\ud14d\uc2a4\ud2b8' },
  tables: { de: 'GFM-Tabellen', en: 'GFM Tables', zh: 'GFM \u8868\u683c', fr: 'Tableaux GFM', es: 'Tablas GFM', pt: 'Tabelas GFM', ja: 'GFM\u30c6\u30fc\u30d6\u30eb', ko: 'GFM \ud14c\uc774\ube14' },
  export: { de: 'Multi-Format-Export', en: 'Multi-Format Export', zh: '\u591a\u683c\u5f0f\u5bfc\u51fa', fr: 'Export multi-format', es: 'Exportaci\u00f3n multi-formato', pt: 'Exporta\u00e7\u00e3o multi-formato', ja: '\u30de\u30eb\u30c1\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u30a8\u30af\u30b9\u30dd\u30fc\u30c8', ko: '\ub2e4\uc911 \ud615\uc2dd \ub0b4\ubcf4\ub0b4\uae30' },
  free: { de: 'Kostenlos, ohne Anmeldung', en: 'Free, No Signup', zh: '\u514d\u8d39\uff0c\u65e0\u9700\u6ce8\u518c', fr: 'Gratuit, sans inscription', es: 'Gratis, sin registro', pt: 'Gratuito, sem cadastro', ja: '\u7121\u6599\u30fb\u767b\u9332\u4e0d\u8981', ko: '\ubb34\ub8cc\u00b7\uac00\uc785 \ubd88\ud544\uc694' },
  nologin: { de: 'Kein Login erforderlich', en: 'No Login Required', zh: '\u65e0\u9700\u767b\u5f55', fr: 'Sans inscription', es: 'Sin registro', pt: 'Sem login', ja: '\u30ed\u30b0\u30a4\u30f3\u4e0d\u8981', ko: '\ub85c\uadf8\uc778 \ubd88\ud544\uc694' },
}

const FEATURE_DESCRIPTIONS: Record<string, L> = {
  streaming: {
    de: 'Der Bericht wird in Echtzeit generiert und angezeigt \u2014 Sie sehen den Text, w\u00e4hrend die KI schreibt, ohne auf das Endergebnis warten zu m\u00fcssen.',
    en: 'The report is generated and displayed in real time \u2014 you see the text as the AI writes it, without waiting for the final result.',
    zh: '\u62a5\u544a\u5b9e\u65f6\u751f\u6210\u5e76\u663e\u793a \u2014 \u60a8\u53ef\u4ee5\u770b\u5230 AI \u5199\u4f5c\u7684\u6587\u672c\uff0c\u65e0\u9700\u7b49\u5f85\u6700\u7ec8\u7ed3\u679c\u3002',
    fr: "Le rapport est g\u00e9n\u00e9r\u00e9 et affich\u00e9 en temps r\u00e9el \u2014 vous voyez le texte au fur et \u00e0 mesure que l'IA l'\u00e9crit.",
    es: 'El informe se genera y muestra en tiempo real \u2014 ve el texto mientras la IA lo escribe, sin esperar el resultado final.',
    pt: 'O relat\u00f3rio \u00e9 gerado e exibido em tempo real \u2014 voc\u00ea v\u00ea o texto enquanto a IA escreve, sem esperar pelo resultado final.',
    ja: '\u30ec\u30dd\u30fc\u30c8\u306f\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u3067\u751f\u6210\u30fb\u8868\u793a \u2014 AI\u304c\u66f8\u304f\u30c6\u30ad\u30b9\u30c8\u3092\u5373\u5ea7\u306b\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002',
    ko: '\ubcf4\uace0\uc11c\uac00 \uc2e4\uc2dc\uac04\uc73c\ub85c \uc0dd\uc131\ub418\uace0 \ud45c\uc2dc\ub429\ub2c8\ub2e4 \u2014 AI\uac00 \uc791\uc131\ud558\ub294 \ud14d\uc2a4\ud2b8\ub97c \ubc14\ub85c \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  },
  context: {
    de: 'Berichte basieren auf kuratierten KI-Nachrichten des gew\u00e4hlten Zeitraums \u2014 w\u00f6chentlich oder t\u00e4glich, mit Daten aus 35+ Quellen. Hat ein Tag noch keine Daten, werden die neuesten verf\u00fcgbaren Daten derselben Woche verwendet.',
    en: 'Reports are based on curated AI news from the selected period \u2014 weekly or daily, with data from 35+ sources. If a day has no data yet, the most recent available data from the same week is used.',
    zh: '\u62a5\u544a\u57fa\u4e8e\u6240\u9009\u65f6\u6bb5\u7684\u7cbe\u9009 AI \u65b0\u95fb \u2014 \u6bcf\u5468\u6216\u6bcf\u65e5,\u6570\u636e\u6765\u81ea 35+ \u4fe1\u606f\u6e90\u3002\u82e5\u67d0\u5929\u6682\u65e0\u6570\u636e,\u5219\u4f7f\u7528\u540c\u4e00\u5468\u5185\u6700\u65b0\u7684\u53ef\u7528\u6570\u636e\u3002',
    fr: 'Les rapports sont bas\u00e9s sur les actualit\u00e9s IA s\u00e9lectionn\u00e9es de la p\u00e9riode choisie \u2014 hebdomadaire ou quotidienne, avec des donn\u00e9es de 35+ sources. Si un jour n\'a pas encore de donn\u00e9es, les donn\u00e9es disponibles les plus r\u00e9centes de la m\u00eame semaine sont utilis\u00e9es.',
    es: 'Los informes se basan en noticias de IA curadas del per\u00edodo seleccionado \u2014 semanal o diario, con datos de 35+ fuentes. Si un d\u00eda a\u00fan no tiene datos, se usan los datos disponibles m\u00e1s recientes de la misma semana.',
    pt: 'Os relat\u00f3rios s\u00e3o baseados em not\u00edcias de IA selecionadas do per\u00edodo escolhido \u2014 semanal ou di\u00e1rio, com dados de 35+ fontes. Se um dia ainda n\u00e3o tiver dados, s\u00e3o usados os dados dispon\u00edveis mais recentes da mesma semana.',
    ja: '\u30ec\u30dd\u30fc\u30c8\u306f\u9078\u629e\u3057\u305f\u671f\u9593\u306e\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u306b\u57fa\u3065\u304d\u307e\u3059 \u2014 \u9031\u6b21\u307e\u305f\u306f\u65e5\u6b21\u300135\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u306e\u30c7\u30fc\u30bf\u3002\u305d\u306e\u65e5\u306e\u30c7\u30fc\u30bf\u304c\u307e\u3060\u306a\u3044\u5834\u5408\u306f\u3001\u540c\u3058\u9031\u306e\u6700\u65b0\u306e\u5229\u7528\u53ef\u80fd\u306a\u30c7\u30fc\u30bf\u3092\u4f7f\u7528\u3057\u307e\u3059\u3002',
    ko: '\ubcf4\uace0\uc11c\ub294 \uc120\ud0dd\ud55c \uae30\uac04\uc758 \uc5c4\uc120\ub41c AI \ub274\uc2a4\ub97c \uae30\ubc18\uc73c\ub85c \ud569\ub2c8\ub2e4 \u2014 \uc8fc\uac04 \ub610\ub294 \uc77c\uac04, 35\uac1c+ \uc18c\uc2a4 \ub370\uc774\ud130. \uadf8\ub0a0 \ub370\uc774\ud130\uac00 \uc544\uc9c1 \uc5c6\uc73c\uba74 \uac19\uc740 \uc8fc\uc758 \uac00\uc7a5 \ucd5c\uc2e0 \ub370\uc774\ud130\ub97c \uc0ac\uc6a9\ud569\ub2c8\ub2e4.',
  },
  tables: {
    de: 'Berichte enthalten GitHub Flavored Markdown-Tabellen f\u00fcr Finanzierungsrunden und M&A-Deals \u2014 \u00fcbersichtlich und professionell.',
    en: 'Reports include GitHub Flavored Markdown tables for funding rounds and M&A deals \u2014 clear and professional.',
    zh: '\u62a5\u544a\u5305\u542b GitHub Flavored Markdown \u8868\u683c\uff0c\u7528\u4e8e\u878d\u8d44\u8f6e\u6b21\u548c\u5e76\u8d2d\u4ea4\u6613 \u2014 \u6e05\u6670\u4e13\u4e1a\u3002',
    fr: 'Les rapports incluent des tableaux Markdown GFM pour les tours de financement et les op\u00e9rations M&A \u2014 clairs et professionnels.',
    es: 'Los informes incluyen tablas Markdown GFM para rondas de financiaci\u00f3n y operaciones M&A \u2014 claras y profesionales.',
    pt: 'Os relat\u00f3rios incluem tabelas Markdown GFM para rodadas de financiamento e opera\u00e7\u00f5es M&A \u2014 claras e profissionais.',
    ja: '\u30ec\u30dd\u30fc\u30c8\u306b\u306f\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3068M&A\u30c7\u30a3\u30fc\u30eb\u306eGFM\u30c6\u30fc\u30d6\u30eb\u304c\u542b\u307e\u308c\u307e\u3059 \u2014 \u660e\u78ba\u3067\u30d7\u30ed\u30d5\u30a7\u30c3\u30b7\u30e7\u30ca\u30eb\u3002',
    ko: '\ubcf4\uace0\uc11c\uc5d0\ub294 \ud380\ub529 \ub77c\uc6b4\ub4dc\uc640 M&A \uac70\ub798\ub97c \uc704\ud55c GFM \ud14c\uc774\ube14\uc774 \ud3ec\ud568\ub429\ub2c8\ub2e4 \u2014 \uba85\ud655\ud558\uace0 \uc804\ubb38\uc801.',
  },
  export: {
    de: 'Exportieren Sie in DOCX, HTML, Markdown, TXT oder JSON \u2014 f\u00fcr jeden Anwendungsfall das richtige Format.',
    en: 'Export to DOCX, HTML, Markdown, TXT, or JSON \u2014 the right format for every use case.',
    zh: '\u5bfc\u51fa\u4e3a DOCX\u3001HTML\u3001Markdown\u3001TXT \u6216 JSON \u2014 \u6bcf\u79cd\u7528\u4f8b\u90fd\u6709\u5408\u9002\u7684\u683c\u5f0f\u3002',
    fr: "Exportez en DOCX, HTML, Markdown, TXT ou JSON \u2014 le bon format pour chaque cas d'utilisation.",
    es: 'Exporte a DOCX, HTML, Markdown, TXT o JSON \u2014 el formato adecuado para cada caso de uso.',
    pt: 'Exporte para DOCX, HTML, Markdown, TXT ou JSON \u2014 o formato certo para cada caso de uso.',
    ja: 'DOCX\u3001HTML\u3001Markdown\u3001TXT\u3001JSON\u306b\u30a8\u30af\u30b9\u30dd\u30fc\u30c8 \u2014 \u3042\u3089\u3086\u308b\u30e6\u30fc\u30b9\u30b1\u30fc\u30b9\u306b\u6700\u9069\u306a\u5f62\u5f0f\u3002',
    ko: 'DOCX, HTML, Markdown, TXT, JSON\uc73c\ub85c \ub0b4\ubcf4\ub0b4\uae30 \u2014 \ubaa8\ub4e0 \uc0ac\uc6a9 \uc0ac\ub840\uc5d0 \ub9de\ub294 \ud615\uc2dd.',
  },
  free: {
    de: 'Keine versteckten Kosten, keine Anmeldung. Kostenlos mit Fair-Use-Limit (einige Berichte pro 10 Minuten).',
    en: 'No hidden costs, no signup. Free to use with a fair-use rate limit (a few reports per 10 minutes).',
    zh: '\u6ca1\u6709\u9690\u85cf\u8d39\u7528\uff0c\u65e0\u9700\u6ce8\u518c\u3002\u514d\u8d39\u4f7f\u7528\uff0c\u542b\u5408\u7406\u4f7f\u7528\u9650\u5236\uff08\u6bcf 10 \u5206\u949f\u6570\u4efd\u62a5\u544a\uff09\u3002',
    fr: "Pas de co\u00fbts cach\u00e9s, pas d'inscription. Gratuit avec une limite d'usage raisonnable (quelques rapports par 10 minutes).",
    es: 'Sin costos ocultos, sin registro. Gratis con un l\u00edmite de uso razonable (varios informes cada 10 minutos).',
    pt: 'Sem custos ocultos, sem cadastro. Gratuito com um limite de uso justo (alguns relat\u00f3rios a cada 10 minutos).',
    ja: '\u96a0\u308c\u305f\u30b3\u30b9\u30c8\u3082\u767b\u9332\u3082\u4e0d\u8981\u3002\u30d5\u30a7\u30a2\u30e6\u30fc\u30b9\u5236\u9650\u4ed8\u304d\u3067\u7121\u6599(10\u5206\u3042\u305f\u308a\u6570\u4ef6)\u3002',
    ko: '\uc228\uaca8\uc9c4 \ube44\uc6a9\ub3c4 \uac00\uc785\ub3c4 \uc5c6\uc2b5\ub2c8\ub2e4. \uacf5\uc815 \uc0ac\uc6a9 \uc81c\ud55c\uacfc \ud568\uaed8 \ubb34\ub8cc(10\ubd84\ub2f9 \uba87 \uac74).',
  },
  nologin: {
    de: 'Kein Konto, keine Registrierung. \u00d6ffnen Sie die App und erstellen Sie sofort Ihren ersten Bericht.',
    en: 'No account, no registration. Open the app and generate your first report instantly.',
    zh: '\u65e0\u9700\u8d26\u6237\uff0c\u65e0\u9700\u6ce8\u518c\u3002\u6253\u5f00\u5e94\u7528\u5373\u53ef\u7acb\u5373\u751f\u6210\u7b2c\u4e00\u4efd\u62a5\u544a\u3002',
    fr: "Pas de compte, pas d'inscription. Ouvrez l'application et g\u00e9n\u00e9rez votre premier rapport instantan\u00e9ment.",
    es: 'Sin cuenta, sin registro. Abra la aplicaci\u00f3n y genere su primer informe al instante.',
    pt: 'Sem conta, sem registro. Abra o app e gere seu primeiro relat\u00f3rio instantaneamente.',
    ja: '\u30a2\u30ab\u30a6\u30f3\u30c8\u4e0d\u8981\u3001\u767b\u9332\u4e0d\u8981\u3002\u30a2\u30d7\u30ea\u3092\u958b\u3044\u3066\u3059\u3050\u306b\u6700\u521d\u306e\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210\u3002',
    ko: '\uacc4\uc815 \ud544\uc694 \uc5c6\uc74c, \uac00\uc785 \ud544\uc694 \uc5c6\uc74c. \uc571\uc744 \uc5f4\uace0 \uc988\uc2dc \uccab \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud558\uc138\uc694.',
  },
}

// Section E — How It Works
const H2_HOW: L = {
  de: 'Wie funktioniert der KI-Bericht-Generator?',
  en: 'How does the AI report generator work?',
  zh: 'AI \u62a5\u544a\u751f\u6210\u5668\u5982\u4f55\u8fd0\u4f5c\uff1f',
  fr: 'Comment fonctionne le g\u00e9n\u00e9rateur de rapports IA ?',
  es: '\u00bfC\u00f3mo funciona el generador de informes IA?',
  pt: 'Como funciona o gerador de relat\u00f3rios IA?',
  ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f\u3069\u306e\u3088\u3046\u306b\u6a5f\u80fd\u3057\u307e\u3059\u304b\uff1f',
  ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub294 \uc5b4\ub5bb\uac8c \uc791\ub3d9\ud558\ub098\uc694?',
}

const STEP_TITLES: L[] = [
  { de: 'Zeitraum w\u00e4hlen', en: 'Select Period', zh: '\u9009\u62e9\u65f6\u6bb5', fr: 'Choisir la p\u00e9riode', es: 'Seleccionar per\u00edodo', pt: 'Selecionar per\u00edodo', ja: '\u671f\u9593\u3092\u9078\u629e', ko: '\uae30\uac04 \uc120\ud0dd' },
  { de: 'Generieren klicken', en: 'Click Generate', zh: '\u70b9\u51fb\u751f\u6210', fr: 'Cliquer sur G\u00e9n\u00e9rer', es: 'Hacer clic en Generar', pt: 'Clicar em Gerar', ja: '\u751f\u6210\u3092\u30af\u30ea\u30c3\u30af', ko: '\uc0dd\uc131 \ud074\ub9ad' },
  { de: 'KI streamt Bericht', en: 'AI Streams Report', zh: 'AI\u6d41\u5f0f\u751f\u6210\u62a5\u544a', fr: "L'IA g\u00e9n\u00e8re le rapport", es: 'La IA genera el informe', pt: 'IA gera o relat\u00f3rio', ja: 'AI\u304c\u30ec\u30dd\u30fc\u30c8\u3092\u30b9\u30c8\u30ea\u30fc\u30e0', ko: 'AI\uac00 \ubcf4\uace0\uc11c \uc0dd\uc131' },
  { de: 'Exportieren', en: 'Export', zh: '\u5bfc\u51fa', fr: 'Exporter', es: 'Exportar', pt: 'Exportar', ja: '\u30a8\u30af\u30b9\u30dd\u30fc\u30c8', ko: '\ub0b4\ubcf4\ub0b4\uae30' },
]

const STEP_DESCRIPTIONS: L[] = [
  {
    de: 'W\u00e4hlen Sie einen w\u00f6chentlichen oder t\u00e4glichen Zeitraum aus dem Navigationsmen\u00fc.',
    en: 'Choose a weekly or daily period from the navigation menu.',
    zh: '\u4ece\u5bfc\u822a\u83dc\u5355\u4e2d\u9009\u62e9\u6bcf\u5468\u6216\u6bcf\u65e5\u65f6\u6bb5\u3002',
    fr: 'Choisissez une p\u00e9riode hebdomadaire ou quotidienne dans le menu de navigation.',
    es: 'Elija un per\u00edodo semanal o diario del men\u00fa de navegaci\u00f3n.',
    pt: 'Escolha um per\u00edodo semanal ou di\u00e1rio no menu de navega\u00e7\u00e3o.',
    ja: '\u30ca\u30d3\u30b2\u30fc\u30b7\u30e7\u30f3\u30e1\u30cb\u30e5\u30fc\u304b\u3089\u9031\u6b21\u307e\u305f\u306f\u65e5\u6b21\u306e\u671f\u9593\u3092\u9078\u629e\u3002',
    ko: '\ud0d0\uc0c9 \uba54\ub274\uc5d0\uc11c \uc8fc\uac04 \ub610\ub294 \uc77c\uac04 \uae30\uac04\uc744 \uc120\ud0dd\ud558\uc138\uc694.',
  },
  {
    de: 'Klicken Sie auf den Bericht-Button (links unten) \u2014 die Generierung startet sofort.',
    en: 'Click the report button (bottom-left) \u2014 generation starts immediately.',
    zh: '\u70b9\u51fb\u62a5\u544a\u6309\u94ae\uff08\u5de6\u4e0b\u89d2\uff09\u2014 \u7acb\u5373\u5f00\u59cb\u751f\u6210\u3002',
    fr: 'Cliquez sur le bouton rapport (en bas \u00e0 gauche) \u2014 la g\u00e9n\u00e9ration d\u00e9marre imm\u00e9diatement.',
    es: 'Haga clic en el bot\u00f3n de informe (abajo a la izquierda) \u2014 la generaci\u00f3n comienza inmediatamente.',
    pt: 'Clique no bot\u00e3o de relat\u00f3rio (canto inferior esquerdo) \u2014 a gera\u00e7\u00e3o come\u00e7a imediatamente.',
    ja: '\u30ec\u30dd\u30fc\u30c8\u30dc\u30bf\u30f3\uff08\u5de6\u4e0b\uff09\u3092\u30af\u30ea\u30c3\u30af \u2014 \u5373\u5ea7\u306b\u751f\u6210\u958b\u59cb\u3002',
    ko: '\ubcf4\uace0\uc11c \ubc84\ud2bc(\uc67c\ucabd \ud558\ub2e8)\uc744 \ud074\ub9ad \u2014 \uc989\uc2dc \uc0dd\uc131 \uc2dc\uc791.',
  },
  {
    de: 'Die KI analysiert die kuratierten Nachrichten und streamt einen strukturierten Bericht in Echtzeit.',
    en: 'The AI analyzes curated news and streams a structured report in real time.',
    zh: 'AI \u5206\u6790\u7cbe\u9009\u65b0\u95fb\u5e76\u5b9e\u65f6\u6d41\u5f0f\u751f\u6210\u7ed3\u6784\u5316\u62a5\u544a\u3002',
    fr: "L'IA analyse les actualit\u00e9s s\u00e9lectionn\u00e9es et diffuse un rapport structur\u00e9 en temps r\u00e9el.",
    es: 'La IA analiza las noticias curadas y transmite un informe estructurado en tiempo real.',
    pt: 'A IA analisa as not\u00edcias selecionadas e transmite um relat\u00f3rio estruturado em tempo real.',
    ja: 'AI\u304c\u53b3\u9078\u30cb\u30e5\u30fc\u30b9\u3092\u5206\u6790\u3057\u3001\u69cb\u9020\u5316\u3055\u308c\u305f\u30ec\u30dd\u30fc\u30c8\u3092\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u3067\u30b9\u30c8\u30ea\u30fc\u30e0\u3002',
    ko: 'AI\uac00 \uc5c4\uc120\ub41c \ub274\uc2a4\ub97c \ubd84\uc11d\ud558\uace0 \uad6c\uc870\ud654\ub41c \ubcf4\uace0\uc11c\ub97c \uc2e4\uc2dc\uac04\uc73c\ub85c \uc0dd\uc131\ud569\ub2c8\ub2e4.',
  },
  {
    de: 'Laden Sie den fertigen Bericht in Ihrem bevorzugten Format herunter: DOCX, HTML, Markdown, TXT oder JSON.',
    en: 'Download the finished report in your preferred format: DOCX, HTML, Markdown, TXT, or JSON.',
    zh: '\u4ee5\u60a8\u559c\u6b22\u7684\u683c\u5f0f\u4e0b\u8f7d\u5b8c\u6210\u7684\u62a5\u544a\uff1aDOCX\u3001HTML\u3001Markdown\u3001TXT \u6216 JSON\u3002',
    fr: 'T\u00e9l\u00e9chargez le rapport termin\u00e9 dans votre format pr\u00e9f\u00e9r\u00e9 : DOCX, HTML, Markdown, TXT ou JSON.',
    es: 'Descargue el informe terminado en su formato preferido: DOCX, HTML, Markdown, TXT o JSON.',
    pt: 'Baixe o relat\u00f3rio finalizado no seu formato preferido: DOCX, HTML, Markdown, TXT ou JSON.',
    ja: '\u5b8c\u6210\u3057\u305f\u30ec\u30dd\u30fc\u30c8\u3092\u304a\u597d\u307f\u306e\u5f62\u5f0f\u3067\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\uff1aDOCX\u3001HTML\u3001Markdown\u3001TXT\u3001JSON\u3002',
    ko: '\uc644\uc131\ub41c \ubcf4\uace0\uc11c\ub97c \uc6d0\ud558\ub294 \ud615\uc2dd\uc73c\ub85c \ub2e4\uc6b4\ub85c\ub4dc\ud558\uc138\uc694: DOCX, HTML, Markdown, TXT, JSON.',
  },
]

// Section F — FAQ
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
      de: 'Was ist der KI-Bericht-Generator?',
      en: 'What is the AI report generator?',
      zh: '\u4ec0\u4e48\u662f AI \u62a5\u544a\u751f\u6210\u5668\uff1f',
      fr: "Qu'est-ce que le g\u00e9n\u00e9rateur de rapports IA ?",
      es: '\u00bfQu\u00e9 es el generador de informes IA?',
      pt: 'O que \u00e9 o gerador de relat\u00f3rios IA?',
      ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u3068\u306f\uff1f',
      ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub780 \ubb34\uc5c7\uc778\uac00\uc694?',
    },
    a: {
      de: 'Der KI-Bericht-Generator von Frontier ist ein LLM-gest\u00fctztes Tool, das aus kuratierten KI-Nachrichten strukturierte Berichte erstellt. Er generiert Executive Summarys, Technologie-Analysen, Investment-\u00dcberblicke und Trend-Ausblicke \u2014 alles per Streaming in Echtzeit.',
      en: 'The Frontier report generator is an LLM-powered tool that creates structured reports from curated AI news. It generates executive summaries, technology analyses, investment overviews, and trend outlooks \u2014 all streamed in real time.',
      zh: 'Frontier \u62a5\u544a\u751f\u6210\u5668\u662f\u4e00\u4e2a\u57fa\u4e8e LLM \u7684\u5de5\u5177\uff0c\u4ece\u7cbe\u9009\u7684 AI \u65b0\u95fb\u521b\u5efa\u7ed3\u6784\u5316\u62a5\u544a\u3002\u5b83\u751f\u6210\u6267\u884c\u6458\u8981\u3001\u6280\u672f\u5206\u6790\u3001\u6295\u8d44\u6982\u89c8\u548c\u8d8b\u52bf\u5c55\u671b \u2014 \u5168\u90e8\u5b9e\u65f6\u6d41\u5f0f\u751f\u6210\u3002',
      fr: "Le g\u00e9n\u00e9rateur de rapports IA de Frontier est un outil aliment\u00e9 par LLM qui cr\u00e9e des rapports structur\u00e9s \u00e0 partir d'actualit\u00e9s IA s\u00e9lectionn\u00e9es. Il g\u00e9n\u00e8re des r\u00e9sum\u00e9s ex\u00e9cutifs, analyses technologiques, aper\u00e7us d'investissement et perspectives \u2014 tout en streaming temps r\u00e9el.",
      es: 'El generador de informes IA de Frontier es una herramienta impulsada por LLM que crea informes estructurados a partir de noticias de IA curadas. Genera res\u00famenes ejecutivos, an\u00e1lisis tecnol\u00f3gicos, panoramas de inversi\u00f3n y perspectivas \u2014 todo en streaming en tiempo real.',
      pt: 'O gerador de relat\u00f3rios IA do Frontier \u00e9 uma ferramenta alimentada por LLM que cria relat\u00f3rios estruturados a partir de not\u00edcias de IA selecionadas. Gera resumos executivos, an\u00e1lises tecnol\u00f3gicas, panoramas de investimento e perspectivas \u2014 tudo em streaming em tempo real.',
      ja: 'Frontier\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f\u3001\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u304b\u3089\u69cb\u9020\u5316\u3055\u308c\u305f\u30ec\u30dd\u30fc\u30c8\u3092\u4f5c\u6210\u3059\u308bLLM\u99c6\u52d5\u30c4\u30fc\u30eb\u3067\u3059\u3002\u30a8\u30b0\u30bc\u30af\u30c6\u30a3\u30d6\u30b5\u30de\u30ea\u30fc\u3001\u6280\u8853\u5206\u6790\u3001\u6295\u8cc7\u6982\u8981\u3001\u30c8\u30ec\u30f3\u30c9\u5c55\u671b\u3092\u751f\u6210 \u2014 \u3059\u3079\u3066\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u30b9\u30c8\u30ea\u30fc\u30e0\u3002',
      ko: 'Frontier \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub294 \uc5c4\uc120\ub41c AI \ub274\uc2a4\uc5d0\uc11c \uad6c\uc870\ud654\ub41c \ubcf4\uace0\uc11c\ub97c \uc791\uc131\ud558\ub294 LLM \uae30\ubc18 \ub3c4\uad6c\uc785\ub2c8\ub2e4. \uc5d1\uc81c\ud07c\ud2f0\ube0c \uc694\uc57d, \uae30\uc220 \ubd84\uc11d, \ud22c\uc790 \uac1c\uc694, \ud2b8\ub80c\ub4dc \uc804\ub9dd\uc744 \uc0dd\uc131 \u2014 \ubaa8\ub450 \uc2e4\uc2dc\uac04 \uc2a4\ud2b8\ub9ac\ubc0d.',
    },
  },
  {
    q: {
      de: 'Ist der Bericht-Generator kostenlos?',
      en: 'Is the report generator free?',
      zh: '\u62a5\u544a\u751f\u6210\u5668\u514d\u8d39\u5417\uff1f',
      fr: 'Le g\u00e9n\u00e9rateur de rapports est-il gratuit ?',
      es: '\u00bfEl generador de informes es gratuito?',
      pt: 'O gerador de relat\u00f3rios \u00e9 gratuito?',
      ja: '\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f\u7121\u6599\u3067\u3059\u304b\uff1f',
      ko: '\ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub294 \ubb34\ub8cc\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ja, der KI-Bericht-Generator ist 100% kostenlos. Kein Login, keine Registrierung. Es gilt ein Fair-Use-Limit von einigen Berichten pro 10 Minuten.',
      en: 'Yes, the AI report generator is 100% free. No login, no registration. A fair-use rate limit of a few reports per 10 minutes applies.',
      zh: '\u662f\u7684\uff0cAI \u62a5\u544a\u751f\u6210\u5668 100% \u514d\u8d39\u3002\u65e0\u9700\u767b\u5f55\u3001\u65e0\u9700\u6ce8\u518c\u3002\u9002\u7528\u5408\u7406\u4f7f\u7528\u9650\u5236\uff08\u6bcf 10 \u5206\u949f\u6570\u4efd\u62a5\u544a\uff09\u3002',
      fr: "Oui, le g\u00e9n\u00e9rateur de rapports IA est 100% gratuit. Pas de login, pas d'inscription. Une limite d'usage raisonnable de quelques rapports par 10 minutes s'applique.",
      es: 'S\u00ed, el generador de informes IA es 100% gratuito. Sin login, sin registro. Se aplica un l\u00edmite de uso razonable de varios informes cada 10 minutos.',
      pt: 'Sim, o gerador de relat\u00f3rios IA \u00e9 100% gratuito. Sem login, sem registro. Aplica-se um limite de uso justo de alguns relat\u00f3rios a cada 10 minutos.',
      ja: '\u306f\u3044\u3001AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f100%\u7121\u6599\u3067\u3059\u3002\u30ed\u30b0\u30a4\u30f3\u4e0d\u8981\u3001\u767b\u9332\u4e0d\u8981\u300210\u5206\u3042\u305f\u308a\u6570\u4ef6\u306e\u30d5\u30a7\u30a2\u30e6\u30fc\u30b9\u5236\u9650\u304c\u3042\u308a\u307e\u3059\u3002',
      ko: '\ub124, AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30\ub294 100% \ubb34\ub8cc\uc785\ub2c8\ub2e4. \ub85c\uadf8\uc778 \uc5c6\uc74c, \uac00\uc785 \uc5c6\uc74c. 10\ubd84\ub2f9 \uba87 \uac74\uc758 \uacf5\uc815 \uc0ac\uc6a9 \uc81c\ud55c\uc774 \uc801\uc6a9\ub429\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'In welche Formate kann ich exportieren?',
      en: 'What formats can I export?',
      zh: '\u53ef\u4ee5\u5bfc\u51fa\u4e3a\u54ea\u4e9b\u683c\u5f0f\uff1f',
      fr: "Dans quels formats puis-je exporter ?",
      es: '\u00bfEn qu\u00e9 formatos puedo exportar?',
      pt: 'Em quais formatos posso exportar?',
      ja: '\u3069\u306e\u5f62\u5f0f\u3067\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u3067\u304d\u307e\u3059\u304b\uff1f',
      ko: '\uc5b4\ub5a4 \ud615\uc2dd\uc73c\ub85c \ub0b4\ubcf4\ub0b4\uae30\ud560 \uc218 \uc788\ub098\uc694?',
    },
    a: {
      de: 'Sie k\u00f6nnen Berichte in 5 Formaten exportieren: DOCX (Word), HTML (mit CSS-Styling), Markdown (GFM), TXT (reiner Text) und JSON (strukturierte Daten f\u00fcr Entwickler).',
      en: 'You can export reports in 5 formats: DOCX (Word), HTML (with CSS styling), Markdown (GFM), TXT (plain text), and JSON (structured data for developers).',
      zh: '\u60a8\u53ef\u4ee5\u4ee5 5 \u79cd\u683c\u5f0f\u5bfc\u51fa\u62a5\u544a\uff1aDOCX\uff08Word\uff09\u3001HTML\uff08\u5e26 CSS \u6837\u5f0f\uff09\u3001Markdown\uff08GFM\uff09\u3001TXT\uff08\u7eaf\u6587\u672c\uff09\u548c JSON\uff08\u5f00\u53d1\u8005\u7ed3\u6784\u5316\u6570\u636e\uff09\u3002',
      fr: "Vous pouvez exporter des rapports dans 5 formats : DOCX (Word), HTML (avec styles CSS), Markdown (GFM), TXT (texte brut) et JSON (donn\u00e9es structur\u00e9es pour d\u00e9veloppeurs).",
      es: 'Puede exportar informes en 5 formatos: DOCX (Word), HTML (con estilos CSS), Markdown (GFM), TXT (texto plano) y JSON (datos estructurados para desarrolladores).',
      pt: 'Voc\u00ea pode exportar relat\u00f3rios em 5 formatos: DOCX (Word), HTML (com estilos CSS), Markdown (GFM), TXT (texto simples) e JSON (dados estruturados para desenvolvedores).',
      ja: '\u30ec\u30dd\u30fc\u30c8\u306f5\u3064\u306e\u5f62\u5f0f\u3067\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u53ef\u80fd\uff1aDOCX\uff08Word\uff09\u3001HTML\uff08CSS\u30b9\u30bf\u30a4\u30eb\u4ed8\u304d\uff09\u3001Markdown\uff08GFM\uff09\u3001TXT\uff08\u30d7\u30ec\u30fc\u30f3\u30c6\u30ad\u30b9\u30c8\uff09\u3001JSON\uff08\u958b\u767a\u8005\u5411\u3051\u69cb\u9020\u5316\u30c7\u30fc\u30bf\uff09\u3002',
      ko: '\ubcf4\uace0\uc11c\ub97c 5\uac00\uc9c0 \ud615\uc2dd\uc73c\ub85c \ub0b4\ubcf4\ub0b4\uae30\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4: DOCX(Word), HTML(CSS \uc2a4\ud0c0\uc77c \ud3ec\ud568), Markdown(GFM), TXT(\uc77c\ubc18 \ud14d\uc2a4\ud2b8), JSON(\uac1c\ubc1c\uc790\uc6a9 \uad6c\uc870\ud654 \ub370\uc774\ud130).',
    },
  },
  {
    q: {
      de: 'Welche Daten nutzt der Bericht?',
      en: 'What data does the report use?',
      zh: '\u62a5\u544a\u4f7f\u7528\u54ea\u4e9b\u6570\u636e\uff1f',
      fr: 'Quelles donn\u00e9es le rapport utilise-t-il ?',
      es: '\u00bfQu\u00e9 datos utiliza el informe?',
      pt: 'Quais dados o relat\u00f3rio utiliza?',
      ja: '\u30ec\u30dd\u30fc\u30c8\u306f\u3069\u306e\u30c7\u30fc\u30bf\u3092\u4f7f\u7528\u3057\u307e\u3059\u304b\uff1f',
      ko: '\ubcf4\uace0\uc11c\ub294 \uc5b4\ub5a4 \ub370\uc774\ud130\ub97c \uc0ac\uc6a9\ud558\ub098\uc694?',
    },
    a: {
      de: 'Berichte basieren auf kuratierten KI-Nachrichten aus 35+ Quellen, darunter TechCrunch, MIT Technology Review, Hacker News und YouTube. Die Daten umfassen Technologie-Durchbr\u00fcche, Finanzierungsrunden, Marktbewegungen, M&A-Deals und praktische Tipps.',
      en: 'Reports are based on curated AI news from 35+ public sources including TechCrunch, MIT Technology Review, Hacker News, GitHub, arXiv, and Reddit. Data covers technology breakthroughs, funding rounds, market movements, M&A deals, and practical tips.',
      zh: '\u62a5\u544a\u57fa\u4e8e\u6765\u81ea 35+ \u516c\u5f00\u4fe1\u606f\u6e90\u7684\u7cbe\u9009 AI \u65b0\u95fb\uff0c\u5305\u62ec TechCrunch\u3001MIT Technology Review\u3001Hacker News\u3001GitHub\u3001arXiv \u548c Reddit\u3002\u6570\u636e\u6db5\u76d6\u6280\u672f\u7a81\u7834\u3001\u878d\u8d44\u8f6e\u6b21\u3001\u5e02\u573a\u52a8\u5411\u3001\u5e76\u8d2d\u4ea4\u6613\u548c\u5b9e\u7528\u6280\u5de7\u3002',
      fr: "Les rapports sont bas\u00e9s sur des actualit\u00e9s IA s\u00e9lectionn\u00e9es de 35+ sources dont TechCrunch, MIT Technology Review, Hacker News et YouTube. Les donn\u00e9es couvrent les perc\u00e9es technologiques, les tours de financement, les mouvements de march\u00e9, les op\u00e9rations M&A et les conseils pratiques.",
      es: 'Los informes se basan en noticias de IA curadas de 35+ fuentes, incluyendo TechCrunch, MIT Technology Review, Hacker News y YouTube. Los datos cubren avances tecnol\u00f3gicos, rondas de financiaci\u00f3n, movimientos de mercado, operaciones M&A y consejos pr\u00e1cticos.',
      pt: 'Os relat\u00f3rios s\u00e3o baseados em not\u00edcias de IA selecionadas de 35+ fontes, incluindo TechCrunch, MIT Technology Review, Hacker News e YouTube. Os dados cobrem avan\u00e7os tecnol\u00f3gicos, rodadas de financiamento, movimentos de mercado, opera\u00e7\u00f5es M&A e dicas pr\u00e1ticas.',
      ja: '\u30ec\u30dd\u30fc\u30c8\u306fTechCrunch\u3001MIT Technology Review\u3001Hacker News\u3001YouTube\u3092\u542b\u308035\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u304b\u3089\u306e\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u306b\u57fa\u3065\u3044\u3066\u3044\u307e\u3059\u3002\u6280\u8853\u7684\u30d6\u30ec\u30fc\u30af\u30b9\u30eb\u30fc\u3001\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001\u5e02\u5834\u52d5\u5411\u3001M&A\u30c7\u30a3\u30fc\u30eb\u3001\u5b9f\u8df5\u30d2\u30f3\u30c8\u3092\u30ab\u30d0\u30fc\u3002',
      ko: '\ubcf4\uace0\uc11c\ub294 TechCrunch, MIT Technology Review, Hacker News, YouTube\ub97c \ud3ec\ud568\ud55c 35\uac1c+ \uc18c\uc2a4\uc758 \uc5c4\uc120\ub41c AI \ub274\uc2a4\ub97c \uae30\ubc18\uc73c\ub85c \ud569\ub2c8\ub2e4. \uae30\uc220 \ub3cc\ud30c\uad6c, \ud380\ub529 \ub77c\uc6b4\ub4dc, \uc2dc\uc7a5 \ub3d9\ud5a5, M&A \uac70\ub798, \uc2e4\uc6a9 \ud301\uc744 \ub2e4\ub8f9\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Kann ich Berichte f\u00fcr bestimmte Zeitr\u00e4ume erstellen?',
      en: 'Can I generate reports for specific periods?',
      zh: '\u53ef\u4ee5\u4e3a\u7279\u5b9a\u65f6\u6bb5\u751f\u6210\u62a5\u544a\u5417\uff1f',
      fr: 'Puis-je g\u00e9n\u00e9rer des rapports pour des p\u00e9riodes sp\u00e9cifiques ?',
      es: '\u00bfPuedo generar informes para per\u00edodos espec\u00edficos?',
      pt: 'Posso gerar relat\u00f3rios para per\u00edodos espec\u00edficos?',
      ja: '\u7279\u5b9a\u306e\u671f\u9593\u306e\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210\u3067\u304d\u307e\u3059\u304b\uff1f',
      ko: '\ud2b9\uc815 \uae30\uac04\uc758 \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud560 \uc218 \uc788\ub098\uc694?',
    },
    a: {
      de: 'Ja! Navigieren Sie zu einem beliebigen t\u00e4glichen oder w\u00f6chentlichen Zeitraum und klicken Sie den Bericht-Button. Der Generator nutzt die Daten dieses Zeitraums; hat ein Tag noch keine Daten, greift er auf die neuesten verf\u00fcgbaren Daten derselben Woche zur\u00fcck.',
      en: 'Yes! Navigate to any daily or weekly period and click the report button. The generator uses that period\'s data; if a day has no data yet, it falls back to the most recent available data from the same week.',
      zh: '\u662f\u7684!\u5bfc\u822a\u5230\u4efb\u4f55\u6bcf\u65e5\u6216\u6bcf\u5468\u65f6\u6bb5\u5e76\u70b9\u51fb\u62a5\u544a\u6309\u94ae\u3002\u751f\u6210\u5668\u4f7f\u7528\u8be5\u65f6\u6bb5\u7684\u6570\u636e;\u82e5\u67d0\u5929\u6682\u65e0\u6570\u636e,\u4f1a\u56de\u9000\u5230\u540c\u4e00\u5468\u5185\u6700\u65b0\u7684\u53ef\u7528\u6570\u636e\u3002',
      fr: 'Oui ! Naviguez vers n\'importe quelle p\u00e9riode quotidienne ou hebdomadaire et cliquez sur le bouton rapport. Le g\u00e9n\u00e9rateur utilise les donn\u00e9es de cette p\u00e9riode ; si un jour n\'a pas encore de donn\u00e9es, il se rabat sur les donn\u00e9es disponibles les plus r\u00e9centes de la m\u00eame semaine.',
      es: '\u00a1S\u00ed! Navegue a cualquier per\u00edodo diario o semanal y haga clic en el bot\u00f3n de informe. El generador usa los datos de ese per\u00edodo; si un d\u00eda a\u00fan no tiene datos, recurre a los datos disponibles m\u00e1s recientes de la misma semana.',
      pt: 'Sim! Navegue at\u00e9 qualquer per\u00edodo di\u00e1rio ou semanal e clique no bot\u00e3o de relat\u00f3rio. O gerador usa os dados desse per\u00edodo; se um dia ainda n\u00e3o tiver dados, recorre aos dados dispon\u00edveis mais recentes da mesma semana.',
      ja: '\u306f\u3044!\u4efb\u610f\u306e\u65e5\u6b21\u30fb\u9031\u6b21\u671f\u9593\u306b\u79fb\u52d5\u3057\u3066\u30ec\u30dd\u30fc\u30c8\u30dc\u30bf\u30f3\u3092\u30af\u30ea\u30c3\u30af\u3002\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc\u306f\u305d\u306e\u671f\u9593\u306e\u30c7\u30fc\u30bf\u3092\u4f7f\u7528\u3057\u3001\u305d\u306e\u65e5\u306e\u30c7\u30fc\u30bf\u304c\u307e\u3060\u306a\u3044\u5834\u5408\u306f\u540c\u3058\u9031\u306e\u6700\u65b0\u306e\u5229\u7528\u53ef\u80fd\u306a\u30c7\u30fc\u30bf\u306b\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af\u3057\u307e\u3059\u3002',
      ko: '\ub124! \uc6d0\ud558\ub294 \uc77c\uac04 \ub610\ub294 \uc8fc\uac04 \uae30\uac04\uc73c\ub85c \uc774\ub3d9\ud574 \ubcf4\uace0\uc11c \ubc84\ud2bc\uc744 \ud074\ub9ad\ud558\uc138\uc694. \uc0dd\uc131\uae30\ub294 \ud574\ub2f9 \uae30\uac04\uc758 \ub370\uc774\ud130\ub97c \uc0ac\uc6a9\ud558\uba70, \uadf8\ub0a0 \ub370\uc774\ud130\uac00 \uc544\uc9c1 \uc5c6\uc73c\uba74 \uac19\uc740 \uc8fc\uc758 \uac00\uc7a5 \ucd5c\uc2e0 \ub370\uc774\ud130\ub85c \ub300\uccb4\ud569\ub2c8\ub2e4.',
    },
  },
]

// Section G — Final CTA
const H2_CTA_FINAL: L = {
  de: 'Erstellen Sie jetzt Ihren ersten KI-Bericht',
  en: 'Generate your first AI report now',
  zh: '\u7acb\u5373\u751f\u6210\u60a8\u7684\u7b2c\u4e00\u4efd AI \u62a5\u544a',
  fr: 'G\u00e9n\u00e9rez votre premier rapport IA maintenant',
  es: 'Genere su primer informe de IA ahora',
  pt: 'Gere seu primeiro relat\u00f3rio de IA agora',
  ja: '\u4eca\u3059\u3050\u6700\u521d\u306eAI\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210',
  ko: '\uc9c0\uae08 \uccab AI \ubcf4\uace0\uc11c\ub97c \uc0dd\uc131\ud558\uc138\uc694',
}

const TRUST_LINE: L = {
  de: 'Von KI-Fachleuten weltweit genutzt',
  en: 'Trusted by AI professionals worldwide',
  zh: '\u53d7\u5168\u7403 AI \u4e13\u4e1a\u4eba\u58eb\u4fe1\u8d56',
  fr: "Utilis\u00e9 par des professionnels de l\u2019IA dans le monde entier",
  es: 'Usado por profesionales de IA en todo el mundo',
  pt: 'Usado por profissionais de IA em todo o mundo',
  ja: '\u4e16\u754c\u4e2d\u306eAI\u5c02\u9580\u5bb6\u306b\u4fe1\u983c\u3055\u308c\u3066\u3044\u307e\u3059',
  ko: '\uc804 \uc138\uacc4 AI \uc804\ubb38\uac00\ub4e4\uc774 \uc2e0\ub8b0\ud569\ub2c8\ub2e4',
}

// Breadcrumb labels
const HOME_LABEL: L = { de: 'Startseite', en: 'Home', zh: '\u9996\u9875', fr: 'Accueil', es: 'Inicio', pt: 'In\u00edcio', ja: '\u30db\u30fc\u30e0', ko: '\ud648' }
const TOOLS_LABEL: L = { de: 'Tools', en: 'Tools', zh: '\u5de5\u5177', fr: 'Outils', es: 'Herramientas', pt: 'Ferramentas', ja: '\u30c4\u30fc\u30eb', ko: '\ub3c4\uad6c' }
const TOOL_LABEL: L = { de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI\u62a5\u544a\u751f\u6210\u5668', fr: 'G\u00e9n\u00e9rateur de rapports IA', es: 'Generador de informes IA', pt: 'Gerador de relat\u00f3rios IA', ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc', ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30' }

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AIReportGeneratorToolPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  // -- JSON-LD schemas --------------------------------------------------------
  const pageUrl = `${BASE_URL}/${lang}/tools/ai-report-generator`

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Frontier Report Generator',
    description: t(META_DESCRIPTIONS, lang),
    url: pageUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    author: {
      '@type': 'Organization',
      name: 'Frontier',
      url: BASE_URL,
    },
    inLanguage: ['en', 'zh-Hans'],
    featureList: [
      'Streaming AI report generation',
      '5 export formats (DOCX, HTML, Markdown, TXT, JSON)',
      'Weekly and daily period context',
      'GFM tables for financial data',
      'No login required',
      '100% free',
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
  const featureIcons: Record<string, React.ReactNode> = {
    streaming: <Zap className="h-6 w-6" />,
    context: <FileText className="h-6 w-6" />,
    tables: <Table className="h-6 w-6" />,
    export: <Download className="h-6 w-6" />,
    free: <Gift className="h-6 w-6" />,
    nologin: <Unlock className="h-6 w-6" />,
  }

  const featureAccents: Record<string, string> = {
    streaming: 'text-[var(--tech-accent)]',
    context: 'text-[var(--invest-accent)]',
    tables: 'text-[var(--tips-accent)]',
    export: 'text-[var(--tech-accent)]',
    free: 'text-[var(--tips-accent)]',
    nologin: 'text-[var(--invest-accent)]',
  }

  // -- Format icons -----------------------------------------------------------
  const formatIcons = ['📄', '🌐', '📝', '📋', '🔧']

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
              {t(CTA_GENERATE, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#sample-preview"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_SAMPLE, lang)}
            </a>
          </div>

          {/* Stat badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[STAT_STREAMING, STAT_FORMATS, STAT_CONTEXT, STAT_FREE].map((stat, i) => (
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
        {/* Section B: Sample Report Preview                                  */}
        {/* ================================================================= */}
        <section id="sample-preview" className="py-12 sm:py-16 scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            {t(H2_PREVIEW, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(PREVIEW_LEAD, lang)}
          </p>

          <div className="mt-8 rounded-xl border border-border/50 bg-card/50 p-6 overflow-x-auto">
            <pre className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
{`## Executive Summary

This week saw significant developments across the AI landscape...

## Technology Breakthroughs

| Company     | Development           | Impact   |
|-------------|-----------------------|----------|
| OpenAI      | GPT-5 architecture    | Critical |
| Google      | Gemini 2.5 release    | High     |
| Anthropic   | Claude new features   | High     |

## Investment & Market Activity

### Primary Market (Funding Rounds)
- **xAI**: $6B Series C at $50B valuation
- **Mistral AI**: $640M Series B...

### Mergers & Acquisitions
- **Databricks → MosaicML**: $1.3B...

## Practical AI Tips
- [Intermediate] Use structured outputs...

## Key Trends & Outlook
The convergence of multimodal AI...`}
            </pre>
          </div>

          <div className="mt-8">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(TRY_IT, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section C: Export Formats                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_FORMATS, lang)}
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FORMAT_NAMES.map((name, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/50 p-6"
              >
                <div className="mb-4 text-2xl" aria-hidden="true">
                  {formatIcons[i]}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t(name, lang)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(FORMAT_DESCRIPTIONS[i], lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section D: Features Grid                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center">
            {t(H2_FEATURES, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
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
        {/* Section E: How It Works                                           */}
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
              {t(CTA_GENERATE, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t(TRUST_LINE, lang)}</p>
        </section>
      </article>
      </main>
    </>
  )
}
