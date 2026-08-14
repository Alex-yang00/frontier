const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, follow',
}

export function GET() {
  return new Response(null, { status: 204, headers })
}

export function HEAD() {
  return new Response(null, { status: 204, headers })
}
