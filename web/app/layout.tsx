import React from "react"
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google'
import { SettingsProvider } from '@/lib/settings-context'
import { isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import type { AppLanguage } from '@/lib/i18n'
import { OrganizationSchema, WebsiteSchema, FAQSchema } from '@/components/structured-data'
import { SITE_URL, siteUrl } from '@/lib/site'
import './globals.css'

// The three faces the design uses, and only those three: Newsreader carries every
// headline and the AI summary, Inter every deck and body line, JetBrains Mono every
// piece of metadata. Weight lists match what the stylesheet actually asks for --
// Inter 500 for the More Today tier, Newsreader 400 with its italic for the summary
// accent -- so no face is downloaded for a weight nothing renders.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Frontier',
    template: '%s',
  },
  description: 'Frontier collects AI breakthroughs, investment signals, and practical workflows from public sources in English and Chinese.',
  keywords: [
    // English
    'AI news', 'artificial intelligence', 'machine learning', 'AI investment', 'AI tips',
    'generative AI', 'LLM news', 'ChatGPT updates', 'AI weekly digest', 'AI newsletter',
    'AI stocks', 'AI funding', 'AI tools', 'deep learning', 'AI breakthroughs',
    'prompt engineering', 'AI startups', 'AI daily digest',
    // Chinese
    '人工智能', '大模型', 'AI投资', 'AI新闻', 'AI工具推荐',
  ],
  authors: [{ name: 'Frontier Team' }],
  creator: 'Frontier',
  publisher: 'Frontier',
  generator: 'Next.js',
  icons: {
    icon: [
      {
        url: '/logo/favicon-32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/logo/favicon-32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/logo/frontier-mark.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/logo/favicon-180.png',
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['zh_CN'],
    url: SITE_URL,
    siteName: 'Frontier',
    title: 'Frontier',
    description: 'Curated AI breakthroughs, investment signals, and practical workflows in English and Chinese.',
    images: [
      {
        url: '/logo/social-share.png',
        width: 1200,
        height: 630,
        alt: 'Frontier – Where AI meets human insight',
        type: 'image/jpeg',
      },
    ],
  },

  // Twitter Card — no static images so child pages' openGraph.images propagate automatically
  twitter: {
    card: 'summary_large_image',
    title: 'Frontier',
    description: 'Curated AI breakthroughs, investment signals, and practical workflows in English and Chinese.',
    images: [
      {
        url: '/logo/social-share.png',
        alt: 'Frontier – Where AI meets human insight',
      },
    ],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Alternates for multilingual
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en': siteUrl('/en'),
      'zh-Hans': siteUrl('/zh'),
      'x-default': SITE_URL,
    },
  },

  // Verification
  verification: {
    google: 'tpfZ2qy_2c2rvsuf2_rOrsq5yiBxyLfazfnhdrzZ_Zg',
  },
}

export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const rawLang = headersList.get('x-lang') || 'en'
  const htmlLang = isSupportedLanguage(rawLang) ? toBcp47(rawLang as AppLanguage) : rawLang
  const initialLanguage: AppLanguage = isSupportedLanguage(rawLang) ? rawLang : 'en'

  // The three font variables go on <html>, not <body>: globals.css defines
  // --font-locale-* in :root, and a var() pointing at a custom property that does
  // not exist on the same element is invalid at computed-value time -- it resolves
  // to the empty string and inherits down that way, so every face silently fell
  // back to the system stack.
  return (
    <html
      lang={htmlLang}
      className={`${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
        <FAQSchema lang={rawLang} />
        {['en', 'zh'].map((l) => (
          <link key={l} rel="alternate" type="application/atom+xml" title={`Frontier (${l.toUpperCase()})`} href={`/feed.xml?lang=${l}`} />
        ))}
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <SettingsProvider initialLanguage={initialLanguage}>
          {children}
        </SettingsProvider>
      </body>
    </html>
  )
}
