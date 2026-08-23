"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Lightbulb, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";
import { API_BASE, USE_API } from "@/lib/api-base";
import { ARTICLE_CTA_LABELS, articleHref, tipStoryId } from "@/lib/article-routes";
import { contentLanguage, dataUrl, toTips, type FrontierItem } from "@/lib/frontier-adapter";

interface TipsFeedProps {
  weekId: string;
  searchQuery?: string;
  initialItems?: FrontierItem[];
}

interface TipPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  platform: string;
  content: string;
  tip: string;
  category: string;
  difficulty?: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

function isCodeLikeTip(value: string): boolean {
  const text = value.trim();
  return /```|^\s*(curl|npm|pnpm|yarn|pip|python|git|docker|kubectl|const|let|var|function|import|from|def|class|select|with)\b|[{};]/im.test(text);
}

function sentenceCaseFragment(text: string) {
  if (!text) return "";
  return /^[a-z]/.test(text) ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function splitHeadlineDeck(content: string): [string, string] {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) return ["", ""];
  for (const separator of [": ", " — ", " – ", " - "]) {
    const position = clean.indexOf(separator);
    if (position >= 20 && position <= 80) {
      return [clean.slice(0, position).replace(/[ .,-;:]+$/, ""), clean.slice(position + separator.length).trim()];
    }
  }
  for (const separator of [". ", "? ", "! "]) {
    const position = clean.indexOf(separator);
    if (position >= 28 && position <= 86 && position + separator.length < clean.length) {
      return [clean.slice(0, position + 1), clean.slice(position + separator.length).trim()];
    }
  }
  if (clean.length <= 86) return [clean, ""];
  const cut = clean.lastIndexOf(" ", 86);
  return [clean.slice(0, cut).replace(/[ .,-;:]+$/, ""), sentenceCaseFragment(clean.slice(cut).trim())];
}

export function TipsFeed({ weekId, searchQuery, initialItems = [] }: TipsFeedProps) {
  const { language, t } = useSettings();
  const initialLanguage = contentLanguage(language);
  const [posts, setPosts] = useState<TipPost[]>(() => toTips(initialItems, initialLanguage)[initialLanguage] || []);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      post.tip.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.platform.toLowerCase().includes(q) ||
      post.author.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (initialItems.length === 0) setLoading(true);

    // Try API first if configured, fall back to static JSON
    const fetchUrl = USE_API
      ? `${API_BASE}/tips/${weekId}`
      : dataUrl("daily.json");

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ items?: FrontierItem[]; [language: string]: unknown }>;
      })
      .then((data) => {
        const itemLanguage = contentLanguage(language);
        const localized = Array.isArray(data[language]) ? data[language] as TipPost[] : [];
        setPosts(data.items ? (toTips(data.items, itemLanguage)[itemLanguage] || []) : localized);
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
              setPosts(Array.isArray(data[language]) ? data[language] as TipPost[] : []);
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

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const periodLabel = getPeriodLabel(weekId, language);

  return (
    <div>
      {/* Section Header */}
      <div className="section-header-tips border-b border-foreground px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("practicalTipsTitle")}</h2>
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
          {t("handsOnTipsFrom")}
        </p>
      </div>

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Lightbulb className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {language === "zh" ? "信息源正在按不同频率持续采集" : "Sources are collected continuously on staggered schedules"}
          </p>
        </div>
      )}

      {/* Tips Posts */}
      {filteredPosts.map((post, index) => {
        const tipIsCodeLike = isCodeLikeTip(post.tip);
        const [headline, deck] = splitHeadlineDeck(post.content);
        const storyHref = articleHref(language, weekId, tipStoryId(post));
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
                  {/* difficulty is absent on most tips, so the line is joined rather
                      than interpolated -- the fixed separators printed " ·  · " around
                      the hole when it was missing. */}
                  {[post.category, post.difficulty, post.platform, post.timestamp].filter(Boolean).join(" · ")}
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

                {/* Tip Code Block */}
                <div className="mt-4 border border-foreground bg-secondary/45 p-3">
                  <div className="flex items-start justify-between gap-2">
                    {tipIsCodeLike ? (
                      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-foreground">
                        {post.tip}
                      </pre>
                    ) : (
                      <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {post.tip}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(post.id, post.tip);
                      }}
                    >
                      {copiedId === post.id ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Source */}
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  {post.sourceUrl && (
                  <div className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-b border-primary/40 text-primary transition-colors hover:border-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("source")}
                    </a>
                  </div>
                  )}
                  <ShareButton
                    title={post.category}
                    text={`${post.content}\n\n${post.tip}`}
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
