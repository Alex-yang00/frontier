import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArchiveView, type ArchiveDay } from '@/components/archive-view'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47, type AppLanguage } from '@/lib/i18n'
import { readCanonicalFile, readWeeks } from '@/lib/server/frontier-data'
import { siteUrl } from '@/lib/site'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ year?: string }>
}

const META: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Archive',
    description: 'Every day Frontier has published, as a month-by-month heatmap down to the individual day.',
  },
  zh: {
    title: '归档',
    description: 'Frontier 收录过的每一天，按月热力图展示，可下钻到具体日期。',
  },
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}
  const meta = META[lang] || META.en

  const hreflangEntries: Record<string, string> = { 'x-default': siteUrl('/en/archive') }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = siteUrl(`/${code}/archive`)
  }

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: siteUrl(`/${lang}/archive`), languages: hreflangEntries },
    openGraph: { title: meta.title, description: meta.description, url: siteUrl(`/${lang}/archive`) },
  }
}

export default async function ArchivePage({ params, searchParams }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()
  const { year } = await searchParams

  const weeks = (await readWeeks()).weeks || []
  // `itemCount` is written by core/periods.py. An index published before that
  // field existed reports none, and the grid draws those days at its lowest
  // shade rather than as gaps -- the day is still published and still linkable.
  const days: ArchiveDay[] = weeks
    .filter((week) => /^\d{4}-\d{2}-\d{2}$/.test(week.id))
    .map((week) => ({ id: week.id, itemCount: week.itemCount ?? 0 }))
    .sort((a, b) => b.id.localeCompare(a.id))

  const years = [...new Set(days.map((day) => Number(day.id.slice(0, 4))))].sort((a, b) => a - b)
  const requested = Number(year)
  const activeYear =
    years.includes(requested) ? requested : years[years.length - 1] || new Date().getUTCFullYear()

  // "Today" is the newest day the site has published, not the server's clock: the
  // grid outlines the cell a reader can actually open, and on a day whose collect
  // has not run yet those two differ.
  const daily = await readCanonicalFile()
  const today = daily?.date || days[0]?.id || ''

  return (
    <ArchiveView
      days={days}
      year={activeYear}
      years={years}
      language={lang as AppLanguage}
      today={today}
    />
  )
}
