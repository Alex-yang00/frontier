# AGENTS.md

Read `README.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN_SPEC.md` before broad
changes.

## Layout

```text
collectors/   source adapters; sources.py dispatches config/sources.yaml
core/         pure models, deduplication, scoring, curation, storage
scripts/      private collection, editorial processing, R2 publication
config/       canonical source and tag registries
skills/       public single-file Frontier Skill
tests/        pytest suite
web/          Next.js App Router + Tailwind v4
```

The pipeline defaults to `~/.local/share/frontier`; never put runtime state in
the repository. Only canonical release JSON is public. Production reads R2 via
`current.json`, while local Next.js can use `FRONTIER_REMOTE_DATA_URL` or an
explicit `FRONTIER_DATA_DIR`.

## Commands

```bash
python3 -m pytest -q
python3 -m compileall core collectors scripts
python3 -m scripts.local_collect --group fast --collect-only
python3 -m scripts.local_collect --process-only --no-publish --ignore-stale-collection

cd web
pnpm lint
pnpm build
```

CI runs both Python and web checks. The deploy workflow runs only after a green
CI run on `main` or an explicit manual dispatch.

## Conventions

- `config/sources.yaml` is the only source registry. Add collector code only for
  a new `kind`; do not duplicate source lists in Python.
- Read secrets through `os.environ`; collection must remain usable without LLM
  credentials, and publication must fail closed without R2 credentials.
- Preserve the stable `/api/data/daily.json`, `weeks.json`, `meta.json`, and
  `archive/YYYY-MM-DD.json` contract.
- Keep detailed collector errors private; public metadata is sanitized.
- Use semantic CSS tokens and preserve the editorial CJK metric/reset rules in
  the existing frontend instructions and comments.
- Do not describe the stream with issue numbers or as a strict calendar-day
  digest. Throughlines are AI-generated and must be labeled accordingly.
