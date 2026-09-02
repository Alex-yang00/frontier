"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sun, Moon, Check, Globe, X, ChevronUp, ChevronDown } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import type { FrontierItem, FrontierSection, Throughline } from "@/lib/frontier-adapter";
import { getParentWeekId } from "@/lib/period-utils";
import { toTopicSlug } from "@/lib/topic-utils";

const SECTIONS: FrontierSection[] = ["tech", "investment", "tips", "policy"];

const LANGUAGES = [
  { code: "en" as const, label: "English" },
  { code: "zh" as const, label: "中文" },
];

/* Copy notes, because several obvious phrasings are factually wrong here:
   - No "issue"/"第 N 期". Collection is staggered before two daily publication
     runs, so this remains a continuously updated stream. The mock's
     "Issue 33 · Aug 17–23" was hardcoded sample text in a layout study.
   - The mock's summary card is headed "Today's summary". That is only true for the
     newest day; on any other selected day the heading takes that day's date.
   - The summary carries no byline at all. It is model output, so naming an
     editor would be a lie about who wrote it, and the /ai-disclosure page is
     where the site states how the text is produced. */
const COPY = {
  en: {
    kicker: "AI industry intelligence",
    sections: { tech: "Technology", investment: "Capital", tips: "Practice", policy: "Policy" },
    search: "Search all items",
    searchLabel: "Search",
    language: "Language",
    theme: "Toggle theme",
    sectionNav: "Sections",
    dayNav: "By date",
    thisWeek: "This week",
    fullArchive: "Full archive",
    todaySummary: "Today's summary",
    daySummary: (day: string) => `Summary · ${day}`,
    summaryPending: "Summary being generated…",
    moreToday: "More today",
    expand: "Open details",
    sources: (n: number) => `×${n} sources`,
    // "COVERAGE — 3 sources", as the mock writes it. "combined from" was mine and
    // the design does not say it; only the zh string carries 综合.
    coverage: (n: number) => `Coverage — ${n} sources`,
    aiSummary: "SUMMARY",
    briefingSources: "Sources",
    readOn: (source: string) => `Read on ${source} →`,
    watchOn: (source: string) => `Watch on ${source} →`,
    prev: "Previous item",
    next: "Next item",
    close: "Close",
    footItems: (items: number, sources: number) => `${items} items · ${sources} sources`,
    updated: (when: string) => `updated ${when}`,
    emptyTitle: "Nothing collected for this day yet",
    emptyDeck: "Pick another date, or clear the filters.",
    emptySearchTitle: "No matches",
    emptySearchDeck: "Try another keyword, or clear the filters.",
    emptyAction: "Clear filters",
    skip: "Skip to content",
    showing: (n: number) => `${n} item${n === 1 ? "" : "s"} showing`,
    ago: {
      now: "just now",
      minutes: (n: number) => `${n} min ago`,
      hours: (n: number) => `${n} hr ago`,
      days: (n: number) => `${n} day${n === 1 ? "" : "s"} ago`,
    },
  },
  zh: {
    kicker: "AI 行业情报",
    sections: { tech: "技术", investment: "资本动向", tips: "实用方法", policy: "政策" },
    search: "搜索全部内容",
    searchLabel: "搜索",
    language: "语言",
    theme: "切换明暗",
    sectionNav: "栏目",
    dayNav: "按日期",
    thisWeek: "本周",
    fullArchive: "完整归档",
    todaySummary: "今日总结",
    daySummary: (day: string) => `${day}总结`,
    summaryPending: "摘要生成中…",
    moreToday: "今日更多",
    expand: "展开详情",
    sources: (n: number) => `×${n} 来源`,
    coverage: (n: number) => `COVERAGE — 综合 ${n} 个来源`,
    aiSummary: "摘要",
    briefingSources: "来源",
    readOn: (source: string) => `阅读 ${source} 原文 →`,
    watchOn: (source: string) => `在 ${source} 观看 →`,
    prev: "上一条",
    next: "下一条",
    close: "关闭",
    footItems: (items: number, sources: number) => `${items} 条 · ${sources} 个信源`,
    updated: (when: string) => `更新于 ${when}`,
    emptyTitle: "这一天暂无收录内容",
    emptyDeck: "换一个日期，或清空筛选条件。",
    emptySearchTitle: "没有匹配的内容",
    emptySearchDeck: "试着换个关键词，或清空筛选条件。",
    emptyAction: "清空筛选",
    skip: "跳到正文",
    showing: (n: number) => `${n} 条内容`,
    ago: {
      now: "刚刚",
      minutes: (n: number) => `${n} 分钟前`,
      hours: (n: number) => `${n} 小时前`,
      days: (n: number) => `${n} 天前`,
    },
  },
} as const;

type Copy = (typeof COPY)["en"];

function copyFor(language: string): Copy {
  return (language === "zh" ? COPY.zh : COPY.en) as Copy;
}

function text(item: FrontierItem, language: string, field: "title" | "summary"): string {
  if (field === "summary") {
    const eventKey = `event_summary_${language === "zh" ? "zh" : "en"}` as keyof FrontierItem;
    const eventSummary = item[eventKey];
    if (typeof eventSummary === "string" && eventSummary) return eventSummary;
  }
  const key = `${field}_${language === "zh" ? "zh" : "en"}` as keyof FrontierItem;
  return (item[key] as string) || item[field] || "";
}

/** Tags in the reading language, falling back to the English list. */
function tagsFor(item: FrontierItem, language: string): string[] {
  const localized = language === "zh" ? item.tags_zh : undefined;
  return (localized?.length ? localized : item.tags) || [];
}

