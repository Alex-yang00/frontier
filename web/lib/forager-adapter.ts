import type { InvestmentData, MultilingualData, TechPost, TipPost, TipPlatform } from "@/lib/types";

export interface ForagerItem {
  id: string;
  title: string;
  title_en?: string;
  title_zh?: string;
  url: string;
  source: string;
  source_name: string;
  tags?: string[];
  published: string;
  summary?: string;
  summary_en?: string;
  summary_zh?: string;
  lang?: string;
  score?: number;
  points?: number;
  comments?: number;
  impact?: "critical" | "high" | "medium" | "low";
  section?: "tech" | "investment" | "tips";
}

export function dataUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_FORAGER_DATA_URL || "/data").replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

export function contentLanguage(language: string): "en" | "zh" {
  return language === "zh" ? "zh" : "en";
}

function languageText(item: ForagerItem, language: string, field: "title" | "summary") {
  if (language === "zh") return item[`${field}_zh` as "title_zh" | "summary_zh"] || item[field] || "";
  return item[`${field}_en` as "title_en" | "summary_en"] || item[field] || "";
}

function author(item: ForagerItem) {
  return { name: item.source_name, handle: item.source, avatar: item.source_name.slice(0, 2).toUpperCase(), verified: true };
}

export function toTech(item: ForagerItem, language: string, index: number): TechPost {
  const points = item.points || item.score || 0;
  return {
    id: index + 1, author: author(item), content: `${languageText(item, language, "title")}: ${languageText(item, language, "summary")}`.replace(/: $/, ""),
    tags: item.tags || [], category: item.tags?.[0] || "AI", iconType: "Cpu", impact: item.impact || (points >= 75 ? "critical" : points >= 55 ? "high" : "medium"),
    timestamp: item.published, metrics: { comments: item.comments || 0, retweets: 0, likes: points, views: "" }, source: item.source_name, sourceUrl: item.url,
  };
}

export function toTips(items: ForagerItem[], language: string): MultilingualData<TipPost> {
  return { [language]: items.filter((item) => item.section === "tips").map((item, index) => ({
    id: index + 1, author: author(item), platform: "Reddit" as TipPlatform, content: languageText(item, language, "title"), tip: languageText(item, language, "summary"), category: item.tags?.[0] || "workflow", difficulty: "Intermediate", timestamp: item.published,
    metrics: { comments: item.comments || 0, retweets: 0, likes: item.points || item.score || 0, views: "" }, sourceUrl: item.url,
  })) };
}

export function toInvestments(items: ForagerItem[], language: string): InvestmentData {
  const primary = items.filter((item) => item.section === "investment").map((item, index) => ({
    id: index + 1, author: author(item), content: languageText(item, language, "title") + (item.summary ? `: ${languageText(item, language, "summary")}` : ""), company: item.source_name, amount: "Reported", round: item.tags?.[0] || "AI", roundCategory: "Unknown" as const, investors: [], valuation: "", timestamp: item.published, metrics: { comments: item.comments || 0, retweets: 0, likes: item.points || item.score || 0, views: "" }, sourceUrl: item.url,
  }));
  return { primaryMarket: { [language]: primary }, secondaryMarket: { [language]: [] }, ma: { [language]: [] } };
}
