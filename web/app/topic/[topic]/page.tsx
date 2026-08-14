import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ topic: string }>
}

export default async function LegacyTopicPage({ params }: Props) {
  const { topic } = await params
  redirect(`/de/topic/${topic}`)
}
