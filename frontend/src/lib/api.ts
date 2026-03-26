// API client for WorkScanAI
// In production (Vercel), frontend and backend share the same domain,
// so we use a relative /api path. In local dev, we point to localhost:8000.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface Task {
  name: string
  description?: string
  frequency?: string
  timePerTask?: number
}

export interface Workflow {
  id?: string
  share_code?: string
  name: string
  tasks: Task[]
  createdAt?: string
}

export interface AnalysisResult {
  workflowId: string
  automationScore: number
  annualSavings: number
  hoursSaved: number
  tasks: TaskAnalysis[]
}

export interface TaskAnalysis {
  taskName: string
  automationScore: number
  timeSaved: string
  recommendation: string
  difficulty: 'Very Easy' | 'Easy' | 'Medium' | 'Hard'
}

// Workflow API calls
export const workflowAPI = {
  async create(workflow: Workflow): Promise<Workflow> {
    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    })

    if (!response.ok) {
      throw new Error('Failed to create workflow')
    }

    return response.json()
  },

  async get(id: string): Promise<Workflow> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/${id}`)

    if (!response.ok) {
      throw new Error('Failed to fetch workflow')
    }

    return response.json()
  },

  async list(): Promise<Workflow[]> {
    const response = await fetch(`${API_BASE_URL}/api/workflows`)

    if (!response.ok) {
      throw new Error('Failed to fetch workflows')
    }

    return response.json()
  },
}

// Analysis API calls
export const analysisAPI = {
  async analyze(workflowId: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflowId }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze workflow')
    }

    return response.json()
  },

  async getResults(workflowId: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/api/results/${workflowId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch results')
    }

    return response.json()
  },
}

// Job Scanner API
export interface JobScanRequest {
  job_title: string
  industry?: string
  analysis_context?: string
  hourly_rate?: number
}

export interface JobScanResponse {
  workflow_id: number
  share_code: string
  job_title: string
  tasks_found: number
  n8n_workflow: Record<string, unknown>
  search_used: boolean
  message: string
}

export const jobScanAPI = {
  async scan(data: JobScanRequest, userEmail?: string): Promise<JobScanResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (userEmail) headers['x-user-email'] = userEmail
    const response = await fetch(`${API_BASE_URL}/api/job-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Job scan failed')
    }
    return response.json()
  },
}
