import { NextRequest, NextResponse } from 'next/server'

// Proxy all /api/* calls to the Python backend
// Set API_URL in Vercel environment variables to your backend URL
// e.g. https://workscanai-backend.onrender.com
const API_URL = process.env.API_URL || 'http://localhost:8000'

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const fullPath = '/api/' + path.join('/')
  const search = request.nextUrl.searchParams.toString()
  const url = `${API_URL}${fullPath}${search ? '?' + search : ''}`

  try {
    const isBodyless = ['GET', 'HEAD', 'DELETE'].includes(request.method)
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
      },
    })
  } catch (err) {
    console.error(`[API proxy] ${request.method} ${url} failed:`, err)
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 503 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
