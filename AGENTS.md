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

The CLI reads from `FORAGER_DATA_URL`, whose default in `cli/forager.py` is still
an unfilled `<owner>` placeholder — it 404s until you point it at a real
`raw.githubusercontent.com/<owner>/forager/data/data` path or a local dir.

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
