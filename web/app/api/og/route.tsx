import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'
import { readPeriodData } from '@/lib/server/frontier-data'

export const runtime = 'nodejs'

interface TechPost {
  author?: { name?: string }
  content?: string
  impact?: string
}

async function getTopHeadlines(periodId: string, lang: string): Promise<string[]> {
  try {
    const { tech: data } = await readPeriodData(periodId)
    const posts = data?.[lang] || data?.en || []
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
  const title = lang === 'zh' ? `AI 新闻 ${period}` : `AI News ${period}`
  const logoUrl = new URL('/logo/frontier-mark-on-dark.svg', request.url)
  // Next's local server canonicalizes the request host to its bind address,
  // which ImageResponse cannot fetch back from. Public hosts remain untouched.
  if (logoUrl.hostname === '0.0.0.0') logoUrl.hostname = '127.0.0.1'

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
        {/* Keep generated cards on the same mark as metadata and favicons. */}
        <img
          src={logoUrl.toString()}
          style={{ width: 80, height: 80 }}
          alt=""
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: 28,
            color: '#888',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          Frontier
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
