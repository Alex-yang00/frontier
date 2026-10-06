import { getCloudflareContext } from '@opennextjs/cloudflare'

// Workers responses bypass the CDN cache even with s-maxage, so every hit runs
// the full Worker. The Cache API stores rendered public responses per colo and
// lets repeat agent and crawler reads skip R2 and rendering. Outside Workers
// (next dev, build) there is no default cache and the handler runs directly.
function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: unknown }).caches as { default?: Cache } | undefined
  return storage?.default ?? null
}

export async function withEdgeCache(
  request: Request,
  ttlSeconds: number,
  render: () => Promise<Response>,
): Promise<Response> {
  const cache = edgeCache()
  if (!cache || request.method !== 'GET') return render()

  const key = new Request(request.url, { method: 'GET' })
  const hit = await cache.match(key)
  if (hit) return hit

  const response = await render()
  if (response.status !== 200 || response.headers.get('Cache-Control')?.includes('no-store')) {
    return response
  }

  // Cache API honours Cache-Control, so the stored copy gets its own edge TTL
  // while the client-facing headers stay unchanged.
  const stored = new Response(response.clone().body, response)
  stored.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`)
  const put = cache.put(key, stored)
  try {
    getCloudflareContext().ctx.waitUntil(put)
  } catch {
    await put
  }
  return response
}
