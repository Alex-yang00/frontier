import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  ApiRouteError,
  apiErrorResponse,
  enforceProtectedApiRequest,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/api-guard";
import {
  fetchPeriodDataWithFallback,
  isValidPeriodId,
} from "@/lib/server/period-context";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese",
};

function condenseWeekData(
  tech: any,
  investment: any,
  tips: any,
  trends: any,
  lang: string
): string {
  const lines: string[] = [];

  const techItems = tech?.[lang] ?? tech?.en ?? [];
  if (techItems.length) {
    lines.push("## Tech News");
    for (const item of techItems) {
      lines.push(
        `- [${item.category || "General"}] (${item.impact || "medium"}) ${item.content ?? ""}${item.source ? ` (Source: ${item.source})` : ""}`
      );
    }
  }

  const primary =
    investment?.primaryMarket?.[lang] ?? investment?.primaryMarket?.en ?? [];
  if (primary.length) {
    lines.push("## Primary Market");
    for (const item of primary) {
      const investors = Array.isArray(item.investors) && item.investors.length
        ? ` — investors: ${item.investors.join(", ")}`
        : "";
      lines.push(
        `- ${item.company}: ${item.amount || "undisclosed"} (${item.round || "N/A"})${investors}`
      );
    }
  }

  const secondary =
    investment?.secondaryMarket?.[lang] ??
    investment?.secondaryMarket?.en ??
    [];
  if (secondary.length) {
    lines.push("## Secondary Market");
    for (const item of secondary) {
      const quote =
        item.price && item.price !== "N/A"
          ? ` (${item.price}, ${item.direction === "up" ? "+" : ""}${item.change})`
          : "";
      lines.push(
        `- ${item.ticker}: ${item.content || ""}${quote}`
      );
    }
  }

  const ma = investment?.ma?.[lang] ?? investment?.ma?.en ?? [];
  if (ma.length) {
    lines.push("## M&A");
    for (const item of ma) {
      lines.push(
        `- ${item.acquirer} → ${item.target}: ${item.dealValue || "undisclosed"}`
      );
    }
  }

  const tipItems = tips?.[lang] ?? tips?.en ?? [];
  if (tipItems.length) {
    lines.push("## Tips");
    for (const item of tipItems) {
      lines.push(
        `- [${item.difficulty || "General"}] ${item.tip ?? item.content ?? ""} (${item.platform || ""})`
      );
    }
  }

  const trendItems = trends?.trends?.[lang] ?? trends?.trends?.en ?? [];
  if (trendItems.length) {
    lines.push("## Trends");
    for (const item of trendItems) {
      lines.push(`- ${item.title} (${item.category || ""})`);
    }
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    enforceProtectedApiRequest(req);
    enforceRateLimit(req, "report", { limit: 5, windowMs: 10 * 60 * 1000 });

    const { weekId, language } = await readJsonBody<{
      weekId?: string;
      language?: string;
    }>(req, 16_000);

    if (!isValidPeriodId(weekId)) {
      throw new ApiRouteError(400, "Missing or invalid weekId");
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new ApiRouteError(503, "LLM service not configured");
    }

    const lang: string =
      typeof language === "string" && language in LANGUAGE_NAMES ? language : "en";

    const { tech, investment, tips, trends, resolvedPeriod } = await fetchPeriodDataWithFallback(weekId);
    const context = condenseWeekData(tech, investment, tips, trends, lang);

    if (!context.trim()) {
      return new Response("No data available for this period", { status: 404 });
    }

    const periodLabel = resolvedPeriod !== weekId ? `${weekId} (data from ${resolvedPeriod})` : weekId;

    const systemPrompt = `You are a senior AI industry analyst writing a comprehensive weekly briefing report. Write in ${LANGUAGE_NAMES[lang] || "English"}.

Generate a well-structured Markdown report based on the provided data. Use the following sections:

## Executive Summary
Write 2-3 paragraphs providing a high-level overview of the most significant developments this period. Highlight the key themes and their potential impact on the AI industry.

## Technology Breakthroughs
Analyze the tech news in detail. Group related developments, explain their significance, and note the impact level. Reference specific sources where available.

## Investment & Market Activity

### Primary Market (Funding Rounds)
Present the funding rounds as a GitHub-Flavored Markdown table (columns: Company | Round | Amount | Investors), then briefly analyze what the companies do.

### Secondary Market (Market News)
Summarize notable as-reported market news and what it signals about sentiment.

### Mergers & Acquisitions
Present M&A activity as a GitHub-Flavored Markdown table (columns: Acquirer | Target | Deal), then discuss strategic rationale and industry implications.

## Practical AI Tips
Curate the most valuable tips, adding context about when and why each tip is useful. Group by difficulty level if applicable.

## Key Trends & Outlook
Synthesize the trending topics into a forward-looking analysis. Identify patterns across the data and provide perspective on where the AI industry is heading.

---

IMPORTANT GUIDELINES:
- Base your report ONLY on the provided data. Do not fabricate information.
- If a section has no data, write "No data available for this section." and move on.
- Use professional, analytical tone suitable for business executives and tech leaders.
- Include specific numbers, company names, and details from the data.
- Keep the report comprehensive but focused — aim for quality analysis over quantity.

DATA:
${context}`;

    const result = streamText({
      model: openrouter.chat("openrouter/free"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate the comprehensive AI briefing report for period ${periodLabel}.`,
        },
      ],
      maxOutputTokens: 4096,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Report API error:", error);
    return apiErrorResponse(error);
  }
}
