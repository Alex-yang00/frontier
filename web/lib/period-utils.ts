/**
 * Utility functions for handling both weekly (YYYY-kwWW) and daily (YYYY-MM-DD) period IDs.
 */

/** Check if a period ID is daily format (YYYY-MM-DD) */
export function isDailyId(id: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(id);
}

/** Check if a period ID is weekly format (YYYY-kwWW) */
export function isWeeklyId(id: string): boolean {
  return /^\d{4}-kw\d{2}$/.test(id);
}

/**
 * Get display label for a period ID.
 * Weekly: "W 05" (EN) / "第 05 周" (ZH)
 * Daily: "Feb 7" (EN) / "2月7日" (ZH)
 */
export function getPeriodLabel(id: string, language: string): string {
  if (isDailyId(id)) {
    const [year, month, day] = id.split("-").map(Number);
    if (language === "zh") return `${month}月${day}日`;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // Weekly format
  const weekNum = id.split("-kw")[1];
  return language === "zh" ? `第 ${weekNum} 周` : `W ${weekNum}`;
}

/**
 * Format a period ID for use in page titles and metadata.
 * Weekly: "Week 05" (EN) / "第 05 周" (ZH)
 * Daily: "Feb 7, 2026" (EN) / "2026年2月7日" (ZH)
 */
export function formatPeriodTitle(id: string, language: string): string {
  if (isDailyId(id)) {
    const [year, month, day] = id.split("-").map(Number);
    if (language === "zh") return `${year}年${month}月${day}日`;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const weekNum = id.split("-kw")[1];
  return language === "zh" ? `第 ${weekNum} 周` : `Week ${weekNum}`;
}

/**
 * Get the period number for badge display.
 * Weekly: week number (e.g., "05"). Daily: day of month (e.g., "07").
 */
export function getPeriodNum(id: string): string {
  if (isDailyId(id)) {
    return id.split("-")[2];
  }
  return id.split("-kw")[1];
}

/**
 * Derive a published-at Date for a period id — the day itself for daily IDs,
 * Saturday of the ISO week for weekly IDs. Single source of truth used by
 * sitemap.ts (lastModified) and week page (datePublished / OG publishedTime)
 * — drift between these two would be a real freshness-signal SEO cost.
 */
export function periodPublishedDate(periodId: string): Date {
  const dayMatch = periodId.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    return new Date(`${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}T00:00:00Z`);
  }
  const weekMatch = periodId.match(/^(\d{4})-kw(\d{2})$/);
  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10);
    const week = parseInt(weekMatch[2], 10);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7; // Mon=1 .. Sun=7
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
    const saturday = new Date(mondayWeek1);
    saturday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7 + 5);
    return saturday;
  }
  return new Date();
}

/**
 * Get the parent weekly period ID (YYYY-kwWW) for a daily period ID (YYYY-MM-DD).
 * Uses ISO 8601 week numbering (Monday-based weeks).
 * Returns null if the input is not a daily ID.
 */
export function getParentWeekId(dailyId: string): string | null {
  if (!isDailyId(dailyId)) return null;
  const [year, month, day] = dailyId.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // ISO week: Monday=1 ... Sunday=7
  const dayOfWeek = date.getUTCDay() || 7; // Convert Sunday=0 to 7
  // Thursday of this ISO week determines the year/week number
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + (4 - dayOfWeek));
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-kw${String(weekNum).padStart(2, "0")}`;
}
