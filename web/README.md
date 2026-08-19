# Frontier Web

Frontier's Next.js 16 interface. It reads canonical JSON produced by the repository collectors and supports English and Simplified Chinese content.

```bash
pnpm install
pnpm dev --hostname 0.0.0.0 --port 5173
pnpm lint
pnpm build
```

Browser data requests use `/api/data/*`; the Worker serves them from the `FRONTIER_DATA` R2 binding and local development falls back to `public/data`. See the repository root README for Cloudflare setup.
