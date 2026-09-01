import type { Metadata } from 'next'
import { ContactForm } from './contact-form'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'For Teams & Enterprise',
  description:
    'English and Chinese AI intelligence for teams, plus an evidence-linked AI deal tracker and planned custom feeds, dashboards, and white-label pilots.',
  alternates: { canonical: '/for-teams' },
  openGraph: {
    title: 'For Teams & Enterprise',
    description:
      'English and Chinese AI intelligence with an evidence-linked deal tracker, plus planned custom feeds, dashboards, and white-label pilots.',
    url: '/for-teams',
    images: [{ url: '/logo/social-share-en.png', width: 1200, height: 630, alt: 'Frontier' }],
  },
}

const useCases = [
  {
    title: 'Corporate Innovation Teams',
    description:
      'Stay ahead of AI trends affecting your industry. Monitor breakthroughs, track competitor moves, and identify emerging technologies before they reshape your market.',
    icon: 'B',
    accent: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Investment Firms',
    description:
      'Follow selected AI funding rounds, acquisitions, and market movements alongside the technology developments that shape investment context.',
    icon: 'I',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Research Departments',
    description:
      'Monitor AI breakthroughs and academic developments from 35+ curated sources. Receive periodic digests covering technology, tools, and practical applications.',
    icon: 'R',
    accent: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'Consulting Firms',
    description:
      'White-label AI news feed for client deliverables (pilot program). Work with us to embed curated, multilingual AI intelligence into your reports, newsletters, and intranet portals.',
    icon: 'C',
    accent: 'bg-purple-100 text-purple-700',
  },
]

// These are PLANNED offerings (roadmap Phase 4) — none are live products
// today. The page must present them as pilot engagements, not inventory.
const products = [
  {
    name: 'Enterprise Dashboard',
    description: 'Custom AI news dashboard with team access, role-based permissions, and saved filters',
    price: 'EUR 500/mo',
  },
  {
    name: 'White-Label Feed',
    description: 'Branded AI news widget for your website or corporate intranet',
    price: 'EUR 300/mo',
  },
  {
    name: 'Custom Data Feeds',
    description: 'Filtered data access, custom categories, and webhooks (planned)',
    price: 'EUR 200/mo',
  },
  {
    name: 'AI Trend Reports',
    description: 'Monthly or weekly analyst-grade AI trend reports with executive summaries',
    price: 'EUR 100/report',
  },
]

const benefits = [
  '35+ curated sources on continuous schedules',
  'English and Chinese content',
  'Continuously updated AI news archive in English and Chinese',
  'Privacy-first: no account required, no tracking ads',
  'Custom filtering by topic, company, and technology (pilot)',
  'Dedicated account support and SLA options (pilot)',
  'No long-term commitment for pilot engagements',
]

export default function ForTeamsPage() {
  return (
    <main id="main-content">
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-sm text-gray-600">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to Home
          </a>
        </p>
      </header>

      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4">AI Intelligence for Your Team</h1>
        <p className="text-lg leading-relaxed text-gray-700">
          Frontier delivers curated, multilingual AI news and market intelligence for corporate
          innovation teams, investment professionals, and technology leaders. Our automated pipeline
          processes 35+ sources on continuous schedules, producing structured intelligence in English and Chinese — so your
          team can focus on decisions, not discovery.
        </p>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Who We Serve</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${uc.accent}`}
                  aria-hidden="true"
                >
                  {uc.icon}
                </span>
                <h3 className="text-lg font-semibold">{uc.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{uc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Offerings */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Planned Offerings (Pilot Program)</h2>
        <p className="text-sm text-gray-600 mb-4">
          These offerings are in development and available as pilot
          engagements — get in touch below to shape them with us. Prices are
          planned pilot pricing, not a live price list.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Product
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Description
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Planned Price
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.name}>
                  <td className="border border-gray-200 px-4 py-3 font-medium whitespace-nowrap">
                    {product.name}
                  </td>
                  <td className="border border-gray-200 px-4 py-3">{product.description}</td>
                  <td className="border border-gray-200 px-4 py-3 whitespace-nowrap tabular-nums">
                    {product.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Planned prices exclude VAT; final pilot terms are agreed individually.
        </p>
      </section>

      {/* Key Benefits */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Key Benefits</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-green-600 mt-0.5 shrink-0" aria-hidden="true">
                &#10003;
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      {/* Contact Form */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
        <p className="text-sm text-gray-600 mb-6">
          Tell us about your team and requirements — the form opens a prefilled email to us. We will get back to you as soon as possible.
        </p>
        <ContactForm />
      </section>

      <footer className="mt-12 border-t border-gray-200 pt-6">
        <div className="flex gap-4 text-sm">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Home
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/impressum"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Impressum
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/datenschutz"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Datenschutz
          </a>
        </div>
      </footer>
    </article>
    </main>
  )
}
