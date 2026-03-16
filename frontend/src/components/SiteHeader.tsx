'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function SiteHeader() {
  const { email, signOut, isLoaded } = useAuth()
  const pathname = usePathname()

  // Hide header on auth pages and landing page (has its own nav)
  if (pathname?.startsWith('/auth') || pathname === '/') return null

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e5e5ea]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[#0071e3] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">WorkScanAI</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
            Past Analyses
          </Link>

          {isLoaded && (
            email ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[13px] text-[#6e6e73]">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[160px] truncate">{email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="text-[13px] font-medium bg-[#0071e3] text-white px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-all"
              >
                Sign in
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
