import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  toInvestments,
  toTech,
  toTips,
  type FrontierFile,
  type FrontierItem,
} from '@/lib/frontier-adapter'
import type {
  InvestmentData,
  MultilingualData,
  TechPost,
  TipPost,
  TrendsData,
  WeeksData,
} from '@/lib/types'

const PERIOD_ID_RE = /^(?:\d{4}-\d{2}-\d{2}|\d{4}-kw\d{2})$/
const SAFE_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/

interface ReleaseManifest {
  schema_version: number
  release_id?: string
  files?: Record<string, string>
  archives?: Record<string, { key?: string; itemCount?: number }>
}

function dataKey(segments: string[]): string | null {
  return segments.length > 0 && segments.every((segment) => SAFE_SEGMENT_RE.test(segment))
    ? segments.join('/')
    : null
}

async function r2DataBucket(): Promise<R2Bucket | null> {
  try {
    // Synchronous lookup uses the context OpenNext injects at request time.
    // The async variant starts a local Wrangler proxy when no context exists,
    // which makes parallel Next build workers contend for one SQLite file.
    const { env } = getCloudflareContext()
    return env.FRONTIER_DATA || null
  } catch {
    // next dev and build-time metadata generation run outside Workers.
    return null
  }
}

async function readLocalData(key: string): Promise<string | null> {
  try {
    const [{ readFile }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ])
    const configured = process.env.FRONTIER_DATA_DIR
    const root = configured
      ? path.resolve(configured)
      : path.join(process.cwd(), 'public', 'data')
    return await readFile(path.join(root, ...key.split('/')), 'utf-8')
  } catch {
    return null
  }
}

async function readRemoteData(key: string): Promise<string | null> {
  const base = process.env.FRONTIER_REMOTE_DATA_URL?.replace(/\/$/, '')
  if (!base) return null
  try {
    const response = await fetch(`${base}/${key}`, { cache: 'no-store' })
    return response.ok ? response.text() : null
  } catch {
    return null
  }
}

async function readBucketText(bucket: R2Bucket, key: string): Promise<string | null> {
  const object = await bucket.get(key)
  return object ? object.text() : null
}

async function readManifest(bucket: R2Bucket): Promise<ReleaseManifest | null> {
  try {
    const raw = await readBucketText(bucket, 'current.json')
    if (!raw) return null
    const value = JSON.parse(raw) as ReleaseManifest
    return value.schema_version === 1 ? value : null
  } catch {
    return null
  }
}

function manifestKey(manifest: ReleaseManifest, segments: string[]): string | null {
  if (segments.length === 1) {
    return manifest.files?.[segments[0]] || null
  }
  if (segments.length === 2 && segments[0] === 'archive') {
    const periodId = segments[1].replace(/\.json$/, '')
    return manifest.archives?.[periodId]?.key || null
  }
  return null
}

export async function readPublicDataText(...segments: string[]): Promise<string | null> {
  const key = dataKey(segments)
  if (!key) return null
  const bucket = await r2DataBucket()
  if (bucket) {
    const manifest = await readManifest(bucket)
    const resolved = manifest ? manifestKey(manifest, segments) : null
    if (resolved) return readBucketText(bucket, resolved)
    if (manifest && (segments.length === 1 || segments[0] === 'archive')) return null
    const legacy = await readBucketText(bucket, key)
    if (legacy) return legacy
  }
  return (await readRemoteData(key)) || readLocalData(key)
}

