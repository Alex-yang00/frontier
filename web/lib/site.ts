const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_URL = (configuredSiteUrl || 'http://localhost:5173').replace(/\/$/, '')

export function siteUrl(pathname = ''): string {
  const path = pathname && !pathname.startsWith('/') ? `/${pathname}` : pathname
  return `${SITE_URL}${path}`
}
