'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { persistSession } from '@/lib/auth'
import { useT } from '@/i18n/client'

function VerifyInner() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useT('auth')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setMessage(t('errNoToken')); return }

    fetch(`/api/auth/verify?token=${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      .then(data => {
        if (!data.ok) throw new Error(data.detail || t('errInvalidLink'))
        persistSession(data.email)
        setStatus('success')
        setTimeout(() => router.push('/'), 1500)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [params, router])

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-[#e5e5ea] p-10 text-center max-w-[380px] w-full shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin mx-auto mb-4" />
            <p className="text-[16px] font-medium text-[#1d1d1f]">{t('verifyingLink')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <p className="text-[18px] font-semibold text-[#1d1d1f] mb-1">{t('signedIn')}</p>
            <p className="text-[14px] text-[#6e6e73]">{t('redirecting')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-[18px] font-semibold text-[#1d1d1f] mb-2">{t('linkInvalid')}</p>
            <p className="text-[14px] text-[#6e6e73] mb-6">{message}</p>
            <a href="/auth" className="inline-block bg-[#0071e3] text-white px-6 py-3 rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-all">
              {t('requestNewLink')}
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" />
      </div>
    }>
      <VerifyInner />
    </Suspense>
  )
}
