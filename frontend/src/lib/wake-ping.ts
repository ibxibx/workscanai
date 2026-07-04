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

// ── Cold-start-resilient fetch ───────────────────────────────────────────────
//
// Render free-tier spins the backend down after ~15 min idle. The first request
// after that either hangs for 30-50s or fails outright (502/503/504 from the
// Render router, or a network error before the container is up). A single
// fetch() therefore surfaces a false "backend down" error to the user.
//
// fetchWithWake wraps fetch with:
//   • an onWarming(true) callback fired if the request is slow OR retrying, so
//     the caller can show the shared warming toast
//   • automatic retries on network errors and cold-start status codes
//     (502/503/504, and 500 which the Turso/ORM layer can emit mid-boot)
//   • generous per-attempt timeouts to ride out the cold boot
//
// It intentionally does NOT retry 4xx (404/401/403) — those are real answers,
// not cold-start symptoms — so ownership/not-found handling still works.

const COLD_START_STATUSES = new Set([500, 502, 503, 504])
const WARMING_TOAST_DELAY_MS = 800

export interface FetchWithWakeOptions extends RequestInit {
  onWarming?: (warming: boolean) => void
  maxRetries?: number
  attemptTimeoutMs?: number
}

export async function fetchWithWake(
  input: string,
  { onWarming, maxRetries = 4, attemptTimeoutMs = 60_000, ...init }: FetchWithWakeOptions = {},
): Promise<Response> {
  let warmingShown = false
  const showWarming = () => {
    if (!warmingShown) { warmingShown = true; onWarming?.(true) }
  }
  const clearWarming = () => {
    if (warmingShown) { warmingShown = false; onWarming?.(false) }
  }

  // Fire the toast if the very first attempt is slow (likely a cold boot),
  // without waiting for it to fail first.
  let slowTimer: ReturnType<typeof setTimeout> | null = null
  if (!isLikelyWarm()) {
    slowTimer = setTimeout(showWarming, WARMING_TOAST_DELAY_MS)
  }

  let lastErr: unknown = null
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(input, {
          ...init,
          cache: init.cache ?? 'no-store',
          signal: init.signal ?? AbortSignal.timeout(attemptTimeoutMs),
        })
        // Cold-start status → retry (unless we're out of attempts)
        if (COLD_START_STATUSES.has(res.status) && attempt < maxRetries) {
          showWarming()
          lastWakeAt = 0 // force the next wake ping to actually run
          await sleep(backoffMs(attempt))
          continue
        }
        clearWarming()
        lastWakeAt = Date.now() // a real HTTP answer means the box is up
        return res
      } catch (err: unknown) {
        // Caller-initiated aborts must propagate untouched.
        if (err instanceof DOMException && err.name === 'AbortError' && init.signal?.aborted) {
          throw err
        }
        lastErr = err
        if (attempt < maxRetries) {
          showWarming()
          await sleep(backoffMs(attempt))
          continue
        }
      }
    }
  } finally {
    if (slowTimer) clearTimeout(slowTimer)
  }

  clearWarming()
  throw lastErr instanceof Error ? lastErr : new Error('Request failed after cold-start retries')
}

function backoffMs(attempt: number): number {
  // 1.5s, 3s, 5s, 7s … capped — long enough to let Render finish booting.
  return Math.min(1500 + attempt * 2000, 8000)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
