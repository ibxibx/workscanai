import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000'

export async function GET(
    _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    try {
          const { id } = await params
          const response = await fetch(`${API_URL}/api/workflows/${id}`)
          if (!response.ok) {
                  return NextResponse.json({ error: 'Not found' }, { status: response.status })
          }
          const data = await response.json()
          return NextResponse.json(data)
    } catch (error) {
          console.error('workflows/[id] proxy error:', error)
          return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 })
    }
}
