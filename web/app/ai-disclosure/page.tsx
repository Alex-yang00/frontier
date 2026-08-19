import type { Metadata } from 'next'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'AI Disclosure | Frontier',
  description: 'AI usage disclosure for Frontier content collection, summarization, categorization, translation, curation, and human review.',
  alternates: { canonical: '/ai-disclosure' },
  openGraph: {
    title: 'AI Disclosure | Frontier',
    description: 'How Frontier uses AI-assisted workflows for collection, summarization, categorization, translation, and review.',
    url: '/ai-disclosure',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Frontier' }],
  },
}

const config: TrustPageConfig = {
  label: 'AI Disclosure',
  title: 'How Frontier Uses AI',
  description: 'Frontier uses automated and AI-assisted workflows to process public source material into concise multilingual briefings.',
  sections: [
    {
      title: 'Where AI Is Used',
      bullets: [
        'Summarizing source material into concise briefing items.',
        'Classifying items by topic, category, and impact level.',
        'Translating summaries into supported languages.',
        'Formatting content for HTML pages, feeds, and Markdown summaries.',
      ],
    },
    {
      title: 'What AI Does Not Mean',
      body: [
        'AI assistance does not make a summary a primary source. The original publisher remains the best source for full context, quotes, legal details, financial numbers, and later updates.',
      ],
    },
    {
      title: 'Reader Guidance',
      body: [
        'Use Frontier as a discovery and briefing layer. For high-stakes decisions, read the cited source and validate the facts independently.',
      ],
    },
    {
      title: 'Search And AI Retrieval',
      body: [
        'The site exposes canonical HTML pages, Atom feeds, sitemap files, llms.txt, and Markdown summaries so search engines and AI retrieval systems can understand the content structure.',
      ],
    },
  ],
}

export default function AiDisclosurePage() {
  return <TrustPage config={config} />
}