export async function readPublicData<T>(...segments: string[]): Promise<T | null> {
  try {
    const raw = await readPublicDataText(...segments)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function archiveKeys(): Promise<string[]> {
  const bucket = await r2DataBucket()
  if (bucket) {
    const manifest = await readManifest(bucket)
    if (manifest) {
      return Object.keys(manifest.archives || {}).map((periodId) => `archive/${periodId}.json`)
    }
    const keys: string[] = []
    let cursor: string | undefined
    do {
      const page = await bucket.list({ prefix: 'archive/', cursor })
      keys.push(...page.objects.map((object) => object.key))
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    return keys
  }
  try {
    const [{ readdir }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ])
    const configured = process.env.FRONTIER_DATA_DIR
    const root = configured
      ? path.resolve(configured)
      : path.join(process.cwd(), 'public', 'data')
    const filenames = await readdir(path.join(root, 'archive'))
    return filenames.map((filename) => `archive/${filename}`)
  } catch {
    return []
  }
}

export async function readWeeks(): Promise<WeeksData> {
  return (await readPublicData<WeeksData>('weeks.json')) || { weeks: [] }
}

export async function readCanonicalFile(periodId?: string): Promise<FrontierFile | null> {
  if (periodId && !PERIOD_ID_RE.test(periodId)) return null

  const daily = await readPublicData<FrontierFile>('daily.json')
  if (!periodId || periodId === daily?.date) return daily

  if (/^\d{4}-\d{2}-\d{2}$/.test(periodId)) {
    return readPublicData<FrontierFile>('archive', `${periodId}.json`)
  }
  return null
}

function canonicalFeeds(items: FrontierItem[]) {
  const techItems = items.filter((item) => (item.section || 'tech') === 'tech')
  const tech: MultilingualData<TechPost> = {
    en: techItems.map((item, index) => toTech(item, 'en', index)),
    zh: techItems.map((item, index) => toTech(item, 'zh', index)),
  }
  const tips: MultilingualData<TipPost> = {
    ...toTips(items, 'en'),
    ...toTips(items, 'zh'),
  }
  const enInvestment = toInvestments(items, 'en')
  const zhInvestment = toInvestments(items, 'zh')
  const investment: InvestmentData = {
    primaryMarket: { ...enInvestment.primaryMarket, ...zhInvestment.primaryMarket },
    secondaryMarket: { ...enInvestment.secondaryMarket, ...zhInvestment.secondaryMarket },
    ma: { ...enInvestment.ma, ...zhInvestment.ma },
  }
  return { tech, investment, tips }
}

export async function readPeriodData(periodId: string): Promise<{
  tech: MultilingualData<TechPost> | null
  investment: InvestmentData | null
  tips: MultilingualData<TipPost> | null
  trends: TrendsData | null
}> {
  if (!PERIOD_ID_RE.test(periodId)) {
    return { tech: null, investment: null, tips: null, trends: null }
  }

  // Versioned daily editions are canonical. Reading them first avoids four
  // parallel probes for legacy split files on every date and keeps the R2
  // request path identical to the homepage. Weekly legacy snapshots still
  // fall through to the split-file reader below.
  const canonical = await readCanonicalFile(periodId)
  if (canonical?.items?.length) return { ...canonicalFeeds(canonical.items), trends: null }

  const [tech, investment, tips, trends] = await Promise.all([
    readPublicData<MultilingualData<TechPost>>(periodId, 'tech.json'),
    readPublicData<InvestmentData>(periodId, 'investment.json'),
    readPublicData<MultilingualData<TipPost>>(periodId, 'tips.json'),
    readPublicData<TrendsData>(periodId, 'trends.json'),
  ])
  if (tech || investment || tips || trends) return { tech, investment, tips, trends }
  return { tech: null, investment: null, tips: null, trends: null }
}

export async function availablePeriodIds(): Promise<string[]> {
  const ids = new Set<string>()
  const weeks = await readWeeks()
  for (const period of weeks.weeks || []) {
    if (PERIOD_ID_RE.test(period.id)) ids.add(period.id)
    for (const day of period.days || []) {
      if (PERIOD_ID_RE.test(day.id)) ids.add(day.id)
    }
  }

  const daily = await readCanonicalFile()
  if (daily?.date && PERIOD_ID_RE.test(daily.date)) ids.add(daily.date)
  for (const key of await archiveKeys()) {
    const id = key.replace(/^archive\//, '').replace(/\.json$/, '')
    if (PERIOD_ID_RE.test(id)) ids.add(id)
  }
  return [...ids].sort().reverse()
}

export async function latestPeriodId(): Promise<string | null> {
  return (await availablePeriodIds())[0] || null
}
