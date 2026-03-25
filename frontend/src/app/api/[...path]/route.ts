import { NextRequest, NextResponse } from 'next/server'

const API_URL = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '')

// Headers that must never be forwarded to the upstream backend
const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
  // content-length is recalculated from the actual body buffer below
  'content-length',
  // encoding headers — Node fetch handles this itself
  'accept-encoding',
])

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
    const bodyBuffer = isBodyless ? null : await request.arrayBuffer()

    // Forward safe headers only — strip hop-by-hop + content-length (recalculated)
    const forwardHeaders: Record<string, string> = {}
    request.headers.forEach((val, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        forwardHeaders[key] = val
      }
    })

    // Set correct content-length from actual buffer size
    if (bodyBuffer && bodyBuffer.byteLength > 0) {
      forwardHeaders['content-length'] = String(bodyBuffer.byteLength)
    }

    const upstream = await fetch(url, {
      method: request.method,
      headers: forwardHeaders,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      // @ts-ignore — Node 18+ fetch supports this; prevents response body buffering issues
      duplex: 'half',
    })

    // Always use arrayBuffer — text() corrupts binary files (docx, pdf)
    const responseBuffer = await upstream.arrayBuffer()

    const responseHeaders: Record<string, string> = {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*',
    }
    const disposition = upstream.headers.get('content-disposition')
    if (disposition) responseHeaders['content-disposition'] = disposition

    return new NextResponse(responseBuffer, {
      status: upstream.status,
      headers: responseHeaders,
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

// Increase max duration: 120s covers Render free-tier cold start (~30-50s) + analysis time
export const maxDuration = 120
