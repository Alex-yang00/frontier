'use client'

import { useState } from 'react'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
const ISSUES_URL = 'https://github.com/Alex-yang00/forager/issues/new'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Team inquiry — ${company || name}`)
    const body = encodeURIComponent(
      `Name: ${name}\nWork email: ${email}\nCompany: ${company}\n\n${message}`
    )
    window.location.href = CONTACT_EMAIL
      ? `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
      : `${ISSUES_URL}?title=${subject}&body=${body}`
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-2">
          One more step — send the email.
        </p>
        <p className="text-green-700 text-sm">
          {CONTACT_EMAIL
            ? 'We opened a prefilled email draft. Send it from your mail client to complete the inquiry.'
            : 'We opened a prefilled GitHub issue. Submit it there to complete the inquiry.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="Your full name"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium mb-1">
          Work Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium mb-1">
          Company <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-company"
          name="organization"
          type="text"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="Company name"
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none resize-y"
          placeholder="Tell us about your team size, use case, and any specific requirements."
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors"
        >
          {CONTACT_EMAIL ? 'Compose Email Inquiry' : 'Open Inquiry'}
        </button>
        <span className="text-xs text-gray-500">
          {CONTACT_EMAIL ? `Or email us directly at ${CONTACT_EMAIL}` : 'No account is required to view the repository.'}
        </span>
      </div>
    </form>
  )
}
