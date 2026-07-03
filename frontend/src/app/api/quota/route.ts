import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * Dedicated /api/quota proxy.
 * Vercel rewrites x-forwarded-for with its own edge IP before the catch-all
 * proxy reaches the backend, so the backend get_client_ip() sees a Vercel
 * datacenter IP instead of the real user IP -- breaking the owner bypass.
 *
 * This route reads the real IP from the incoming Vercel request headers and
 * injects it as x-real-ip so the backend owner-bypass check works correctly.
 */
// Owner IPs that get unlimited analyses — bypass quota check entirely in the
// frontend so it works regardless of Render deploy state or in-memory limiter.
// Configured ONLY via the OWNER_IP env var (never hardcoded — a real IP in the
// public repo is a privacy leak). Empty by default. Each entry may be an exact
// IP, a prefix like "84.59." / "84.59.*", or "*" (matches everything).
const OWNER_IPS = (process.env.OWNER_IP || '')
  .split(',').map(s => s.trim()).filter(Boolean)

// Prefix/wildcard-aware match (mirrors backend is_owner_ip), so ISP IP churn
// doesn't silently disable the owner bypass.
function isOwnerIp(ip: string): boolean {
  if (!ip) return false
  return OWNER_IPS.some((entry) => {
    if (entry === '*') return true
    if (entry.endsWith('*')) return ip.startsWith(entry.slice(0, -1))
    if (entry.endsWith('.')) return ip.startsWith(entry)
    return ip === entry
  })
}

export async function GET(request: NextRequest) {
  try {
    const realIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      ''

    // Owner bypass — return "not exceeded" immediately without hitting backend
    if (isOwnerIp(realIp)) {
      return NextResponse.json({ used: 0, limit: 5, remaining: 5, exceeded: false })
    }

    const upstream = await fetch(`${BACKEND_URL}/api/quota`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': realIp,
        'x-real-ip': realIp,
      },
    })

    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch (err) {
    console.error('[quota proxy error]', err)
    return NextResponse.json({ used: 0, limit: 5, remaining: 5, exceeded: false }, { status: 200 })
  }
}
