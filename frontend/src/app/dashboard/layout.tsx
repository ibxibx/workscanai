'use client'

import Link from 'next/link'
import { Brain } from 'lucide-react'
import LanguageToggle from '@/components/LanguageToggle'
import { useT } from '@/i18n/client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Reuses the `home` namespace's navNewLong key ("New Analysis" / "Neue
  // Analyse") -- this nav was the one surface left un-internationalized and
  // missing the language toggle entirely (found during a full DE coverage audit).
  const t = useT('home')

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="flex items-center gap-[8px] text-[21px] font-semibold tracking-tight text-[#1d1d1f] hover:text-[#6e6e73] transition-colors">
              <Brain className="h-[20px] w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex gap-[32px] text-[12px]">
              <Link 
                href="/dashboard" 
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/#analyze" 
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              >
                {t('navNewLong')}
              </Link>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
