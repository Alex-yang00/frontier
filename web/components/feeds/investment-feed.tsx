"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, TrendingUp, TrendingDown, Building2, Briefcase, GitMerge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/utils";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";
import { API_BASE, USE_API } from "@/lib/api-base";
import {
  ARTICLE_CTA_LABELS,
  articleHref,
  maStoryId,
  primaryStoryId,
  secondaryStoryId,
} from "@/lib/article-routes";
import { contentLanguage, dataUrl, toInvestments, type ForagerItem } from "@/lib/forager-adapter";

interface InvestmentFeedProps {
  weekId: string;
  searchQuery?: string;
  initialItems?: ForagerItem[];
}

type MarketTab = "primary" | "secondary" | "ma";

type RoundCategory = "Early" | "Series A" | "Series B" | "Series C+" | "Late/PE" | "Unknown";

interface PrimaryMarketPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  company: string;
  amount: string;
  round: string;
  roundCategory?: RoundCategory;
  investors: string[];
  valuation?: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

interface SecondaryMarketPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  ticker: string;
  price: string;
  change: string;
  direction: "up" | "down";
  marketCap: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

type IndustryCategory =
  | "AI Healthcare"
  | "AI Finance"
  | "AI Enterprise"
  | "AI Consumer"
  | "AI Infrastructure"
  | "AI Robotics"
  | "AI Security"
  | "AI Creative"
  | "AI Education"
  | "Other AI";

interface MAPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
  industry?: IndustryCategory;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

