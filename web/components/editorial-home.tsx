"use client";

import { useMemo, useState } from "react";
import { Search, Sun, Moon, Check, Globe, X } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { FrontierMark } from "@/components/frontier-mark";
import { VideoEmbed } from "@/components/video-embed";
import type { FrontierItem, FrontierSection, Throughline } from "@/lib/frontier-adapter";
import { getParentWeekId, getPeriodLabel } from "@/lib/period-utils";

const SECTIONS: FrontierSection[] = ["tech", "investment", "tips"];

const LANGUAGES = [
  { code: "en" as const, label: "English" },
  { code: "zh" as const, label: "中文" },
];

/* Copy notes, because several obvious phrasings are factually wrong here:
   - No "issue"/"第 N 期". The three collect workflows run every 30 minutes, every
     6 hours and once a day, so this is a continuously updated stream. The mock's
     "Issue 33 · Aug 17–23" was hardcoded sample text in a layout study.
   - No "daily"/"每日" either: the file is refreshed through the day, but the items
     inside it span ~25 days because feeds carry backlog, and the day strip shows
     that. Claiming a single day contradicts what is on screen.
   - The throughline signature says AI-generated. It is model output, so an
     editorial byline would be a lie about who wrote it. */
const COPY = {
  en: {
    kicker: "AI industry intelligence",
    updated: (when: string) => `Updated ${when}`,
    sections: { tech: "Technology", investment: "Capital", tips: "Practice" },
    decks: {
      tech: "Models, research and releases",
      investment: "Funding, acquisitions and markets",
      tips: "Things you can apply today",
    },
    items: "items",
    video: "Video",
    throughline: (day?: string, latest = false) => latest ? "Today's summary" : day ? `Summary · ${day}` : "Summary",
    signature: (n: number) => `AI-generated · based on ${n} items in this section`,
    dayBriefing: "Automatic date overview · AI summary pending",
    search: "Search all items",
    days: "By date",
    sectionNav: "Sections",
    railNav: "Tools and filters",
    activeFilters: "Active filters",
    clear: "Clear",
    emptyTitle: "No matches",
    emptyDeck: "Try another keyword, or clear the filters.",
    emptyAction: "Clear filters",
    theme: "Toggle theme",
    language: "Language",
    search_: "Search",
    skip: "Skip to content",
    showing: (n: number) => `${n} item${n === 1 ? "" : "s"} showing`,
    footer: (items: number, sources: number) => `${items} items · ${sources} sources`,
    disclosure: "Summaries and translations are AI-generated",
    combinedSources: (n: number) => `Combined from ${n} sources`,
  },
  zh: {
    kicker: "AI 行业情报",
    updated: (when: string) => `更新于 ${when}`,
    sections: { tech: "技术", investment: "资本动向", tips: "实用方法" },
    decks: {
      tech: "模型、研究与工程进展",
      investment: "融资、并购与市场动向",
      tips: "可直接上手的做法",
    },
    items: "条",
    video: "视频",
    throughline: (day?: string, latest = false) => latest ? "今日总结" : day ? `${day}总结` : "总结",
    signature: (n: number) => `AI 生成 · 基于本栏 ${n} 条内容`,
    dayBriefing: "日期概览 · AI 摘要待生成",
    search: "搜索全部内容",
    days: "按日期",
    sectionNav: "栏目",
    railNav: "工具与筛选",
    activeFilters: "正在筛选",
    clear: "清空",
    emptyTitle: "没有匹配的内容",
    emptyDeck: "试着换个关键词，或清空筛选条件。",
    emptyAction: "清空筛选",
    theme: "切换明暗",
    language: "语言",
    search_: "搜索",
    skip: "跳到正文",
    showing: (n: number) => `${n} 条内容`,
    footer: (items: number, sources: number) => `${items} 条 · ${sources} 个信源`,
    disclosure: "摘要与译文由 AI 生成",
    combinedSources: (n: number) => `综合 ${n} 个来源`,
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

/** Both tag languages, for matching a filter against.
 *
 * The filter holds whatever string the button showed, and the language toggle is
 * client state rather than a route change -- the component does not remount. So
 * matching only the reading language would silently empty the page when a reader
 * switches language with a tag active. Matching either list keeps the filter
 * working across the switch. */
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

/** Drop the aggregator byline and one trailing sentence period from a headline.
 *
 * Translation returns full sentences, so 5 of 228 Chinese titles and 2 of 229
 * English ones arrive ending in 。or . — a headline does not take one. Only the
 * final mark goes: some titles legitimately contain internal sentence breaks
 * ("Databricks wanted $1B. Investors wanted $15B. ..."), and "?" and "!" carry
 * meaning a headline needs to keep. */
function headline(value: string): string {
  return value.replace(TRAILING_BYLINE_RE, "").replace(/[。.]\s*$/, "").trim();
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
 * The throughline is model-written and arrives inside a JSON file served from
 * the data branch, so it is untrusted input no matter what the generator
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
  return (item.published || "").slice(0, 10);
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

function formatTime(item: FrontierItem, language: string): string {
  const parsed = new Date(item.published);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Date plus time, since the feed can refresh several times within one day. */
function formatUpdated(value: string, language: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
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
// investment hold a couple. Replaces a hard-coded 2 that capped the whole
// homepage regardless of how many videos the day produced.
//
// Matches the reference feed's video_output_count. Held here rather than higher
// because a video row is not a row-sized object: its thumbnail is 680px wide at
// 16:9, so from the CSS the row stands roughly 500px against roughly 150px for a
// text story. At 3 a day with three videos available would give them under a
// quarter of the rows but about half the scroll, and on a narrow viewport the
// thumbnail goes full width, which widens that gap further.
//
// This is a cap, not a floor: the live page renders 2 today because only 2 videos
// fall inside VIDEO_WINDOW_DAYS for the section, so slice(0, 3) never reached 3.
// The change is a no-op on such days by design.
const VIDEOS_PER_SECTION = 2;

// Videos publish on a slower cadence than the text feeds: a given day often
// holds 50+ articles and zero videos. Matching them to the selected day exactly
// therefore hid the whole video set. They stay eligible across the rail's own
// 7-day span instead, ranked against that day's articles by importance.
const VIDEO_WINDOW_DAYS = 7;

// Summary length shown under a headline. Measured against the reference feed,
// whose items run 181-439 characters (median 299); the raw summaries here reach
// 23k, so the cap is what keeps rows scannable.
//
// Kept equal to SUMMARY_MAX in scripts/enrich.py, which is the widest rewrite it
// accepts. deck() cuts on a character count, not a word boundary, so anything
// enrich passes through would otherwise end mid-word here -- the exact defect
// the rewrite exists to remove. Items still carrying raw feed prose get cut, as
// they did before.
const STORY_DECK_LIMIT = 320;

// Rows in the idle day view, videos included. The reference feed ships 11-12 a
// day; ours held 24, whose back half sat inside a 3-5 point score band -- volume
// the ranking could not order, below a design that gives one lead and three
// standard rows (see TIER_* in core/scoring.py). 12 keeps the tail that still
// differentiates and drops the part that did not. Filtering bypasses this.
const DAY_VIEW_LIMIT = 12;

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

/**
 * Merge videos into a section by importance rather than at fixed slots.
 *
 * Videos used to be spliced into positions 2 and 7 regardless of how strong
 * they were, which both capped the set at two and decoupled placement from
 * editorial weight.
 */
// Videos used to be sorted into the article stream by score, but the two are not
// comparable: most article feeds carry no points or comments, so an article scores
// 0 for popularity, while a video earns up to 25 from its view count. Videos
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

export default function EditorialHome({ items, curatedIds = {}, throughlines = {}, dailyThroughlines = {}, updatedAt }: EditorialHomeProps) {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const copy = copyFor(language);

  const [section, setSection] = useState<FrontierSection>("tech");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

  const curated = useMemo(() => {
    const articles = items.filter((item) => !item.is_video);
    const tech = selectItems(articles.filter((item) => (item.section || "tech") === "tech"), curatedIds.tech, 10);
    const investment = selectItems(articles.filter((item) => item.section === "investment"), curatedIds.investment, 5);
    const tips = selectItems(articles.filter((item) => item.section === "tips"), curatedIds.tips, 5);
    // Videos carry their own section; route them there instead of piling every
    // one into tech. Curated ids stay authoritative when enrich.py supplied any.
    const videosFor = (name: FrontierSection, limit: number) => {
      const pool = items
        .filter((item) => item.is_video && (item.section || "tech") === name)
        .sort((a, b) => importance(b) - importance(a));
      // enrich.py curates only a couple of videos overall, so treat that list
      // as priority rather than as the whole set: lead with the curated ones,
      // then top up by score. Filtering to the curated ids alone left a section
      // showing one video when four were available.
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
    };
  }, [items, curatedIds]);

  const sectionItems = curated[section];

  // The date rail describes the published stream, not only the small global
  // selection shown before a date is chosen. Keep the full section available
  // so selecting a day cannot make a busy day look empty.
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

  const counts = useMemo(() => {
    return { tech: curated.tech.length, investment: curated.investment.length, tips: curated.tips.length };
  }, [curated]);

  // Day counts come from the section, not the whole file, so the strip never
  // offers a day that would return an empty feed for the section you are in.
  const days = useMemo(() => {
    const tally = new Map<string, number>();
    // Count articles only. Videos surface across a window rather than on one
    // day, so counting them here would not match what the day actually shows.
    for (const item of allSectionItems.filter((item) => !item.is_video)) {
      const day = dayOf(item);
      if (day) tally.set(day, (tally.get(day) || 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  }, [allSectionItems]);

  // Group the day strip under its ISO week, the hierarchy the reference feed
  // uses. Weeks are derived from the days themselves rather than read from
  // weeks.json so the rail keeps its invariant: it only ever offers a day the
  // current section actually has articles for.
  const weekGroups = useMemo(() => {
    const groups: Array<{ id: string; days: Array<[string, number]>; count: number }> = [];
    for (const entry of days) {
      const weekId = getParentWeekId(entry[0]);
      if (!weekId) continue;
      const last = groups[groups.length - 1];
      if (last && last.id === weekId) {
        last.days.push(entry);
        last.count += entry[1];
      } else {
        groups.push({ id: weekId, days: [entry], count: entry[1] });
      }
    }
    return groups;
  }, [days]);

  const selectedDay = useMemo(() => {
    if (activeDay && days.some(([day]) => day === activeDay)) return activeDay;
    // The newest day accumulates through the UTC day, so shortly after midnight
    // it holds a handful of items -- 5 tech articles at 05:35 UTC when measured,
    // all of them bare repo rows. Defaulting to it put the thinnest page of the
    // week in front of anyone visiting in the European morning. Prefer the newest
    // day that can actually fill the view; padding a thin day with older items
    // was the alternative, and it produced a feed whose ranking ran 63, 58, 42,
    // 39, then back up to 75, contradicting both the score order and the date
    // label. Every view stays scoped to exactly one date this way, and the thin
    // day is still one click away in the rail.
    const full = days.find(([, count]) => count >= DAY_VIEW_LIMIT - VIDEOS_PER_SECTION);
    return (full || days[0])?.[0] || null;
  }, [activeDay, days]);

  // Everything the selected day holds, ranked. Filtering runs against this, not
  // against the trimmed view: the day feed used to be cut to 20 articles before
  // the search box saw it, so on a 89-article day a query silently missed 69 of
  // them. The cut belongs to the idle view only.
  const dateItems = useMemo(() => {
    if (!selectedDay) return sectionItems;
    const articles = allSectionItems.filter(
      (item) => !item.is_video && dayOf(item) === selectedDay,
    );
    const videos = allSectionItems
      .filter((item) => item.is_video && daysBetween(dayOf(item), selectedDay) <= VIDEO_WINDOW_DAYS)
      .sort((a, b) => importance(b) - importance(a))
      .slice(0, VIDEOS_PER_SECTION);
    return intersperseVideos(diversifyBySource(articles, articles.length), videos);
  }, [allSectionItems, sectionItems, selectedDay]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = dateItems.filter((item) => {
      if (activeTags.length && !activeTags.every((tag) => tagMatches(item, tag))) return false;
      if (!needle) return true;
      const haystack = `${text(item, language, "title")} ${text(item, language, "summary")} ${item.source_name}`;
      return haystack.toLowerCase().includes(needle);
    });
    // A filtered view is a deliberate search: show every match. The idle view is
    // a front page, so it stops where score stops discriminating -- measured on
    // three days, positions 13+ land inside a 3-5 point band and read as filler.
    if (needle || activeTags.length) return matched;
    return matched.slice(0, DAY_VIEW_LIMIT);
  }, [dateItems, activeTags, query, language]);

  const indexed = visible.map((item, index) => ({ item, order: index + 1 }));
  const filtered = activeTags.length > 0 || query.trim() !== "";
  const dailyThru = selectedDay ? dailyThroughlines[selectedDay]?.[section] : undefined;
  const thruText = language === "zh" ? dailyThru?.zh : dailyThru?.en;
  const fallbackText = selectedDay && !dailyThru
    ? language === "zh"
      ? `${selectedDay} 共收录 ${visible.length} 条${copy.sections[section]}内容，当前列表按重要性展示最值得关注的进展。`
      : `${selectedDay} includes ${visible.length} ${copy.sections[section].toLowerCase()} items, ranked here by importance.`
    : "";
  const displayedThruText = thruText || fallbackText;

  const toggleTag = (tag: string) =>
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );

  const clearAll = () => {
    setActiveTags([]);
    setActiveDay(null);
    setQuery("");
  };

  const nextTheme = theme === "dark" ? "light" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  const videoStory = (item: FrontierItem, order: number) => (
    <article className="f-it is-video" key={item.id}>
      <div className="f-video">
        <span className="f-ord f-video-ord" aria-hidden="true">
          {String(order).padStart(2, "0")}
        </span>
        <div className="f-video-body">
          <div className="f-video-kicker">
            <span>{copy.video}</span>
            {item.video_duration && <span>{item.video_duration}</span>}
            {item.video_view_count && <span>{item.video_view_count}</span>}
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="f-video-link">
            <h3 className="f-video-h">{headline(text(item, language, "title"))}</h3>
          </a>
          {item.video_id && (
            <div className="f-video-media">
              <VideoEmbed
                videoId={item.video_id}
                thumbnailUrl={item.video_thumbnail_url}
                duration={item.video_duration}
                viewCount={item.video_view_count}
                title={text(item, language, "title")}
              />
            </div>
          )}
          <p className="f-meta f-video-meta">
            {item.source_name} · {formatTime(item, language)}
          </p>
        </div>
      </div>
    </article>
  );

  const articleStory = (item: FrontierItem, order: number) => {
    const summary = deck(text(item, language, "summary"), STORY_DECK_LIMIT);
    return (
    <article className="f-it" key={item.id}>
      <div className="f-story">
        <span className="f-ord f-story-ord" aria-hidden="true">
          {String(order).padStart(2, "0")}
        </span>
        <div className="f-story-body">
          <a className="f-it-a" href={item.url} target="_blank" rel="noopener noreferrer">
            <h3 className="f-story-h">{headline(text(item, language, "title"))}</h3>
          </a>
          {summary && <p className="f-story-deck">{summary}</p>}
          <div className="f-story-foot">
            <span className="f-meta">{item.source_name} · {formatTime(item, language)}</span>
            {(item.event_sources?.length || 0) > 1 && (
              <span
                className="f-event-sources"
                title={item.event_sources?.map((source) => source.source_name).join(", ")}
              >
                {copy.combinedSources(item.event_sources?.length || 0)}
              </span>
            )}
            {tagsFor(item, language).slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                className={`f-tag${activeTags.includes(tag) ? " is-on" : ""}`}
                aria-pressed={activeTags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
    );
  };

  const tools = (
    <div className="f-tools">
      <button
        type="button"
        className="f-tbtn"
        onClick={() => setTheme(nextTheme)}
        aria-label={copy.theme}
      >
        <ThemeIcon aria-hidden="true" />
      </button>
      <div className="f-langmenu">
        <button
          type="button"
          className="f-tbtn"
          onClick={() => setLangOpen((open) => !open)}
          aria-expanded={langOpen}
          aria-haspopup="menu"
          aria-label={copy.language}
        >
          <Globe aria-hidden="true" />
          <span className="f-tbtn-lab">{language === "zh" ? "中文" : "EN"}</span>
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
    </div>
  );

  const search = (
    <div className="f-srch">
      <Search aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.search}
        aria-label={copy.search}
      />
    </div>
  );

  const dayStrip = (
    <div className="f-rail-block">
      <span className="f-label f-label-pad">{copy.days}</span>
      <div className="f-days">
        {weekGroups.map((week) => (
          // The week is a heading, not a control: selecting a whole week is what
          // /week/[weekId] is for, and a button here would offer a filter the
          // day-scoped feed cannot honour.
          <div className="f-week" key={week.id}>
            <div className="f-week-h">
              <span className="f-week-l">{getPeriodLabel(week.id, language)}</span>
              <span className="f-day-n">{week.count}</span>
            </div>
            {week.days.map(([day, count]) => (
              <button
                key={day}
                type="button"
                className="f-day f-day-child"
                aria-pressed={selectedDay === day}
                onClick={() => setActiveDay((current) => (current === day ? null : day))}
              >
                <span className="f-day-d">{formatDay(day, language)}</span>
                <span className="f-day-n">{count}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const throughline = displayedThruText ? (
    <div className="f-idx">
      <div className="f-idx-head">
        <h2 className="f-idx-h">{copy.throughline(
          selectedDay ? formatDay(selectedDay, language) : undefined,
          selectedDay === days[0]?.[0],
        )}</h2>
        <span className="f-label">{copy.sections[section]}</span>
      </div>
      {/* emOnly() escapes the string and re-allows only <em>, so the accent
          underline works without trusting the data file. */}
      <p className="f-thru" dangerouslySetInnerHTML={{ __html: emOnly(displayedThruText) }} />
      <span className="f-thru-sig">{dailyThru ? copy.signature(visible.length) : copy.dayBriefing}</span>
    </div>
  ) : null;

  return (
    <div className="f-page">
      <a className="sr-only focus:not-sr-only" href="#f-feed">
        {copy.skip}
      </a>

      {/* Mobile/tablet top bar. Appears at the same 1180px breakpoint the rail
          leaves, because theme, language and search live only in those two
          places. */}
      <div className="f-mtop">
        <FrontierMark className="f-mh-mark" size={22} />
        <span className="f-wordmark">Frontier</span>
        <div className="f-mtop-sp">
          <button
            type="button"
            className="f-tbtn"
            onClick={() => setMobileSearch((open) => !open)}
            aria-expanded={mobileSearch}
            aria-label={copy.search_}
          >
            <Search aria-hidden="true" />
          </button>
          <button
            type="button"
            className="f-tbtn"
            onClick={() => setTheme(nextTheme)}
            aria-label={copy.theme}
          >
            <ThemeIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="f-tbtn"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            aria-label={copy.language}
          >
            <span className="f-tbtn-lab">{language === "zh" ? "中文" : "EN"}</span>
          </button>
        </div>
      </div>
      <div className="f-msrch" hidden={!mobileSearch}>
        {search}
      </div>

      <div className="f-shell">
        <main className="f-paper">
          <header className="f-masthead">
            <div className="f-mh-top">
              <span className="f-mh-kicker">{copy.kicker}</span>
              <FrontierMark className="f-mh-mark" size={24} />
              <span className="f-mh-kicker f-mh-issue">
                {updatedAt ? copy.updated(formatUpdated(updatedAt, language)) : ""}
              </span>
            </div>
            <h1 className="f-mh-name">Frontier</h1>
          </header>

          <nav className="f-secbar" aria-label={copy.sectionNav}>
            {SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                className="f-sitem"
                aria-current={section === id}
                onClick={() => {
                  setSection(id);
                  setActiveDay(null);
                }}
              >
                <span className="f-sitem-n">{copy.sections[id]}</span>
                <span className="f-sitem-c">{counts[id]}</span>
              </button>
            ))}
          </nav>

          {filtered && (
            <div className="f-fbar" role="group" aria-label={copy.activeFilters}>
              {activeDay && (
                <button type="button" className="f-fchip" onClick={() => setActiveDay(null)}>
                  <span>{formatDay(activeDay, language)}</span>
                  <X aria-hidden="true" />
                </button>
              )}
              {activeTags.map((tag) => (
                <button key={tag} type="button" className="f-fchip" onClick={() => toggleTag(tag)}>
                  <span>{tag}</span>
                  <X aria-hidden="true" />
                </button>
              ))}
              {query.trim() && (
                <button type="button" className="f-fchip" onClick={() => setQuery("")}>
                  <span>{`"${query.trim()}"`}</span>
                  <X aria-hidden="true" />
                </button>
              )}
              <button type="button" className="f-fclear" onClick={clearAll}>
                {copy.clear}
              </button>
            </div>
          )}

          <div className="f-sec">
            <h2 className="f-sec-h">{copy.sections[section]}</h2>
            <span className="f-sec-n">
              {visible.length} {copy.items}
            </span>
            <span className="f-sec-note">{copy.decks[section]}</span>
          </div>

          <div className="f-m-thru">{throughline}</div>

          {/* Filter results are announced rather than silently swapped, so a
              screen reader learns the count changed without moving focus. */}
          <p className="sr-only" role="status" aria-live="polite">
            {copy.showing(visible.length)}
          </p>

          <div className="f-feed" id="f-feed">
            {visible.length === 0 ? (
              <div className="f-empty">
                <p className="f-empty-t">{copy.emptyTitle}</p>
                <p className="f-empty-d">{copy.emptyDeck}</p>
                <button type="button" className="f-empty-b" onClick={clearAll}>
                  {copy.emptyAction}
                </button>
              </div>
            ) : (
              indexed.map(({ item, order }) =>
                item.is_video && item.video_id ? videoStory(item, order) : articleStory(item, order)
              )
            )}
          </div>

          <div className="f-m-idx">{dayStrip}</div>

          <footer className="f-paper-foot">
            <span className="f-meta">{copy.footer(items.length, sourceCount)}</span>
            {updatedAt && (
              <span className="f-meta">{copy.updated(formatUpdated(updatedAt, language))}</span>
            )}
            <span className="f-meta">{copy.disclosure}</span>
          </footer>
        </main>

        <aside className="f-rail" aria-label={copy.railNav}>
          {tools}
          {search}
          <div className="f-rail-scroll">
            {dayStrip}
            {throughline}
          </div>
        </aside>
      </div>
    </div>
  );
}
