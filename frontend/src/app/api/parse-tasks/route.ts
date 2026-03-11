import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()
          const response = await fetch(`${API_URL}/api/parse-tasks`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
          })
          if (!response.ok) {
                  const err = await response.json().catch(() => ({ detail: 'Parse failed' }))
                  return NextResponse.json(err, { status: response.status })
          }
          const data = await response.json()
          return NextResponse.json(data)
    } catch (error) {
          console.error('parse-tasks proxy error:', error)
          return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 50i0m p}o)r
      t   {} 
  N}extRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()
          const response = await fetch(`${API_URL}/api/parse-tasks`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
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
