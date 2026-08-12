# Forager

A personal AI information stream — aggregates ~35 public AI sources (Hacker News, GitHub Trending, Hugging Face papers, arXiv, Simon Willison, The Decoder, Reddit AI subs, Chinese AI media, and more) on 30min / 6h / daily schedules.

Runs entirely on GitHub Actions (public repo = free, unlimited minutes). Data is stored as JSON in git. Three surfaces: **web** (Astro static site on Cloudflare Pages), **cli** (`forager`), and a future **api** (Cloudflare Worker).

## Design principles

1. **Simple** — no backend, no database, no framework beyond what's listed. Git is the database.
2. **Zero local dependency** — everything runs in GitHub Actions. Nothing requires a local machine.
3. **Public & free** — public repo, all sources public and key-less.
4. **Durable file-first** — JSON files on GitHub are the source of truth; web/CLI are thin readers.

## Documents

- [`docs/SPEC.md`](docs/SPEC.md) — full implementation spec (architecture, data schema, sources, workflows, CLI, web, implementation order)
- [`docs/DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md) — web design brief (taste direction, pages, components, visual language)

## Status

🚧 Spec stage. Implementation not started.
