import type { Metadata } from 'next'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'Editorial Policy | Forager',
  description: 'Editorial policy for Forager, including source attribution, curation rules, corrections, and AI-assisted processing.',
  alternates: { canonical: 'https://www.forager.example/editorial-policy' },
  openGraph: {
    title: 'Editorial Policy | Forager',
    description: 'How Forager selects sources, summarizes AI news, labels AI-assisted processing, and handles corrections.',
    url: 'https://www.forager.example/editorial-policy',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Forager' }],
  },
}

const config: TrustPageConfig = {
  label: 'Editorial Policy',
  title: 'How Forager Curates Intelligence',
  description: 'Our editorial policy is built around attribution, clear summaries, source traceability, and conservative labeling of AI-assisted content.',
  sections: [
    {
      title: 'Selection Criteria',
      body: [
        'Items are selected for relevance to AI technology, AI business, AI capital formation, applied workflows, policy, infrastructure, and developer practice.',
      ],
      bullets: [
        'We prioritize source-backed developments over generic commentary.',
        'We avoid publishing items when the underlying source is unavailable or too ambiguous to summarize responsibly.',
        'We separate video items from text items when the primary source format is video.',
      ],
    },
    {
      title: 'Attribution',
      body: [
        'Each news item should retain source attribution whenever the source is available. External links belong to the original publisher; Forager period pages are the canonical pages for our summaries.',
      ],
    },
    {
      title: 'Summaries',
      body: [
        'Summaries are written to preserve the factual substance of the source while making the item easier to scan. We avoid representing summaries as original reporting unless that is explicitly true.',
      ],
    },
    {
      title: 'Conflicts And Monetization',
      body: [
        'The product may include free tools, newsletter signup, or commercial contact flows. Editorial summaries should not be shaped by those conversion goals.',
      ],
    },
    {
      title: 'Corrections',
      body: [
        'When we identify a material error, we update the affected content or remove the item. The corrections process is documented on the corrections page.',
      ],
    },
  ],
}

export default function EditorialPolicyPage() {
  return <TrustPage config={config} />
}
