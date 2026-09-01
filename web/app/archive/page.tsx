import { redirect } from 'next/navigation'

/** Unprefixed /archive keeps working; the localized route is canonical. */
export default async function UnprefixedArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year } = await searchParams
  redirect(year ? `/en/archive?year=${encodeURIComponent(year)}` : '/en/archive')
}
