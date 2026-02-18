'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkflowForm from '@/components/WorkflowForm'

export default function AnalyzePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleAnalysisComplete = (workflowId: number) => {
    router.push(`/dashboard/results/${workflowId}`)
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <div className="max-w-[780px] mx-auto px-6">

        {/* Header */}
        <div className="mb-[48px]">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]" />
            <h1 className="relative text-[48px] leading-[1.08] font-semibold tracking-tight mb-[12px] px-[32px]">
              Analyze Workflow
            </h1>
          </div>
          <p className="text-[19px] text-[#6e6e73] max-w-[560px]">
            Upload your task list or describe your workflow to get actionable automation insights powered by AI.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-[24px] bg-red-50 border border-red-200 rounded-[14px] px-[20px] py-[16px]">
            <p className="text-[15px] text-red-700">{error}</p>
          </div>
        )}

        <WorkflowForm
          onAnalysisComplete={handleAnalysisComplete}
          onError={(e) => setError(e || null)}
        />
      </div>
    </div>
  )
}
