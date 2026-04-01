import { NextResponse } from 'next/server';

// Pings the Render backend to prevent free-tier spin-down (sleeps after ~15 min idle).
// Cron schedule: every 14 minutes (see vercel.json) — keeps Render warm at all times.
export async function GET() {
  const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    console.error('[keep-alive] API_URL env var not set');
    return NextResponse.json({ ok: false, error: 'API_URL not configured' }, { status: 500 });
  }

  try {
    const start = Date.now();
    const res = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: { 'x-keep-alive': '1' },
      signal: AbortSignal.timeout(10_000),
    });

    const ms = Date.now() - start;

    if (!res.ok) {
      const body = await res.text();
      console.error(`[keep-alive] Render ping failed: HTTP ${res.status} — ${body}`);
      return NextResponse.json({ ok: false, status: res.status, ms }, { status: 500 });
    }

    console.log(`[keep-alive] Render ping OK in ${ms}ms at`, new Date().toISOString());
    return NextResponse.json({ ok: true, ms, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[keep-alive] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
