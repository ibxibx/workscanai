'use client'

import { useEffect, useState } from 'react'

export default function LinkedInReceiverPage() {
  const [status, setStatus] = useState<'waiting' | 'received' | 'error'>('waiting')
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'workscanai_linkedin_data') return
      const data = event.data
      setProfileName(data.name || 'Profile')
      setStatus('received')
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'workscanai_linkedin_data', ...data }, '*')
        }
      } catch {}
      setTimeout(() => window.close(), 1200)
    }

    window.addEventListener('message', handler)

    // Fallback: data passed via URL hash (if popup was blocked)
    const hash = window.location.hash.slice(1)
    if (hash) {
      try {
        const data = JSON.parse(decodeURIComponent(hash))
        if (data?.type === 'workscanai_linkedin_data') handler({ data } as MessageEvent)
      } catch {}
    }

    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '40px 48px',
        textAlign: 'center', maxWidth: 380, border: '1px solid #d2d2d7',
      }}>
        {status === 'waiting' && <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px' }}>Waiting for LinkedIn data…</p>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
            Go to your LinkedIn profile and click the <strong>WorkScanAI</strong> bookmark in your browser bar.
          </p>
        </>}
        {status === 'received' && <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px' }}>Got it — {profileName}</p>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>Sending to WorkScanAI… closing window.</p>
        </>}
        {status === 'error' && <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', margin: '0 0 8px' }}>Something went wrong</p>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>Close this window and try again.</p>
        </>}
      </div>
    </div>
  )
}