function sourceTier(item: FrontierItem, language: string): string {
  const source = (item.source || "").toLowerCase();
  const primary = ["openai", "deepmind", "anthropic", "huggingface", "prime_intellect", "arxiv"];
  if (primary.some((value) => source === value)) return language === "zh" ? "一手来源" : "Primary source";
  if (source.startsWith("reddit_") || source === "hacker_news") return language === "zh" ? "社区信号" : "Community signal";
  if (source === "techmeme") return language === "zh" ? "聚合报道" : "Aggregator";
  return language === "zh" ? "专业媒体" : "Specialist media";
}

/** Where a video link actually lands.
 *
 * The design names the platform for video items -- "· YouTube" in the panel head,
 * "Watch on YouTube →" on the button -- not the channel. source_name holds the
 * channel ("Sam Witteveen"), which reads as a destination the visitor cannot
 * visit; the host is the thing the link opens. Falls back to source_name when the
 * URL is not one we recognise, so a non-YouTube video still names something.
 */
function videoPlatform(item: FrontierItem): string {
  const source = (item.source || "").toLowerCase();
  if (source.startsWith("youtube") || /(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/.test(hostOf(item.url))) {
    return "YouTube";
  }
  return item.source_name || "";
}

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function storyType(item: FrontierItem, language: string): string {
  const category = `${item.category || ""} ${item.category_zh || ""}`.toLowerCase();
  const title = `${item.title_en || item.title || ""}`.toLowerCase();
  if (item.is_video) return language === "zh" ? "视频" : "Video";
  if (/(fund|funding|融资|acquisition|并购|valuation|估值|market)/.test(`${category} ${title}`)) return language === "zh" ? "资本事件" : "Capital event";
  if (/(security|vulnerability|安全|漏洞|sandbox|cyber)/.test(`${category} ${title}`)) return language === "zh" ? "安全" : "Security";
  if (/(research|benchmark|study|研究|基准|论文)/.test(`${category} ${title}`)) return language === "zh" ? "研究" : "Research";
  if (/(policy|regulation|legislation|政策|监管|法律)/.test(`${category} ${title}`)) return language === "zh" ? "政策" : "Policy";
  if (/(launch|release|发布|推出|introduc)/.test(`${category} ${title}`)) return language === "zh" ? "产品发布" : "Product release";
  return language === "zh" ? "行业动态" : "Industry update";
}

/** Both tag languages, for matching a filter against.
 *
 * The filter holds whatever string the control showed, and the language toggle is
 * client state rather than a route change -- the component does not remount. So
 * matching only the reading language would silently empty the page when a reader
 * switches language with a tag active. */
function tagMatches(item: FrontierItem, tag: string): boolean {
  return (item.tags || []).includes(tag) || (item.tags_zh || []).includes(tag);
}

/* Techmeme headlines end in the byline of the outlet they aggregate --
 * "（Bloomberg）", "（Andrew Deck/Nieman Lab）" -- which pushed measured titles to
 * 87-102 characters in Chinese. Every row already prints its source underneath,
 * so the bracket is duplicated cost paid in the least readable place. Only a
 * trailing bracket is removed, and only when short enough to be a byline rather
 * than part of the headline's meaning. */
const TRAILING_BYLINE_RE = /[（(][^（()）]{2,40}[）)]\s*$/;

/* Whether a row has the two things the layout draws: a headline that reads as one,
 * and a deck. An unenriched GitHub Trending row has neither -- the title is the
 * repo path and the deck is raw README prose -- so it renders as a broken row.
 * Used to judge ordering, not to hide anything. */
const SLUG_TITLE_RE = /^[\w.-]+\/[\w.-]+$/;

function isPresentable(item: FrontierItem, language: string): boolean {
  const title = headline(text(item, language, "title"));
  if (!title || SLUG_TITLE_RE.test(title)) return false;
  return text(item, language, "summary").trim().length > 0;
}

/** Drop the aggregator byline and one trailing sentence period from a headline.
 *
 * Translation returns full sentences, so 5 of 228 Chinese titles and 2 of 229
 * English ones arrive ending in 。or . — a headline does not take one. Only the
 * final mark goes: some titles legitimately contain internal sentence breaks, and
 * "?" and "!" carry meaning a headline needs to keep. */
function headline(value: string): string {
  // A run, not one character: two measured titles end in "..." and stripping a
  // single dot left "The summer Math fell to the machines.." on the page.
  return value.replace(TRAILING_BYLINE_RE, "").replace(/[。.…]+\s*$/, "").trim();
}

/** Strips the arXiv boilerplate that leads most abstracts, then trims. */
function deck(value: string, limit: number): string {
  const cleaned = value
    .replace(/^arXiv:\S+\s+/i, "")
    .replace(/^announce type:\s*(new|replace|cross)\s+abstract:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3).trimEnd()}...` : cleaned;
}

/** Escape everything, then re-allow the single <em> pair the design uses.
 *
 * The summary is model-written and arrives inside a JSON file served from the
 * published R2 snapshot, so it is untrusted input no matter what the generator
 * validated. scripts/enrich.py rejects stray markup on the way in; this is the
 * matching check on the way out, so a hand-edited or replaced data file cannot
 * inject script through the accent underline. */
function emOnly(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;em&gt;/g, "<em>")
    .replace(/&lt;\/em&gt;/g, "</em>");
}

function dayOf(item: FrontierItem): string {
  return (item.edition_date || item.published || "").slice(0, 10);
}

function formatDay(day: string, language: string): string {
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The day chip label, split so the strip can drop the weekday on mobile.
 *
 * The mock writes "Sat 30" -- weekday first -- but no locale produces that order
 * from a {weekday, day} skeleton: CLDR orders that pattern day-first in en-US
 * ("29 Sat") and interleaves a literal in zh-CN ("29日周六"). So the two fields are
 * formatted separately and composed here. Returned as parts rather than one string
 * because the 390px frame shows the number alone.
 */
function formatChip(day: string, language: string): { weekday: string; day: string } {
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { weekday: "", day };
  const locale = language === "zh" ? "zh-CN" : "en-US";
  // The day part only, without the locale's own suffix: zh-CN formats a numeric day
  // as "29日", which reads redundantly beside the weekday and is wider than the bare
  // number the mock's 390px strip shows, where the weekday is dropped entirely.
  const dayPart = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" })
    .formatToParts(parsed)
    .find((part) => part.type === "day")?.value;
  return {
    weekday: parsed.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }),
    day: dayPart || String(parsed.getUTCDate()),
  };
}

/** "Aug 24–30", or "Aug 31 – Sep 6" when the ISO week straddles two months. */
function weekRange(weekId: string, language: string): string {
  const match = weekId.match(/^(\d{4})-kw(\d{2})$/);
  if (!match) return weekId;
  const [, year, week] = match;
  const jan4 = new Date(Date.UTC(Number(year), 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (Number(week) - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const from = monday.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `${from}–${sunday.toLocaleDateString(locale, { day: "numeric", timeZone: "UTC" })}`;
  }
  return `${from} – ${sunday.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

function formatTime(item: FrontierItem, language: string): string {
  const parsed = new Date(item.published);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Full timestamp for the panel: the feed refreshes several times within a day. */
function formatStamp(value: string, language: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}, ${parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function formatClock(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

/** "5 min ago". Computed on the client only -- see the mounted guard below. */
function relativeTime(value: string, copy: Copy): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60_000));
  if (minutes < 1) return copy.ago.now;
  if (minutes < 60) return copy.ago.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return copy.ago.hours(hours);
  return copy.ago.days(Math.round(hours / 24));
}

export interface EditorialHomeProps {
  items: FrontierItem[];
  curatedIds?: Partial<Record<FrontierSection | "videos", string[]>>;
  throughlines?: Partial<Record<FrontierSection, Throughline>>;
  dailyThroughlines?: Record<string, Partial<Record<FrontierSection, Throughline>>>;
  updatedAt?: string;
}

function selectItems(candidates: FrontierItem[], ids: string[] | undefined, limit: number): FrontierItem[] {
  if (ids === undefined) return candidates.slice(0, limit);
  const byId = new Map(candidates.map((item) => [item.id, item]));
  const selected = (ids || []).map((id) => byId.get(id)).filter((item): item is FrontierItem => Boolean(item));
  return selected.slice(0, limit);
}

// Per section, not per page: tech carries the bulk of the feed while tips and
// investment hold a couple. Matches the reference feed's video_output_count.
// A cap, not a floor: a day holding one video renders one, a day holding none
// renders none.
const VIDEOS_PER_SECTION = 2;

// A day's videos should be that day's. Videos publish on a slower cadence than
// the text feeds, so a day with none would show no video at all; this window is
// how far back that fallback may reach, and same-day videos always outrank it.
// At the previous 7 days the fallback was wide enough that two videos from Aug
// 19-20 won every day's rail for the four days that followed.
const VIDEO_WINDOW_DAYS = 2;

// Deck length shown under a headline. Measured against the reference feed, whose
// items run 181-439 characters (median 299); the raw summaries here reach 23k, so
// the cap is what keeps rows scannable. Kept equal to SUMMARY_MAX in
// scripts/enrich.py, the widest rewrite it accepts.
const STORY_DECK_LIMIT = 320;

// Rows in the idle day view, videos included. The reference feed ships 11-12 a
// day; ours held 24, whose back half sat inside a 3-5 point score band -- volume
// the ranking could not order. Filtering bypasses this.
const DAY_VIEW_LIMIT = 12;

// Where the tiers change. The mock draws one lead, then standard rows, then a
// "MORE TODAY" rule and a compact tail; these are the two boundaries.
const STANDARD_UNTIL = 3;

/** Days between two YYYY-MM-DD strings, or Infinity when either is unusable. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(b - a) / 86_400_000;
}

/** Rank on the same axis as articles: `score` already folds in video reach. */
function importance(item: FrontierItem): number {
  return typeof item.score === "number" ? item.score : 0;
}

// Videos used to be sorted into the article stream by score, but the two are not
// comparable: most article feeds carry no points or comments, so an article scores
// 0 for popularity while a video earns up to 25 from its view count. Videos
// therefore won the top slots systematically -- measured on the live zh page, the
// story ordinals began at 03 because positions 01 and 02 were both video.
//
// Fixed interspersion is what the reference feed does (DataCube:
// intersperse_videos(interval=5, start=3)). It guarantees an article lead, keeps
// videos discoverable at a predictable rhythm, and generalizes as the video count
// grows instead of depending on how a view count compares to a points count.
const VIDEO_START_POSITION = 3;
const VIDEO_INTERVAL = 5;

function intersperseVideos(posts: FrontierItem[], videos: FrontierItem[]): FrontierItem[] {
  if (!videos.length) return posts;
  const merged = [...posts];
  videos.forEach((video, n) => {
    const position = VIDEO_START_POSITION - 1 + n * VIDEO_INTERVAL;
    // Past the end of a short day, append rather than drop.
    if (position >= merged.length) merged.push(video);
    else merged.splice(position, 0, video);
  });
  return merged;
}

// arXiv alone supplies 46 of 300 items on a measured day, and Techmeme 35, so an
// uncapped pass fills the visible rows with two feeds. Deferred items are appended
// afterwards, so the cap reorders the page without dropping anything.
const SOURCE_CAP = 4;

function diversifyBySource(items: FrontierItem[], limit: number): FrontierItem[] {
  const counts = new Map<string, number>();
  const selected: FrontierItem[] = [];
  const deferred: FrontierItem[] = [];
  for (const item of items) {
    const source = item.source || item.source_name || "unknown";
    if ((counts.get(source) || 0) < SOURCE_CAP && selected.length < limit) {
      selected.push(item);
      counts.set(source, (counts.get(source) || 0) + 1);
    } else {
      deferred.push(item);
    }
  }
  for (const item of deferred) {
    if (selected.length >= limit) break;
    selected.push(item);
  }
  return selected;
}

type Tier = "lead" | "standard" | "brief" | "video";

function tierFor(item: FrontierItem, index: number): Tier {
  if (item.is_video) return "video";
  if (index === 0) return "lead";
  return index < STANDARD_UNTIL ? "standard" : "brief";
}

export default function EditorialHome({
  items,
  curatedIds = {},
  dailyThroughlines = {},
  updatedAt,
}: EditorialHomeProps) {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const copy = copyFor(language);

  const [section, setSection] = useState<FrontierSection>("tech");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<FrontierItem | null>(null);
  // Relative timestamps and anything else that reads the clock must wait for the
  // client: rendering "5 min ago" on the server produces different text than the
  // hydration pass and React discards the whole tree over it.
  const [mounted, setMounted] = useState(false);

  // Section and day live in the query string so a section view or a specific day
  // can be linked and reloaded. Read after mount rather than during render --
  // useSearchParams would force this component into a Suspense boundary, and the
  // server has no business rendering a client-chosen filter.
  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("section");
    if (wanted && (SECTIONS as string[]).includes(wanted)) setSection(wanted as FrontierSection);
    const day = params.get("day");
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) setActiveDay(day);
    const tag = params.get("tag");
    if (tag) setActiveTags([tag]);
    const q = params.get("q");
    if (q) setQuery(q);
  }, []);

  const curated = useMemo(() => {
    const articles = items.filter((item) => !item.is_video);
    const tech = selectItems(articles.filter((item) => (item.section || "tech") === "tech"), curatedIds.tech, 10);
    const investment = selectItems(articles.filter((item) => item.section === "investment"), curatedIds.investment, 5);
    const tips = selectItems(articles.filter((item) => item.section === "tips"), curatedIds.tips, 5);
    const policy = selectItems(articles.filter((item) => item.section === "policy"), curatedIds.policy, 4);
    // Videos carry their own section; route them there instead of piling every
    // one into tech. Curated ids stay authoritative when enrich.py supplied any.
    const videosFor = (name: FrontierSection, limit: number) => {
      const pool = items
        .filter((item) => item.is_video && (item.section || "tech") === name)
        .sort((a, b) => importance(b) - importance(a));
      // enrich.py curates only a couple of videos overall, so treat that list as
      // priority rather than as the whole set: lead with the curated ones, then
      // top up by score. Filtering to the curated ids alone left a section showing
      // one video when four were available.
      const curatedForSection = (curatedIds.videos || [])
        .map((id) => pool.find((item) => item.id === id))
        .filter((item): item is FrontierItem => Boolean(item));
      const chosen = [...curatedForSection];
      for (const item of pool) {
        if (chosen.length >= limit) break;
        if (!chosen.some((picked) => picked.id === item.id)) chosen.push(item);
      }
      return chosen.slice(0, limit);
    };
    return {
      tech: intersperseVideos(tech, videosFor("tech", VIDEOS_PER_SECTION)),
      investment: intersperseVideos(investment, videosFor("investment", VIDEOS_PER_SECTION)),
      tips: intersperseVideos(tips, videosFor("tips", VIDEOS_PER_SECTION)),
      policy: intersperseVideos(policy, videosFor("policy", VIDEOS_PER_SECTION)),
    };
  }, [items, curatedIds]);

  const sectionItems = curated[section];

  // The date strip describes the published stream, not only the small global
  // selection shown before a date is chosen. Keep the full section available so
  // selecting a day cannot make a busy day look empty.
  const allSectionItems = useMemo(() => {
    // Videos belong to the published stream as well; excluding them here made
    // them vanish as soon as a date was selected.
    const inSection = items.filter((item) => (item.section || "tech") === section);
    return intersperseVideos(
      inSection.filter((item) => !item.is_video),
      inSection.filter((item) => item.is_video),
    );
  }, [items, section]);

  const sourceCount = useMemo(
    () => new Set(items.map((item) => item.source).filter(Boolean)).size,
    [items],
  );

  // Day counts come from the section, not the whole file, so the strip never
  // offers a day that would return an empty feed for the section you are in.
  const days = useMemo(() => {
    const tally = new Map<string, number>();
    // Count articles only. Videos surface across a window rather than on one day,
    // so counting them here would not match what the day actually shows.
    for (const item of allSectionItems.filter((item) => !item.is_video)) {
      const day = dayOf(item);
      if (day) tally.set(day, (tally.get(day) || 0) + 1);
    }
    // Keep the week rail chronological so Monday is the first entry. The
    // selected-day fallback below still opens the newest published day.
    return [...tally.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  }, [allSectionItems]);

  // The strip is headed by the ISO week the days belong to, the hierarchy the
  // reference feed uses. Derived from the days themselves rather than read from
  // weeks.json so the strip keeps its invariant: it only ever offers a day the
  // current section actually has articles for.
  const weekLabel = useMemo(() => {
    const weekId = days.length ? getParentWeekId(days[0][0]) : null;
    if (!weekId) return "";
    const newestWeek = getParentWeekId(new Date().toISOString().slice(0, 10));
    const prefix = weekId === newestWeek ? copy.thisWeek : weekRange(weekId, language);
    return weekId === newestWeek ? `${prefix} · ${weekRange(weekId, language)}` : prefix;
  }, [days, copy, language]);

  // The mock dims its thinnest day. Applied by measurement: a day is quiet when
  // it holds under a third of what the busiest day in the strip holds.
  const quietBelow = useMemo(() => {
    const busiest = Math.max(0, ...days.map(([, count]) => count));
    return busiest / 3;
  }, [days]);

  const selectedDay = useMemo(() => {
    if (activeDay && days.some(([day]) => day === activeDay)) return activeDay;
    // Always the newest day the section has. This used to skip to the newest day
    // that could fill the view, which reads as a stale site: on 2026-08-23 the
    // newest day held 7 tech articles and the page opened on 08-22 instead. A
    // short newest day is the honest state of a stream that is still filling.
    return days[days.length - 1]?.[0] || null;
  }, [activeDay, days]);

  // Everything the selected day holds, ranked. Filtering runs against this, not
  // against the trimmed view: the day feed used to be cut to 20 articles before
  // the search box saw it, so on an 89-article day a query silently missed 69 of
  // them. The cut belongs to the idle view only.
  const dateItems = useMemo(() => {
    if (!selectedDay) return sectionItems;
    const articles = allSectionItems.filter(
      (item) => !item.is_video && dayOf(item) === selectedDay,
    );
    // Same-day first, then the nearest older day, and only within each of those
    // by score. Ranking the whole window by score alone let a high-scoring video
    // from days ago outrank the section's own video for the selected day.
    const videos = allSectionItems
      .filter((item) => item.is_video && daysBetween(dayOf(item), selectedDay) <= VIDEO_WINDOW_DAYS)
      .sort(
        (a, b) =>
          daysBetween(dayOf(a), selectedDay) - daysBetween(dayOf(b), selectedDay) ||
          importance(b) - importance(a),
      )
      .slice(0, VIDEOS_PER_SECTION);
    // A row with no deck, or with a repo path where its headline goes, reads as
    // broken next to finished ones -- measured 2026-08-21: "AI companies destroy
    // physical books" scored second in the section on a Hacker News link post that
    // carries no body at all, so it took slot 02 with nothing under it. Nothing is
    // hidden and score order holds inside each group; the unfinished rows simply
    // stop outranking the finished ones while they wait for enrich.
    const ready = articles.filter((item) => isPresentable(item, language));
    const waiting = articles.filter((item) => !isPresentable(item, language));
    return intersperseVideos(
      diversifyBySource([...ready, ...waiting], articles.length),
      videos,
    );
  }, [allSectionItems, sectionItems, selectedDay, language]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = dateItems.filter((item) => {
      if (activeTags.length && !activeTags.every((tag) => tagMatches(item, tag))) return false;
      if (!needle) return true;
      const haystack = `${text(item, language, "title")} ${text(item, language, "summary")} ${item.source_name}`;
      return haystack.toLowerCase().includes(needle);
    });
    // A filtered view is a deliberate search: show every match. The idle view is a
    // front page, so it stops where score stops discriminating -- measured on
    // three days, positions 13+ land inside a 3-5 point band and read as filler.
    if (needle || activeTags.length) return matched;
    return matched.slice(0, DAY_VIEW_LIMIT);
  }, [dateItems, activeTags, query, language]);

  const filtering = activeTags.length > 0 || query.trim() !== "";
  const dailyThru = selectedDay ? dailyThroughlines[selectedDay]?.[section] : undefined;
  const summaryText = (language === "zh" ? dailyThru?.zh : dailyThru?.en)?.trim() || "";
  const summarySources = (dailyThru?.supporting_ids || [])
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is FrontierItem => Boolean(item?.url))
    .slice(0, 3);

  const selectedIndex = selected ? visible.findIndex((item) => item.id === selected.id) : -1;

  const step = useCallback(
    (delta: number) => {
      if (selectedIndex < 0 || !visible.length) return;
      const next = visible[selectedIndex + delta];
      if (next) setSelected(next);
    },
    [selectedIndex, visible],
  );

  // Esc, J/K and the arrows, plus a scroll lock so the feed behind the panel does
  // not move under it. Bound only while a panel is open.
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        return;
      }
      const key = event.key.toLowerCase();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        step(1);
      }
      if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        step(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [selected, step]);

  // "/" focuses search, the shortcut the top bar advertises. Ignored while typing
  // in a field, and while a panel owns the keyboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || selected) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      setSearchOpen(true);
      document.getElementById("f-search")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  // Close the language menu on an outside click, the behaviour a popover owes.
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement)?.closest(".f-langmenu")) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [langOpen]);

  // Keep the query string in step with the filters, without a navigation: the
  // list is client-rendered and reacts immediately, and replaceState keeps a
  // refresh or a copied link on the same view (DESIGN_SPEC section 2).
  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    set("section", section === "tech" ? "" : section);
    set("day", activeDay && activeDay !== days[0]?.[0] ? activeDay : "");
    set("tag", activeTags[0] || "");
    set("q", query.trim());
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [mounted, section, activeDay, activeTags, query, days]);

  const clearAll = () => {
    setActiveTags([]);
    setQuery("");
  };

  const localized = (path: string) => `/${language}${path}`;

  /** One feed row. Four tiers share this shell so the ordinals stay in one
   *  optical column; only type sizes and the thumbnail change between them. */
  const row = (item: FrontierItem, order: number, tier: Tier) => {
    const title = headline(text(item, language, "title"));
    const summary = deck(text(item, language, "summary"), STORY_DECK_LIMIT);
    const coverage = item.event_sources?.length || 0;
    // The design carries tags and the expand affordance in the lead row only, and
    // gives every other tier a plain mono meta line. Repeating them down the list
    // added ~30px to each row and cost the feed the density the mock is built on.
    // One tag, per DESIGN_SPEC section 1 ("标签 ≤1个中文词/英文词") and the mock,
    // which carries exactly one tag anchor in the whole desktop feed.
    const tags = tier === "lead" ? tagsFor(item, language).slice(0, 1) : [];
    // The brief tier starts at its headline: no kicker in the design, because the
    // whole point of the More Today block is a compact tail.
    const showKicker = tier !== "brief";
    const open = () => setSelected(item);
    const body = (
      <div className="f-it-body">
        {showKicker && (
          <div className="f-it-kick">
            <span className="f-type">{storyType(item, language)}</span>
            {tier === "video" ? (
              item.video_view_count && <span className="f-tier">{item.video_view_count} views</span>
            ) : (
              <span className="f-tier">{sourceTier(item, language)}</span>
            )}
            {/* Only for N > 1: "×1 source" is noise (DESIGN_SPEC section 5). */}
            {coverage > 1 && <span className="f-multi">{copy.sources(coverage)}</span>}
          </div>
        )}
        {/* A real anchor to the source, so the outbound link is in the DOM for
            crawlers and middle-click, with the plain click intercepted to open the
            panel instead of navigating away. */}
        <a
          className="f-it-h-btn"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            open();
          }}
        >
          {/* h3 at every tier, where the mock draws the brief rows as h4. The two are
              the same 15px here, so the tag only carries outline meaning -- and an h4
              would sit a level under the standard row above it, telling a screen
              reader a brief is a subsection of that story. Every row is a sibling item
              in one day's list; MORE TODAY is a label, not a heading. */}
          <h3 className="f-it-h">{title}</h3>
        </a>
        {summary && <p className="f-it-deck">{summary}</p>}
        {tier === "lead" ? (
          <div className="f-it-foot">
            <span className="f-meta">
              {item.is_video ? videoPlatform(item) : item.source_name} · {formatTime(item, language)}
            </span>
            {tags.map((tag) => (
              <Link
                key={tag}
                className="f-tag"
                href={localized(`/tag/${toTopicSlug(tag)}`)}
                onClick={(event) => event.stopPropagation()}
              >
                #{tag}
              </Link>
            ))}
            <span className="f-expand">{copy.expand} →</span>
          </div>
        ) : (
          <span className="f-meta">
            {item.is_video ? videoPlatform(item) : item.source_name} · {formatTime(item, language)}
          </span>
        )}
      </div>
    );

    return (
      <article
        key={item.id}
        className={`f-it is-${tier}`}
        onClick={(event) => {
          // The headline anchor and the tag links handle their own clicks; this is
          // the rest of the row, which the design makes one hit area.
          if ((event.target as HTMLElement).closest("a")) return;
          open();
        }}
      >
        <span className="f-ord" aria-hidden="true">
          {String(order).padStart(2, "0")}
        </span>
        {tier === "video" ? (
          <div className="f-it-video">
            <div className="f-thumb">
              {item.video_thumbnail_url && (
                /* eslint-disable-next-line @next/next/no-img-element --
                   a fixed 180x101 still from a host the CSP already allows; the
                   loader would add a request hop and a layout pass for no gain. */
                <img src={item.video_thumbnail_url} alt="" loading="lazy" decoding="async" />
              )}
              <span className="f-thumb-play" aria-hidden="true" />
              {item.video_duration && <span className="f-thumb-dur">{item.video_duration}</span>}
            </div>
            {body}
          </div>
        ) : (
          body
        )}
      </article>
    );
  };

  const summaryHeading =
    selectedDay && selectedDay === days[0]?.[0]
      ? copy.todaySummary
      : selectedDay
        ? copy.daySummary(formatDay(selectedDay, language))
        : copy.todaySummary;

  // The tail starts at the first row the brief tier owns. Videos keep their own
  // tier wherever they land, so the boundary is found by tier rather than by a
  // fixed index -- an interspersed video at position 3 would otherwise push the
  // rule one row late.
  const rows = visible.map((item, index) => ({ item, order: index + 1, tier: tierFor(item, index) }));
  const firstBrief = rows.findIndex((entry) => entry.tier === "brief");

  return (
    <div className="f-page">
      <a className="sr-only focus:not-sr-only" href="#f-feed">
        {copy.skip}
      </a>

      <div className="f-paper f-paper-home">
        <header className="f-top">
          <h1 className="f-wordmark">Frontier</h1>
          <span className="f-kicker">{copy.kicker}</span>
          <div className="f-top-sp" />

          {/* A label, not a div: the drawn control is the whole 220x33 box, so a click
              on its padding or on the magnifier should focus the field. As a div only
              the 17.5px input itself was clickable, which is both surprising and under
              the 24px target minimum in WCAG 2.2 SC 2.5.8. */}
          <label className="f-srch" htmlFor="f-search">
            <Search aria-hidden="true" />
            <input
              id="f-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
            />
            {!query && <span className="f-kbd" aria-hidden="true">/</span>}
          </label>
          <button
            type="button"
            className="f-srch-btn"
            onClick={() => {
              setSearchOpen((open) => !open);
              requestAnimationFrame(() => document.getElementById("f-search-m")?.focus());
            }}
            aria-expanded={searchOpen}
            aria-label={copy.searchLabel}
          >
            <Search aria-hidden="true" />
          </button>

          {/* Globe plus the current language, kept as a list rather than a toggle
              so more languages can join without the control changing shape. */}
          <div className="f-langmenu">
            <button
              type="button"
              className="f-lang"
              onClick={() => setLangOpen((open) => !open)}
              aria-expanded={langOpen}
              aria-haspopup="menu"
              aria-label={copy.language}
            >
              <Globe aria-hidden="true" />
              {language === "zh" ? "中文" : "EN"}
            </button>
            {langOpen && (
              <div className="f-langpop" role="menu">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setLangOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {language === option.code && <Check aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="f-theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={copy.theme}
          >
            {mounted && (theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />)}
          </button>
        </header>

        {searchOpen && (
          <div className="f-msrch">
            <div className="f-srch">
              <Search aria-hidden="true" />
              <input
                id="f-search-m"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.search}
                aria-label={copy.search}
              />
            </div>
          </div>
        )}

        {days.length > 0 && (
          <div className="f-days">
            <div className="f-days-head">
              <span className="f-label">{weekLabel}</span>
              <span className="f-rule" />
              <Link className="f-days-more" href={localized("/archive")}>
                {copy.fullArchive} →
              </Link>
            </div>
            <div className="f-days-row" role="group" aria-label={copy.dayNav}>
              {days.map(([day, count]) => {
                const chip = formatChip(day, language);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`f-day${count < quietBelow ? " is-quiet" : ""}`}
                    aria-pressed={selectedDay === day}
                    onClick={() => setActiveDay(day)}
                  >
                    <span className="f-day-w">{chip.weekday}</span>{" "}
                    <span className="f-day-d">{chip.day}</span>{" "}
                    <span className="f-day-n">· {count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Never hidden when the text is missing: the card holds a skeleton so the
            page does not reflow when the summary lands (DESIGN_SPEC section 3). */}
        {selectedDay && (
          <div className="f-brief">
            <div className="f-brief-head">
              <h2 className="f-brief-h">{summaryHeading}</h2>
            </div>
            {summaryText ? (
              <>
                {/* emOnly() escapes the string and re-allows only <em>, so the accent
                    underline works without trusting the data file. */}
                <p className="f-brief-p" dangerouslySetInnerHTML={{ __html: emOnly(summaryText) }} />
                {summarySources.length > 0 && (
                  <div className="f-brief-sources" aria-label={copy.briefingSources}>
                    <span>{copy.briefingSources}</span>
                    {summarySources.map((item, index) => (
                      <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                        {index + 1}. {item.source_name || text(item, language, "title")}
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="f-brief-skel" aria-label={copy.summaryPending}>
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        )}

        {/* Below the summary, not above it. The design note on this frame is explicit
            that the summary does not re-render per section -- switching a tab filters
            the list underneath and the summary still describes the whole day. Placing
            it above the tabs is what says that: a heading the tabs sit under cannot be
            read as belonging to the selected one. */}
        <nav className="f-tabs" aria-label={copy.sectionNav}>
          {SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              className="f-tab"
              aria-current={section === id}
              onClick={() => {
                setSection(id);
                // The day strip is section-scoped, so a day chosen in one section
                // may not exist in the next; fall back to that section's newest.
                setActiveDay(null);
              }}
            >
              {copy.sections[id]}
            </button>
          ))}
        </nav>

        {/* Filter results are announced rather than silently swapped, so a screen
            reader learns the count changed without moving focus. */}
        <p className="sr-only" role="status" aria-live="polite">
          {copy.showing(visible.length)}
        </p>

        <div id="f-feed">
          {rows.length === 0 ? (
            <div className="f-empty">
              <p className="f-empty-t">{filtering ? copy.emptySearchTitle : copy.emptyTitle}</p>
              <p className="f-empty-d">{filtering ? copy.emptySearchDeck : copy.emptyDeck}</p>
              {filtering && (
                <button type="button" className="f-empty-b" onClick={clearAll}>
                  {copy.emptyAction}
                </button>
              )}
            </div>
          ) : (
            /* A Fragment, not a wrapper div: the rows have to be real siblings
               for .f-it.is-brief:last-child to single out the row that closes the
               group. Wrapped, every brief row was its own last child and they all
               took the heavy rule instead of the mock's lighter hairline. */
            rows.map((entry, index) => (
              <Fragment key={entry.item.id}>
                {index === firstBrief && index > 0 && (
                  <div className="f-more">
                    <span className="f-label">{copy.moreToday}</span>
                    <span className="f-rule" />
                  </div>
                )}
                {row(entry.item, entry.order, entry.tier)}
              </Fragment>
            ))
          )}
        </div>

        <footer className="f-foot">
          <span>{copy.footItems(items.length, sourceCount)}</span>
          <span className="f-foot-r">
            {/* Relative time only after mount: the server and the client would
                compute different strings and React would discard the tree. */}
            {updatedAt && mounted && <span>{copy.updated(relativeTime(updatedAt, copy))}</span>}
          </span>
        </footer>
      </div>

      {selected && (
        <DetailPanel
          item={selected}
          language={language}
          copy={copy}
          onClose={() => setSelected(null)}
          onStep={step}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < visible.length - 1}
          localized={localized}
        />
      )}
    </div>
  );
}

interface DetailPanelProps {
  item: FrontierItem;
  language: string;
  copy: Copy;
  onClose: () => void;
  onStep: (delta: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
  localized: (path: string) => string;
}

/**
 * The item surface: opens over the feed, never navigates.
 *
 * Article and video share one structure -- head, body, footer -- so the operating
 * habit transfers between them; the video variant swaps the metadata line for a
 * 16:9 player above the headline (DESIGN_SPEC section 2).
 */
function DetailPanel({
  item,
  language,
  copy,
  onClose,
  onStep,
  hasPrev,
  hasNext,
  localized,
}: DetailPanelProps) {
  const [playing, setPlaying] = useState(false);
  const isVideo = Boolean(item.is_video && item.video_id);
  const title = headline(text(item, language, "title"));
  const summary = text(item, language, "summary").trim();
  const coverage = item.event_sources || [];
  const tags = tagsFor(item, language);

  // Each item gets its own player state and its own scroll position: stepping
  // with J/K must not inherit the previous item's playback or scroll offset
  // (DESIGN_SPEC section 2).
  useEffect(() => {
    setPlaying(false);
  }, [item.id]);

  // Focus moves into the panel when it opens, so Tab continues inside it and a
  // screen reader announces the dialog rather than staying on the row behind.
  const onPanelMount = useCallback((node: HTMLElement | null) => {
    node?.focus();
  }, []);

  return (
    <div
      className="f-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`f-panel${isVideo ? " is-video" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={onPanelMount}
      >
        {/* Touch-only drag handle; CSS hides it above the sheet breakpoint. */}
        <div className="f-grip" aria-hidden="true">
          <span />
        </div>

        <div className="f-panel-head">
          <span className={`f-panel-type${isVideo ? " is-video" : ""}`}>{storyType(item, language)}</span>
          <span className="f-panel-src">
            · {isVideo ? videoPlatform(item) : sourceTier(item, language)}
          </span>
          <span className="f-panel-keys">
            <span className="f-key" aria-hidden="true">J</span>
            <span className="f-key" aria-hidden="true">K</span>
            <button type="button" className="f-panel-x" onClick={onClose} aria-label={copy.close}>
              <X aria-hidden="true" />
            </button>
          </span>
        </div>

        {/* Keyed on the item so stepping remounts the scroller at the top. */}
        <div className="f-panel-body" key={item.id}>
          {isVideo && (
            <div className="f-panel-player">
              {playing ? (
                /* youtube-nocookie: no cookies until the reader interacts. */
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${item.video_id}?autoplay=1&rel=0`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="f-panel-player-btn"
                  onClick={() => setPlaying(true)}
                  aria-label={title}
                >
                  {item.video_thumbnail_url && (
                    /* eslint-disable-next-line @next/next/no-img-element -- see the
                       feed thumbnail above; same host, same reasoning. */
                    <img src={item.video_thumbnail_url} alt="" />
                  )}
                  <span aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <h2 className="f-panel-h">{title}</h2>
          <div className="f-panel-meta">
            {/* The design's video meta row reads "YouTube · 82k views", so the
                platform and the view count share one field; an article keeps
                source and category. */}
            <span>
              {isVideo ? videoPlatform(item) : item.source_name}
              {isVideo
                ? item.video_view_count
                  ? ` · ${item.video_view_count} views`
                  : ""
                : item.category
                  ? ` · ${item.category}`
                  : ""}
            </span>
            {isVideo && item.video_duration && <span>{item.video_duration}</span>}
            {/* Date only on a video, full stamp on an article -- the design's two
                panels differ here ("Aug 30" against "Aug 30, 09:30 UTC"). A video's
                publish minute carries no news value, and the row already spends a
                field on the duration. */}
            <span>
              {isVideo
                ? formatDay(dayOf(item), language)
                : formatStamp(item.published, language)}
            </span>
          </div>

          <div className="f-panel-sum">
            <div className="f-panel-sum-l">{copy.aiSummary}</div>
            {summary ? (
              <p>{summary}</p>
            ) : (
              <div className="f-panel-skel" aria-label={copy.summaryPending}>
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {/* Only for a real cluster: one source is the row's own byline, already
              printed above (DESIGN_SPEC section 5). */}
          {coverage.length > 1 && (
            <div className="f-cov">
              <div className="f-cov-l">{copy.coverage(coverage.length)}</div>
              <div className="f-cov-list">
                {coverage.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{source.source_name}</span>
                    {source.published && <span className="f-cov-t">{formatClock(source.published)}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="f-panel-tags">
              {tags.map((tag) => (
                <Link key={tag} href={localized(`/tag/${toTopicSlug(tag)}`)}>
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="f-panel-foot">
          <a className="f-panel-go" href={item.url} target="_blank" rel="noopener noreferrer">
            {isVideo ? copy.watchOn(videoPlatform(item)) : copy.readOn(item.source_name)}
          </a>
          <button
            type="button"
            className="f-panel-nav"
            onClick={() => onStep(-1)}
            disabled={!hasPrev}
            aria-label={copy.prev}
          >
            <ChevronUp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="f-panel-nav"
            onClick={() => onStep(1)}
            disabled={!hasNext}
            aria-label={copy.next}
          >
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
