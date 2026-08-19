# AGENTS.md

Working notes for agents in this repo. See `README.md` for product framing and
`docs/SPEC.md` / `docs/DESIGN-BRIEF.md` for intent.

## Layout

Two independent halves, no shared runtime:

```
collectors/   source adapters (rss, hn, arxiv, github); sources.py reads config/sources.yaml
core/         models, dedup, scoring, storage — pure logic, no I/O beyond storage.py
scripts/      aggregate.py (collect) -> enrich.py (LLM classify) -> translate.py
cli/          forager.py, reads the same JSON the web client does
config/       sources.yaml — source registry, grouped fast/medium/slow
tests/        pytest, mirrors core/ and collectors/
web/          Next.js App Router + Tailwind v4
```

Pipeline output does **not** live on `main`. `scripts/aggregate.py` writes JSON to
a temp dir and the collect workflows commit it to the orphan `data` branch. The
web client and CLI both read from there.

## Commands

Python (3.11+, deps in `requirements.txt`):

```bash
python3 -m pytest -q                  # what CI runs
python3 -m compileall core collectors cli scripts
python3 -m scripts.aggregate --group fast --output /tmp/forager-data
python3 -m cli.forager today          # needs FORAGER_DATA_URL, see below
```

The CLI reads from `FORAGER_DATA_URL`. Its source-tree default is
`web/public/data`; the override accepts a local directory, `file://` URL, or
HTTP(S) base URL.

Web (run from `web/`):

```bash
pnpm dev --hostname 0.0.0.0 --port 5173
pnpm lint                             # tsc --noEmit; there is no ESLint step
pnpm build
```

`pnpm lint` is a typecheck only. CI (`.github/workflows/ci.yml`) runs the Python
tests and nothing from `web/` — run `pnpm lint` yourself before committing web
changes.

## Conventions

- Read API keys via `os.environ` only; workflows pass them as `${{ secrets.* }}`.
  `enrich.py` and `translate.py` no-op without a key so collection still
  succeeds unkeyed.
- Adding a source: entry in `config/sources.yaml` (`group` sets the cron tier),
  plus a collector in `collectors/` if `kind` isn't already `rss`/`html`.
- Design tokens are CSS custom properties in `web/app/globals.css` (`:root` +
  `.dark`), consumed through Tailwind v4 `@theme inline`. Prefer semantic tokens
  (`bg-card`, `text-muted-foreground`) over hex literals.
- `web/` is pnpm, despite a stale `package-lock.json` also being tracked.

## Home page (editorial)

`web/components/editorial-home.tsx` + `web/app/editorial.css` are a port of
`forager-home-redesign.html`. Tokens are namespaced `--f-*` because the mock's
`--muted` / `--accent` / `--border` mean different things than the shadcn tokens
of the same name (shadcn `--muted` is a surface fill; `--f-muted` is body text).

Three traps that cost real time here, all still live:

- **Unlayered beats layered.** The `html[lang^="zh"]` CJK metric overrides sit
  outside `@layer base` on purpose. Inside the layer they lose to the unlayered
  `:root` no matter how specific the selector, which left Chinese headlines
  reading the Latin line-height.
- **Resets need `:where()`.** `.f-page button` scores 0-1-1 and outranks every
  0-1-0 component rule, which silently painted `.f-tag` and inactive `.f-sitem`
  at full `--f-fg` and flattened the tier hierarchy the design depends on.
- **Don't eyeball oklch.** L is not linear in sRGB. Convert properly, and measure
  rendered colour through a 1×1 canvas — `getComputedStyle` returns `lab()` in
  current Chrome, so regexing it as RGB yields nonsense contrast ratios.

Copy constraints, because the obvious phrasings are false here: no issue numbers
(three collect crons at 30min/6h/daily make this a continuous stream, and the
mock's "Issue 33" was sample text), no "daily" (items span ~25 days because feeds
carry backlog, and the day strip shows it), and the throughline must be signed as
AI-generated because it is model output.

## Recently completed

- The site and generated metadata now support English and Simplified Chinese
  only. Removed the nonexistent public API product pages and all
  `api.forager.example` calls; server pages, feeds, summaries, OG images, and
  sitemaps read the published JSON files through `web/lib/server/forager-data.ts`.
- Added TechCrunch AI, Tech.eu, and Nate's Newsletter. Reddit sources use the
  `/top/` feed path so `t=day` is effective, and run serially with 75-second
  spacing plus one cooldown retry to respect Reddit's anonymous RSS limit.
- Source parity was checked against DataCube `main` at commit `13cc558`: all 34
  of its RSS entries are represented, along with its 15-channel YouTube
  allowlist and two discovery queries. YouTube runs with the daily slow group,
  no-ops without `YOUTUBE_API_KEY`, and passes duration/view metadata through to
  the existing web video components. Forager additionally collects arXiv cs.AI
  and GitHub Trending.
- Homepage curation follows DataCube's daily defaults: the editor model selects
  up to 10 technology stories, 5 capital stories, and 5 practical items; two
  videos have a reserved candidate pool and are inserted at feed positions 3
  and 8. The JSON retains the broader collected pool while `curated_ids` stores
  the display shortlist.
- All collect workflows establish the `data` branch upstream when pushing.
- The CLI defaults to `web/public/data` and supports local paths, `file://`, and
  HTTP(S) sources through `FORAGER_DATA_URL`.
- `enrich.py` checkpoints per batch and resumes on `classification_source ==
  "llm"`; `core/llm.py` retries transient TLS drops. Both exist because one
  `SSLEOFError` mid-run used to discard every batch before it.
