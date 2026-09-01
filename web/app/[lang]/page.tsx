import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomePageContent } from '../page'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'
import { SITE_URL, siteUrl } from '@/lib/site'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string }>
}

const META: Record<string, { title: string; description: string; ogDescription: string; ogAlt: string }> = {
  en: {
    title: 'Frontier',
    description: 'AI breakthroughs, LLM updates, investment signals, and practical workflows collected from public sources in English and Chinese.',
    ogDescription: 'Curated AI news, investment updates, and practical workflows in English and Chinese.',
    ogAlt: 'Frontier – Where AI meets human insight',
  },
  zh: {
    title: 'Frontier',
    description: '从公开来源汇集生成式 AI 突破、大模型动态、投资信号和实用工作流，提供中英文内容。',
    ogDescription: '中英文精选 AI 新闻、投资动态和实用工作流。',
    ogAlt: 'Frontier – AI 与人类智慧的交汇',
  },
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const localizedHome = siteUrl(`/${lang}`)
  const meta = META[lang] || META.en

  const hreflangEntries: Record<string, string> = { 'x-default': SITE_URL }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = siteUrl(`/${code}`)
  }

  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: {
      canonical: localizedHome,
      languages: hreflangEntries,
    },
    openGraph: {
      title: meta.title,
      description: meta.ogDescription,
      url: localizedHome,
      images: [
        {
          url: '/logo/social-share.png',
          width: 1200,
          height: 630,
          alt: meta.ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.ogDescription,
      images: [
        {
          url: '/logo/social-share.png',
          alt: meta.ogAlt,
        },
      ],
    },
  }
}

export default async function LocalizedHomePage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return HomePageContent({ language: lang })
}
