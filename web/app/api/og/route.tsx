import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const API_BASE = 'https://api.forager.example/api'

interface TechPost {
  author?: { name?: string }
  content?: string
  impact?: string
}

async function getTopHeadlines(periodId: string, lang: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json() as Record<string, TechPost[]>
    const posts = data[lang] || data.en || data.de || []
    return posts
      .filter((p: TechPost) => !('isVideo' in p && (p as any).isVideo))
      .slice(0, 3)
      .map((p: TechPost) => {
        const name = p.author?.name || ''
        return name.length > 60 ? name.slice(0, 57) + '...' : name
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || ''
  const lang = searchParams.get('lang') || 'en'
  const title = lang === 'de' ? `KI-News ${period}` : `AI News ${period}`

  const headlines = await getTopHeadlines(period, lang)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Forager mark */}
        <svg width="80" height="80" viewBox="0 0 512 512" fill="none">
          <rect x="32" y="32" width="448" height="448" rx="72" fill="#0a0a0b" />
          <path d="M142 112v288M142 124h182M142 244h142" fill="none" stroke="#fffdf9" strokeWidth="40" strokeLinecap="square" />
          <path d="M326 292v108M278 340h108" fill="none" stroke="#22c55e" strokeWidth="30" strokeLinecap="square" />
        </svg>

        {/* Brand name */}
        <div
          style={{
            fontSize: 28,
            color: '#888',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          Forager
        </div>

        {/* Period title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: 'white',
            marginTop: 12,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>

        {/* Headlines */}
        {headlines.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 28,
              gap: 8,
            }}
          >
            {headlines.map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 20,
                  color: '#a0a0a0',
                  maxWidth: 900,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: '#60A5FA', fontSize: 16 }}>●</span>
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Language badges */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
            fontSize: 14,
            color: '#555',
          }}
        >
          {['EN', 'ZH'].map((l) => (
            <span
              key={l}
              style={{
                color: l === lang.toUpperCase() ? '#60A5FA' : '#555',
                fontWeight: l === lang.toUpperCase() ? 700 : 400,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
