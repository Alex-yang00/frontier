# Contributing

Frontier accepts focused issues and pull requests. Open an issue before a large
architecture, schema, source-policy, or editorial-policy change so the intended
behavior is clear before implementation.

Use Python 3.11+ and Node.js 22+. Install Python development dependencies with
`python3 -m pip install -r requirements-dev.txt`; install web dependencies with
`pnpm install` inside `web/`.

Before opening a pull request, run:

```bash
python3 -m pytest -q
python3 -m compileall core collectors scripts
cd web && pnpm lint && pnpm build
```

Do not commit API keys, populated environment files, raw candidates, generated
editions, or Cloudflare credentials. Keep unrelated refactors out of focused
fixes, and document changes to the public JSON contract.
