"use client";

import { useRef, useEffect, useState } from "react";
import { TechFeed } from "./feeds/tech-feed";
import { InvestmentFeed } from "./feeds/investment-feed";
import { TipsFeed } from "./feeds/tips-feed";
import { ErrorBoundary } from "./error-boundary";
import { FrontierMark } from "@/components/frontier-mark";
import { IssueTimeline } from "@/components/issue-timeline";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";
import { cn } from "@/lib/utils";
import type { FrontierItem } from "@/lib/frontier-adapter";

interface FeedProps {
  activeTab: string;
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
  searchQuery: string;
  initialItems?: FrontierItem[];
}

/**
 * Main feed container with tab switching and slide animations.
 *
 * Renders the appropriate feed component (Tech/Investment/Tips) based on activeTab.
 * Handles week navigation and passes search query to child feeds.
 *
 * @param activeTab - Current tab: "tech" | "investment" | "tips"
 * @param selectedWeekId - Week ID in format "YYYY-kwWW" (e.g., "2025-kw04")
 * @param onWeekChange - Callback when user selects a different week
 * @param searchQuery - Filter string passed to feed components
 *
 * @example
 * <Feed
 *   activeTab="tech"
 *   selectedWeekId="2025-kw04"
 *   onWeekChange={(id) => setWeekId(id)}
 *   searchQuery=""
 * />
 */
export function Feed({ activeTab, selectedWeekId, onWeekChange, searchQuery, initialItems = [] }: FeedProps) {
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTabRef = useRef(activeTab);
  const { language } = useSettings();

  const tabOrder = ["tech", "investment", "tips"];

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      const prevIndex = tabOrder.indexOf(prevTabRef.current);
      const newIndex = tabOrder.indexOf(activeTab);
      setDirection(newIndex > prevIndex ? "left" : "right");
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);

      prevTabRef.current = activeTab;
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const renderFeed = () => {
    switch (activeTab) {
      case "tech":
        return <TechFeed weekId={selectedWeekId} searchQuery={searchQuery} initialItems={initialItems} />;
      case "investment":
        return <InvestmentFeed weekId={selectedWeekId} searchQuery={searchQuery} initialItems={initialItems} />;
      case "tips":
        return <TipsFeed weekId={selectedWeekId} searchQuery={searchQuery} initialItems={initialItems} />;
      default:
        return <TechFeed weekId={selectedWeekId} searchQuery={searchQuery} initialItems={initialItems} />;
    }
  };

  if (!selectedWeekId) {
    return <main className="min-h-screen" />;
  }

  const issueLabel = getPeriodLabel(selectedWeekId, language);

  return (
    <main id="main-content" className="min-h-screen bg-card pb-20 md:pb-0">
      <header className="border-b-2 border-foreground bg-card px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          <span>AI Intelligence</span>
          <FrontierMark size={30} />
          <span className="text-right">{issueLabel}</span>
        </div>
        <div className="pt-4 text-center">
          <h1 className="font-display text-5xl font-normal leading-none text-foreground sm:text-6xl">
            Frontier
          </h1>
          <p className="mt-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            The Intelligence Memo
          </p>
          <p className="mx-auto mt-2 max-w-[19rem] font-display text-lg leading-snug text-foreground sm:max-w-none">
            Curated intelligence, capital moves, and workflows.
          </p>
        </div>
      </header>
      <IssueTimeline
        selectedWeekId={selectedWeekId}
        onWeekChange={onWeekChange}
        variant="mobile"
        className="md:hidden"
      />

      <ErrorBoundary>
        <div className="overflow-hidden">
          <div
            className={cn(
              "transition-opacity duration-300 ease-out",
              isAnimating && direction === "left" && "animate-slide-left",
              isAnimating && direction === "right" && "animate-slide-right",
              isAnimating ? "opacity-0" : "opacity-100"
            )}
            onAnimationEnd={() => setIsAnimating(false)}
          >
            {renderFeed()}
          </div>
        </div>
      </ErrorBoundary>
    </main>
  );
}
