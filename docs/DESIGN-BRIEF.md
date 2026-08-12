# Forager — Web Design Brief (for Open Design)

## 1. Product in one paragraph

**Forager** is a personal AI information stream: a daily/real-time aggregation of ~35 AI-related sources (Hacker News, GitHub Trending, Hugging Face papers, Simon Willison, The Decoder, arXiv, OpenAI/DeepMind blogs, Chinese AI media, Reddit AI subs, etc.). It's built by a developer for a developer's own use, and is open-sourced as a portfolio piece.

The site is **not a news site**. It's a **reading tool** that lets the user quickly triage what's worth attention today, drill into a single item, and read the source link. The user is the **owner** — they trust the curation is theirs, not an editorial team's.

## 2. Audience

- **Primary**: Alex (the developer who built this), AI/ML DevRel professionals, AI engineers, AI founders
- **Secondary**: Anyone visiting the GitHub repo and clicking the live demo link — they should immediately understand what the product does and how it differs from Feedly/Google News
- **Reading context**: usually desktop in office hours; occasionally mobile during commute

## 3. Visual reference (taste direction)

We want the **density and taste of Linear / Vercel docs / Stripe changelog** — not the friendliness of Feedly/Flipboard, not the playfulness of Product Hunt.

Specific references (in priority order):
1. **Linear** (linear.app) — the gold standard for dense, scannable, opinionated UI. Sidebar nav, tight typography, mono accents.
2. **Vercel changelog** (vercel.com/changelog) — each entry is a row, not a card. Time/source/metadata on the left, content on the right.
3. **Hugging Face Papers** (huggingface.co/papers) — this is the **closest sibling**: an AI paper/item stream. Note their row layout, vote buttons, tag chips.
4. **GitHub Trending** (github.com/trending) — row-based, source on top, tiny meta below.
5. **News Now** (newsnow.app) — Chinese news aggregator, dense grid. Look at how it handles multi-source aggregation visually.

**Avoid**: card-heavy magazine layouts (Feedly, Flipboard), playful marketing gradients (Notion AI pages), emoji-heavy fun UI (Product Hunt).

## 4. Core UX flow

The user opens the site once or twice a day. They want to:

1. See **what changed since last visit** (this is the killer feature — change-first, not feed-first)
2. **Triage** quickly: tag filter, source filter, search
3. **Read** a few items, click through to source
4. **Drill into archive** of a specific day

Every design decision should serve flow 1. If something doesn't help triage, cut it.

## 5. Required pages

### Page 1: `/` — Today

Layout (desktop, ~1280px+):

```
┌────────────────────────────────────────────────────────────────────┐
│ [logo: Forager]   Today   Hot   Papers   Archive          [🔍 search] │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│ │ Sidebar filter       │  │ Main list (rows)                      │ │
│ │                      │  │                                      │ │
│ │ · By source          │  │  9:30 · HN · 320pt · 45c             │ │
│ │   [ ] Hacker News    │  │  Title of the article, in semibold   │ │
│ │   [ ] Simon Will.    │  │  Brief one-line summary in muted text│ │
│ │   [ ] The Decoder    │  │  [tag] [tag] [tag]                   │ │
│ │   ...                │  │                                      │ │
│ │ · By tag             │  │                                      │ │
│ │   [ ] model-rele.    │  │  9:00 · arXiv · cs.AI                │ │
│ │   [ ] inference      │  │  Paper title in semibold             │ │
│ │   [ ] agent          │  │  Authors in italic, muted            │ │
│ │   [ ] open-source    │  │  [paper] [arxiv]                     │ │
│ │                      │  │                                      │ │
│ │ · Language           │  │                                      │ │
│ │   [ ] EN [ ] 中文    │  │  8:30 · OpenAI Blog                  │ │
│ │                      │  │  Title…                             │ │
│ └──────────────────────┘  └──────────────────────────────────────┘ │
│                                                                    │
│  87 items · 24 sources · updated 5min ago                         │
└────────────────────────────────────────────────────────────────────┘
```

