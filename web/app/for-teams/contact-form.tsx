'use client'

import { useState } from 'react'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')

  // There is no server-side inbox for this form — delivery happens via the
  // visitor's own mail client (mailto: draft, prefilled from the fields).
  // Never show a "we received it" state that nothing backs up.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Team inquiry — ${company || name}`)
    const body = encodeURIComponent(
      `Name: ${name}\nWork email: ${email}\nCompany: ${company}\n\n${message}`
    )
    window.location.href = `mailto:enterprise@forager.example?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-2">
          One more step — send the email.
        </p>
        <p className="text-green-700 text-sm">
          We asked your mail client to open a prefilled draft. If it opened,
          hit send there to complete the inquiry. If nothing opened, please
          email{' '}
          <a href="mailto:enterprise@forager.example" className="underline">
            enterprise@forager.example
          </a>{' '}
          directly.
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
          Compose Email Inquiry
        </button>
        <span className="text-xs text-gray-500">
          Or email us directly at{' '}
          <a
            href="mailto:enterprise@forager.example"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            enterprise@forager.example
          </a>
        </span>
      </div>
    </form>
  )
}
