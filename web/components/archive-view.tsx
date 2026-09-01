import Link from "next/link";
import type { AppLanguage } from "@/lib/i18n";

/** One published day, as the archive index reports it. */
export interface ArchiveDay {
  id: string;
  itemCount: number;
}

interface ArchiveViewProps {
  days: ArchiveDay[];
  year: number;
  years: number[];
  language: AppLanguage;
  today: string;
}

const COPY = {
  en: {
    archive: "Archive",
    heading: "Archive",
    weeksIn: (month: string) => `Weeks in ${month}`,
    items: (n: number) => `${n} items`,
    less: "Less",
    more: "More",
    todayIs: (day: string) => `outlined cell = today, ${day}`,
    /* Short month + day, as the mock writes it. The raw id ("2026-08-29") is the
       cell's own label where the full date disambiguates; in a legend sentence it
       reads as machine output. */
    dows: ["Mon", "", "Wed", "", "Fri", "", "Sun"],
    empty: "No days published for this year yet.",
  },
  zh: {
    archive: "归档",
    heading: "归档",
    weeksIn: (month: string) => `${month}的周`,
    items: (n: number) => `${n} 条`,
    less: "少",
    more: "多",
    todayIs: (day: string) => `框选一格 = 今天，${day}`,
    dows: ["一", "", "三", "", "五", "", "日"],
    empty: "这一年还没有收录内容。",
  },
} as const;

/** Monday-based column index for a date, counted from the grid's first Monday. */
function isoDow(date: Date): number {
  return (date.getUTCDay() || 7) - 1;
}

function startOfGrid(year: number): Date {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const monday = new Date(jan1);
  monday.setUTCDate(jan1.getUTCDate() - isoDow(jan1));
  return monday;
}

/**
 * Shade level 0-5 for a day's volume.
 *
 * Thresholds are relative to the busiest day in the year rather than absolute:
 * a day holding 21 items is a quiet day in a 300-item week and a busy one in a
 * month that averages 20, and the grid is meant to show that shape. Level 0 is
 * reserved for a published day that holds nothing, so "published but empty" and
 * "never published" stay visually distinct -- the latter draws no cell at all.
 */
function heatLevel(count: number, busiest: number): number {
  if (count <= 0) return 0;
  if (busiest <= 0) return 1;
  const share = count / busiest;
  if (share > 0.8) return 5;
  if (share > 0.6) return 4;
  if (share > 0.4) return 3;
  if (share > 0.2) return 2;
  return 1;
}

/**
 * Year → month heatmap → week list, the hierarchy the design specifies.
 *
 * Server-rendered: everything here is derived from the published index, so there
 * is no interaction to hydrate beyond following a link.
 */
