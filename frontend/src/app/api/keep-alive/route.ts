import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, error: 'Missing Supabase env vars' }, { status: 500 });
    }

    // Lightweight ping via REST — no SDK needed
    const res = await fetch(`${supabaseUrl}/rest/v1/workflows?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[keep-alive] Supabase ping failed:', err);
      return NextResponse.json({ ok: false, error: err }, { status: 500 });
    }

    console.log('[keep-alive] Supabase ping OK at', new Date().toISOString());
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[keep-alive] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
