const DEFAULT_ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export class ApiRouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function hostFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const normalized = value.startsWith("http")
      ? value
      : `https://${value}`;
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

function getAllowedHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);
  const siteHost = hostFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const vercelHost = hostFromUrl(process.env.VERCEL_URL);
  if (siteHost) hosts.add(siteHost);
  if (vercelHost) hosts.add(vercelHost);
  return hosts;
}

function isAllowedOrigin(value: string | null, requestHost: string | null): boolean {
  if (!value) return false;
  const host = hostFromUrl(value);
  if (!host) return false;
  return host === requestHost || getAllowedHosts().has(host);
}

function hasVisitedCookie(cookieHeader: string | null): boolean {
  return /(?:^|;\s*)visited=true(?:;|$)/.test(cookieHeader || "");
}

export function enforceProtectedApiRequest(req: Request) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const requestHost = hostFromUrl(req.url);

  if (!isAllowedOrigin(origin, requestHost) && !isAllowedOrigin(referer, requestHost)) {
    throw new ApiRouteError(403, "Forbidden origin");
  }

  // The `visited` cookie is set automatically by the middleware on any page
  // response (the login gate is gone) — this check only blocks direct API
  // calls that never loaded a page.
  if (!hasVisitedCookie(req.headers.get("cookie"))) {
    throw new ApiRouteError(401, "Visit the site before using the API");
  }
}

// Best-effort per-IP rate limiting. In-memory per serverless instance, so it
// is a deterrent rather than a hard guarantee — enough to stop casual abuse
// of the public LLM endpoints without adding an external dependency.
const rateBuckets = new Map<string, number[]>();
const RATE_BUCKETS_MAX = 10_000;

export function enforceRateLimit(
  req: Request,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const hits = (rateBuckets.get(bucketKey) || []).filter(
    (t) => now - t < windowMs,
  );
  if (hits.length >= limit) {
    throw new ApiRouteError(429, "Rate limit exceeded — try again later");
  }
  hits.push(now);
  if (rateBuckets.size >= RATE_BUCKETS_MAX && !rateBuckets.has(bucketKey)) {
    rateBuckets.clear();
  }
  rateBuckets.set(bucketKey, hits);
}

export async function readJsonBody<T>(
  req: Request,
  maxBytes: number,
): Promise<T> {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiRouteError(413, "Request body too large");
  }

  const raw = await req.text();
  const byteLength = new TextEncoder().encode(raw).length;
  if (byteLength > maxBytes) {
    throw new ApiRouteError(413, "Request body too large");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiRouteError(400, "Invalid JSON body");
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiRouteError) {
    return new Response(error.message, { status: error.status });
  }
  return new Response("Internal error", { status: 500 });
}
