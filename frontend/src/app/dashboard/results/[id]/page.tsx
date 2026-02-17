'use client'

import { use, useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'

interface TaskResult {
  task: {
    name: string
    description: string
  }
  ai_readiness_score: number
  time_saved_percentage: number
  recommendation: string
  difficulty: string
  estimated_hours_saved: number
}

interface AnalysisData {
  workflow: {
    name: string
    description: string
  }
  automation_score: number
  hours_saved: number
  annual_savings: number
  results: TaskResult[]
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/results/${id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis results')
        }

        const data = await response.json()
        
        // Fetch workflow details separately
        const workflowResponse = await fetch(`http://localhost:8000/api/workflows/${data.workflow_id}`)
        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json()
          data.workflow = workflowData
        } else {
          // Fallback if workflow fetch fails
          data.workflow = { name: 'Workflow Analysis', description: '' }
        }
        
        setAnalysisData(data)
      } catch (err) {
        console.error('Error fetching analysis:', err)
        setError('Failed to load analysis results. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[24px] text-[#86868b]">Loading analysis...</div>
        </div>
      </div>
    )
  }

  if (error || !analysisData) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[24px] text-red-600 mb-4">{error || 'No analysis data found'}</div>
          <a href="/" className="text-[#0071e3] hover:underline">Go back to home</a>
        </div>
      </div>
    )
  }

  const totalTasks = analysisData.results.length
  const automationReady = analysisData.results.filter(r => r.ai_readiness_score >= 70).length

  const downloadAsDocx = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${id}/docx`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI-Analysis-${analysisData.workflow.name.replace(/\s+/g, '-')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading DOCX:', error)
      alert('Failed to generate DOCX report. Please try again.')
    }
  }

  const downloadAsPdf = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI-Analysis-${analysisData.workflow.name.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to generate PDF report. Please try again.')
    }
  }

  const generateReportContent = () => {
    return `
WORKSCANAI AUTOMATION ANALYSIS REPORT
=====================================

Workflow: ${analysisData.workflow.name}
Analysis Date: ${new Date().toLocaleDateString()}
Analysis ID: ${id}

EXECUTIVE SUMMARY
-----------------
Automation Score: ${Math.round(analysisData.automation_score)}/100
Total Tasks Analyzed: ${totalTasks}
Tasks Ready for Automation: ${automationReady}
Annual Savings Potential: €${Math.round(analysisData.annual_savings).toLocaleString()}
Time Saved Per Year: ${Math.round(analysisData.hours_saved)} hours

DETAILED TASK ANALYSIS
----------------------

${analysisData.results.map((result, index) => `
${index + 1}. ${result.task.name}
   Automation Readiness: ${Math.round(result.ai_readiness_score)}%
   Time Savings Potential: ${Math.round(result.time_saved_percentage)}%
   Implementation Difficulty: ${result.difficulty}
   Recommendation: ${result.recommendation}
   Estimated Hours Saved: ${Math.round(result.estimated_hours_saved)} hours/year
`).join('\n')}

RECOMMENDATIONS
---------------
Quick Wins (Implement First):
${analysisData.results.filter(r => r.difficulty === 'easy').map(r => `• ${r.task.name}`).join('\n')}

Medium-Term Goals:
${analysisData.results.filter(r => r.difficulty === 'medium').map(r => `• ${r.task.name}`).join('\n')}

NEXT STEPS
----------
1. Start with the highest-scoring, easiest-to-implement tasks
2. Set up automation tools recommended above
3. Test automations with small batches before full rollout
4. Monitor and iterate based on results

---
Report generated by WorkScanAI
Visit: https://workscanai.com
    `.trim()
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header */}
        <div className="mb-[48px]">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
            <h1 className="relative text-[48px] leading-[1.08] font-semibold tracking-tight mb-[8px] px-[32px]">
              {analysisData.workflow.name}
            </h1>
          </div>
          <p className="text-[14px] text-[#86868b]">Analysis ID: {id}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Automation Score
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-[#0071e3] mb-[4px]">
              {Math.round(analysisData.automation_score)}%
            </div>
            <div className="text-[13px] text-[#86868b]">
              {automationReady} of {totalTasks} tasks ready
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Annual Savings
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-green-600 mb-[4px]">
              €{Math.round(analysisData.annual_savings).toLocaleString()}
            </div>
            <div className="text-[13px] text-[#86868b]">
              {Math.round(analysisData.hours_saved)} hours per year
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Quick Wins
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-purple-600 mb-[4px]">
              {analysisData.results.filter(r => r.difficulty === 'easy').length}
            </div>
            <div className="text-[13px] text-[#86868b]">
              Tasks you can automate today
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] mb-[32px]">
          <h2 className="text-[28px] font-semibold tracking-tight mb-[32px]">Task Breakdown</h2>
          <div className="space-y-[16px]">
            {analysisData.results.map((result, index) => {
         // Safe access to task data
          const taskName = result.task?.name || `Task ${index + 1}`
  
          return (
         <div key={index} className="border border-[#d2d2d7] rounded-[12px] p-[24px] bg-white">
        <div className="flex justify-between items-start mb-[16px]">
        <h3 className="text-[19px] font-semibold text-[#1d1d1f]">{taskName}</h3>
                  <span className={`px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${
                    result.ai_readiness_score >= 80 ? 'bg-green-100 text-green-700' :
                    result.ai_readiness_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(result.ai_readiness_score)}% Ready
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-[16px] text-[14px] mb-[16px]">
                  <div>
                    <span className="text-[#86868b]">Time Saved: </span>
                    <span className="font-medium text-[#1d1d1f]">{Math.round(result.time_saved_percentage)}%</span>
                  </div>
                  <div>
                    <span className="text-[#86868b]">Difficulty: </span>
                    <span className="font-medium text-[#1d1d1f] capitalize">{result.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-[#86868b]">Hours/Year: </span>
                    <span className="font-medium text-[#1d1d1f]">{Math.round(result.estimated_hours_saved)}</span>
                  </div>
                </div>
                <div className="p-[16px] bg-blue-50 border border-blue-200 rounded-[8px]">
                  <span className="text-[13px] font-semibold text-[#0071e3]">💡 Recommendation: </span>
                  <span className="text-[13px] text-[#1d1d1f]">{result.recommendation}</span>
                </div>
              </div>
           )
          })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-[16px]">
          <button 
            onClick={downloadAsDocx}
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
          >
            <Download className="h-[18px] w-[18px]" />
            Download as DOCX
          </button>
          <button 
            onClick={downloadAsPdf}
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
          >
            <Download className="h-[18px] w-[18px]" />
            Download as PDF
          </button>
          <button className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[28px] py-[14px] rounded-full font-medium text-[17px] text-[#1d1d1f] transition-all">
            <Share2 className="h-[18px] w-[18px]" />
            Share Results
          </button>
        </div>
      </div>
    </div>
  )
}
