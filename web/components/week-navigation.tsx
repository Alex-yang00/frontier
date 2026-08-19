"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useSettings } from "@/lib/settings-context";
import { isDailyId, getPeriodLabel } from "@/lib/period-utils";
import { API_BASE, USE_API } from "@/lib/api-base";
import { dataUrl } from "@/lib/frontier-adapter";

interface WeekNavigationProps {
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
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

export function WeekNavigation({ selectedWeekId, onWeekChange }: WeekNavigationProps) {
  const { language, t } = useSettings();
  const [weeks, setWeeks] = useState<WeekData[]>([]);

  useEffect(() => {
    const processData = (data: any) => setWeeks(data.weeks || []);

    const fetchUrl = USE_API ? `${API_BASE}/weeks` : dataUrl("weeks.json");

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => {
        if (USE_API) {
          fetch(dataUrl("weeks.json"))
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
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
      const prevWeek = weeks[activeWeekIndex + 1];
      selectWeek(prevWeek);
    }
  };

  const handleNext = () => {
    if (activeWeekIndex > 0) {
      const nextWeek = weeks[activeWeekIndex - 1];
      selectWeek(nextWeek);
    }
  };

  const hasDays = !!activeWeek?.days?.length;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to active week button when it changes
  useEffect(() => {
    if (!scrollRef.current || activeWeekIndex < 0) return;
    const container = scrollRef.current;
    const activeButton = container.children[activeWeekIndex] as HTMLElement | undefined;
    if (activeButton) {
      activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeWeekIndex]);

  return (
    <div className="sticky top-0 z-10 border-b-2 border-foreground bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Issue Archive
          </p>
          <h2 className="font-display text-xl font-normal leading-tight text-foreground">{t("weekOverview")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={activeWeekIndex < 0 || activeWeekIndex >= weeks.length - 1}
            className="h-10 w-10 rounded-none border border-border bg-card hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={activeWeekIndex <= 0}
            className="h-10 w-10 rounded-none border border-border bg-card hover:bg-secondary"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" aria-hidden="true" />

        <div ref={scrollRef} className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide scroll-smooth" style={{ touchAction: 'pan-x' }}>
          {weeks.length === 0 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-20 shrink-0 rounded-lg" />
              ))}
            </>
          )}
          {weeks.map((week) => {
            const isActive = activeWeek?.id === week.id;
            const weekHasDays = !!week.days?.length;

            return (
              <button
                key={week.id}
                onClick={() => selectWeek(week)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border px-4 py-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground hover:bg-secondary",
                  week.current && !isActive && "ring-1 ring-primary/30"
                )}
              >
                <div className="flex flex-col items-center">
                  <span className="font-display text-base font-normal leading-tight">{getPeriodLabel(week.id, language)}</span>
                  <span className="text-xs opacity-80">{week.dateRange}</span>
                </div>
                {weekHasDays && (
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isActive && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                )}
                {week.current && !weekHasDays && (
                  <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {t("current")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" aria-hidden="true" />
      </div>

      <Collapsible open={hasDays}>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:slide-out-to-top-1">
          <div className="border-t border-border/50">
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide" style={{ touchAction: 'pan-x' }}>
              {activeWeek?.days?.map((day) => (
                <button
                  key={day.id}
                  onClick={() => onWeekChange(day.id)}
                  className={cn(
                    "shrink-0 flex flex-col items-center border px-3 py-2.5 transition-colors duration-200",
                    selectedDay === day.id
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border bg-card text-secondary-foreground hover:border-foreground hover:bg-secondary",
                    day.current &&
                      selectedDay !== day.id &&
                      "ring-2 ring-accent ring-offset-1 ring-offset-background"
                  )}
                >
                  <span className="text-[11px] font-medium opacity-80">{day.weekday}</span>
                  <span className="text-sm font-semibold">{day.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
