/**
 * POST /api/checkout
 *
 * Checkout is intentionally unavailable until a real Stripe integration is
 * configured in this application.
 * Body: { email: string, tier: "premium" | "api_developer" | "api_business" }
 * Returns: { url: string } -- Stripe Checkout URL to redirect to
 */

const VALID_TIERS = ["premium", "api_developer", "api_business"];

export async function POST(req: Request) {
  try {
    const body = await req.json() as { email?: unknown; tier?: unknown };
    const { email, tier } = body;

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (typeof tier !== "string" || !VALID_TIERS.includes(tier)) {
      return Response.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Checkout is not configured" },
      { status: 503 }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
