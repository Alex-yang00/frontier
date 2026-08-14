import type { Metadata } from 'next'
import { FundingTracker } from '@/components/funding-tracker'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AI Funding Tracker — Open, Evidence-Linked Deal Data',
  description:
    'Free, open tracker of AI funding rounds and M&A deals. New rows pass a server-side evidence gate and link to their sources; legacy rows are clearly labeled. Free CSV export, no signup.',
  alternates: { canonical: 'https://www.forager.example/funding' },
  openGraph: {
    url: 'https://www.forager.example/funding',
    title: 'AI Funding Tracker — Open, Evidence-Linked Deal Data',
    description:
      'Free tracker of AI funding rounds and M&A deals with per-row provenance labels. Free CSV export.',
  },
}

export default function FundingPage() {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 border-b-2 border-foreground pb-5">
        <p className="mb-1 font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          Forager · Open Data
        </p>
        <h1 className="font-display text-4xl font-normal leading-tight text-foreground">
          AI Funding Tracker
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
          Funding rounds and M&A deals in AI, detected daily across our monitored
          EN/ZH sources. Rows link to their original source; rows labeled
          &quot;evidence-gated&quot; only show figures whose verbatim supporting
          sentence was found in the source text (hover the{' '}
          <span aria-hidden="true">*</span> next to an amount). Older rows are
          labeled &quot;legacy · unverified&quot;. Free to use and export — no signup.
        </p>
      </header>

      {/* Honesty box — this is a feature, not a disclaimer to hide */}
      <aside
        aria-label="Data scope and methodology"
        className="mb-8 border border-border bg-secondary/40 p-4 font-sans text-xs leading-relaxed text-muted-foreground"
      >
        <p className="mb-1">
          <strong className="text-foreground">How this data is made:</strong>{' '}
          deals are extracted by our AI pipeline from public articles. New rows
          pass a server-side <strong className="text-foreground">evidence gate</strong>:
          a financial figure is only published when its verbatim supporting sentence
          is found in the source text — otherwise the figure is withheld. Rows from
          before this gate are labeled{' '}
          <strong className="text-foreground">legacy · unverified</strong>. Coverage
          is limited to our monitored sources; this is <em>not</em> a complete
          market picture, and reported dates reflect when our sources covered the
          deal.
        </p>
        <p>
          Found an error?{' '}
          <a
            href="https://github.com/Alex-yang00/forager/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary hover:underline"
          >
            Report it
          </a>{' '}
          — corrections are published. See{' '}
          <a href="/source-methodology" className="font-bold text-primary hover:underline">
            source methodology
          </a>{' '}
          and{' '}
          <a href="/corrections" className="font-bold text-primary hover:underline">
            corrections policy
          </a>
          . Facts (companies, amounts, rounds, dates) are free to reuse with
          attribution and a link; evidence excerpts are quotations from the
          linked sources and are not licensed for redistribution.
        </p>
      </aside>

      <FundingTracker />

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
          Developers
        </h2>
        <p className="max-w-2xl font-sans text-xs leading-relaxed text-muted-foreground">
          The same data is available as free JSON:{' '}
          <code className="border border-border bg-secondary/40 px-1 py-0.5">
            GET /api/deals
          </code>{' '}
          with filters (<code>deal_type</code>, <code>round_category</code>,{' '}
          <code>industry</code>, <code>q</code>, <code>min_amount</code>,{' '}
          <code>date_from</code>/<code>date_to</code>) — see the{' '}
          <a href="/en/tools/ai-news-api" className="font-bold text-primary hover:underline">
            API page
          </a>
          .
        </p>
      </section>
    </main>
  )
}
