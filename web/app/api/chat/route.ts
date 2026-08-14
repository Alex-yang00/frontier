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
  condensePeriodData,
  fetchPeriodDataWithFallback,
  isValidPeriodId,
  LANGUAGE_NAMES,
  normalizeLanguage,
} from "@/lib/server/period-context";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// SEC-H3: Allowed message roles - filter out any other roles (e.g., "system")
const ALLOWED_ROLES = new Set(["user", "assistant"]);

export async function POST(req: Request) {
  try {
    enforceProtectedApiRequest(req);
    enforceRateLimit(req, "chat", { limit: 20, windowMs: 10 * 60 * 1000 });

    const { messages, weekId, language } = await readJsonBody<{
      messages?: { role: string; content: string }[];
      weekId?: string;
      language?: string;
    }>(req, 160_000);

    if (!isValidPeriodId(weekId)) {
      throw new ApiRouteError(400, "Missing or invalid weekId");
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new ApiRouteError(503, "LLM service not configured");
    }

    const lang = normalizeLanguage(language);
    const { tech, investment, tips, trends } =
      await fetchPeriodDataWithFallback(weekId);
    const weekContext = condensePeriodData(tech, investment, tips, trends, lang);

    const systemPrompt = `You are the Forager Hub Assistant — a concise helper for the Forager Information Hub platform.

SCOPE:
- Answer questions about this week's AI news, trends, investments, and tips shown on the platform.
- Discuss general AI industry topics (models, companies, research, tools).
- Help users navigate the platform (feeds, week selector, settings).

OFF-TOPIC:
- If a user asks about something unrelated (weather, sports, cooking, etc.), respond: "I'm focused on AI news and this platform's content. How can I help you with AI topics?"

STYLE:
- Be concise: 2-3 short paragraphs max, never exceed 300 words.
- Cite specific news items from the context when relevant.
- Respond in ${LANGUAGE_NAMES[lang] || "English"}.

CONTEXT — This week's AI data:
${weekContext || "No data available for this week."}`;

    // Cap message history to last 10 messages for token budget
    // SEC-H3: Filter message roles to only allow "user" and "assistant"
    const messageList = Array.isArray(messages) ? messages : [];
    const coreMessages = messageList
      .filter((msg: { role: string }) => ALLOWED_ROLES.has(msg.role))
      .slice(-10)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: typeof msg.content === "string" ? msg.content.slice(0, 10000) : "", // SEC-H2: Limit content size
      }));

    const result = streamText({
      model: openrouter.chat("openrouter/free"),
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens: 500,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return apiErrorResponse(error);
  }
}
