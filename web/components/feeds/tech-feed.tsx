"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { VideoEmbed } from "@/components/video-embed";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";
import { API_BASE, USE_API } from "@/lib/api-base";
import { ARTICLE_CTA_LABELS, articleHref, techStoryId } from "@/lib/article-routes";
import type { TechPost } from "@/lib/types";
import { contentLanguage, dataUrl, toTech, type FrontierItem } from "@/lib/frontier-adapter";

interface TechFeedProps {
  weekId: string;
  searchQuery?: string;
  initialItems?: FrontierItem[];
}

const impactLabels: Record<string, Record<string, string>> = {
  de: { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" },
  en: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
};

function sentenceCaseFragment(text: string) {
  if (!text) return "";
  return /^[a-z]/.test(text) ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function splitHeadlineDeck(content: string): [string, string] {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) return ["", ""];

  for (const separator of [": ", " — ", " – ", " - "]) {
    const position = clean.indexOf(separator);
    if (position >= 24 && position <= 82) {
      return [clean.slice(0, position).replace(/[ .,-;:]+$/, ""), clean.slice(position + separator.length).trim()];
    }
  }

  for (const separator of [" that ", " to "]) {
    const position = clean.indexOf(separator, 30);
    if (position > 0 && position <= 86) {
      const headline = clean.slice(0, position).replace(/[ .,-;:]+$/, "");
      let deck = separator === " to " ? clean.slice(position + 1).trim() : clean.slice(position + separator.length).trim();
      if (separator === " to " && clean.slice(0, position).toLowerCase().includes(" from ")) {
        deck = `toward ${clean.slice(position + separator.length).trim()}`;
      }
      return [headline, sentenceCaseFragment(deck)];
    }
  }

  for (const separator of [". ", "? ", "! "]) {
    const position = clean.indexOf(separator);
    if (position >= 32 && position <= 90 && position + separator.length < clean.length) {
      return [clean.slice(0, position + 1), clean.slice(position + separator.length).trim()];
    }
  }

  if (clean.length <= 92) return [clean, ""];
  const cut = clean.lastIndexOf(" ", 92);
  return [clean.slice(0, cut).replace(/[ .,-;:]+$/, ""), clean.slice(cut).trim()];
}

/**
 * Displays AI technology news posts for a given week.
 *
 * Data loading pattern (reference implementation for other feeds):
 * 1. useEffect triggers on weekId or language change
 * 2. Fetches /data/{weekId}/tech.json (or API endpoint if configured)
 * 3. Selects data[language] with fallback to data["de"]
 * 4. Filters by searchQuery if provided
 *
 * Video posts are interspersed among regular posts and displayed with
 * an embedded YouTube player and special "Video" badge styling.
 *
 * @param weekId - Week ID in format "YYYY-kwWW"
 * @param searchQuery - Optional filter string for content/tags/source
 *
 * @example
 * <TechFeed weekId="2025-kw04" searchQuery="" />
 */
export function TechFeed({ weekId, searchQuery, initialItems = [] }: TechFeedProps) {
  const { language, t } = useSettings();
  const initialLanguage = contentLanguage(language);
  const [posts, setPosts] = useState<TechPost[]>(() => initialItems.filter((item) => item.section === "tech" || !item.section).map((item, index) => toTech(item, initialLanguage, index)));
  const [loading, setLoading] = useState(initialItems.length === 0);
  const impacts = impactLabels[language] || impactLabels.en;

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.source.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.author.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (initialItems.length === 0) setLoading(true);

    // Try API first if configured, fall back to static JSON
    const fetchUrl = USE_API
      ? `${API_BASE}/tech/${weekId}`
      : dataUrl("daily.json");

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ items?: FrontierItem[]; [language: string]: unknown }>;
      })
      .then((data) => {
        const itemLanguage = contentLanguage(language);
        const localized = Array.isArray(data[language]) ? data[language] as TechPost[] : [];
        setPosts(data.items ? data.items.filter((item) => item.section === "tech" || !item.section).map((item, index) => toTech(item, itemLanguage, index)) : localized);
        setLoading(false);
      })
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (USE_API) {
          fetch(dataUrl("daily.json"))
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json() as Promise<Record<string, unknown>>;
            })
            .then((data) => {
              setPosts(Array.isArray(data[language]) ? data[language] as TechPost[] : []);
              setLoading(false);
            })
            .catch(() => {
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [weekId, language, initialItems.length]);

  const periodLabel = getPeriodLabel(weekId, language);

  return (
    <div>
      {/* Section Header */}
      <div className="section-header-tech border-b border-foreground px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("aiTechProgress")}</h2>
          {!loading && filteredPosts.length > 0 && (
            <Badge variant="outline" className="rounded-none border-primary/40 text-xs text-primary">
              {filteredPosts.length}
            </Badge>
          )}
          <Badge variant="secondary" className="ml-auto rounded-none border border-border bg-card font-sans text-[10px] uppercase tracking-[0.12em]">
            {periodLabel}
          </Badge>
        </div>
        <p className="mt-2 font-display text-2xl font-normal leading-tight text-foreground">
          {t("importantDevThisWeek")}
        </p>
      </div>

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Cpu className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {language === "zh" ? "信息源正在按不同频率持续采集" : "Sources are collected continuously on staggered schedules"}
          </p>
        </div>
      )}

      {/* Posts */}
      {filteredPosts.map((post, index) => {
        const isVideoPost = post.isVideo && post.videoId;
        const [headline, deck] = splitHeadlineDeck(post.content);
        const impactLabel = impacts[post.impact as keyof typeof impacts] || post.impact;
        const storyHref = articleHref(language, weekId, techStoryId(post));
        const articleLabel = ARTICLE_CTA_LABELS[language] || ARTICLE_CTA_LABELS.en;

        return (
          <article
            key={post.id}
            className="animate-fade-up border-b border-border px-4 py-5 transition-colors hover:bg-secondary/50 sm:px-6"
            style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
          >
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4">
              <div className="font-display text-3xl font-normal leading-none text-primary tabular-nums sm:text-4xl">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sans text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">
                  {isVideoPost ? "Video" : post.category} · {impactLabel} · {post.timestamp}
                </div>
                <h2 className="mt-2 border-b border-border pb-3 font-display text-2xl font-normal leading-[1.1] text-foreground sm:text-[1.75rem]">
                  <Link href={storyHref} className="transition-colors hover:text-primary">
                    {headline}
                  </Link>
                </h2>
                {deck && (
                  <p className="mt-3 text-[15px] leading-relaxed text-foreground sm:text-base">
                    {deck}
                  </p>
                )}

                {/* Video Embed */}
                {isVideoPost && post.videoId && (
                  <div className="mt-3">
                    <VideoEmbed
                      videoId={post.videoId}
                      thumbnailUrl={post.videoThumbnailUrl}
                      duration={post.videoDuration}
                      viewCount={post.videoViewCount}
                      title={post.content}
                    />
                  </div>
                )}

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="cursor-pointer font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Source */}
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {post.sourceUrl ? (
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-b border-primary/40 text-primary transition-colors hover:border-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("source")}: {post.source}
                      </a>
                    ) : (
                      <span>{t("source")}: {post.source}</span>
                    )}
                  </div>
                  <ShareButton
                    title={post.category}
                    text={post.content}
                    url={post.sourceUrl}
                  />
                  <Link
                    href={storyHref}
                    className="ml-auto border-b border-foreground/30 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {articleLabel}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
