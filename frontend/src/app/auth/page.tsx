'use client'

import { useState } from 'react'
import { Mail, Brain, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react'

type Stage = 'email' | 'otp' | 'success'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState<Stage>('email')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [slowWarning, setSlowWarning] = useState(false)

  async function requestOTP(emailVal: string, isResend = false) {
    setError('')
    setSlowWarning(false)
    if (isResend) setResending(true)
    else setLoading(true)

    // Warn user if it's taking a while (backend cold start)
    const slowTimer = setTimeout(() => setSlowWarning(true), 8000)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      setStage('otp')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The server may be starting up — please try again in a moment.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send code')
      }
    } finally {
      clearTimeout(slowTimer)
      setSlowWarning(false)
      setLoading(false)
      setResending(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    await requestOTP(email)
  }

  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid code')

      // Persist session
      localStorage.setItem('user_email', data.email)
      document.cookie = `user_email=${encodeURIComponent(data.email)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`

      setStage('success')
      setTimeout(() => { window.location.href = '/' }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <a href="/" className="inline-flex items-center gap-[6px] text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
            <Brain className="h-[18px] w-[18px]" />
            WorkScanAI
          </a>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-8 shadow-sm">

          {/* ── Stage 1: Enter email ── */}
          {stage === 'email' && (
            <>
              <h1 className="text-[24px] font-semibold text-[#1d1d1f] mb-2">Sign in</h1>
              <p className="text-[15px] text-[#6e6e73] mb-7">
                Enter your email and we'll send you a 4-digit code — no password needed.
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#d2d2d7] text-[15px] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>
                </div>
                {slowWarning && !error && (
                  <p className="text-[13px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    ⏳ Server is warming up — this can take 20–40 seconds on first use. Hang tight…
                  </p>
                )}
                {error && <p className="text-[13px] text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white py-3 rounded-xl text-[15px] font-medium transition-all"
                >
                  {loading ? 'Sending…' : <>Send sign-in code <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-[12px] text-[#86868b] text-center mt-5">
                Free tier: 5 analyses per 24 hours.
              </p>
            </>
          )}

          {/* ── Stage 2: Enter OTP ── */}
          {stage === 'otp' && (
            <>
              <h1 className="text-[24px] font-semibold text-[#1d1d1f] mb-2">Check your inbox</h1>
              <p className="text-[15px] text-[#6e6e73] mb-1">We sent a 4-digit code to</p>
              <p className="text-[15px] font-medium text-[#1d1d1f] mb-6">{email}</p>
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Enter your code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full text-center text-[32px] font-mono tracking-[12px] py-4 rounded-xl border border-[#d2d2d7] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>
                {error && <p className="text-[13px] text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white py-3 rounded-xl text-[15px] font-medium transition-all"
                >
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>
              </form>
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => { setStage('email'); setOtp(''); setError('') }}
                  className="text-[13px] text-[#6e6e73] hover:underline"
                >
                  ← Use a different email
                </button>
                <button
                  onClick={() => requestOTP(email, true)}
                  disabled={resending}
                  className="text-[13px] text-[#0071e3] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resending ? 'Resending…' : 'Resend code'}
                </button>
              </div>
              <p className="text-[12px] text-[#86868b] text-center mt-4">
                Code expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
            </>
          )}

          {/* ── Stage 3: Success ── */}
          {stage === 'success' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">You're signed in!</h2>
              <p className="text-[15px] text-[#6e6e73]">Redirecting you now…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
