# Forager

Forager is a personal AI information stream. The web surface uses a dense editorial React/Next shell, while the data pipeline is file-first and independent: public sources are collected by GitHub Actions, normalized into JSON on the `data` branch, and consumed by both the web client and the CLI.

The first release supports English and Simplified Chinese fields. Collection writes an auditable snapshot to the orphan `data` branch and publishes the current JSON to Cloudflare R2. Set `FORAGER_TRANSLATION_API_KEY`, `FORAGER_TRANSLATION_ENDPOINT`, `FORAGER_TRANSLATION_MODEL`, and `YOUTUBE_API_KEY` as GitHub Actions secrets; collection still succeeds without the optional AI/video keys.

```bash
python -m cli.forager today
python -m cli.forager hot --lang zh
python -m cli.forager search agent
```

```bash
cd web
pnpm install
pnpm dev --hostname 0.0.0.0 --port 5173
```

## Cloudflare Workers

The Next.js app deploys through OpenNext. Create the two R2 buckets once:

```bash
cd web
pnpm exec wrangler login
pnpm exec wrangler r2 bucket create forager-data
pnpm exec wrangler r2 bucket create forager-opennext-cache
```

Configure these GitHub repository settings before the first deployment:

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variable: `NEXT_PUBLIC_SITE_URL` with the final `https://` origin

Optional Worker runtime features use secrets stored in Cloudflare, not GitHub:

```bash
pnpm exec wrangler secret put OPENROUTER_API_KEY
```

`deploy-cloudflare.yml` deploys application code on `main`. Collection workflows update R2 without redeploying the Worker. For a local production-runtime preview, run `pnpm cf:preview` from `web/`.