export function ArchiveView({ days, year, years, language, today }: ArchiveViewProps) {
  const copy = COPY[language] || COPY.en;
  const locale = language === "zh" ? "zh-CN" : "en-US";

  const counts = new Map(days.map((day) => [day.id, day.itemCount]));
  const inYear = days.filter((day) => day.id.startsWith(`${year}-`));
  const busiest = Math.max(0, ...inYear.map((day) => day.itemCount));

  // The grid runs from the Monday on or before Jan 1 to the last published day of
  // the year -- never to Dec 31 of a year still in progress, which would draw
  // months of empty cells for dates that have not happened.
  const gridStart = startOfGrid(year);
  const lastDay = inYear[0]?.id || `${year}-01-01`;
  const gridEnd = new Date(`${lastDay}T00:00:00Z`);
  // floor + 1, not ceil + 1: gridStart is a Monday, so the number of week columns
  // the range spans is the count of whole weeks between the two dates plus the
  // week gridEnd itself falls in. ceil already rounds a partial week up, and the
  // extra +1 then drew one empty column past the last day of data.
  const weeks = Math.max(1, Math.floor((gridEnd.getTime() - gridStart.getTime()) / 604_800_000) + 1);

  // Month labels sit at the column where each month's first week starts.
  const months: Array<{ label: string; column: number; isNow: boolean }> = [];
  for (let month = 0; month < 12; month += 1) {
    const first = new Date(Date.UTC(year, month, 1));
    if (first > gridEnd) break;
    const column = Math.floor((first.getTime() - gridStart.getTime()) / 604_800_000) + 1;
    months.push({
      label: first.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }),
      column,
      isNow: today.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
    });
  }

  const cells: Array<{ id: string; row: number; column: number; count: number; published: boolean }> = [];
  for (let index = 0; index < weeks * 7; index += 1) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    if (date > gridEnd) break;
    const id = date.toISOString().slice(0, 10);
    if (!id.startsWith(`${year}-`)) continue;
    cells.push({
      id,
      row: isoDow(date) + 1,
      column: Math.floor(index / 7) + 1,
      count: counts.get(id) || 0,
      published: counts.has(id),
    });
  }

  // Weeks of the most recent published month, newest first: the design's third
  // level, between the year grid and a single day.
  const recentMonth = lastDay.slice(0, 7);
  const monthName = new Date(`${recentMonth}-01T00:00:00Z`).toLocaleDateString(locale, {
    month: "long",
    timeZone: "UTC",
  });
  const monthWeeks = new Map<string, { start: Date; days: ArchiveDay[]; count: number }>();
  for (const day of inYear.filter((entry) => entry.id.startsWith(recentMonth))) {
    const date = new Date(`${day.id}T00:00:00Z`);
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - isoDow(date));
    const key = monday.toISOString().slice(0, 10);
    const bucket = monthWeeks.get(key) || { start: monday, days: [], count: 0 };
    bucket.days.push(day);
    bucket.count += day.itemCount;
    monthWeeks.set(key, bucket);
  }
  const weekRows = [...monthWeeks.values()].sort((a, b) => b.start.getTime() - a.start.getTime());
  const currentWeekKey = weekRows[0]?.start.toISOString().slice(0, 10);

  const dayRange = (start: Date) => {
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const from = start.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
    const to = end.toLocaleDateString(
      locale,
      start.getUTCMonth() === end.getUTCMonth()
        ? { day: "numeric", timeZone: "UTC" }
        : { month: "short", day: "numeric", timeZone: "UTC" },
    );
    return `${from} – ${to}`;
  };

  return (
    <div className="f-page">
      <div className="f-paper f-paper-900">
        {/* Wordmark and kicker only, as the mock draws every 900px frame's top bar.
            The "← Home" link that used to sit at the right was a second route to the
            same place the wordmark already goes. */}
        <header className="f-top">
          <Link href={`/${language}`} className="f-wordmark">
            Frontier
          </Link>
          <span className="f-kicker">{copy.archive}</span>
        </header>

        <nav className="f-yeartabs" aria-label={copy.heading}>
          {years.map((entry) => (
            <Link
              key={entry}
              className="f-yeartab"
              href={`/${language}/archive?year=${entry}`}
              aria-current={entry === year}
            >
              {entry}
            </Link>
          ))}
        </nav>

        {inYear.length === 0 ? (
          <div className="f-empty">
            <p className="f-empty-t">{copy.empty}</p>
          </div>
        ) : (
          <>
            <div className="f-heat">
              <div className="f-heat-scroll">
                {/* 8px tracks, the same as the cell grid below, so a label sits over the
                    first week of its month. At 14px the two grids drifted apart by 3px a
                    week and by August the label stood a month to the right of its
                    column. The text overflows its own 8px track and that is intended --
                    white-space: nowrap lets it run right over the weeks it labels. */}
                <div className="f-heat-months" style={{ gridTemplateColumns: `repeat(${weeks}, 8px)` }}>
                  {months.map((month) => (
                    <span
                      key={month.label}
                      className={`f-heat-month${month.isNow ? " is-now" : ""}`}
                      style={{ gridColumn: month.column }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
                <div className="f-heat-grid">
                  <div className="f-heat-dows" aria-hidden="true">
                    {copy.dows.map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                  <div className="f-heat-cells" style={{ gridTemplateColumns: `repeat(${weeks}, 8px)` }}>
                    {cells.map((cell) =>
                      /* A cell is a link only when there is an archive behind it,
                         so the pointer never promises a page that is not there. */
                      cell.published ? (
                        <Link
                          key={cell.id}
                          href={`/${language}/week/${cell.id}`}
                          className={`f-cell${cell.id === today ? " is-today" : ""}`}
                          data-level={heatLevel(cell.count, busiest)}
                          style={{ gridRow: cell.row, gridColumn: cell.column }}
                          title={`${cell.id} · ${copy.items(cell.count)}`}
                          aria-label={`${cell.id} · ${copy.items(cell.count)}`}
                        />
                      ) : (
                        <span
                          key={cell.id}
                          className="f-cell is-empty"
                          style={{ gridRow: cell.row, gridColumn: cell.column }}
                          aria-hidden="true"
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div className="f-heat-legend">
                <span>{copy.less}</span>
                {[0, 2, 3, 4, 5].map((level) => (
                  <i key={level} style={{ background: `var(--f-heat-${level})` }} />
                ))}
                <span>{copy.more}</span>
                <span className="f-heat-note">
                  {copy.todayIs(
                    new Date(`${today}T00:00:00Z`).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }),
                  )}
                </span>
              </div>
            </div>

            <div className="f-weeks">
              <div className="f-label" style={{ marginBottom: "12px" }}>
                {copy.weeksIn(monthName)}
              </div>
              <div className="f-weeks-list">
                {weekRows.map((week) => {
                  const key = week.start.toISOString().slice(0, 10);
                  return (
                    <div key={key}>
                      <div className={`f-week${key === currentWeekKey ? " is-current" : ""}`}>
                        <span className="f-week-l">{dayRange(week.start)}</span>
                        <span className="f-week-n">{copy.items(week.count)}</span>
                      </div>
                      {/* The week expands to its days, the design's last level. */}
                      <div className="f-week-days">
                        {week.days
                          .slice()
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((day) => (
                            <Link
                              key={day.id}
                              className="f-day"
                              href={`/${language}/week/${day.id}`}
                            >
                              <span>
                                {new Date(`${day.id}T00:00:00Z`).toLocaleDateString(locale, {
                                  weekday: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                })}
                              </span>
                              <span className="f-day-n">· {day.itemCount}</span>
                            </Link>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
