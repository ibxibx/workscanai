import { NextRequest, NextResponse } from 'next/server'

const API_URL = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params
    const fullPath = '/api/' + path.join('/')
    const search = request.nextUrl.searchParams.toString()
    const url = `${API_URL}${fullPath}${search ? '?' + search : ''}`

    const isBodyless = ['GET', 'HEAD'].includes(request.method)
    const body = isBodyless ? undefined : await request.arrayBuffer()

    // Forward all incoming headers (including x-user-email, authorization, etc.)
    const forwardHeaders: Record<string, string> = {}
    request.headers.forEach((val, key) => {
      // Skip hop-by-hop headers that shouldn't be forwarded
      if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
        forwardHeaders[key] = val
      }
    })

    const upstream = await fetch(url, {
      method: request.method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
    })

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'access-control-allow-origin': '*',
      },
    })
  } catch (err) {
    console.error('[API proxy error]', err)
    return NextResponse.json(
      { error: 'Proxy error', detail: String(err) },
      { status: 503 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
