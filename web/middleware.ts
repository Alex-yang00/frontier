import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSupportedLanguage, toLocalizedPath } from './lib/i18n'

// 2026-08: The former login gate ("visited" cookie wall + crawler-UA bypass)
// has been removed — it served no auth purpose, suppressed first-visit
// conversion, and showing bots different behavior than humans is a cloaking
// risk. The `visited` cookie is now set automatically on page responses
// because the chat/report API guard still requires it as a cheap
// must-have-visited-the-site abuse barrier (see lib/server/api-guard.ts).

function buildTarget(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

const LANG_RE = '(?:en|zh)'

function isLocalizablePath(pathname: string): boolean {
  return (
    pathname === '/' ||
    new RegExp(`^\\/${LANG_RE}$`).test(pathname) ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    /^\/tag\/[^/]+$/.test(pathname) ||
    pathname === '/archive' ||
    /^\/news\/[^/]+\/[^/]+$/.test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/week\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/topic\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/tag\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/archive$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/news\\/[^/]+\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/tools(\\/[^/]+)?$`).test(pathname)
  )
}

function nextWithLang(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const langSegment = segments[1]
  // EN is the default language since 2026-08 (global audience).
  const lang = isSupportedLanguage(langSegment) ? langSegment : 'en'

  const requestHeaders = new Headers(request.headers)
  if (requestHeaders.get('next-router-prefetch') && !requestHeaders.get('rsc')) {
    requestHeaders.delete('next-router-prefetch')
    requestHeaders.delete('next-router-segment-prefetch')
  }
  requestHeaders.set('x-lang', lang)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API and static assets.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return nextWithLang(request)
  }

  if (request.headers.get('next-router-prefetch') && !request.headers.get('rsc')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, follow',
      },
    })
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
  const langParam = searchParams.get('lang')

  if (langParam && isSupportedLanguage(langParam) && isLocalizablePath(pathname)) {
    searchParams.delete('lang')
    const localizedPath = toLocalizedPath(pathname, langParam)
    const target = buildTarget(localizedPath, searchParams)
    const current = buildTarget(pathname, request.nextUrl.searchParams)

    if (target !== current) {
      return NextResponse.redirect(new URL(target, request.url), 308)
    }
  }

  const legacyWeek = pathname.match(/^\/week\/([^/]+)$/)
  if (legacyWeek) {
    const target = buildTarget(`/en/week/${legacyWeek[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyTopic = pathname.match(/^\/topic\/([^/]+)$/)
  if (legacyTopic) {
    const target = buildTarget(`/en/topic/${legacyTopic[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyNews = pathname.match(/^\/news\/([^/]+)\/([^/]+)$/)
  if (legacyNews) {
    const target = buildTarget(`/en/news/${legacyNews[1]}/${legacyNews[2]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const response = nextWithLang(request)
  if (!request.cookies.get('visited')) {
    response.cookies.set('visited', 'true', {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      path: '/',
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
