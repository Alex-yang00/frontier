import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung / Privacy Policy',
  description: 'Privacy policy for Frontier, covering hosting, functional cookies, analytics, embedded media, backend APIs, and data rights.',
  alternates: { canonical: '/datenschutz' },
  openGraph: {
    title: 'Privacy Policy | Frontier',
    description: 'Privacy policy for Frontier, covering hosting, cookies, analytics, embedded media, APIs, and data rights.',
    url: '/datenschutz',
    images: [{ url: '/logo/social-share.png', width: 1200, height: 630, alt: 'Frontier' }],
  },
}

export default function DatenschutzPage() {
  return (
    <main id="main-content">
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Datenschutzerklärung / Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-600">
          <a href="/" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">
            &larr; Zur Startseite / Back to Home
          </a>
        </p>
      </header>

      {/* Draft / placeholder banner — the controller/DPO/retention fields in
          [brackets] below have not been filled in yet. This page will be
          revised before we enable advertising cookies or any third-party ad
          network. Shown publicly to avoid misleading readers. */}
      <aside
        role="note"
        className="mb-8 rounded-md border-2 border-amber-500/60 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200"
      >
        <strong className="font-semibold">⚠ Draft notice — Entwurf:</strong>{' '}
        This privacy policy is in draft form. Controller contact, DPO, and
        retention fields in square brackets will be completed before any
        advertising cookies are enabled on this site. Today the site sets only
        a functional &quot;visited&quot; cookie and uses Vercel Analytics
        (privacy-friendly, no cookies). — Diese Datenschutzerklärung ist ein
        Entwurf; Platzhalter werden vor Aktivierung von Werbecookies ergänzt.
      </aside>

      {/* German Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Datenschutzerklärung (Deutsch)</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Verantwortliche Stelle</h3>
            <p className="leading-relaxed">
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="leading-relaxed mt-2">
              [Name des Verantwortlichen]<br />
              [Straße und Hausnummer]<br />
              [PLZ Ort]<br />
              E-Mail: [E-Mail-Adresse]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">2. Hosting</h3>
            <p className="leading-relaxed text-sm">
              Diese Website wird über Cloudflare bereitgestellt. Beim Aufruf
              dieser Website werden automatisch Informationen (z.B. IP-Adresse, Zeitpunkt des
              Zugriffs, verwendeter Browser) an die Server der Hosting-Anbieter übermittelt.
              Dies ist für den Betrieb der Website technisch erforderlich.
            </p>
            <p className="leading-relaxed text-sm mt-2">
              Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an einer effizienten und sicheren Bereitstellung der
              Website).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">3. Cookies</h3>
            <p className="leading-relaxed text-sm">
              Diese Website verwendet ein einziges funktionales Cookie:
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-200 px-2 py-1 text-left">Cookie</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Zweck</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Dauer</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Rechtsgrundlage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-2 py-1"><code>visited</code></td>
                    <td className="border border-gray-200 px-2 py-1">
                      Speichert, ob die Begrüßungsseite bereits angezeigt wurde
                    </td>
                    <td className="border border-gray-200 px-2 py-1">30 Tage</td>
                    <td className="border border-gray-200 px-2 py-1">
                      Art. 6 Abs. 1 lit. f DSGVO (technisch notwendig)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="leading-relaxed text-sm mt-2">
              Dieses Cookie ist technisch notwendig für den Betrieb der Website und erfordert
              keine Einwilligung gemäß § 25 Abs. 2 TDDDG.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">4. Webanalyse</h3>
            <p className="leading-relaxed text-sm">
              Diese Website verwendet <strong>Vercel Analytics</strong>, einen
              datenschutzfreundlichen Analysedienst. Vercel Analytics erfasst keine
              personenbezogenen Daten, setzt keine Cookies und führt kein geräteübergreifendes
              Tracking durch. Es werden ausschließlich aggregierte, anonyme Nutzungsdaten
              erhoben.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">5. Drittanbieterdienste</h3>

            <h4 className="font-semibold mt-3 mb-1">Öffentliche Inhaltsdaten</h4>
            <p className="leading-relaxed text-sm">
              Die Website lädt öffentliche JSON-Inhaltsdaten. Dabei werden keine Benutzerkonten oder persönlichen Profile angelegt.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">6. Ihre Rechte (DSGVO Art. 15-21)</h3>
            <p className="leading-relaxed text-sm">
              Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO) - Recht auf Auskunft über Ihre gespeicherten Daten</li>
              <li><strong>Berichtigungsrecht</strong> (Art. 16 DSGVO) - Recht auf Korrektur unrichtiger Daten</li>
              <li><strong>Löschungsrecht</strong> (Art. 17 DSGVO) - Recht auf Löschung Ihrer Daten</li>
              <li><strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO) - Recht auf Einschränkung der Datenverarbeitung</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) - Recht auf Erhalt Ihrer Daten in einem gängigen Format</li>
              <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO) - Recht auf Widerspruch gegen die Datenverarbeitung</li>
            </ul>
            <p className="leading-relaxed text-sm mt-2">
              Darüber hinaus haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
              über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">7. Datenspeicherung</h3>
            <p className="leading-relaxed text-sm">
              Server-Logdaten werden automatisch nach [Anzahl] Tagen gelöscht. Das funktionale
              Cookie wird nach 30 Tagen automatisch ungültig. Darüber hinaus werden keine
              personenbezogenen Daten gespeichert.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">8. Kontakt für Datenschutzanfragen</h3>
            <p className="leading-relaxed text-sm">
              Für Fragen zum Datenschutz wenden Sie sich bitte an:<br />
              [Name des Datenschutzbeauftragten oder Verantwortlichen]<br />
              E-Mail: [E-Mail-Adresse für Datenschutzanfragen]
            </p>
          </div>
        </div>
      </section>

      {/* English Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Privacy Policy (English)</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Data Controller</h3>
            <p className="leading-relaxed">
              The party responsible for data processing on this website is:
            </p>
            <p className="leading-relaxed mt-2">
              [Controller Name]<br />
              [Street and Number]<br />
              [Postal Code City]<br />
              Email: [Email Address]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">2. Hosting</h3>
            <p className="leading-relaxed text-sm">
              This website is delivered through Cloudflare. When you access this
              website, information (e.g., IP address, access time, browser used) is automatically
              transmitted to the hosting providers{"'"} servers. This is technically necessary for
              operating the website.
            </p>
            <p className="leading-relaxed text-sm mt-2">
              Legal basis: Art. 6(1)(f) GDPR (legitimate interest in efficient and secure
              provision of the website).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">3. Cookies</h3>
            <p className="leading-relaxed text-sm">
              This website uses a single functional cookie:
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-200 px-2 py-1 text-left">Cookie</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Purpose</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Duration</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-2 py-1"><code>visited</code></td>
                    <td className="border border-gray-200 px-2 py-1">
                      Stores whether the welcome page has been shown
                    </td>
                    <td className="border border-gray-200 px-2 py-1">30 days</td>
                    <td className="border border-gray-200 px-2 py-1">
                      Art. 6(1)(f) GDPR (technically necessary)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="leading-relaxed text-sm mt-2">
              This cookie is technically necessary for the operation of the website and does not
              require consent.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">4. Web Analytics</h3>
            <p className="leading-relaxed text-sm">
              This website uses <strong>Vercel Analytics</strong>, a privacy-friendly analytics
              service. Vercel Analytics does not collect personal data, does not set cookies, and
              does not perform cross-device tracking. Only aggregated, anonymous usage data is
              collected.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">5. Third-Party Services</h3>

            <h4 className="font-semibold mt-3 mb-1">Public content data</h4>
            <p className="leading-relaxed text-sm">
              The website loads public JSON content files. It does not create user accounts or personal profiles.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">6. Your Rights (GDPR Art. 15-21)</h3>
            <p className="leading-relaxed text-sm">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li><strong>Right of access</strong> (Art. 15 GDPR) - Right to information about your stored data</li>
              <li><strong>Right to rectification</strong> (Art. 16 GDPR) - Right to correct inaccurate data</li>
              <li><strong>Right to erasure</strong> (Art. 17 GDPR) - Right to deletion of your data</li>
              <li><strong>Right to restriction</strong> (Art. 18 GDPR) - Right to restrict data processing</li>
              <li><strong>Right to data portability</strong> (Art. 20 GDPR) - Right to receive your data in a common format</li>
              <li><strong>Right to object</strong> (Art. 21 GDPR) - Right to object to data processing</li>
            </ul>
            <p className="leading-relaxed text-sm mt-2">
              You also have the right to lodge a complaint with a data protection supervisory
              authority regarding the processing of your personal data.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">7. Data Retention</h3>
            <p className="leading-relaxed text-sm">
              Server log data is automatically deleted after [number] days. The functional cookie
              expires automatically after 30 days. No further personal data is stored.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">8. Contact for Data Protection Inquiries</h3>
            <p className="leading-relaxed text-sm">
              For questions regarding data protection, please contact:<br />
              [Data Protection Officer or Responsible Person Name]<br />
              Email: [Email Address for Data Protection Inquiries]
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-12 border-t border-gray-200 pt-6">
        <div className="flex gap-4 text-sm">
          <a href="/" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">Startseite / Home</a>
          <span className="text-gray-400">|</span>
          <a href="/impressum" className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded">Impressum / Legal Notice</a>
        </div>
      </footer>
    </article>
    </main>
  )
}
