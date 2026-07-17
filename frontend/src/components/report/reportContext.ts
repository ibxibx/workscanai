// Non-client helpers so SERVER components can import them without pulling in the
// client i18n runtime (ReportSections is now 'use client').
export type ReportContext = 'individual' | 'team' | 'company'

export function resolveContext(raw?: string): ReportContext {
  if (raw === 'team' || raw === 'company') return raw
  return 'individual'
}
