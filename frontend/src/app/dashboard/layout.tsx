import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="flex items-center gap-[8px] text-[21px] font-semibold tracking-tight text-white hover:text-gray-300 transition-colors">
              <Brain className="h-[20px] w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex gap-[32px] text-[12px]">
              <Link 
                href="/dashboard" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/analyze" 
                className="text-gray-400 hover:text-white transition-colors"
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
