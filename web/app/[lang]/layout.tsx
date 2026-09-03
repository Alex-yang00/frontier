import React from 'react'
import { notFound } from 'next/navigation'
import { SettingsProvider } from '@/lib/settings-context'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n'

// Prerender both language shells so the localized subtree stays fully static /
// ISR-cacheable. The language comes from the [lang] path segment, not from
// request headers, so nothing here taints the route as dynamic.
export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  // Seed the client settings context with the URL's language so the interactive
  // chrome (chat, share, editorial home) server-renders in the right language
  // instead of flashing English before hydration. This provider shadows the
  // en-default one in the root layout for everything under /{lang}.
  return (
    <SettingsProvider initialLanguage={lang as AppLanguage}>
      {children}
    </SettingsProvider>
  )
}
