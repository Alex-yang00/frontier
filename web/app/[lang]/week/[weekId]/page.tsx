import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LegacyWeekPage, {
  generateMetadata as generateLegacyMetadata,
  generateStaticParams as generateLegacyStaticParams,
} from '../../../week/[weekId]/page'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'
import { siteUrl } from '@/lib/site'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string; weekId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) return {}

  const baseMeta = await generateLegacyMetadata({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })

  // Keep alternates aligned with the two supported languages.
  const hreflangEntries: Record<string, string> = {
    'x-default': siteUrl(`/en/week/${weekId}`),
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = siteUrl(`/${code}/week/${weekId}`)
  }

  return {
    ...baseMeta,
    alternates: {
      canonical: siteUrl(`/${lang}/week/${weekId}`),
      languages: hreflangEntries,
    },
  }
}

export async function generateStaticParams() {
  const periods = (await generateLegacyStaticParams()) as { weekId: string }[]
  return periods.flatMap((period) =>
    SUPPORTED_LANGUAGES.map((lang) => ({ lang, weekId: period.weekId }))
  )
}

export default async function LocalizedWeekPage({ params }: Props) {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return LegacyWeekPage({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })
}
