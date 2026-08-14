export async function POST(req: Request) {
  try {
    const { email, language } = await req.json();
    const SUPPORTED = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"];
    const lang = SUPPORTED.includes(language) ? language : "de";

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (!apiKey || !publicationId) {
      console.error("Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID");
      return Response.json(
        { error: "Newsletter service not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          reactivate_existing: true,
          send_welcome_email: true,
          custom_fields: [{ name: "language", value: lang }],
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Beehiiv API error ${res.status}: ${body}`);

      if (res.status === 409) {
        // Already subscribed — treat as success
        return Response.json({ ok: true, alreadySubscribed: true });
      }

      return Response.json(
        { error: "Subscription failed" },
        { status: res.status }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
