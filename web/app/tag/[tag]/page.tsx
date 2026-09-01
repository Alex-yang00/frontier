import { redirect } from 'next/navigation'

/** Unprefixed /tag/x keeps working; the localized route is canonical. */
export default async function UnprefixedTagPage({
  params,
}: {
  params: Promise<{ tag: string }>
}) {
  const { tag } = await params
  redirect(`/en/tag/${encodeURIComponent(tag)}`)
}
