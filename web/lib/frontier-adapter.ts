import type { InvestmentData, MultilingualData, TechPost, TipPost } from "@/lib/types";

export interface FrontierItem {
  id: string;
  title: string;
  title_en?: string;
  title_zh?: string;
  url: string;
  source: string;
  source_name: string;
  tags?: string[];
  tags_zh?: string[];
  category?: string;
  category_zh?: string;
  published: string;
  summary?: string;
  summary_en?: string;
  summary_zh?: string;
  event_summary_en?: string;
  event_summary_zh?: string;
  event_sources?: Array<{
    id: string;
    title?: string;
    url: string;
    source_name: string;
    published?: string;
  }>;
  lang?: string;
  score?: number;
  points?: number;
  comments?: number;
  impact?: "critical" | "high" | "medium" | "low";
  section?: "tech" | "investment" | "tips" | "policy";
  tier?: "lead" | "standard" | "brief";
  relevance?: number;
  classification_source?: string;
  is_video?: boolean;
  video_id?: string;
  video_duration?: string;
  video_view_count?: string;
  video_thumbnail_url?: string;
}

/**
 * Shrink items before they cross into a client component.
 *
 * The homepage serializes the whole day file into the RSC payload so the client
 * can filter by day, tag and query without a round trip, but it renders roughly
 * two dozen rows and never shows a summary past STORY_DECK_LIMIT characters.
 * Untrimmed that shipped ~1 MB of HTML per request, two thirds of it summary
 * tails and ingest bookkeeping no view reads. The cap sits above the deck limit
 * so search still matches on more text than is displayed.
 */
const CLIENT_SUMMARY_CAP = 400;

export function trimForClient(items: FrontierItem[]): FrontierItem[] {
  return items.map((item) => {
    // `fetched_at` is ingest bookkeeping and `lang` is superseded by the
    // per-language title/summary fields; neither has a reader in the UI.
    const { fetched_at: _fetchedAt, lang: _lang, ...rest } = item as FrontierItem &
      Record<"fetched_at" | "lang", unknown>;
    const trimmed: FrontierItem = { ...rest };
    for (const field of [
      "summary",
      "summary_en",
      "summary_zh",
      "event_summary_en",
      "event_summary_zh",
    ] as const) {
      const value = trimmed[field];
      if (typeof value === "string" && value.length > CLIENT_SUMMARY_CAP) {
        trimmed[field] = value.slice(0, CLIENT_SUMMARY_CAP).trimEnd();
      }
    }
    return trimmed;
  });
}

export type FrontierSection = "tech" | "investment" | "tips" | "policy";

/** Per-section editorial prose written by scripts/enrich.py. */
export interface Throughline {
  en?: string;
  zh?: string;
  count?: number;
}

export interface FrontierFile {
  date?: string;
  updated_at?: string;
  items?: FrontierItem[];
  throughlines?: Partial<Record<FrontierSection, Throughline>>;
  daily_throughlines?: Record<string, Partial<Record<FrontierSection, Throughline>>>;
  curated_ids?: Partial<Record<FrontierSection | "videos", string[]>>;
  event_clusters?: Array<{
    section: FrontierSection;
    canonical_id: string;
    member_ids: string[];
    reason?: string;
    event_anchor?: string;
    summary_en?: string;
    summary_zh?: string;
  }>;
}

export function dataUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_FRONTIER_DATA_URL || "/api/data").replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

export function contentLanguage(language: string): "en" | "zh" {
  return language === "zh" ? "zh" : "en";
}

function languageText(item: FrontierItem, language: string, field: "title" | "summary") {
  if (language === "zh") return item[`${field}_zh` as "title_zh" | "summary_zh"] || item[field] || "";
  return item[`${field}_en` as "title_en" | "summary_en"] || item[field] || "";
}

