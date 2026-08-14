import type { AppLanguage } from '@/lib/i18n'

export type StoryIdPost = {
  id: number
  isVideo?: boolean
}

export function techStoryId(post: StoryIdPost): string {
  return `${post.isVideo ? 'video' : 'tech'}-${post.id}`
}

export function tipStoryId(post: StoryIdPost): string {
  return `tip-${post.id}`
}

export function primaryStoryId(post: StoryIdPost): string {
  return `primary-${post.id}`
}

export function secondaryStoryId(post: StoryIdPost): string {
  return `secondary-${post.id}`
}

export function maStoryId(post: StoryIdPost): string {
  return `ma-${post.id}`
}

export function articleHref(lang: AppLanguage | string, periodId: string, storyId: string): string {
  return `/${lang}/news/${periodId}/${storyId}`
}

export function absoluteArticleUrl(baseUrl: string, lang: AppLanguage | string, periodId: string, storyId: string): string {
  return `${baseUrl}${articleHref(lang, periodId, storyId)}`
}

export const ARTICLE_CTA_LABELS: Record<string, string> = {
  de: 'Brief lesen',
  en: 'Read brief',
  zh: '阅读简报',
  fr: 'Lire le brief',
  es: 'Leer brief',
  pt: 'Ler brief',
  ja: 'ブリーフを読む',
  ko: '브리프 읽기',
}
