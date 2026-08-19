"use client";

import { useEffect, useState } from "react";
import { API_BASE, USE_API } from "@/lib/api-base";
import { dataUrl } from "@/lib/forager-adapter";
import type { TrendItem } from "@/lib/types";

type TrendsResponse = {
  trends?: Record<string, TrendItem[] | undefined>;
};

const fallbackTrendsEN: TrendItem[] = [
  { category: "AI", title: "GPT-5" },
  { category: "Technology", title: "NVIDIA Blackwell" },
  { category: "Finance", title: "AI Stocks" },
  { category: "Science", title: "AlphaFold 3" },
  { category: "Startups", title: "Anthropic" },
];

const fallbackTrends: Record<string, TrendItem[]> = {
  de: [
    { category: "KI", title: "GPT-5" },
    { category: "Technologie", title: "NVIDIA Blackwell" },
    { category: "Finanzen", title: "KI-Aktien" },
    { category: "Wissenschaft", title: "AlphaFold 3" },
    { category: "Startups", title: "Anthropic" },
  ],
  en: fallbackTrendsEN,
  zh: [
    { category: "AI", title: "GPT-5" },
    { category: "技术", title: "NVIDIA Blackwell" },
    { category: "资本", title: "AI 投资" },
    { category: "科学", title: "AlphaFold 3" },
    { category: "公司", title: "Anthropic" },
  ],
  fr: [
    { category: "IA", title: "GPT-5" },
    { category: "Technologie", title: "NVIDIA Blackwell" },
    { category: "Finance", title: "Actions IA" },
    { category: "Science", title: "AlphaFold 3" },
    { category: "Startups", title: "Anthropic" },
  ],
  es: [
    { category: "IA", title: "GPT-5" },
    { category: "Tecnologia", title: "NVIDIA Blackwell" },
    { category: "Finanzas", title: "Acciones de IA" },
    { category: "Ciencia", title: "AlphaFold 3" },
    { category: "Startups", title: "Anthropic" },
  ],
  pt: [
    { category: "IA", title: "GPT-5" },
    { category: "Tecnologia", title: "NVIDIA Blackwell" },
    { category: "Financas", title: "Acoes de IA" },
    { category: "Ciencia", title: "AlphaFold 3" },
    { category: "Startups", title: "Anthropic" },
  ],
  ja: [
    { category: "AI", title: "GPT-5" },
    { category: "技術", title: "NVIDIA Blackwell" },
    { category: "金融", title: "AI 株" },
    { category: "科学", title: "AlphaFold 3" },
    { category: "スタートアップ", title: "Anthropic" },
  ],
  ko: [
    { category: "AI", title: "GPT-5" },
    { category: "기술", title: "NVIDIA Blackwell" },
    { category: "금융", title: "AI 주식" },
    { category: "과학", title: "AlphaFold 3" },
    { category: "스타트업", title: "Anthropic" },
  ],
};

export function getFallbackTrends(language: string): TrendItem[] {
  return fallbackTrends[language] || fallbackTrendsEN;
}

function selectTrends(data: TrendsResponse, language: string): TrendItem[] {
  const languageTrends = data.trends?.[language];
  if (languageTrends && languageTrends.length > 0) return languageTrends;

  const germanTrends = data.trends?.de;
  if (germanTrends && germanTrends.length > 0) return germanTrends;

  const englishTrends = data.trends?.en;
  if (englishTrends && englishTrends.length > 0) return englishTrends;

  return getFallbackTrends(language);
}

async function fetchJson(url: string, signal: AbortSignal): Promise<TrendsResponse> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<TrendsResponse>;
}

export function usePeriodTrends(weekId: string, language: string, enabled = true) {
  const [trends, setTrends] = useState<TrendItem[]>(() => getFallbackTrends(language));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !weekId) {
      setTrends(getFallbackTrends(language));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    async function loadTrends() {
      setLoading(true);
      const apiUrl = USE_API ? `${API_BASE}/trends/${weekId}` : dataUrl(`${weekId}/trends.json`);

      try {
        const data = await fetchJson(apiUrl, signal);
        if (!signal.aborted) setTrends(selectTrends(data, language));
      } catch {
        if (signal.aborted) return;
        if (USE_API) {
          try {
            const data = await fetchJson(dataUrl(`${weekId}/trends.json`), signal);
            if (!signal.aborted) setTrends(selectTrends(data, language));
          } catch {
            if (!signal.aborted) setTrends(getFallbackTrends(language));
          }
        } else {
          setTrends(getFallbackTrends(language));
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    loadTrends();

    return () => controller.abort();
  }, [enabled, weekId, language]);

  return { trends, loading };
}
