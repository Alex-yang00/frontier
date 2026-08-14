export const SUPPORTED_LANGUAGES = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const LANG_PATTERN = SUPPORTED_LANGUAGES.join('|')
const LANG_PREFIX_RE = new RegExp(`^\\/(${LANG_PATTERN})(?=\\/|$)`)

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage)
}

export function getLanguageFromPathname(pathname: string): AppLanguage | null {
  const match = pathname.match(LANG_PREFIX_RE)
  if (!match) return null
  return match[1] as AppLanguage
}

function stripLanguagePrefix(pathname: string): string {
  const stripped = pathname.replace(LANG_PREFIX_RE, '')
  return stripped || '/'
}

/** Map internal language code to BCP 47 for hreflang / html lang attributes. */
export function toBcp47(lang: AppLanguage): string {
  if (lang === 'zh') return 'zh-Hans'
  return lang
}

export function toLocalizedPath(pathname: string, language: AppLanguage): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const basePath = stripLanguagePrefix(normalized)

  if (basePath === '/') return `/${language}`
  return `/${language}${basePath}`
}
