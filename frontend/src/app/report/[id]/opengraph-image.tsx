import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'WorkScanAI Analysis Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function Image({ params }: { params: { id: string } }) {
  let workflowName = 'Workflow Analysis'
  let automationScore = 0
  let annualSavings = 0
  let hoursSaved = 0
  let taskCount = 0

  try {
    const res = await fetch(`${API_BASE}/api/results/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      workflowName = data.workflow?.name || workflowName
      automationScore = Math.round(data.automation_score || 0)
      annualSavings = Math.round(data.annual_savings || 0)
      hoursSaved = Math.round(data.hours_saved || 0)
      taskCount = (data.results || []).length
    }
  } catch { /* use defaults */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#1d1d1f',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top — logo + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', background: '#0071e3',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '18px'
            }}>W</div>
            <span style={{ color: 'white', fontWeight: 600, fontSize: '20px' }}>WorkScanAI</span>
          </div>
          <div style={{
            background: '#0071e3', color: 'white', borderRadius: '999px',
            padding: '8px 20px', fontSize: '14px', fontWeight: 600,
          }}>AI Automation Analysis</div>
        </div>

        {/* Middle — workflow name + score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: '#86868b', fontSize: '18px', fontWeight: 500 }}>Analysis Report</div>
          <div style={{
            color: 'white', fontSize: '52px', fontWeight: 700,
            lineHeight: 1.1, maxWidth: '800px',
            fontStyle: 'italic',
          }}>{workflowName}</div>
        </div>

        {/* Bottom — stats row */}
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { label: 'Automation Score', value: `${automationScore}%`, color: '#0071e3' },
            { label: 'Annual Savings', value: `€${annualSavings.toLocaleString()}`, color: '#34d399' },
            { label: 'Hours Saved / yr', value: `${hoursSaved}h`, color: '#a78bfa' },
            { label: 'Tasks Analysed', value: `${taskCount}`, color: '#fb923c' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#2c2c2e', borderRadius: '16px', padding: '24px 32px',
              display: 'flex', flexDirection: 'column', gap: '8px', flex: 1,
            }}>
              <div style={{ color, fontSize: '36px', fontWeight: 700 }}>{value}</div>
              <div style={{ color: '#86868b', fontSize: '14px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
