// frontend/src/lib/wake-ping.ts
//
// Pre-warms the Render free-tier backend on key user moments
// (page load, focus, just before submit) so the first real request
// doesn't pay the 30-50s cold-start penalty.

const BACKEND_DIRECT = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://workscanai.onrender.com'
).replace(/\/$/, '')

let inFlight: Promise<WakeStatus> | null = null
let lastWakeAt = 0
const WAKE_TTL_MS = 10 * 60 * 1000

export type WakeStatus =
  | { state: 'warm'; latencyMs: number }
  | { state: 'cold'; latencyMs: number }
  | { state: 'failed'; error: string }

export function wakeBackend(): Promise<WakeStatus> {
  if (inFlight) return inFlight
  if (lastWakeAt && Date.now() - lastWakeAt < WAKE_TTL_MS) {
    return Promise.resolve({ state: 'warm', latencyMs: 0 })
  }
  const start = Date.now()
  inFlight = (async (): Promise<WakeStatus> => {
    try {
      const res = await fetch(`${BACKEND_DIRECT}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(60_000),
        cache: 'no-store',
      })
      const latencyMs = Date.now() - start
      if (!res.ok) return { state: 'failed', error: `HTTP ${res.status}` }
      lastWakeAt = Date.now()
      return latencyMs > 3000 ? { state: 'cold', latencyMs } : { state: 'warm', latencyMs }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'wake failed'
      return { state: 'failed', error: msg }
    } finally {
      setTimeout(() => { inFlight = null }, 1000)
    }
  })()
  return inFlight
}

export function isLikelyWarm(): boolean {
  return lastWakeAt > 0 && Date.now() - lastWakeAt < WAKE_TTL_MS
}
