import type { Metadata } from 'next'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'AI Disclosure | Forager',
  description: 'AI usage disclosure for Forager content collection, summarization, categorization, translation, curation, and human review.',
  alternates: { canonical: 'https://www.forager.example/ai-disclosure' },
  openGraph: {
    title: 'AI Disclosure | Forager',
    description: 'How Forager uses AI-assisted workflows for collection, summarization, categorization, translation, and review.',
    url: 'https://www.forager.example/ai-disclosure',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Forager' }],
  },
}

const config: TrustPageConfig = {
  label: 'AI Disclosure',
  title: 'How Forager Uses AI',
  description: 'Forager uses automated and AI-assisted workflows to process public source material into concise multilingual briefings.',
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
        'Use Forager as a discovery and briefing layer. For high-stakes decisions, read the cited source and validate the facts independently.',
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
