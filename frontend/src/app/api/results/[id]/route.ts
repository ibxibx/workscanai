import { NextRequest, NextResponse } from 'next/server'

function getPythonBackendUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8000'
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const response = await fetch(`${getPythonBackendUrl()}/api/results/${id}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('results proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