export function InvestmentFeed({ weekId, searchQuery, initialItems = [] }: InvestmentFeedProps) {
  const [activeTab, setActiveTab] = useState<MarketTab>("primary");
  const { language, t } = useSettings();
  const initialLanguage = contentLanguage(language);
  const initialData = toInvestments(initialItems, initialLanguage);
  const [primaryPosts, setPrimaryPosts] = useState<PrimaryMarketPost[]>(initialData.primaryMarket[initialLanguage] || []);
  const [secondaryPosts, setSecondaryPosts] = useState<SecondaryMarketPost[]>([]);
  const [maPosts, setMaPosts] = useState<MAPost[]>([]);
  const [loading, setLoading] = useState(initialItems.length === 0);

  // Filter states
  const [selectedRound, setSelectedRound] = useState<RoundCategory | "All">("All");

  // Filter options
  const roundFilters: (RoundCategory | "All")[] = ["All", "Early", "Series A", "Series B", "Series C+", "Late/PE"];

  // Translations for filter labels
  const getRoundLabel = (round: RoundCategory | "All"): string => {
    const labels: Record<RoundCategory | "All", string> = {
      "All": t("filterAll"),
      "Early": t("filterEarly"),
      "Series A": t("filterSeriesA"),
      "Series B": t("filterSeriesB"),
      "Series C+": t("filterSeriesCPlus"),
      "Late/PE": t("filterLatePE"),
      "Unknown": "Unknown",
    };
    return labels[round] || round;
  };

  // Get display name for AI application domain (shown on M&A cards)
  const getIndustryDisplayName = (industry: string): string => {
    const names: Record<string, Record<string, string>> = {
      "AI Healthcare": { de: "AI Gesundheit", en: "AI Healthcare" },
      "AI Finance": { de: "AI Finanzen", en: "AI Finance" },
      "AI Enterprise": { de: "AI Enterprise", en: "AI Enterprise" },
      "AI Consumer": { de: "AI Consumer", en: "AI Consumer" },
      "AI Infrastructure": { de: "AI Infrastruktur", en: "AI Infrastructure" },
      "AI Robotics": { de: "AI Robotik", en: "AI Robotics" },
      "AI Security": { de: "AI Sicherheit", en: "AI Security" },
      "AI Creative": { de: "AI Kreativ", en: "AI Creative" },
      "AI Education": { de: "AI Bildung", en: "AI Education" },
      "Other AI": { de: "Sonstige AI", en: "Other AI" },
    };
    return names[industry]?.[language] || industry;
  };

  useEffect(() => {
    if (initialItems.length === 0) setLoading(true);

    const processData = (data: any) => {
      const itemLanguage = contentLanguage(language);
      const normalized = data.items ? toInvestments(data.items as ForagerItem[], itemLanguage) : data;
      setPrimaryPosts(normalized.primaryMarket?.[itemLanguage] || normalized.primaryMarket?.["de"] || []);
      setSecondaryPosts(normalized.secondaryMarket?.[itemLanguage] || normalized.secondaryMarket?.["de"] || []);
      setMaPosts(normalized.ma?.[itemLanguage] || normalized.ma?.["de"] || []);
      setLoading(false);
    };

    const finishWithoutUpdate = () => {
      setLoading(false);
    };

    // Try API first if configured, fall back to static JSON
    const fetchUrl = USE_API
      ? `${API_BASE}/investment/${weekId}`
      : dataUrl("daily.json");

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (USE_API) {
          fetch(dataUrl("daily.json"))
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(processData)
            .catch(finishWithoutUpdate);
        } else {
          finishWithoutUpdate();
        }
      });
  }, [weekId, language, initialItems.length]);

  // Live stock quotes removed 2026-08-01: the backend stock endpoints are
  // disabled (HTTP 410) pending market-data licensing. Secondary-market cards
  // show only the as-reported figures from the collection pipeline.

  const periodLabel = getPeriodLabel(weekId, language);

  const filterByQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Primary market posts - filter by search and round category
  const filteredPrimary = primaryPosts.filter((p) => {
    const matchesSearch = !searchQuery || filterByQuery(p.content) || filterByQuery(p.company) || filterByQuery(p.round) || p.investors.some((i) => filterByQuery(i));
    const matchesRound = selectedRound === "All" || p.roundCategory === selectedRound;
    return matchesSearch && matchesRound;
  });

  // Secondary market posts - filter by search only
  const filteredSecondary = secondaryPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.ticker)
  );

  // M&A posts - filter by search only (industry badge shown on cards instead of filter)
  const filteredMa = maPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.acquirer) || filterByQuery(p.target) || filterByQuery(p.dealType)
  );

  const tabs = [
    { id: "primary" as const, label: t("primaryMarket"), icon: Briefcase },
    { id: "secondary" as const, label: t("secondaryMarket"), icon: TrendingUp },
    { id: "ma" as const, label: "M&A", icon: GitMerge },
  ];
  const articleLabel = ARTICLE_CTA_LABELS[language] || ARTICLE_CTA_LABELS.en;

  const SourceLink = ({ sourceUrl, storyHref }: { sourceUrl?: string; storyHref: string }) => (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      {sourceUrl ? (
        <div className="flex items-center gap-1">
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-primary/40 text-primary transition-colors hover:border-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {t("source")}
          </a>
        </div>
      ) : null}
      <Link
        href={storyHref}
        className="ml-auto border-b border-foreground/30 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {articleLabel}
      </Link>
    </div>
  );


  return (
    <div>
      {/* Section Header */}
      <div className="section-header-invest border-b border-foreground px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("aiInvestments")}</h2>
          <Badge variant="secondary" className="ml-auto rounded-none border border-border bg-card font-sans text-[10px] uppercase tracking-[0.12em]">
            {periodLabel}
          </Badge>
        </div>
        <p className="mt-2 font-display text-2xl font-normal leading-tight text-foreground">
          {t("fundingNewsMA")}
        </p>
      </div>

      {/* Market Tabs */}
      <div className="flex border-b border-foreground">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 border-r border-border py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors last:border-r-0",
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Chips - Primary Market (Round Filter) */}
      {activeTab === "primary" && (
        <div className="border-b border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {roundFilters.map((round) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={cn(
                  "whitespace-nowrap border px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                  selectedRound === round
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-secondary-foreground hover:border-foreground hover:bg-secondary"
                )}
              >
                {getRoundLabel(round)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Primary Market Posts */}
      {!loading && activeTab === "primary" && (
        <div className="divide-y divide-border">
          {filteredPrimary.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Briefcase className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich am späten Abend (Berliner Zeit) gesammelt" : "Data is collected daily in the late evening (Berlin time)"}
              </p>
            </div>
          )}
          {filteredPrimary.map((post, index) => {
            const storyHref = articleHref(language, weekId, primaryStoryId(post));
            return (
            <article key={post.id} className="animate-fade-up border-b border-border px-4 py-5 transition-colors hover:bg-secondary/50 sm:px-6" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="w-14 shrink-0 font-display text-3xl font-normal leading-none text-primary tabular-nums sm:text-4xl">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary sm:gap-2">
                    <span>{post.author.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* Deal Info Card */}
                  <div className="mt-3 border-t border-foreground bg-card py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
                        <Link href={storyHref} className="font-display text-2xl font-normal leading-tight text-foreground transition-colors hover:text-primary">
                          {post.company}
                        </Link>
                      </div>
                      <Badge className="rounded-none border border-primary/30 bg-primary/10 text-primary">{post.round}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("volume")}:</span>
                        <span className="ml-2 font-display text-xl font-normal text-primary">{post.amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("valuation")}:</span>
                        <span className="ml-2 font-semibold text-foreground">{post.valuation}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.investors.map((investor) => (
                        <Badge key={investor} variant="secondary" className="rounded-none text-xs">{investor}</Badge>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 border-t border-border pt-3 text-[15px] leading-relaxed text-foreground sm:text-base">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} storyHref={storyHref} />
                  <div className="mt-3">
                    <ShareButton title={post.company} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {/* Secondary Market Posts */}
      {!loading && activeTab === "secondary" && (
        <div className="divide-y divide-border">
          {filteredSecondary.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich am späten Abend (Berliner Zeit) gesammelt" : "Data is collected daily in the late evening (Berlin time)"}
              </p>
            </div>
          )}
          {filteredSecondary.map((post, index) => {
            const storyHref = articleHref(language, weekId, secondaryStoryId(post));
            return (
            <article key={post.id} className="animate-fade-up border-b border-border px-4 py-5 transition-colors hover:bg-secondary/50 sm:px-6" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="w-14 shrink-0 font-display text-3xl font-normal leading-none text-primary tabular-nums sm:text-4xl">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary sm:gap-2">
                    <span>{post.author.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* Stock Info Card */}
                  <div className="mt-3 border-t border-foreground bg-card py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        <Link href={storyHref} className="font-display text-2xl font-normal text-foreground transition-colors hover:text-primary">
                          {post.ticker}
                        </Link>
                        {post.price && post.price !== "N/A" && (
                          <span className="font-display text-2xl font-normal tabular-nums text-primary">{post.price}</span>
                        )}
                      </div>
                      {post.change && post.change !== "N/A" && (
                        <div
                          className={cn(
                            "flex items-center gap-1 border px-3 py-1 text-sm font-semibold tabular-nums",
                            post.direction === "up"
                              ? "bg-accent/20 text-accent"
                              : "bg-destructive/20 text-destructive"
                          )}
                        >
                          {post.direction === "up" ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
                          {post.change}
                        </div>
                      )}
                    </div>
                    {post.marketCap && post.marketCap !== "N/A" && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {t("marketCap")}: <span className="text-foreground tabular-nums">{post.marketCap}</span>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 border-t border-border pt-3 text-[15px] leading-relaxed text-foreground sm:text-base">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} storyHref={storyHref} />
                  <div className="mt-3">
                    <ShareButton title={post.ticker} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {/* M&A Posts */}
      {!loading && activeTab === "ma" && (
        <div className="divide-y divide-border">
          {filteredMa.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <GitMerge className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich am späten Abend (Berliner Zeit) gesammelt" : "Data is collected daily in the late evening (Berlin time)"}
              </p>
            </div>
          )}
          {filteredMa.map((post, index) => {
            const storyHref = articleHref(language, weekId, maStoryId(post));
            return (
            <article key={post.id} className="animate-fade-up border-b border-border px-4 py-5 transition-colors hover:bg-secondary/50 sm:px-6" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="w-14 shrink-0 font-display text-3xl font-normal leading-none text-primary tabular-nums sm:text-4xl">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary sm:gap-2">
                    <span>{post.author.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* M&A Info Card */}
                  <div className="mt-3 border-t border-foreground bg-card py-3">
                    <div className="flex items-center justify-center gap-3 min-w-0">
                      <div className="text-center min-w-0">
                        <p className="text-xs text-muted-foreground">{t("acquirer")}</p>
                        <Link href={storyHref} className="block truncate font-display text-xl font-normal text-foreground transition-colors hover:text-primary">
                          {post.acquirer}
                        </Link>
                      </div>
                      <GitMerge className="h-6 w-6 text-chart-5 shrink-0" aria-hidden="true" />
                      <div className="text-center min-w-0">
                        <p className="text-xs text-muted-foreground">{t("target")}</p>
                        <p className="truncate font-display text-xl font-normal text-foreground">{post.target}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                        <Badge className="rounded-none border-chart-5/30 bg-chart-5/20 text-chart-5">
                        {post.dealType}
                      </Badge>
                      {post.industry && (
                        <Badge className="rounded-none border-primary/30 bg-primary/20 text-primary">
                          {getIndustryDisplayName(post.industry)}
                        </Badge>
                      )}
                      <span className="font-display text-xl font-normal text-primary">{post.dealValue}</span>
                    </div>
                  </div>

                  <p className="mt-3 border-t border-border pt-3 text-[15px] leading-relaxed text-foreground sm:text-base">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} storyHref={storyHref} />
                  <div className="mt-3">
                    <ShareButton title={`${post.acquirer} → ${post.target}`} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
