/**
 * API client for the AI Hub backend.
 *
 * This module reads Frontier's published canonical JSON files.
 */

import type { WeeksData, TechPost, InvestmentData, TipPost, TrendsData, MultilingualData } from "@/lib/types";
import { API_BASE, USE_API } from "@/lib/api-base";
import { dataUrl, toInvestments, toTips, toTech, type FrontierItem } from "@/lib/frontier-adapter";

/**
 * Fetch with fallback to static JSON.
 */
async function fetchWithFallback<T>(
  apiPath: string,
  staticPath: string
): Promise<T> {
  if (USE_API) {
    try {
      const res = await fetch(`${API_BASE}${apiPath}`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });
      if (res.ok) {
        return res.json();
      }
    } catch (error) {
      console.warn(`API fetch failed for ${apiPath}, falling back to static`, error);
    }
  }

  // Fallback to static JSON
  const res = await fetch(staticPath);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${staticPath}`);
  }
  return res.json();
}

/**
 * Fetch list of available weeks.
 */
export async function fetchWeeks(): Promise<WeeksData> {
  return fetchWithFallback<WeeksData>("/weeks", dataUrl("weeks.json"));
}

/**
 * Fetch current week.
 */
export async function fetchCurrentWeek(): Promise<{ id: string }> {
  if (USE_API) {
    try {
      const res = await fetch(`${API_BASE}/weeks/current`);
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fall through to static
    }
  }

  // Get from weeks.json
  const data = await fetchWeeks();
  const current = data.weeks.find((w) => w.current) || data.weeks[0];
  return { id: current?.id || "2025-kw04" };
}

/**
 * Fetch tech feed for a specific week.
 */
export async function fetchTechFeed(weekId: string): Promise<MultilingualData<TechPost>> {
  if (weekId === "2026-08-12" || weekId === "") {
    const res = await fetch(dataUrl("daily.json"));
    const data = await res.json() as { items: FrontierItem[] };
    return { en: (data.items || []).map((item, index) => toTech(item, "en", index)) };
  }
  return fetchWithFallback<MultilingualData<TechPost>>(
    `/tech/${weekId}`,
    dataUrl(`${weekId}/tech.json`)
  );
}

/**
 * Fetch investment feed for a specific week.
 */
export async function fetchInvestmentFeed(weekId: string): Promise<InvestmentData> {
  if (!USE_API) {
    const res = await fetch(dataUrl("daily.json"));
    const data = await res.json() as { items: FrontierItem[] };
    return toInvestments(data.items || [], "en");
  }
  return fetchWithFallback<InvestmentData>(
    `/investment/${weekId}`,
    dataUrl(`${weekId}/investment.json`)
  );
}

/**
 * Fetch tips feed for a specific week.
 */
export async function fetchTipsFeed(weekId: string): Promise<MultilingualData<TipPost>> {
  if (!USE_API) {
    const res = await fetch(dataUrl("daily.json"));
    const data = await res.json() as { items: FrontierItem[] };
    return toTips(data.items || [], "en");
  }
  return fetchWithFallback<MultilingualData<TipPost>>(
    `/tips/${weekId}`,
    dataUrl(`${weekId}/tips.json`)
  );
}

/**
 * Fetch trends for a specific week.
 */
export async function fetchTrends(weekId: string): Promise<TrendsData> {
  return fetchWithFallback<TrendsData>(
    `/trends/${weekId}`,
    dataUrl(`${weekId}/trends.json`)
  );
}

/**
 * Check if the API is available.
 */
export async function checkApiHealth(): Promise<boolean> {
  if (!USE_API) return false;

  try {
    const res = await fetch(`${API_BASE.replace("/api", "")}/health`, {
      method: "GET",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { USE_API, API_BASE };
