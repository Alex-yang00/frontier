"use client";

import { useMemo, useState } from "react";
import { Search, Sun, Moon, Check, Globe, X } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { ForagerMark } from "@/components/forager-mark";
import { VideoEmbed } from "@/components/video-embed";
import type { ForagerItem, ForagerSection, Throughline } from "@/lib/forager-adapter";

const SECTIONS: ForagerSection[] = ["tech", "investment", "tips"];

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

function text(item: ForagerItem, language: string, field: "title" | "summary"): string {
  if (field === "summary") {
    const eventKey = `event_summary_${language === "zh" ? "zh" : "en"}` as keyof ForagerItem;
    const eventSummary = item[eventKey];
    if (typeof eventSummary === "string" && eventSummary) return eventSummary;
  }
  const key = `${field}_${language === "zh" ? "zh" : "en"}` as keyof ForagerItem;
  return (item[key] as string) || item[field] || "";
}

/** Drop one trailing sentence period from a headline.
 *
 * Translation returns full sentences, so 5 of 228 Chinese titles and 2 of 229
 * English ones arrive ending in 。or . — a headline does not take one. Only the
 * final mark goes: some titles legitimately contain internal sentence breaks
 * ("Databricks wanted $1B. Investors wanted $15B. ..."), and "?" and "!" carry
 * meaning a headline needs to keep. */
function headline(value: string): string {
  return value.replace(/[。.]\s*$/, "");
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

function dayOf(item: ForagerItem): string {
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

function formatTime(item: ForagerItem, language: string): string {
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
  items: ForagerItem[];
  curatedIds?: Partial<Record<ForagerSection | "videos", string[]>>;
  throughlines?: Partial<Record<ForagerSection, Throughline>>;
  dailyThroughlines?: Record<string, Partial<Record<ForagerSection, Throughline>>>;
  updatedAt?: string;
}

function viewCount(value?: string): number {
  const match = (value || "").trim().match(/^([\d.]+)([KMB])?$/i);
  if (!match) return 0;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]?.toUpperCase() as "K" | "M" | "B"] || 1;
  return Number(match[1]) * multiplier;
}

function selectItems(candidates: ForagerItem[], ids: string[] | undefined, limit: number): ForagerItem[] {
  if (ids === undefined) return candidates.slice(0, limit);
  const byId = new Map(candidates.map((item) => [item.id, item]));
  const selected = (ids || []).map((id) => byId.get(id)).filter((item): item is ForagerItem => Boolean(item));
  return selected.slice(0, limit);
}

function intersperseVideos(posts: ForagerItem[], videos: ForagerItem[]): ForagerItem[] {
  const result = [...posts];
  videos.forEach((video, index) => result.splice(2 + index * 5, 0, video));
  return result;
}

export default function EditorialHome({ items, curatedIds = {}, throughlines = {}, dailyThroughlines = {}, updatedAt }: EditorialHomeProps) {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const copy = copyFor(language);

  const [section, setSection] = useState<ForagerSection>("tech");
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
    const videoCandidates = items.filter((item) => item.is_video).sort((a, b) => viewCount(b.video_view_count) - viewCount(a.video_view_count));
    const videos = selectItems(videoCandidates, curatedIds.videos, 2);
    return { tech: intersperseVideos(tech, videos), investment, tips };
  }, [items, curatedIds]);

  const sectionItems = curated[section];

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
    for (const item of sectionItems) {
      const day = dayOf(item);
      if (day) tally.set(day, (tally.get(day) || 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  }, [sectionItems]);

  const selectedDay = useMemo(() => {
    if (activeDay && days.some(([day]) => day === activeDay)) return activeDay;
    return days[0]?.[0] || null;
  }, [activeDay, days]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sectionItems.filter((item) => {
      if (selectedDay && dayOf(item) !== selectedDay) return false;
      if (activeTags.length && !activeTags.every((tag) => (item.tags || []).includes(tag))) return false;
      if (!needle) return true;
      const haystack = `${text(item, language, "title")} ${text(item, language, "summary")} ${item.source_name}`;
      return haystack.toLowerCase().includes(needle);
    });
  }, [sectionItems, selectedDay, activeTags, query, language]);

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

  const videoStory = (item: ForagerItem, order: number) => (
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

  const articleStory = (item: ForagerItem, order: number) => (
    <article className="f-it" key={item.id}>
      <div className="f-story">
        <span className="f-ord f-story-ord" aria-hidden="true">
          {String(order).padStart(2, "0")}
        </span>
        <div className="f-story-body">
          <a className="f-it-a" href={item.url} target="_blank" rel="noopener noreferrer">
            <h3 className="f-story-h">{headline(text(item, language, "title"))}</h3>
          </a>
          {deck(text(item, language, "summary"), 260) && (
            <p className="f-story-deck">{deck(text(item, language, "summary"), 260)}</p>
          )}
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
            {(item.tags || []).slice(0, 3).map((tag) => (
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
        {days.map(([day, count]) => (
          <button
            key={day}
            type="button"
            className="f-day"
            aria-pressed={selectedDay === day}
            onClick={() => setActiveDay((current) => (current === day ? null : day))}
          >
            <span className="f-day-d">{formatDay(day, language)}</span>
            <span className="f-day-n">{count}</span>
          </button>
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
        <ForagerMark className="f-mh-mark" size={22} />
        <span className="f-wordmark">Forager</span>
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
              <ForagerMark className="f-mh-mark" size={24} />
              <span className="f-mh-kicker f-mh-issue">
                {updatedAt ? copy.updated(formatUpdated(updatedAt, language)) : ""}
              </span>
            </div>
            <h1 className="f-mh-name">Forager</h1>
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
