'use client'

import { useState } from 'react'
import { Mail, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#0071e3] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[20px] font-semibold tracking-tight text-[#1d1d1f]">WorkScanAI</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-8 shadow-sm">
          {!sent ? (
            <>
              <h1 className="text-[24px] font-semibold text-[#1d1d1f] mb-2">Sign in</h1>
              <p className="text-[15px] text-[#6e6e73] mb-7">
                Enter your email and we'll send a magic link — no password needed.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Email address
                  </label>
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
                {error && (
                  <p className="text-[13px] text-red-500">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white py-3 rounded-xl text-[15px] font-medium transition-all"
                >
                  {loading ? 'Sending…' : <>Send magic link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-[12px] text-[#86868b] text-center mt-5">
                Free tier: 5 analyses per 24 hours.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">Check your inbox</h2>
              <p className="text-[15px] text-[#6e6e73] mb-1">
                We sent a sign-in link to
              </p>
              <p className="text-[15px] font-medium text-[#1d1d1f] mb-5">{email}</p>
              <p className="text-[13px] text-[#86868b]">
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-[13px] text-[#0071e3] hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
