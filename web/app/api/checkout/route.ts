/**
 * POST /api/checkout
 *
 * Proxies checkout session creation to the backend Stripe endpoint.
 * Body: { email: string, tier: "premium" | "api_developer" | "api_business" }
 * Returns: { url: string } -- Stripe Checkout URL to redirect to
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.forager.example/api";

const VALID_TIERS = ["premium", "api_developer", "api_business"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, tier } = body;

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (!tier || !VALID_TIERS.includes(tier)) {
      return Response.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_URL}/stripe/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), tier }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Backend checkout error ${res.status}: ${errorBody}`);
      return Response.json(
        { error: "Failed to create checkout session" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json({ url: data.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
