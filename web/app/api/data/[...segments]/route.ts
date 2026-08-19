import { readPublicDataText } from '@/lib/server/frontier-data'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await params
  const raw = await readPublicDataText(...segments)
  if (!raw) return new Response('Not found', { status: 404 })
  return new Response(raw, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
