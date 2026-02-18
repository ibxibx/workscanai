'use client'

import { useState, useRef } from 'react'
import { Mic, Upload, FileText, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'

interface Task {
  name: string
  description: string
  frequency: string
  time_per_task: number
  category: string
  complexity: string
}

interface WorkflowFormProps {
  onAnalysisComplete: (workflowId: number) => void
  onError: (error: string) => void
}

export default function WorkflowForm({ onAnalysisComplete, onError }: WorkflowFormProps) {
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([{
    name: '',
    description: '',
    frequency: 'weekly',
    time_per_task: 30,
    category: 'general',
    complexity: 'medium'
  }])
  const [inputMode, setInputMode] = useState<'manual' | 'voice' | 'document'>('manual')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(50)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const addTask = () => {
    setTasks([...tasks, {
      name: '', description: '', frequency: 'weekly',
      time_per_task: 30, category: 'general', complexity: 'medium'
    }])
  }

  const removeTask = (index: number) => {
    if (tasks.length > 1) setTasks(tasks.filter((_, i) => i !== index))
  }

  const updateTask = (index: number, field: keyof Task, value: string | number) => {
    const newTasks = [...tasks]
    newTasks[index] = { ...newTasks[index], [field]: value }
    setTasks(newTasks)
  }

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processVoiceInput(audioBlob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      onError('Failed to start voice recording. Please check microphone permissions.')
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`, { method: 'POST', body: formData })
      if (!response.ok) throw new Error()
      const data = await response.json()
      await extractTasksFromText(data.transcription)
    } catch {
      onError('Failed to process voice recording. Please try again or use manual input.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract-tasks`, { method: 'POST', body: formData })
      if (!response.ok) throw new Error()
      const data = await response.json()
      await extractTasksFromText(data.text)
    } catch {
      onError('Failed to process document. Please try again or use manual input.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const extractTasksFromText = async (text: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/parse-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error()
      const data = await response.json()
      if (data.tasks?.length > 0) {
        setTasks(data.tasks)
        if (data.workflow_name) setWorkflowName(data.workflow_name)
        if (data.workflow_description) setWorkflowDescription(data.workflow_description)
      }
    } catch {
      onError('Failed to extract tasks. Please try manual input.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflowName.trim()) { onError('Please provide a workflow name'); return }
    if (!tasks.some(t => t.name.trim())) { onError('Please add at least one task'); return }
    setIsAnalyzing(true)
    onError('')
    try {
      const workflowResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          tasks: tasks.filter(t => t.name.trim()).map(t => ({
            name: t.name,
            description: t.description || t.name,
            frequency: t.frequency,
            time_per_task: t.time_per_task,
            category: t.category,
            complexity: t.complexity
          }))
        }),
      })
      if (!workflowResponse.ok) {
        const err = await workflowResponse.json()
        throw new Error(err.detail || 'Failed to create workflow')
      }
      const workflow = await workflowResponse.json()

      const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflow.id, hourly_rate: hourlyRate }),
      })
      if (!analysisResponse.ok) {
        const err = await analysisResponse.json()
        throw new Error(err.detail || 'Failed to analyze workflow')
      }
      onAnalysisComplete(workflow.id)
    } catch (error: any) {
      onError(error.message || 'Failed to analyze workflow. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Shared input styles ────────────────────────────────────────────────────
  const inputClass = "w-full px-[14px] py-[10px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
  const selectClass = `${inputClass} appearance-none cursor-pointer`
  const labelClass = "block text-[13px] font-medium text-[#6e6e73] mb-[6px] uppercase tracking-wide"

  return (
    <form onSubmit={handleSubmit} className="space-y-[24px]">

      {/* ── Input Mode Tabs ────────────────────────────────────────────────── */}
      <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[6px] flex gap-[4px]">
        {([
          { mode: 'manual', icon: FileText, label: 'Manual Entry' },
          { mode: 'voice',  icon: Mic,      label: 'Voice Input' },
          { mode: 'document', icon: Upload,  label: 'Upload Document' },
        ] as const).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setInputMode(mode)}
            className={`flex-1 flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[12px] text-[15px] font-medium transition-all ${
              inputMode === mode
                ? 'bg-white text-[#1d1d1f] shadow-sm border border-[#d2d2d7]'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            <Icon className="h-[16px] w-[16px]" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Voice Recording ────────────────────────────────────────────────── */}
      {inputMode === 'voice' && (
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
          <div className="mb-[20px]">
            <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]">
              <Mic className={`h-[28px] w-[28px] ${isRecording ? 'text-red-500' : 'text-[#6e6e73]'}`} />
            </div>
            <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Voice Recording</h3>
            <p className="text-[15px] text-[#6e6e73] max-w-[420px] mx-auto">
              Describe your workflow and tasks verbally. AI will extract and organize them for analysis.
            </p>
          </div>

          {!isRecording && !isUploading && (
            <button
              type="button"
              onClick={startVoiceRecording}
              className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
            >
              <Mic className="h-[18px] w-[18px]" />
              Start Recording
            </button>
          )}
          {isRecording && (
            <div className="space-y-[16px]">
              <div className="flex items-center justify-center gap-[10px]">
                <div className="w-[10px] h-[10px] bg-red-500 rounded-full animate-pulse" />
                <span className="text-[17px] font-medium text-[#1d1d1f]">Recording…</span>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="inline-flex items-center gap-[8px] bg-red-500 hover:bg-red-600 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
              >
                Stop Recording
              </button>
            </div>
          )}
          {isUploading && (
            <div className="flex items-center justify-center gap-[10px] text-[#6e6e73]">
              <Loader2 className="animate-spin h-[20px] w-[20px]" />
              <span className="text-[15px]">Processing audio…</span>
            </div>
          )}
        </div>
      )}

      {/* ── Document Upload ────────────────────────────────────────────────── */}
      {inputMode === 'document' && (
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDocumentUpload}
            accept=".txt,.doc,.docx,.pdf,.png,.jpg,.jpeg"
            className="hidden"
          />
          <div className="mb-[20px]">
            <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]">
              <Upload className="h-[28px] w-[28px] text-[#6e6e73]" />
            </div>
            <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Upload Document</h3>
            <p className="text-[15px] text-[#6e6e73] max-w-[420px] mx-auto">
              Upload a file containing your workflow description. Supports PDF, Word, text, and images.
            </p>
          </div>

          {!isUploading ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
            >
              <Upload className="h-[18px] w-[18px]" />
              Choose File
            </button>
          ) : (
            <div className="flex items-center justify-center gap-[10px] text-[#6e6e73]">
              <Loader2 className="animate-spin h-[20px] w-[20px]" />
              <span className="text-[15px]">Processing document…</span>
            </div>
          )}
          <p className="text-[13px] text-[#86868b] mt-[16px]">.txt · .doc · .docx · .pdf · .png · .jpg</p>
        </div>
      )}

      {/* ── Workflow Details ───────────────────────────────────────────────── */}
      <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
        <h2 className="text-[21px] font-semibold text-[#1d1d1f] mb-[28px]">Workflow Details</h2>
        <div className="space-y-[20px]">
          <div>
            <label className={labelClass}>Workflow Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g., Marketing Team Workflow"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
            <textarea
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Describe your workflow or team…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Hourly Rate (€) — for ROI calculation</label>
            <div className="relative">
              <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]">€</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                min="1"
                className={`${inputClass} pl-[28px]`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Task List (Manual mode) ────────────────────────────────────────── */}
      {inputMode === 'manual' && (
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
          <div className="flex items-center justify-between mb-[28px]">
            <h2 className="text-[21px] font-semibold text-[#1d1d1f]">Tasks</h2>
            <button
              type="button"
              onClick={addTask}
              className="inline-flex items-center gap-[6px] border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] px-[16px] py-[8px] rounded-full text-[14px] font-medium text-[#1d1d1f] transition-all"
            >
              <Plus className="h-[14px] w-[14px]" />
              Add Task
            </button>
          </div>

          <div className="space-y-[20px]">
            {tasks.map((task, index) => (
              <div key={index} className="bg-white border border-[#d2d2d7] rounded-[14px] p-[28px]">
                <div className="flex items-center justify-between mb-[20px]">
                  <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">
                    Task {index + 1}
                  </span>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask(index)}
                      className="flex items-center gap-[4px] text-[13px] text-[#86868b] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-[14px] w-[14px]" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Task Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTask(index, 'name', e.target.value)}
                      placeholder="e.g., Write social media posts"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={task.description}
                      onChange={(e) => updateTask(index, 'description', e.target.value)}
                      placeholder="Additional context or details…"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Frequency</label>
                    <div className="relative">
                      <select
                        value={task.frequency}
                        onChange={(e) => updateTask(index, 'frequency', e.target.value)}
                        className={selectClass}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Time per Task (minutes)</label>
                    <input
                      type="number"
                      value={task.time_per_task}
                      onChange={(e) => updateTask(index, 'time_per_task', Number(e.target.value))}
                      min="1"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Category</label>
                    <div className="relative">
                      <select
                        value={task.category}
                        onChange={(e) => updateTask(index, 'category', e.target.value)}
                        className={selectClass}
                      >
                        <option value="general">General</option>
                        <option value="data_entry">Data Entry</option>
                        <option value="communication">Communication</option>
                        <option value="analysis">Analysis</option>
                        <option value="creative">Creative</option>
                        <option value="administrative">Administrative</option>
                      </select>
                      <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Complexity</label>
                    <div className="relative">
                      <select
                        value={task.complexity}
                        onChange={(e) => updateTask(index, 'complexity', e.target.value)}
                        className={selectClass}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-[8px]">
        <button
          type="submit"
          disabled={isAnalyzing || isUploading}
          className="inline-flex items-center gap-[10px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[36px] py-[16px] rounded-full font-semibold text-[17px] transition-all"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin h-[18px] w-[18px]" />
              Analyzing with AI…
            </>
          ) : (
            'Analyze Workflow'
          )}
        </button>
      </div>
    </form>
  )
}
