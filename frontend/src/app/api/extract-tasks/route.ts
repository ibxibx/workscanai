import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
    try {
          const formData = await request.formData()
          const response = await fetch(`${API_URL}/api/extract-tasks`, {
                  method: 'POST',
                  body: formData,
          })
          if (!response.ok) {
                  const err = await response.json().catch(() => ({ detail: 'Extraction failed' }))
                  return NextResponse.json(err, { status: response.status })
          }
          const data = await response.json()
          return NextResponse.json(data)
    } catch (error) {
          console.error('extract-tasks proxy error:', error)
          return NextResponse.json({ error: 'Failed to extract tasks' }, { status: 500 })
    }
}
