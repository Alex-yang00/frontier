import type { Metadata } from 'next'
import { ContactForm } from '../for-teams/contact-form'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Contact Forager',
  description:
    'Contact Forager for editorial corrections, enterprise access, source questions, partnerships, product support, and data requests.',
  alternates: { canonical: 'https://www.forager.example/contact' },
  openGraph: {
    title: 'Contact Forager',
    description:
      'Contact Forager for corrections, enterprise access, source questions, partnerships, and support.',
    url: 'https://www.forager.example/contact',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Forager' }],
  },
}

export default function ContactPage() {
  return (
    <main id="main-content">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <header className="border-b-2 border-foreground pb-8">
          <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Contact
          </p>
          <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-foreground sm:text-5xl">
            Contact Forager
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Use this form for corrections, source questions, enterprise access,
            partnerships, and product support. We review messages manually.
          </p>
        </header>

        <section className="py-8">
          <h2 className="mb-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-primary">
            Send A Message
          </h2>
          <p className="mb-6 leading-relaxed text-foreground">
            Include the affected page URL when reporting a correction, source
            issue, translation problem, or data question. For enterprise
            requests, include your team size, target languages, preferred
            delivery format, and whether you need API access, custom topics, or
            white-label briefing surfaces.
          </p>
          <ContactForm />
        </section>
        <footer className="border-t border-border pt-5">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Contact page links">
            <a href="/de" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">
              Home
            </a>
            <a href="/about" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">
              About
            </a>
            <a href="/datenschutz" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">
              Privacy Policy
            </a>
            <a href="/editorial-policy" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">
              Editorial Policy
            </a>
          </nav>
        </footer>
      </article>
    </main>
  )
}
