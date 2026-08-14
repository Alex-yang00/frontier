import Link from 'next/link'

export interface TrustSection {
  title: string
  body?: string[]
  bullets?: string[]
}

export interface TrustPageConfig {
  label: string
  title: string
  description: string
  sections: TrustSection[]
}

const trustLinks = [
  { href: '/about', label: 'About' },
  { href: '/editorial-policy', label: 'Editorial Policy' },
  { href: '/source-methodology', label: 'Source Methodology' },
  { href: '/corrections', label: 'Corrections' },
  { href: '/ai-disclosure', label: 'AI Disclosure' },
  { href: '/contact', label: 'Contact' },
  { href: '/datenschutz', label: 'Privacy Policy' },
]

export function TrustPage({ config }: { config: TrustPageConfig }) {
  return (
    <main id="main-content">
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b-2 border-foreground pb-8">
        <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
          {config.label}
        </p>
        <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-foreground sm:text-5xl">
          {config.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {config.description}
        </p>
        <p className="mt-4 font-sans text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Last reviewed: May 24, 2026
        </p>
      </header>

      <div className="divide-y divide-border">
        {config.sections.map((section, index) => (
          <section key={section.title} className="grid gap-4 py-7 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <div className="font-display text-3xl leading-none text-primary tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div>
              <h2 className="font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-primary">
                {section.title}
              </h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-8 border-t-2 border-foreground pt-5">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Publisher information">
          {trustLinks.map((link) => (
            <Link key={link.href} href={link.href} className="underline hover:no-underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </article>
    </main>
  )
}
