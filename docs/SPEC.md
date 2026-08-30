# Frontier — Historical Implementation Spec

> **Status**: This records the original design and contains superseded Astro,
> GitHub Actions, and data-branch sections. It is retained for design history, not
> as setup documentation. The root `README.md`, `AGENTS.md`, current code, and
> `deploy/systemd/` describe the draft implementation that actually runs.
>
> **Design principles** (in priority order):
> 1. **Simple** — no application database; durable JSON remains the contract.
> 2. **Local-first collection** — systemd collects raw data without GitHub Actions minutes.
> 3. **Quality before volume** — a complete edition may publish fewer items; stale padding is forbidden.
> 4. **Explicit publication** — local validation is the default and R2 upload is a separate opt-in action.

---

## 1. Overview

Frontier is a **personal AI information stream** that:

- Collects from ~35 public sources (RSS/Atom, HN, GitHub Trending, Reddit, Hugging Face) on three schedules (30min / 6h / daily)
- Collects locally on 30-minute / 6-hour / daily systemd timers
- Stores a private raw JSON pool locally and a quality-gated public JSON snapshot in R2
- Exposes three surfaces:
  - **web** — Next.js site on Cloudflare Workers, reads JSON from R2 at runtime
  - **cli** — `frontier` command, reads remote JSON with local cache
  - **api** — read-only `/api/data/*` routes backed by the same JSON

Inspired by and validated against existing open-source projects:

