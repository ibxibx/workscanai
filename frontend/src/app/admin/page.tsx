'use client'

import { useState, useEffect } from 'react'
import { Users, BarChart3, Clock, DollarSign, FileText, Brain, Zap, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

const BACKEND = 'https://workscanai.onrender.com'

interface AdminStats {
  totals: { users: number; workflows: number; analyses: number; tasks: number }
  averages: { automation_score: number | null; annual_savings: number | null; hours_saved: number | null }
  by_context: Record<string, number>
  by_input_mode: Record<string, number>
  users: Array<{ id: number; email: string; created_at: string; workflows: number; analyses: number }>
  workflows: Array<{
    id: number; name: string; user_email: string
    analysis_context: string; input_mode: string; industry: string | null
    team_size: string | null; created_at: string; task_count: number
    task_names: string[]; source_text: string | null
    automation_score: number | null; annual_savings: number | null
    hours_saved: number | null; share_code: string | null
  }>
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [input, setInput] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedWf, setExpandedWf] = useState<number | null>(null)
  const [filter, setFilter] = useState('')

  const fetchStats = async (s: string) => {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${BACKEND}/api/admin/stats`, { headers: { 'x-admin-secret': s } })
      if (r.status === 401) { setError('Wrong password.'); setLoading(false); return }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setStats(d); setSecret(s)
    } catch (e: any) { setError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  if (!secret) return (
    <div className="min-h-screen bg-[#1d1d1f] flex items-center justify-center px-4">
      <div className="bg-white rounded-[24px] p-[48px] w-full max-w-[400px] shadow-2xl">
        <div className="flex items-center gap-[10px] mb-[32px]">
          <Brain className="h-[28px] w-[28px] text-[#0071e3]" />
          <div>
            <h1 className="text-[22px] font-semibold text-[#1d1d1f]">WorkScanAI Admin</h1>
            <p className="text-[13px] text-[#86868b]">Platform analytics & user data</p>
          </div>
        </div>
        <div className="relative mb-[16px]">
          <input
            type={showPw ? 'text' : 'password'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchStats(input)}
            placeholder="Admin secret key"
            autoFocus
            className="w-full px-[16px] py-[14px] pr-[44px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
          />
          <button onClick={() => setShowPw(p => !p)} className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f]">
            {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
        {error && <p className="text-[13px] text-red-500 mb-[12px]">{error}</p>}
        <button
          onClick={() => fetchStats(input)}
          disabled={loading || !input}
          className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white py-[14px] rounded-[12px] font-semibold text-[15px] transition-all"
        >
          {loading ? 'Loading…' : 'Enter'}
        </button>
      </div>
    </div>
  )

  if (!stats) return (
    <div className="min-h-screen bg-[#1d1d1f] flex items-center justify-center">
      <div className="text-white text-[18px]">Loading…</div>
    </div>
  )

  const filteredWfs = stats.workflows.filter(w =>
    !filter ||
    w.name.toLowerCase().includes(filter.toLowerCase()) ||
    (w.user_email || '').toLowerCase().includes(filter.toLowerCase()) ||
    (w.analysis_context || '').includes(filter.toLowerCase())
  )

  const ctxColor: Record<string, string> = {
    individual: 'bg-blue-100 text-blue-700',
    team: 'bg-emerald-100 text-emerald-700',
    company: 'bg-orange-100 text-orange-700',
    unknown: 'bg-gray-100 text-gray-600',
  }
  const modeColor: Record<string, string> = {
    manual: 'bg-purple-100 text-purple-700',
    document: 'bg-amber-100 text-amber-700',
    voice: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Header */}
      <div className="bg-[#1d1d1f] px-[32px] py-[20px] flex items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <Brain className="h-[24px] w-[24px] text-[#0071e3]" />
          <span className="text-white font-semibold text-[18px]">WorkScanAI Admin</span>
          <span className="text-[#86868b] text-[13px]">Platform Dashboard</span>
        </div>
        <button
          onClick={() => fetchStats(secret)}
          className="flex items-center gap-[6px] text-[#86868b] hover:text-white text-[13px] transition-colors"
        >
          <RefreshCw className="h-[14px] w-[14px]" /> Refresh
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto px-[32px] py-[40px]">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] mb-[32px]">
          {[
            { icon: Users, label: 'Total Users', value: stats.totals.users, color: 'text-blue-600' },
            { icon: FileText, label: 'Workflows', value: stats.totals.workflows, color: 'text-purple-600' },
            { icon: BarChart3, label: 'Analyses Run', value: stats.totals.analyses, color: 'text-green-600' },
            { icon: Zap, label: 'Tasks Submitted', value: stats.totals.tasks, color: 'text-orange-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-[18px] p-[24px] border border-[#e8e8ed]">
              <Icon className={`h-[20px] w-[20px] mb-[12px] ${color}`} />
              <div className={`text-[36px] font-bold mb-[4px] ${color}`}>{value}</div>
              <div className="text-[12px] text-[#86868b] font-semibold uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Averages + Breakdowns */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[32px]">
          {/* Averages */}
          <div className="bg-white rounded-[18px] p-[24px] border border-[#e8e8ed]">
            <h2 className="text-[14px] font-semibold text-[#86868b] uppercase tracking-wide mb-[16px]">Platform Averages</h2>
            <div className="space-y-[14px]">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#6e6e73]">Automation Score</span>
                <span className="font-bold text-[#0071e3]">{stats.averages.automation_score ?? '—'}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#6e6e73]">Avg Annual Savings</span>
                <span className="font-bold text-green-600">€{stats.averages.annual_savings?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#6e6e73]">Avg Hours Saved</span>
                <span className="font-bold text-[#1d1d1f]">{stats.averages.hours_saved ?? '—'}h/yr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#6e6e73]">Completion Rate</span>
                <span className="font-bold text-[#1d1d1f]">
                  {stats.totals.workflows > 0 ? Math.round((stats.totals.analyses / stats.totals.workflows) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* By Context */}
          <div className="bg-white rounded-[18px] p-[24px] border border-[#e8e8ed]">
            <h2 className="text-[14px] font-semibold text-[#86868b] uppercase tracking-wide mb-[16px]">By Context</h2>
            <div className="space-y-[10px]">
              {Object.entries(stats.by_context).sort((a,b) => b[1]-a[1]).map(([ctx, cnt]) => (
                <div key={ctx} className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-[10px] py-[3px] rounded-full capitalize ${ctxColor[ctx] || ctxColor.unknown}`}>{ctx}</span>
                  <div className="flex items-center gap-[8px]">
                    <div className="w-[80px] h-[6px] bg-[#f0f0f5] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${(cnt / stats.totals.workflows) * 100}%` }} />
                    </div>
                    <span className="text-[13px] font-semibold w-[20px] text-right">{cnt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Input Mode */}
          <div className="bg-white rounded-[18px] p-[24px] border border-[#e8e8ed]">
            <h2 className="text-[14px] font-semibold text-[#86868b] uppercase tracking-wide mb-[16px]">By Input Mode</h2>
            <div className="space-y-[10px]">
              {Object.entries(stats.by_input_mode).sort((a,b) => b[1]-a[1]).map(([mode, cnt]) => (
                <div key={mode} className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-[10px] py-[3px] rounded-full capitalize ${modeColor[mode] || modeColor.unknown}`}>{mode || 'unknown'}</span>
                  <div className="flex items-center gap-[8px]">
                    <div className="w-[80px] h-[6px] bg-[#f0f0f5] rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(cnt / stats.totals.workflows) * 100}%` }} />
                    </div>
                    <span className="text-[13px] font-semibold w-[20px] text-right">{cnt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-[18px] border border-[#e8e8ed] mb-[32px] overflow-hidden">
          <div className="px-[24px] py-[20px] border-b border-[#e8e8ed]">
            <h2 className="text-[17px] font-semibold">Users <span className="text-[#86868b] font-normal text-[14px] ml-[8px]">{stats.users.length} accounts</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f9f9fb] text-[11px] text-[#86868b] uppercase tracking-wide">
                  <th className="text-left px-[24px] py-[12px] font-semibold">Email</th>
                  <th className="text-left px-[16px] py-[12px] font-semibold">Joined</th>
                  <th className="text-center px-[16px] py-[12px] font-semibold">Workflows</th>
                  <th className="text-center px-[16px] py-[12px] font-semibold">Analyses</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-[#fafafa]'}>
                    <td className="px-[24px] py-[14px] font-medium text-[#1d1d1f]">{u.email}</td>
                    <td className="px-[16px] py-[14px] text-[#86868b]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-[16px] py-[14px] text-center font-semibold">{u.workflows}</td>
                    <td className="px-[16px] py-[14px] text-center">
                      <span className={`font-semibold ${u.analyses > 0 ? 'text-green-600' : 'text-[#86868b]'}`}>{u.analyses}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflows Table */}
        <div className="bg-white rounded-[18px] border border-[#e8e8ed] overflow-hidden">
          <div className="px-[24px] py-[20px] border-b border-[#e8e8ed] flex items-center justify-between gap-[16px]">
            <h2 className="text-[17px] font-semibold">All Submissions <span className="text-[#86868b] font-normal text-[14px] ml-[8px]">{filteredWfs.length} of {stats.workflows.length}</span></h2>
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name, email, context…"
              className="px-[14px] py-[8px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[10px] text-[13px] w-[260px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
            />
          </div>
          <div className="divide-y divide-[#f0f0f5]">
            {filteredWfs.map(wf => (
              <div key={wf.id} className="px-[24px] py-[16px]">
                <div
                  className="flex items-start justify-between gap-[16px] cursor-pointer"
                  onClick={() => setExpandedWf(expandedWf === wf.id ? null : wf.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[10px] mb-[6px] flex-wrap">
                      <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">{wf.name}</span>
                      <span className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full capitalize ${ctxColor[wf.analysis_context] || ctxColor.unknown}`}>
                        {wf.analysis_context}
                      </span>
                      <span className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full capitalize ${modeColor[wf.input_mode] || modeColor.unknown}`}>
                        {wf.input_mode || 'unknown'}
                      </span>
                      {wf.industry && <span className="text-[10px] text-[#86868b] bg-[#f5f5f7] px-[8px] py-[2px] rounded-full">{wf.industry}</span>}
                    </div>
                    <div className="flex items-center gap-[12px] text-[12px] text-[#86868b] flex-wrap">
                      <span>{wf.user_email || 'anon'}</span>
                      <span>·</span>
                      <span>{new Date(wf.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>{wf.task_count} tasks</span>
                      {wf.automation_score != null && (
                        <>
                          <span>·</span>
                          <span className={`font-semibold ${wf.automation_score >= 70 ? 'text-green-600' : wf.automation_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {wf.automation_score}% score
                          </span>
                        </>
                      )}
                      {wf.annual_savings != null && (
                        <>
                          <span>·</span>
                          <span className="text-green-600 font-semibold">€{Math.round(wf.annual_savings).toLocaleString()}/yr</span>
                        </>
                      )}
                      {wf.automation_score == null && (
                        <span className="text-[#86868b] italic">no analysis</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-[8px]">
                    {wf.share_code && (
                      <a
                        href={`https://workscanai.vercel.app/report/${wf.share_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[11px] text-[#0071e3] hover:underline"
                      >
                        view ↗
                      </a>
                    )}
                    {expandedWf === wf.id
                      ? <ChevronUp className="h-[16px] w-[16px] text-[#86868b]" />
                      : <ChevronDown className="h-[16px] w-[16px] text-[#86868b]" />
                    }
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedWf === wf.id && (
                  <div className="mt-[16px] space-y-[12px]">
                    {/* Task list */}
                    {wf.task_names.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wide mb-[6px]">Tasks submitted</p>
                        <div className="flex flex-wrap gap-[6px]">
                          {wf.task_names.map((t, i) => (
                            <span key={i} className="text-[12px] bg-[#f5f5f7] border border-[#e8e8ed] px-[10px] py-[4px] rounded-full text-[#1d1d1f]">{t}</span>
                          ))}
                          {wf.task_count > wf.task_names.length && (
                            <span className="text-[12px] text-[#86868b] px-[10px] py-[4px]">+{wf.task_count - wf.task_names.length} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Source text */}
                    {wf.source_text && (
                      <div>
                        <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wide mb-[6px]">Uploaded / voice text (preview)</p>
                        <div className="bg-[#f5f5f7] border border-[#e8e8ed] rounded-[10px] px-[14px] py-[10px] text-[12px] text-[#1d1d1f] font-mono leading-relaxed whitespace-pre-wrap break-words">
                          {wf.source_text}
                          {wf.source_text.length >= 500 && <span className="text-[#86868b]">… (truncated)</span>}
                        </div>
                      </div>
                    )}

                    {/* Workflow ID link */}
                    <div className="text-[11px] text-[#86868b]">
                      Workflow ID: {wf.id}
                      {wf.share_code && <> · Share code: <code className="font-mono">{wf.share_code}</code></>}
                      {wf.team_size && <> · Team size: {wf.team_size}</>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
