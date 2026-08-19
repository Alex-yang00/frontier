# Frontier

Frontier is an open AI intelligence stream. It collects public sources, ranks and deduplicates events, enriches them with an OpenAI-compatible model, and publishes a bilingual English/Chinese JSON feed for the web and CLI.

Live site: **[frontiermemo.com](https://frontiermemo.com)**

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

The pipeline is file-first. Each collection run writes JSON to the orphan `data` branch, and the same snapshot is uploaded to Cloudflare R2. The website and CLI read the published snapshot; neither needs a database connection.

## Use the CLI

The CLI defaults to the public Frontier feed, so an agent can install the repository and query it immediately:

```bash
python3 -m cli.frontier today
python3 -m cli.frontier hot --lang zh
python3 -m cli.frontier search agent --json
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

## Data pipeline

GitHub Actions runs three collection tiers:

- `collect-fast`: every 30 minutes
- `collect-medium`: every 6 hours
- `collect-slow`: once per day

Each run collects and normalizes sources, ranks and deduplicates items, classifies sections and impact, generates date-specific AI summaries, translates missing English/Chinese fields, commits the snapshot to `data`, and publishes JSON to R2.

LLM enrichment is optional for raw collection. Configure these repository secrets for classification, translation and daily insights:

```text
FRONTIER_TRANSLATION_ENDPOINT
FRONTIER_TRANSLATION_API_KEY
FRONTIER_TRANSLATION_MODEL
FRONTIER_YOUTUBE_API_KEY
```

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

The `deploy-cloudflare` workflow builds from the `data` branch snapshot, uploads R2 data, and deploys the Worker. Collection workflows update data without requiring an application redeploy.

## API and data license

The read-only JSON endpoint is available at `https://frontiermemo.com/api/data/daily.json`. Source URLs and publisher attribution remain attached to each item. AI classifications, translations and summaries are editorial aids, not primary sources; verify important claims against the original publisher.

Code is licensed under MIT. See [LICENSE](LICENSE). Contributions are welcome through pull requests; run the Python tests and `cd web && pnpm lint` before submitting one.
