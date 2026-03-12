import { NextRequest, NextResponse } from 'next/server'

// On Vercel: VERCEL_URL is auto-set (without https://)
// vercel.json routes /api/* -> api/index.py (Python FastAPI)
// We call the Python backend by fetching our own host — vercel.json handles routing
function getPythonBackendUrl(): string {
  // Local dev: Python runs separately on port 8000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000'
  }
  // Production/Preview: call ourselves — vercel.json routes /api/* to Python
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  return host
}

export async function GET(request: NextRequest) {
  try {
    const base = getPythonBackendUrl()
    const response = await fetch(`${base}/api/workflows`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const base = getPythonBackendUrl()
    const body = await request.json()
    const response = await fetch(`${base}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}
