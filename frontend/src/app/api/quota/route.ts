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
export async function GET(request: NextRequest) {
  try {
    const realIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      ''

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
