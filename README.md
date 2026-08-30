# Frontier

Frontier is an open AI intelligence stream. It collects public sources, ranks and deduplicates events, enriches them with an OpenAI-compatible model, and publishes a bilingual English/Chinese JSON feed for the web and CLI.

Live site: **[frontiermemo.com](https://frontiermemo.com)**

> **Project status: public draft.** The pipeline and editorial policy are still
> evolving. Expect source, schema, ranking, and UI changes before a stable release.
> Treat generated summaries as navigation aids and verify consequential claims at
> the linked source.

## What is in the repository

```text
collectors/   RSS, HTML, Hacker News, GitHub, arXiv, Reddit and YouTube adapters
core/         models, scoring, deduplication, curation, storage and LLM client
scripts/      aggregate, enrich and translate pipeline stages
cli/          read-only Frontier CLI for agents and humans
config/       source registry in sources.yaml
web/          Next.js App Router site deployed to Cloudflare Workers
tests/        pytest coverage for the Python pipeline and CLI
```

The pipeline is file-first. A local collection run keeps a private raw working
pool, processes a separate published snapshot, and uploads only the latter to
Cloudflare R2. The website and CLI read the published snapshot; neither needs a
database connection.

## Use the CLI

The CLI defaults to the public Frontier feed, so an agent can install the repository and query it immediately:

```bash
python3 -m cli.frontier today
python3 -m cli.frontier hot --lang zh
python3 -m cli.frontier search agent --json
python3 -m cli.frontier summary --lang zh
python3 -m cli.frontier status
```

For an installed command:

```bash
python3 -m pip install -e .
frontier today --lang en
```

Useful environment variables:

```bash
FRONTIER_DATA_URL=https://frontiermemo.com/api/data
FRONTIER_CACHE_DIR=~/.cache/frontier
```

`sync` refreshes the local cache. If the network is unavailable, the CLI uses a previously cached response.

## Local development

Python 3.11+ and Node.js 22+ are recommended.

```bash
python3 -m pip install -r requirements.txt
python3 -m pytest -q
python3 -m compileall core collectors cli scripts

cd web
pnpm install
pnpm dev --hostname 0.0.0.0 --port 5173
pnpm lint
pnpm build
```

Open `http://localhost:5173`. The local site reads `web/public/data` while the deployed site reads R2 through `/api/data/*`.

Copy [`.env.example`](.env.example) to a private location and replace only the
values you need. Never commit the populated file. The bundled systemd units read
`~/.config/frontier/frontier.env`:

```bash
mkdir -p ~/.config/frontier
cp .env.example ~/.config/frontier/frontier.env
chmod 600 ~/.config/frontier/frontier.env
```

## Data pipeline

The local scheduler can run three collection tiers:

- `fast`: every 30 minutes
- `medium`: every 6 hours
- `slow`: once per day

Collection and publication are separate. Frequent jobs use `--collect-only` to
update the private raw pool without an LLM call or public change. The daily job
uses `--process-only` to freeze the latest completed Beijing 06:00-to-06:00
window, classify the broad pool, run global selection plus an independent
critic, edit only the selected stories, translate them, and atomically replace
the local snapshot only when every quality gate passes. GitHub Actions is used
for CI and deployment only.

Ready-to-link Linux user units live in `deploy/systemd/`. They schedule fast collection
every 30 minutes, medium every 6 hours, slow at 05:40, and the daily edition at
06:10 Asia/Shanghai. A manual local-only edition is:

```bash
python3 -m scripts.local_collect --group slow \
  --output web/public/data --process-only --no-publish
```

The process keeps raw files in a sibling `FRONTIER_RAW_DATA_DIR` (defaulting to
`<published-dir>.raw`). Omit `--no-publish` only after reviewing the local
edition; that explicitly uploads processed JSON to the `frontier-data` R2 bucket.

LLM enrichment is optional for raw collection. Configure these private local
environment variables for classification, translation, and editorial processing:

```text
FRONTIER_TRANSLATION_ENDPOINT
FRONTIER_TRANSLATION_API_KEY
FRONTIER_TRANSLATION_MODEL
FRONTIER_LLM_FALLBACK_MODELS
FRONTIER_EDITOR_MODELS
FRONTIER_YOUTUBE_API_KEY
```

`FRONTIER_TRANSLATION_API_KEY` can be replaced by `NOVITA_API_KEY` or
`OPENROUTER_API_KEY`. See [`.env.example`](.env.example) for optional retry,
token-budget, path, CLI, and Web variables. `OPENROUTER_API_KEY` also enables the
optional `/api/chat` and `/api/report` routes; without it they return `503`.

## Cloudflare deployment

The production Worker is `frontier` and the public origin is `https://frontiermemo.com`. The Worker uses these R2 buckets:

```text
frontier-data
frontier-opennext-cache
```

For GitHub Actions deployment, configure:

- Secret `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN` with Workers Scripts Edit, R2 Edit and Account Read
- Variable `NEXT_PUBLIC_SITE_URL=https://frontiermemo.com`

The deployed Worker reads the current JSON directly from R2, so publishing new data does not require an application redeploy.

Making a fork public does not require the production values above. CI runs without
credentials. Deployment requires the listed Cloudflare secrets, while local data
collection and R2 publication remain separate from GitHub Actions.

## Security

Do not commit populated `.env` files, local snapshots, API keys, or Cloudflare
tokens. Local data directories and `.env*` files are ignored, except for the safe
placeholder `.env.example`. If a credential is exposed, revoke it at the provider
before removing it from Git history.

## API and data license

The read-only JSON endpoint is available at `https://frontiermemo.com/api/data/daily.json`. Source URLs and publisher attribution remain attached to each item. AI classifications, translations and summaries are editorial aids, not primary sources; verify important claims against the original publisher.

Code is licensed under MIT. See [LICENSE](LICENSE). Contributions are welcome through pull requests; run the Python tests and `cd web && pnpm lint` before submitting one.
