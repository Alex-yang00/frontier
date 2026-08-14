export function toTopicSlug(input: string): string {
  const normalized = input
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'topic'
}

export function topicSlugToQuery(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, ' ')
    .trim()
}

export function topicSlugToTitle(slug: string): string {
  const query = topicSlugToQuery(slug)
  if (!query) return 'Topic'
  return query
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
