# Forager Web

Forager's Next.js 16 interface. It reads canonical JSON produced by the repository collectors and supports English and Simplified Chinese content.

```bash
pnpm install
pnpm dev --hostname 0.0.0.0 --port 5173
pnpm lint
pnpm build
```

Set `NEXT_PUBLIC_FORAGER_DATA_URL` to a published JSON base URL. It defaults to `/data` for local development.