**Top nav**: Forager logo (left) | tabs (Today / Hot / Papers / Archive) | search box (right).
- `Today` — `daily.json`
- `Hot` — `hot.json` (last 30min items)
- `Papers` — filtered view: only items where source in {hf_papers, arxiv}
- `Archive` — date picker → fetch `archive/YYYY-MM-DD.json`

**Sidebar (left, ~240px, sticky)**: filters as checkbox lists:
- **By source** — top 15 most active sources (counter next to each)
- **By tag** — from `tags.yaml` (model-release, inference, agent, agent-framework, safety, etc.)
- **Language** — EN / 中文 (more later if needed)

**Main list (right, fills remaining)**: rows, NOT cards.
- Each row: **time · source badge · meta (points/comments)** │ title │ summary line │ tag chips
- Hover: subtle background tint, "open →" indicator on right
- Click: opens source URL in new tab (this is the primary action)
- No "read more" inline expansion — the source URL IS the read more

**Footer (bottom of list)**: small muted text: `87 items · 24 sources · updated 5min ago`. This is the only "social proof" we need.

**Empty state**: when filters yield zero items — short message: "No matches. Try clearing filters." Plus a "Clear" link.

### Page 2: `/hot` — Hot (last 30min)
Same layout as Today, but data from `hot.json`. Top of page: small banner explaining "Items from the last 30 minutes. Updates every 30 min."

### Page 3: `/papers` — Papers only
Same layout, filtered to {hf_papers, arxiv}. Two columns optional: HF (left) / arXiv (right). Or single column with source badge to distinguish. Pick the simplest.

### Page 4: `/archive` — Past days
Calendar grid of past dates (last 30 days, more on scroll). Click a date → fetch `archive/YYYY-MM-DD.json` → render same list layout.

## 6. Component inventory

### `SourceBadge`
Tiny pill: 2-letter source initials + source name on hover. Color-coded by source group (official / media / reddit / papers / chinese).

### `TagChip`
Tiny pill, monochrome by default. Click to toggle filter. Active state: filled background.

### `FilterSidebar`
Sticky left panel with grouped checkbox lists. Collapses on mobile.

### `ItemRow`
The main row. Structure:
```
[time] [source-badge] [points/comments (optional)]  │ [title in semibold]
                                                    [one-line muted summary]
                                                    [tag chips] [open →]
```

### `TopBar`
Sticky, slim, wordmark + tabs + search + "updated Xm ago" indicator.

### `ArchivePicker`
Horizontal date-strip of recent 30 days, or calendar grid. Highlight today.

## 7. Visual language

- **Color**: near-black background (`#0a0a0f`) with warm neutrals, or clean light. One accent — citrus green or amber. Low-saturation grays.
- **Typography**: system sans (Inter) for titles/content; monospace (ui-monospace / JetBrains Mono) for meta: times, points, counts.
- **Borders**: 1px, low opacity, subtle. Cards are rows with hairline separators.
- **Spacing**: generous line-height (1.6+ for reading), tight card padding.
- **Motion**: minimal. Hover states only. No entrance animations, no parallax.
- **Density**: information-dense but legible. Think HN top comments, not marketing hero.

## 8. Data shape (mock with 12+ realistic items)

Mix of HN, GitHub, Reddit, arXiv, The Decoder, HF Papers, Simon Willison, OpenAI Blog. Use realistic titles (e.g. "DeepSeek V4 R1: a new 1-bit MoE reasoning model").

```json
{
  "id": "hn-20260812-12345678",
  "title": "DeepSeek V4 R1: a new 1-bit MoE reasoning model",
  "url": "https://...",
  "source": "hacker_news",
  "source_name": "Hacker News",
  "tags": ["model-release", "inference"],
  "published": "2026-08-12T08:30:00Z",
  "fetched_at": "2026-08-12T09:00:00Z",
  "score": 87,
  "points": 320,
  "comments": 45,
  "summary": "DeepSeek ships a 1-bit MoE reasoning model claiming 6x lower inference cost.",
  "lang": "en"
}
```

## 9. Deliverable

Full dashboard layout: dark theme, three sections, filter chips, archive strip, realistic mock data filling the screen.