function compactSummary(value: string): string {
  const cleaned = value
    .replace(/^arXiv:\S+\s+/i, "")
    .replace(/^announce type:\s*new\s+abstract:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 360 ? `${cleaned.slice(0, 357).trimEnd()}...` : cleaned;
}

function author(item: FrontierItem) {
  return { name: item.source_name, handle: item.source, avatar: item.source_name.slice(0, 2).toUpperCase(), verified: true };
}

// The item carries both languages. toTech is called once per language, so the zh
// feed must read the zh fields or the Chinese page shows English tags.
function localizedTags(item: FrontierItem, language: string): string[] {
  const localized = language === "zh" ? item.tags_zh : undefined;
  return (localized?.length ? localized : item.tags) || [];
}

function localizedCategory(item: FrontierItem, language: string): string {
  const localized = language === "zh" ? item.category_zh : undefined;
  return localized || item.category || localizedTags(item, language)[0] || "AI";
}

export function toTech(item: FrontierItem, language: string, index: number): TechPost {
  const points = item.points || item.score || 0;
  const title = languageText(item, language, "title");
  const summary = compactSummary(languageText(item, language, "summary"));
  return {
    id: index + 1, author: author(item), content: `${title}${summary ? `: ${summary}` : ""}`,
    tags: localizedTags(item, language), category: localizedCategory(item, language), iconType: "Cpu", impact: item.impact || (points >= 75 ? "critical" : points >= 55 ? "high" : "medium"),
    timestamp: item.published, metrics: { comments: item.comments || 0, retweets: 0, likes: points, views: item.video_view_count || "" }, source: item.source_name, sourceUrl: item.url,
    isVideo: item.is_video,
    videoId: item.video_id,
    videoDuration: item.video_duration,
    videoViewCount: item.video_view_count,
    videoThumbnailUrl: item.video_thumbnail_url,
  };
}

export function toTips(items: FrontierItem[], language: string): MultilingualData<TipPost> {
  // `platform` is the publisher, read off the item. It used to be the constant
  // "Reddit", which labelled every tip as a Reddit post including the ones from
  // newsletters and blogs -- the feed renders this string, so it was a wrong
  // attribution on the page rather than an unused field.
  return { [language]: items.filter((item) => item.section === "tips").map((item, index) => ({
    id: index + 1, author: author(item), platform: item.source_name, content: languageText(item, language, "title"), tip: languageText(item, language, "summary"), category: item.tags?.[0] || "workflow", timestamp: item.published,
    metrics: { comments: item.comments || 0, retweets: 0, likes: item.points || item.score || 0, views: "" }, sourceUrl: item.url,
  })) };
}

// Funding figures are published inside the headline and the deck; nothing in the
// pipeline lifts them into a field of their own. `amount` used to be the literal
// string "Reported", which the investment card rendered as the deal volume -- a
// figure the data never contained, on every row. Read a real one out of the text
// and leave the field empty when there is none, so the card omits the line
// instead of inventing it.
const FUNDING_AMOUNT_RE =
  /(?:US\$|\$|€|£|¥|￥)\s?\d[\d.,]*\s?(?:billion|million|trillion|bn|mn|[bmk])?\b|\d[\d.,]*\s?(?:亿|万)(?:美元|元|人民币)?/i;

function fundingAmount(...texts: string[]): string {
  for (const text of texts) {
    const match = text.match(FUNDING_AMOUNT_RE);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return "";
}

export function toInvestments(items: FrontierItem[], language: string): InvestmentData {
  const primary = items.filter((item) => item.section === "investment").map((item, index) => {
    const title = languageText(item, language, "title");
    const summary = languageText(item, language, "summary");
    return {
      id: index + 1, author: author(item), content: title + (summary ? `: ${summary}` : ""), company: item.source_name,
      amount: fundingAmount(title, summary), round: item.tags?.[0] || "AI",
      investors: [], valuation: "", timestamp: item.published,
      metrics: { comments: item.comments || 0, retweets: 0, likes: item.points || item.score || 0, views: "" }, sourceUrl: item.url,
    };
  });
  return { primaryMarket: { [language]: primary }, secondaryMarket: { [language]: [] }, ma: { [language]: [] } };
}
