'use client'

import { useState, useRef } from 'react'
import { Mic, Upload, FileText, Plus, Trash2, Loader2 } from 'lucide-react'

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
      name: '',
      description: '',
      frequency: 'weekly',
      time_per_task: 30,
      category: 'general',
      complexity: 'medium'
    }])
  }

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index))
    }
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

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processVoiceInput(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const data = await response.json()
      await extractTasksFromText(data.transcription)
    } catch (error) {
      console.error('Error processing voice input:', error)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract-tasks`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to extract tasks from document')
      }

      const data = await response.json()
      await extractTasksFromText(data.text)
    } catch (error) {
      console.error('Error uploading document:', error)
      onError('Failed to process document. Please try again or use manual input.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const extractTasksFromText = async (text: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/parse-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Failed to parse tasks')
      }

      const data = await response.json()
      if (data.tasks && data.tasks.length > 0) {
        setTasks(data.tasks)
        if (data.workflow_name) setWorkflowName(data.workflow_name)
        if (data.workflow_description) setWorkflowDescription(data.workflow_description)
      }
    } catch (error) {
      console.error('Error extracting tasks:', error)
      onError('Failed to extract tasks. Please try manual input.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!workflowName.trim()) {
      onError('Please provide a workflow name')
      return
    }

    if (tasks.length === 0 || !tasks.some(t => t.name.trim())) {
      onError('Please add at least one task')
      return
    }

    setIsAnalyzing(true)
    onError('')

    try {
      // Step 1: Create workflow
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
        const errorData = await workflowResponse.json()
        throw new Error(errorData.detail || 'Failed to create workflow')
      }

      const workflow = await workflowResponse.json()

      // Step 2: Trigger analysis
      const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflow.id,
          hourly_rate: hourlyRate
        }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        throw new Error(errorData.detail || 'Failed to analyze workflow')
      }

      const analysis = await analysisResponse.json()
      onAnalysisComplete(workflow.id)
    } catch (error: any) {
      console.error('Error submitting workflow:', error)
      onError(error.message || 'Failed to analyze workflow. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Input Mode Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Input Method</h2>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              inputMode === 'manual'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText size={20} />
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              inputMode === 'voice'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mic size={20} />
            Voice Input
          </button>
          <button
            type="button"
            onClick={() => setInputMode('document')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              inputMode === 'document'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Upload size={20} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Voice Recording Interface */}
      {inputMode === 'voice' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Voice Recording</h3>
          <div className="text-center py-8">
            {!isRecording && !isUploading && (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Mic size={20} />
                Start Recording
              </button>
            )}
            {isRecording && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-lg font-medium">Recording...</p>
                </div>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Stop Recording
                </button>
              </div>
            )}
            {isUploading && (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <p>Processing audio...</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Describe your workflow and tasks verbally. Our AI will extract and organize them for analysis.
          </p>
        </div>
      )}

      {/* Document Upload Interface */}
      {inputMode === 'document' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
          <div className="text-center py-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDocumentUpload}
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
            />
            {!isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Upload size={20} />
                Choose File
              </button>
            )}
            {isUploading && (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <p>Processing document...</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Upload a document containing your workflow description and task list (.txt, .doc, .docx, .pdf)
          </p>
        </div>
      )}

      {/* Workflow Details */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Workflow Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g., Marketing Team Workflow"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Describe your workflow..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Hourly Rate ($) - for ROI calculation
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              min="1"
              step="1"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tasks */}
      {inputMode === 'manual' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Task
            </button>
          </div>

          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">Task {index + 1}</h3>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Task Name *</label>
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTask(index, 'name', e.target.value)}
                      placeholder="e.g., Write social media posts"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={task.description}
                      onChange={(e) => updateTask(index, 'description', e.target.value)}
                      placeholder="Additional details..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Frequency</label>
                    <select
                      value={task.frequency}
                      onChange={(e) => updateTask(index, 'frequency', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Time per Task (minutes)</label>
                    <input
                      type="number"
                      value={task.time_per_task}
                      onChange={(e) => updateTask(index, 'time_per_task', Number(e.target.value))}
                      min="1"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={task.category}
                      onChange={(e) => updateTask(index, 'category', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="general">General</option>
                      <option value="data_entry">Data Entry</option>
                      <option value="communication">Communication</option>
                      <option value="analysis">Analysis</option>
                      <option value="creative">Creative</option>
                      <option value="administrative">Administrative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Complexity</label>
                    <select
                      value={task.complexity}
                      onChange={(e) => updateTask(index, 'complexity', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isAnalyzing || isUploading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Analyzing...
            </>
          ) : (
            'Analyze Workflow'
          )}
        </button>
      </div>
    </form>
  )
}
