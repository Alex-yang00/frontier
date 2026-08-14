import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Unsubscribe</h1>
        <p className="text-muted-foreground">
          To unsubscribe from the Forager newsletter, simply reply to any
          newsletter email with &quot;unsubscribe&quot; or click the unsubscribe
          link at the bottom of any newsletter you received.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
