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
    const contentType = request.headers.get('content-type')

    const upstream = await fetch(url, {
      method: request.method,
      headers: contentType ? { 'content-type': contentType } : {},
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