| Reference | What we take | What we reject |
|---|---|---|
| Upstream AI news aggregators | Curated source lists, GitHub-Actions-driven collection, dedup-by-URL | FastAPI + PostgreSQL backends, multi-language pipelines, and paid-gating complexity |
| [laolaoshiren/ai-hot](https://github.com/laolaoshiren/ai-hot) | Static data JSON + static site, quality-gate commit | Hugo, single-frequency collection |
| [dw-dengwei/daily-arXiv-ai-enhanced](https://github.com/dw-dengwei/daily-arXiv-ai-enhanced) | Per-day JSONL/JSON files in git, GH Actions cron | Heavy scrapy pipeline |
| [duanyytop/agents-radar](https://github.com/duanyytop/agents-radar) | Per-day digest directory layout | Cloudflare Worker runtime, MCP |

---

## 2. Architecture

### Data flow

```
systemd raw collection -> private local pool
                       -> complete 24h window
                       -> classify/deduplicate/global shortlist
                       -> independent critic/specialized editing/translation
                       -> quality gates -> atomic local snapshot
                                        -> optional R2 upload -> Worker/web/CLI
```

### Key decisions (validated)

| Decision | Choice | Why |
|---|---|---|
| Scheduler | user-level systemd timers | No Actions quota; raw collection stays model-free |
| Storage | private local JSON pool + published R2 JSON | No database or data branch; public writes are atomic |
| Web | Next.js on Cloudflare Workers | Reads the current R2 snapshot without rebuilding |
| CLI | Python, reads remote JSON with local cache | Zero local dependency; same language as collectors |
| Dedup | By canonical URL, in-memory per run + day-file append | Simple, deterministic |
| AI summary | Local editorial job calls an OpenAI-compatible API | Raw collection remains key-less; publication is quality-gated |

### Repo layout (monorepo)

```
frontier/
├── .github/workflows/
│   ├── collect-fast.yml     # cron */30 * * * *
│   ├── collect-medium.yml   # cron 0 */6 * * *
│   ├── collect-slow.yml     # cron 30 1 * * *
│   └── ci.yml               # lint + test on push/PR
├── collectors/              # one module per source
│   ├── base.py              # common fetch/parse/dedup helpers
│   ├── hn.py                # Hacker News (Algolia API / hnrss)
│   ├── github_trending.py   # GitHub Trending (scrape)
│   ├── reddit.py            # 4 subreddits, serial + 75s spacing
│   ├── rss.py               # generic RSS/Atom (feedparser)
│   ├── hf_papers.py         # Hugging Face daily papers
│   └── arxiv.py             # arXiv API (cs.AI/LG/CL/CV)
├── core/
│   ├── models.py            # dataclasses: Item, Source, DayFile
│   ├── dedup.py             # canonical URL normalization + seen-set
│   ├── scoring.py           # optional relevance score (0-100)
│   └── storage.py           # JSON read/write, atomic
├── local state/             # persistent working JSON, uploaded to R2
│   ├── hot.json             # last 30min items (fast sources)
│   ├── medium.json          # last 6h items
│   ├── daily.json           # today's merged view (all sources)
│   ├── archive/YYYY-MM-DD.json
│   └── meta.json            # run status, source health, last-fetch times
├── web/                     # Astro static site
│   ├── src/pages/index.astro
│   ├── src/components/ItemCard.astro, FilterBar.astro, SourceBadge.astro
│   ├── src/lib/fetchData.ts  # fetch JSON from raw.githubusercontent
│   ├── src/lib/tags.ts       # tag taxonomy + colors
│   └── public/ (favicon, etc.)
├── cli/
│   ├── frontier.py           # entry: `frontier today|search|hot|sync`
│   ├── cache.py             # ~/.cache/frontier/ mirror of remote JSON
│   └── format.py            # terminal rendering (plain, no rich dep)
├── scripts/
│   ├── aggregate.py         # workflow entry: run collectors → merge → commit
│   └── health_check.py      # optional: verify data freshness, alert on stale
├── config/
│   ├── sources.yaml         # all sources, grouped by frequency
│   └── tags.yaml            # tag taxonomy
├── tests/
│   ├── test_dedup.py
│   ├── test_storage.py
│   ├── test_collectors.py   # fixture-based, no network
│   └── fixtures/            # sample RSS/JSON/HTML payloads
├── pyproject.toml           # deps: feedparser, requests, PyYAML, pytest
├── README.md
└── LICENSE                  # MIT
```

### Publication strategy

```
main  ← source, collectors, and deployment workflow
        │
local scheduler  ← runs the Python pipeline and uploads JSON to Cloudflare R2
        │
        └─ web Worker reads the current R2 snapshot at request time
```

- **main branch** → source and deployment only; data updates do not require a rebuild.
- **Cloudflare R2** → holds the JSON snapshot published by `scripts/local_collect.py`.
- The web Worker reads R2 through `/api/data/*`.

---

## 3. Data schema

### Item (canonical)

```json
{
  "id": "hn-20260812-12345678",
  "title": "…",
  "url": "https://…",
  "source": "hacker_news",
  "source_name": "Hacker News",
  "tags": ["model-release", "inference"],
  "published": "2026-08-12T08:30:00Z",
  "fetched_at": "2026-08-12T09:00:00Z",
  "score": 87,
  "points": 320,
  "comments": 45,
  "summary": "…",
  "lang": "en"
}
```

### Day file `archive/2026-08-12.json`

```json
{
  "date": "2026-08-12",
  "updated_at": "2026-08-12T09:00:00Z",
  "items": [ /* Item[] */ ],
  "sources": { "hacker_news": {"fetched": 12, "errors": 0}, "…": "…" }
}
```

### `daily.json` (live, always today)

```json
{ "date": "2026-08-12", "updated_at": "…", "items": [/* merged, deduped */] }
```

### `meta.json`

```json
{
  "last_runs": { "fast": "2026-08-12T09:00:00Z", "medium": "…", "slow": "…" },
  "source_health": { "the-decoder": {"ok": true, "last_ok": "…", "errors_since": 0} }
}
```

---

## 4. Sources (35, curated)

### Fast (30min) — hot/emerging

| Source | Type | Notes |
|---|---|---|
| Hacker News AI | Algolia API (`https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=50`) | filter `points>=100` |
| GitHub Trending (AI) | scrape `https://github.com/trending?spoken_language_code=&since=daily` | parse repo cards, filter AI-ish topics |
| Reddit r/ChatGPT | `.rss?t=day` | serial + 75s spacing, retry once |
| Reddit r/ChatGPTPro | same | |
| Reddit r/ClaudeAI | same | |
| Reddit r/PromptEngineering | same | |

### Medium (6h) — daily-pace media

| Source | URL |
|---|---|
| Simon Willison | `https://simonwillison.net/atom/everything/` |
| The Decoder | `https://the-decoder.com/feed` |
| Ben's Bites | `https://www.bensbites.com/feed` |
| The Neuron | `https://www.theneuron.ai/feed` |
| WhyTryAI | `https://www.whytryai.com/feed` |
| One Useful Thing | `https://www.oneusefulthing.org/feed` |
| ChinaTalk | `https://www.chinatalk.media/feed` |
| Techmeme | `https://www.techmeme.com/feed.xml` |
| The Verge AI | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| VentureBeat | `https://venturebeat.com/feed` |
| Ars Technica AI | `https://arstechnica.com/ai/feed/` |
| MIT Tech Review AI | `https://www.technologyreview.com/topic/artificial-intelligence/feed` |
| IEEE Spectrum AI | `https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss` |
| OpenAI | `https://openai.com/news/rss.xml` |
| Google DeepMind | `https://deepmind.google/blog/rss.xml` |
| Google AI | `https://blog.google/technology/ai/rss/` |
| Anthropic | `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml` |
| Hugging Face | `https://huggingface.co/blog/feed.xml` |
| The Register AI | `https://www.theregister.com/software/ai_ml/headlines.atom` |
| 量子位 | `https://www.qbitai.com/feed` |
| 36氪 | `https://36kr.com/feed` |
| Pandaily | `https://pandaily.com/feed` |
| TechNode | `https://technode.com/feed` |
| TechCrunch Fundraising | `https://techcrunch.com/category/fundraising/feed/` |
| TechCrunch M&A | `https://techcrunch.com/tag/mergers-and-acquisitions/feed/` |
| GlobeNewswire M&A | `https://www.globenewswire.com/RssFeed/subjectcode/15-Mergers%20and%20Acquisitions/feedTitle/GlobeNewswire%20-%20Mergers%20and%20Acquisitions` |

### Slow (daily) — papers & official releases

| Source | Type |
|---|---|
| Hugging Face daily papers | `https://huggingface.co/papers` (scrape) |
| arXiv cs.AI/LG/CL/CV | arXiv API `http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.CV&sortBy=submittedDate&sortOrder=descending&max_results=50` |

> **Note on HN**: We prefer the Algolia API (no third-party, richer metadata: points, comments). Filter `points >= 100`.

> **Excluded from v1**: YouTube (needs API key), investment/stock feeds beyond TechCrunch/GlobeNewswire (DevRel positioning), and languages beyond English and Simplified Chinese.

---

## 5. Workflows

### collect-fast.yml (30min)

```yaml
name: collect-fast
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: python scripts/aggregate.py --group fast
      - run: python -m scripts.local_collect --group fast
```

### collect-medium.yml (6h) / collect-slow.yml (daily)
Same shape, `--group medium` / `--group slow`, cron `0 */6 * * *` / `30 1 * * *`.

### ci.yml
- `ruff check` + `pytest` on push/PR to main.

---

## 6. CLI (`frontier`)

```
Usage:
  frontier today                # merged daily items (fetch remote, cache)
  frontier search <query>       # search cached + remote items
  frontier hot                  # fast-group items (last 30min)
  frontier sync                 # pull all data/*.json to ~/.cache/frontier/
  frontier sources              # list configured sources
  frontier status               # meta.json: last runs, source health
```

- **No external deps** beyond Python stdlib (`urllib`, `json`, `argparse`). Single-file friendly.
- Remote base: `https://raw.githubusercontent.com/<you>/frontier/data/data/` (branch `data`, path `data/`).
- Cache: `~/.cache/frontier/<file>.json`, refreshed on TTL (30s for `hot`, 6h for `medium`, daily for `daily`).
- Output: plain text, optionally `--json` for scripting.

---

## 7. Web (Astro, static)

- **Stack**: Astro 5, no framework islands in v1 (vanilla TS for interactivity), Tailwind for styling, no SSR.
- **Pages**:
  - `/` — grouped feeds (Hot / Today / Papers) with FilterBar (tag, source, lang)
  - `/archive` — pick a date, read `archive/YYYY-MM-DD.json`
- **Data fetch**: `src/lib/fetchData.ts` — fetch `https://raw.githubusercontent.com/<you>/frontier/data/data/<file>.json` at runtime with cache-busting `?t=<fetchTime>`; graceful fallback to last cached copy in `localStorage`.
- **Deploy**: Cloudflare Pages, build command `npm run build`, output `dist/`, root `web/`. Builds only on main push.
- **No data rebuild**: data updates never touch main, so the site stays built; users get fresh data on refresh.

---

## 8. v1.1 (optional, not in v1.0)

- **AI summary**: in `collect-slow`, call OpenAI-compatible API (Novita key in GH Secrets) on top items, add `summary` field.
- **API**: Cloudflare Worker reading the same JSON (routing `data/*.json` → JSON responses with filtering).
- **D1 search**: when the archive grows, index into D1 for full-text search.
- **Newsletter**: optional, using the daily.json → markdown → email.

---

## 9. Implementation order (for Codex)

1. Repo skeleton: `pyproject.toml`, `requirements.txt`, `.gitignore`, LICENSE, README stub, `config/sources.yaml` (full 35 sources), `config/tags.yaml`.
2. `core/models.py`, `core/dedup.py`, `core/storage.py` (with tests: dedup by URL, atomic write, day-file merge).
3. `collectors/base.py` + `collectors/rss.py` (generic RSS via feedparser) — test with fixture.
4. `collectors/hn.py` (Algolia API) — test with fixture.
5. `collectors/github_trending.py` (scrape) — test with fixture.
6. `collectors/reddit.py` (serial + 75s spacing) — test with fixture.
7. `collectors/hf_papers.py`, `collectors/arxiv.py` — test with fixture.
8. `scripts/aggregate.py` (merge → write → commit helper) — test storage merge.
9. Workflows: `collect-fast.yml`, `collect-medium.yml`, `collect-slow.yml`, `ci.yml`.
10. CLI `cli/frontier.py` + `cache.py` + `format.py` — test `today`/`search` with fixtures.
11. Astro site `web/` — index, archive, fetchData, Tailwind.
12. README with architecture diagram + "fork & run" instructions.
13. Final verification: run `pytest`; run `aggregate.py --group fast` locally against fixtures; verify `frontier today` output.

---

## 10. Acceptance criteria

- [ ] Local scheduler runs on schedule (30min/6h/daily) and publishes JSON to R2
- [ ] `data/*.json` follows schema; `daily.json` is always today, deduped
- [ ] `frontier today` / `search` / `hot` / `sync` / `sources` / `status` work offline after `sync`
- [ ] Astro site deploys to Cloudflare Pages; fetches fresh JSON on refresh; no rebuild on data change
- [ ] `pytest` green; `ruff` clean
- [ ] Public repo: no secrets, no API keys in code
