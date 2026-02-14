'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkflowForm from '@/components/WorkflowForm'

export default function AnalyzePage() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalysisComplete = (workflowId: number) => {
    // Navigate to results page
    router.push(`/dashboard/results/${workflowId}`)
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Analyze Workflow</h1>
        <p className="text-gray-600 text-lg">
          Upload your task list to get actionable automation insights powered by AI.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <WorkflowForm 
        onAnalysisComplete={handleAnalysisComplete}
        onError={setError}
      />
    </div>
  )
}
