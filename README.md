# Frontier

Frontier is an open AI intelligence stream. It collects public sources, ranks
and deduplicates events, applies a bilingual editorial pipeline, and publishes a
quality-gated English and Simplified Chinese feed.

Live site: **[frontiermemo.com](https://frontiermemo.com)**

> **Public draft.** Sources, schemas, ranking, and editorial policy may change.
> Generated summaries are navigation aids; verify consequential claims with the
> linked publisher.

## Use Frontier With An Agent

Frontier is distributed as a single Agent Skill instead of a separate CLI. Give
an agent this prompt:

```text
Read https://raw.githubusercontent.com/Alex-yang00/frontier/main/skills/frontier/SKILL.md,
then use the Frontier workflow to brief me on today's important AI developments.
Answer in Chinese and link every claim to the original publisher.
```

The public, read-only data contract is:

```text
https://frontiermemo.com/api/data/daily.json
https://frontiermemo.com/api/data/weeks.json
https://frontiermemo.com/api/data/archive/YYYY-MM-DD.json
https://frontiermemo.com/api/data/meta.json
```

## Repository

```text
collectors/   source adapters and the sources.yaml dispatcher
core/         models, ranking, deduplication, curation, periods, storage
scripts/      collection, editorial processing, migration, publication
config/       canonical source and tag registries
skills/       standalone Frontier Agent Skill
web/          Next.js App Router application for Cloudflare Workers
tests/        offline Python tests for pipeline behavior
```

The collection host stores private runtime state under
`~/.local/share/frontier` by default. Runtime JSON never belongs in the source
tree. Production data is held in Cloudflare R2 and resolved through a versioned
release pointer, so readers see either a complete old release or a complete new
one.

See [Architecture](docs/ARCHITECTURE.md) for the data flow and failure model.

## Local Development

Use Python 3.11+, Node.js 22+, and pnpm:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
python3 -m compileall core collectors scripts

cd web
pnpm install
pnpm dev --hostname 0.0.0.0 --port 5173
pnpm lint
pnpm build
```

Local Next.js reads the production data API when
`FRONTIER_REMOTE_DATA_URL=https://frontiermemo.com/api/data` is configured. To
inspect an unpublished local edition, set `FRONTIER_DATA_DIR` to the pipeline's
`preview` directory instead.

Copy `.env.example` to `~/.config/frontier/frontier.env`, fill only the required
private values, and keep it outside the repository. Collection does not require
an LLM key. Editorial publication requires the configured OpenAI-compatible
translation/editor endpoint and Cloudflare credentials.

## Pipeline Operations

The scheduler collects medium sources at 23:00 and 11:00 UTC, slow sources at 23:10
and 11:10 UTC, fast sources at 23:20 and 11:20 UTC, then publishes half-day slices at
00:00 and 12:00 UTC. Two adjacent 12-hour slices form one daily
edition; the morning snapshot is partial until the evening slice completes it.
Collection only updates the private seven-day candidate
pool. Publication freezes the growing edition window, enriches and translates
new candidates, applies quality gates, uploads a versioned release, verifies its
hashes, and switches `current.json` last.

Render user-level systemd units for the current checkout without enabling them:

```bash
python3 -m scripts.install_systemd --dry-run
python3 -m scripts.install_systemd
systemctl --user daemon-reload
```

Migrate legacy local data without deleting it:

```bash
python3 -m scripts.migrate_state --from web/public/data
```

## Security And Licensing

Never commit populated environment files, local snapshots, API keys, or
Cloudflare credentials. See [SECURITY.md](SECURITY.md) for private reporting.

Code is MIT licensed. Frontier-authored editorial fields are CC BY 4.0;
third-party material remains subject to publisher rights. See
[DATA_LICENSE.md](DATA_LICENSE.md) for the exact boundary.

## Roadmap

- **Ready for local acceptance:** standalone state, atomic R2 publication,
  bounded retention, and operational recovery.
- **Available in this repository:** a single-file Frontier Skill for reading,
  searching, and tracing the public feed.
- **Planned:** publish the Skill through suitable public Skill hubs after local
  and repository-based usage is validated.

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
