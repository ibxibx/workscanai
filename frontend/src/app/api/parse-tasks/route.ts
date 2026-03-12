import { NextRequest, NextResponse } from 'next/server'

function getPythonBackendUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8000'
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${getPythonBackendUrl()}/api/parse-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Parse failed' }))
      return NextResponse.json(err, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('parse-tasks proxy error:', error)
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 })
  }
}
