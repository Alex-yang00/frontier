import { getParentWeekId, isDailyId } from "@/lib/period-utils";

export const API_BASE = "";

export const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  en: "English",
  zh: "Chinese",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
};

export function normalizeLanguage(value: unknown): string {
  return typeof value === "string" && value in LANGUAGE_NAMES ? value : "en";
}

export function isValidPeriodId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^\d{4}-kw\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value))
  );
}

export function countNestedArrays(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).reduce(
    (total, child) => total + countNestedArrays(child),
    0,
  );
}

export function hasNestedData(...values: unknown[]): boolean {
  return values.some((value) => countNestedArrays(value) > 0);
}

async function fetchPeriodData(periodId: string) {
  const fetchOne = async (apiPath: string) => {
    try {
      const res = await fetch(`${API_BASE}${apiPath}`, {
        next: { revalidate: 300 },
      });
      if (res.ok) return res.json();
    } catch {
      /* fall through */
    }
    return null;
  };

  const [tech, investment, tips, trends] = await Promise.all([
    fetchOne(`/tech/${periodId}`),
    fetchOne(`/investment/${periodId}`),
    fetchOne(`/tips/${periodId}`),
    fetchOne(`/trends/${periodId}`),
  ]);

  return { tech, investment, tips, trends };
}

export async function fetchPeriodDataWithFallback(periodId: string): Promise<{
  tech: any;
  investment: any;
  tips: any;
  trends: any;
  resolvedPeriod: string;
}> {
  let data = await fetchPeriodData(periodId);
  if (hasNestedData(data.tech, data.investment, data.tips, data.trends)) {
    return { ...data, resolvedPeriod: periodId };
  }

  if (isDailyId(periodId)) {
    const parentWeek = getParentWeekId(periodId);
    if (parentWeek) {
      data = await fetchPeriodData(parentWeek);
      if (hasNestedData(data.tech, data.investment, data.tips, data.trends)) {
        return { ...data, resolvedPeriod: parentWeek };
      }
    }

    const [y, m, d] = periodId.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = date.getUTCDay() || 7;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - (dayOfWeek - 1));

    for (let offset = 6; offset >= 0; offset--) {
      const tryDate = new Date(monday);
      tryDate.setUTCDate(monday.getUTCDate() + offset);
      const tryId = tryDate.toISOString().slice(0, 10);
      if (tryId === periodId) continue;
      data = await fetchPeriodData(tryId);
      if (hasNestedData(data.tech, data.investment, data.tips, data.trends)) {
        return { ...data, resolvedPeriod: tryId };
      }
    }
  }

  return { ...data, resolvedPeriod: periodId };
}

export function condensePeriodData(
  tech: any,
  investment: any,
  tips: any,
  trends: any,
  lang: string,
): string {
  const lines: string[] = [];

  const techItems = tech?.[lang] ?? tech?.de ?? [];
  if (techItems.length) {
    lines.push("## Tech News");
    for (const item of techItems) {
      lines.push(
        `- [${item.category || "General"}] (${item.impact || "medium"}) ${item.content ?? ""}${item.source ? ` (Source: ${item.source})` : ""}`,
      );
    }
  }

  const primary =
    investment?.primaryMarket?.[lang] ?? investment?.primaryMarket?.de ?? [];
  if (primary.length) {
    lines.push("## Primary Market");
    for (const item of primary) {
      lines.push(
        `- ${item.company}: ${item.amount || "undisclosed"} (${item.round || "N/A"})`,
      );
    }
  }

  const secondary =
    investment?.secondaryMarket?.[lang] ??
    investment?.secondaryMarket?.de ??
    [];
  if (secondary.length) {
    lines.push("## Secondary Market");
    for (const item of secondary) {
      lines.push(
        `- ${item.ticker}: ${item.price} (${item.direction === "up" ? "+" : ""}${item.change})`,
      );
    }
  }

  const ma = investment?.ma?.[lang] ?? investment?.ma?.de ?? [];
  if (ma.length) {
    lines.push("## M&A");
    for (const item of ma) {
      lines.push(
        `- ${item.acquirer} -> ${item.target}: ${item.dealValue || "undisclosed"}`,
      );
    }
  }

  const tipItems = tips?.[lang] ?? tips?.de ?? [];
  if (tipItems.length) {
    lines.push("## Tips");
    for (const item of tipItems) {
      lines.push(
        `- [${item.difficulty || "General"}] ${item.tip ?? item.content ?? ""} (${item.platform || ""})`,
      );
    }
  }

  const trendItems = trends?.trends?.[lang] ?? trends?.trends?.de ?? [];
  if (trendItems.length) {
    lines.push("## Trends");
    for (const item of trendItems) {
      lines.push(`- ${item.title} (${item.category || ""})`);
    }
  }

  return lines.join("\n");
}
