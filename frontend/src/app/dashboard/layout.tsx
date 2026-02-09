import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
                href="/dashboard/analyze" 
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              >
                New Analysis
              </Link>
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
