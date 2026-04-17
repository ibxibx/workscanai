'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function SiteHeader() {
  const { email, signOut, isLoaded } = useAuth()
  const pathname = usePathname()

  // Hide header on auth pages and landing page (has its own nav)
  if (pathname?.startsWith('/auth') || pathname === '/') return null

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e5e5ea]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 min-w-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-[6px] text-[16px] sm:text-[18px] font-semibold tracking-tight text-[#1d1d1f] shrink-0">
          <Brain className="h-[16px] w-[16px] sm:h-[18px] sm:w-[18px]" />
          <span className="hidden xs:inline sm:inline">WorkScanAI</span>
          <span className="xs:hidden sm:hidden">WScan<span className="text-[#0071e3]">AI</span></span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2 sm:gap-6 shrink-0">
          <Link href="/dashboard" className="text-[12px] sm:text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap">
            <span className="hidden sm:inline">Past Analyses</span>
            <span className="sm:hidden">History</span>
          </Link>

          {isLoaded && (
            email ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-[#6e6e73]">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-[12px] sm:text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="text-[12px] sm:text-[13px] font-medium bg-[#0071e3] text-white px-3 sm:px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-all whitespace-nowrap"
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
