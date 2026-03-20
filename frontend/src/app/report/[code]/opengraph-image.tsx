import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'WorkScanAI Analysis Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://workscanai.onrender.com'

export default async function Image({ params }: { params: { code: string } }) {
  let workflowName = 'Workflow Analysis'
  let automationScore = 0
  let annualSavings = 0
  let hoursSaved = 0
  let taskCount = 0
  let context = 'individual'
  let quickWins = 0

  try {
    const [analysisRes, workflowRes] = await Promise.all([
      fetch(`${API_BASE}/api/share/${params.code}`),
      fetch(`${API_BASE}/api/share/${params.code}/workflow`),
    ])
    if (analysisRes.ok) {
      const data = await analysisRes.json()
      workflowName = data.workflow?.name || workflowName
      automationScore = Math.round(data.automation_score || 0)
      annualSavings = Math.round(data.annual_savings || 0)
      hoursSaved = Math.round(data.hours_saved || 0)
      taskCount = (data.results || []).length
      quickWins = (data.results || []).filter((r: any) => r.difficulty === 'easy').length
    }
    if (workflowRes.ok) {
      const wf = await workflowRes.json()
      context = wf.analysis_context || 'individual'
    }
  } catch { /* use defaults */ }

  // Score colour
  const scoreColor = automationScore >= 75 ? '#34d399' : automationScore >= 50 ? '#fbbf24' : '#f87171'
  const contextLabel = context === 'company' ? 'Company Analysis' : context === 'team' ? 'Team Analysis' : 'Personal Analysis'
  const contextColor = context === 'company' ? '#fb923c' : context === 'team' ? '#34d399' : '#818cf8'

  // Countdown label based on score
  const countdownLabel = automationScore >= 75 ? '⚡ Act now — within 12 months' : automationScore >= 50 ? '🟠 12–24 month window' : '🟢 24–48 months runway'

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #0a0a0b 0%, #1d1d1f 60%, #0d1f3c 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '56px 64px', fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, ${scoreColor}18 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />

        {/* Top row — branding + context badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', background: '#0071e3', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '20px',
            }}>W</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>WorkScanAI</span>
              <span style={{ color: '#6e6e73', fontSize: '12px' }}>AI Workflow Analysis</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              background: contextColor + '22', color: contextColor,
              border: `1px solid ${contextColor}44`,
              borderRadius: '999px', padding: '6px 16px', fontSize: '13px', fontWeight: 700,
            }}>{contextLabel}</div>
            <div style={{
              background: '#ffffff10', color: '#86868b',
              border: '1px solid #ffffff15',
              borderRadius: '999px', padding: '6px 16px', fontSize: '13px', fontWeight: 500,
            }}>#{params.code}</div>
          </div>
        </div>

        {/* Middle — workflow name + countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center', paddingTop: '8px' }}>
          <div style={{ color: '#6e6e73', fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>
            Automation Risk Report
          </div>
          <div style={{
            color: 'white', fontSize: '48px', fontWeight: 700,
            lineHeight: 1.1, maxWidth: '820px', fontStyle: 'italic',
            letterSpacing: '-1px',
          }}>
            {workflowName.length > 50 ? workflowName.substring(0, 47) + '…' : workflowName}
          </div>
          <div style={{
            color: automationScore >= 75 ? '#fca5a5' : automationScore >= 50 ? '#fde68a' : '#86efac',
            fontSize: '16px', fontWeight: 600, marginTop: '4px',
          }}>
            {countdownLabel}
          </div>
        </div>

        {/* Bottom row — 4 stat cards */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {/* Big score card */}
          <div style={{
            background: '#ffffff08', border: `1px solid ${scoreColor}40`,
            borderRadius: '20px', padding: '24px 28px',
            display: 'flex', flexDirection: 'column', gap: '6px',
            minWidth: '200px',
          }}>
            <div style={{ color: scoreColor, fontSize: '52px', fontWeight: 800, lineHeight: 1 }}>{automationScore}%</div>
            <div style={{ color: '#86868b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Automation Risk</div>
          </div>

          {[
            { label: 'Annual Savings', value: `€${annualSavings.toLocaleString()}`, color: '#34d399' },
            { label: 'Hours/yr Reclaimed', value: `${hoursSaved}h`, color: '#a78bfa' },
            { label: 'Quick Wins', value: `${quickWins} tasks`, color: '#38bdf8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#ffffff06', border: '1px solid #ffffff12',
              borderRadius: '20px', padding: '24px 28px',
              display: 'flex', flexDirection: 'column', gap: '6px', flex: 1,
            }}>
              <div style={{ color, fontSize: '34px', fontWeight: 700, lineHeight: 1 }}>{value}</div>
              <div style={{ color: '#86868b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
            </div>
          ))}

          {/* CTA card */}
          <div style={{
            background: '#0071e3', borderRadius: '20px', padding: '24px 28px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', gap: '8px', minWidth: '160px',
          }}>
            <div style={{ color: 'white', fontSize: '15px', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>Analyse your workflow →</div>
            <div style={{ color: '#93c5fd', fontSize: '12px', textAlign: 'center' }}>workscanai.vercel.app</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
