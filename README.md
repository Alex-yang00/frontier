# Forager

Forager is a personal AI information stream. The web surface uses a dense editorial React/Next shell, while the data pipeline is file-first and independent: public sources are collected by GitHub Actions, normalized into JSON on the `data` branch, and consumed by both the web client and the CLI.

The first release supports English and Simplified Chinese fields. Translation is optional: set `NOVITA_API_KEY` (or `OPENROUTER_API_KEY`) in GitHub Actions to populate `title_en`, `title_zh`, `summary_en`, and `summary_zh`; collection still succeeds without a key.

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
