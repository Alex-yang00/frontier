"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { isDailyId, getPeriodLabel } from "@/lib/period-utils";
import { API_BASE, USE_API } from "@/lib/api-base";
import { dataUrl } from "@/lib/frontier-adapter";

interface IssueTimelineProps {
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
  variant?: "sidebar" | "mobile";
  className?: string;
}

interface DayData {
  id: string;
  label: string;
  weekday: string;
  current: boolean;
}

interface WeekData {
  id: string;
  label: string;
  year: number;
  weekNum?: number;
  dateRange: string;
  current: boolean;
  periodType?: string;
  days?: DayData[];
}

export function IssueTimeline({
  selectedWeekId,
  onWeekChange,
  variant = "sidebar",
  className,
}: IssueTimelineProps) {
  const { language, t } = useSettings();
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processData = (data: { weeks?: WeekData[] }) => setWeeks(data.weeks || []);
    const fetchUrl = USE_API ? `${API_BASE}/weeks` : dataUrl("weeks.json");

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ weeks?: WeekData[] }>;
      })
      .then(processData)
      .catch(() => {
        if (USE_API) {
          fetch(dataUrl("weeks.json"))
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json() as Promise<{ weeks?: WeekData[] }>;
            })
            .then(processData)
            .catch(() => {});
        }
      });
  }, []);

  const activeWeek = weeks.find((week) =>
    isDailyId(selectedWeekId)
      ? week.days?.some((day) => day.id === selectedWeekId)
      : week.id === selectedWeekId
  );
  const activeWeekIndex = activeWeek ? weeks.indexOf(activeWeek) : -1;
  const selectedDay = isDailyId(selectedWeekId) ? selectedWeekId : null;

  useEffect(() => {
    if (!scrollRef.current || activeWeekIndex < 0) return;
    const activeButton = scrollRef.current.children[activeWeekIndex] as HTMLElement | undefined;
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeWeekIndex]);

  const selectWeek = (week: WeekData) => {
    if (week.days && week.days.length > 0) {
      const today = week.days.find((day) => day.current);
      const latest = week.days[week.days.length - 1];
      onWeekChange((today || latest).id);
      return;
    }
    onWeekChange(week.id);
  };

  const handlePrev = () => {
    if (activeWeekIndex >= 0 && activeWeekIndex < weeks.length - 1) {
      selectWeek(weeks[activeWeekIndex + 1]);
    }
  };

  const handleNext = () => {
    if (activeWeekIndex > 0) {
      selectWeek(weeks[activeWeekIndex - 1]);
    }
  };

  if (variant === "mobile") {
    const orderedWeeks = activeWeek
      ? [activeWeek, ...weeks.filter((week) => week.id !== activeWeek.id)]
      : weeks;

    return (
      <div className={cn("border-b-2 border-foreground bg-card", className)}>
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-hide" style={{ touchAction: "pan-x" }}>
          {weeks.length === 0 ? (
            <div className="h-9 w-24 shrink-0 border border-border bg-secondary/60" />
          ) : (
            orderedWeeks.map((week) => {
              const isActive = activeWeek?.id === week.id;
              return (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => selectWeek(week)}
                  className={cn(
                    "shrink-0 border px-3 py-2 text-left transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground"
                  )}
                >
                  <span className="block font-sans text-[9px] font-extrabold uppercase tracking-[0.14em] opacity-70">
                    {week.dateRange}
                  </span>
                  <span className="block font-display text-base leading-none">
                    {getPeriodLabel(week.id, language)}
                  </span>
                </button>
              );
            })
          )}
          {activeWeek?.days?.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => onWeekChange(day.id)}
              className={cn(
                "shrink-0 border px-3 py-2 text-left transition-colors",
                selectedDay === day.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              )}
            >
              <span className="block font-sans text-[9px] font-extrabold uppercase tracking-[0.14em] opacity-70">
                {day.weekday}
              </span>
              <span className="block font-display text-base leading-none">{day.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("hidden xl:block", className)}>
      <div className="border-t-2 border-foreground pt-4">
        <div className="mb-3 flex items-end justify-between gap-3 px-4">
          <div>
            <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
              Issue Archive
            </p>
            <p className="font-display text-xl leading-tight text-foreground">{t("weekOverview")}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeWeekIndex < 0 || activeWeekIndex >= weeks.length - 1}
              className="flex h-8 w-8 items-center justify-center border border-border bg-card text-foreground transition-colors hover:border-foreground disabled:opacity-30"
              aria-label="Previous issue"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeWeekIndex <= 0}
              className="flex h-8 w-8 items-center justify-center border border-border bg-card text-foreground transition-colors hover:border-foreground disabled:opacity-30"
              aria-label="Next issue"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="space-y-2 px-4">
          {weeks.map((week) => {
            const isActive = activeWeek?.id === week.id;
            return (
              <div key={week.id}>
                <button
                  type="button"
                  onClick={() => selectWeek(week)}
                  className={cn(
                    "w-full border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground"
                  )}
                >
                  <span className="block font-display text-xl leading-none">
                    {getPeriodLabel(week.id, language)}
                  </span>
                  <span className="mt-1 block font-sans text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                    {week.dateRange}
                  </span>
                </button>

                {isActive && week.days && week.days.length > 0 && (
                  <div className="mt-2 space-y-1 border-l border-border pl-3">
                    {week.days.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => onWeekChange(day.id)}
                        className={cn(
                          "flex w-full items-center justify-between border px-2.5 py-2 text-left transition-colors",
                          selectedDay === day.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-foreground"
                        )}
                      >
                        <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.13em]">
                          {day.weekday}
                        </span>
                        <span className="font-display text-lg leading-none">{day.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
