---
name: frontier
description: Read and investigate Frontier's public AI intelligence feed. Use this skill whenever a user asks for today's AI news, a Frontier briefing, important AI developments, topic or company searches across recent Frontier editions, a specific Frontier archive date, feed freshness, or original-source links. Do not use it for general web research unrelated to Frontier's published feed.
---

# Frontier Intelligence

Use Frontier as a curated navigation layer, not as a primary source. Retrieve the
smallest public JSON file that can answer the request, check its freshness, and
link claims to the publishers recorded on each item.

Require an HTTP or web-fetch tool that can read public JSON URLs. If none is
available, explain that the Frontier feed cannot be retrieved in this session.

## Endpoints

Use `https://frontiermemo.com/api/data` as the base URL:

- `daily.json`: current quality-gated edition and its bilingual items.
- `weeks.json`: available archive dates and item counts.
- `archive/YYYY-MM-DD.json`: one selected archive date.
- `meta.json`: publication timestamp and summarized source health.

Do not request `hot.json`, `medium.json`, or `slow.json`; they are private source
groups, not public editorial products.

## Workflow

1. Determine the user's language, topic, date, and desired depth. Default to the
   user's language and a concise briefing.
2. Fetch `daily.json` for current news. Verify `date`, `updated_at`,
   `publication_complete`, and `edition_window` before using its items.
3. For a requested date, fetch `weeks.json` first. Only request the matching
   archive when that date is present; otherwise state that Frontier has no
   retained edition for the date.
4. For a topic, company, model, policy, investment, or workflow search, match the
   query against titles, summaries, tags, source names, section, and structured
   investment details. Search the current edition unless the user explicitly
   asks for recent history; for history, inspect only relevant retained dates.
5. Prefer `title_zh` and `summary_zh` for Chinese, and `title_en` and `summary_en`
   for English. Fall back to the original fields only when the requested
   language is missing, and disclose the fallback.
6. Deduplicate the same event and explain why each selected item matters. Do not
   add facts that are absent from Frontier data or the linked publisher.
7. Cite every factual bullet with the item's original `url` and publisher name.
   Make clear that Frontier headlines, summaries, classifications, and
   throughlines are AI-assisted editorial output.

## Freshness And Failure

- If `publication_complete` is not true, do not present the file as a completed
  edition.
- If `meta.json` or `daily.json` is unavailable, report that Frontier data could
  not be verified instead of silently substituting general web search.
- State the edition date and update time when data is unexpectedly old or when
  the user asks for "latest", "today", or feed status.
- Treat source-health counts as operational signals, not evidence that an
  individual story is true.

## Response Shape

For a briefing, use:

```markdown
## Frontier Briefing - YYYY-MM-DD
[One short throughline labeled as AI-generated]

- **Headline** - why it matters. [Publisher](original URL)

Data updated: timestamp. Frontier summaries are AI-assisted; verify important
claims with the linked publishers.
```

For searches, lead with the matched scope and date range, then list results with
publisher links. For status requests, report publication time, edition date,
completion state, item count, and summarized source health without exposing
private operational assumptions.

## Licensing

Frontier-authored editorial fields are CC BY 4.0 with attribution to Frontier.
Third-party headlines, excerpts, media, metadata, and linked material remain
subject to their publishers' rights and terms.
