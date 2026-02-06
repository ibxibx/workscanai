'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, X, Sparkles, Plus, Minus } from 'lucide-react'

export default function AnalyzePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [workflowName, setWorkflowName] = useState('')
  const [tasks, setTasks] = useState([''])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const addTask = () => {
    setTasks([...tasks, ''])
  }

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks]
    newTasks[index] = value
    setTasks(newTasks)
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = (file: File) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid file: JPG, PNG, WEBP, PDF, DOCX, DOC, or TXT')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
  }

  const removeFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = () => {
    if (!uploadedFile) return null
    
    if (uploadedFile.type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    if (uploadedFile.type === 'application/pdf') return <FileText className="h-5 w-5" />
    if (uploadedFile.type.includes('word')) return <FileText className="h-5 w-5" />
    return <FileSpreadsheet className="h-5 w-5" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const validTasks = tasks.filter(task => task.trim() !== '')

    if (validTasks.length === 0 && !uploadedFile) {
      alert('Please add at least one task or upload a file')
      setIsLoading(false)
      return
    }

    try {
      // TODO: Implement actual file upload to backend
      // For files, we'll use FormData to send the file
      if (uploadedFile) {
        const formData = new FormData()
        formData.append('file', uploadedFile)
        formData.append('workflowName', workflowName)
        
        console.log('Uploading file for analysis:', uploadedFile.name)
        // await fetch('/api/workflows/upload', { method: 'POST', body: formData })
      } else {
        console.log('Analyzing workflow:', { workflowName, tasks: validTasks })
        // await fetch('/api/workflows', { method: 'POST', body: JSON.stringify({ workflowName, tasks: validTasks }) })
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push('/dashboard/results/demo-123')
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pt-[88px] pb-[60px]">
      {/* Header */}
      <div className="max-w-[980px] mx-auto px-6 mb-[48px]">
        <button
          onClick={() => router.push('/')}
          className="text-[12px] text-gray-400 hover:text-white mb-[24px] transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-[48px] leading-[1.08] font-semibold tracking-tight mb-[12px]">
          Analyze your workflow.
        </h1>
        <p className="text-[19px] text-gray-400">
          Upload a document or manually enter your tasks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[980px] mx-auto px-6">
        {/* Workflow Name */}
        <div className="mb-[32px]">
          <label className="block text-[12px] font-semibold text-gray-500 tracking-wide uppercase mb-[12px]">
            Workflow Name
          </label>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Marketing Team Daily Tasks"
            className="w-full px-[16px] py-[14px] bg-gray-900/50 border border-gray-800 rounded-[12px] text-[17px] placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            required
          />
        </div>

        {/* File Upload Area */}
        <div className="mb-[32px]">
          <label className="block text-[12px] font-semibold text-gray-500 tracking-wide uppercase mb-[12px]">
            Upload Document
          </label>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-[18px] p-[40px] text-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
            }`}
          >
            {uploadedFile ? (
              <div className="flex items-center justify-between bg-gray-900/80 rounded-[12px] px-[20px] py-[16px]">
                <div className="flex items-center gap-[12px]">
                  <div className="text-blue-400">
                    {getFileIcon()}
                  </div>
                  <div className="text-left">
                    <div className="text-[14px] font-medium">{uploadedFile.name}</div>
                    <div className="text-[12px] text-gray-500">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-[16px]">
                  <div className="inline-flex items-center justify-center w-[56px] h-[56px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-[16px]">
                    <Upload className="h-[24px] w-[24px]" />
                  </div>
                </div>
                <div className="text-[17px] font-medium mb-[8px]">
                  Drop your file here
                </div>
                <div className="text-[14px] text-gray-400 mb-[16px]">
                  JPG, PNG, PDF, DOCX, or TXT • Max 10MB
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-[8px] bg-white/10 hover:bg-white/20 text-white text-[14px] px-[20px] py-[10px] rounded-full transition-all"
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.doc,.docx,text/plain"
                  className="hidden"
                />
              </>
            )}
          </div>
          
          <div className="text-[12px] text-gray-500 mt-[12px]">
            AI will extract and analyze tasks from your document automatically
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-[16px] my-[40px]">
          <div className="flex-1 h-[1px] bg-gray-800"></div>
          <div className="text-[12px] text-gray-500 font-semibold tracking-wide uppercase">
            Or enter manually
          </div>
          <div className="flex-1 h-[1px] bg-gray-800"></div>
        </div>

        {/* Manual Task Entry */}
        <div className="mb-[48px]">
          <label className="block text-[12px] font-semibold text-gray-500 tracking-wide uppercase mb-[12px]">
            Tasks
          </label>
          
          <div className="space-y-[12px]">
            {tasks.map((task, index) => (
              <div key={index} className="flex gap-[12px] items-center group">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask(index, e.target.value)}
                    placeholder={`Task ${index + 1}: Write social media posts (30 min/day)`}
                    className="w-full px-[16px] py-[14px] bg-gray-900/50 border border-gray-800 rounded-[12px] text-[15px] placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="w-[44px] h-[44px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[12px] transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Minus className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addTask}
            className="mt-[16px] inline-flex items-center gap-[8px] text-blue-400 hover:text-blue-300 text-[14px] font-medium transition-colors"
          >
            <Plus className="h-[16px] w-[16px]" />
            Add task
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-[16px] items-center">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex-1 overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span className="relative z-10 flex items-center justify-center gap-[8px]">
              {isLoading ? (
                <>
                  <div className="w-[16px] h-[16px] border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-[18px] w-[18px]" />
                  Analyze workflow
                </>
              )}
            </span>
            {!isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-[28px] py-[14px] border border-gray-800 hover:border-gray-700 hover:bg-gray-900/50 rounded-full font-medium text-[17px] text-gray-400 hover:text-white transition-all"
          >
            Cancel
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-[24px] text-[12px] text-gray-500 text-center">
          Analysis typically completes in under 5 minutes
        </div>
      </form>
    </div>
  )
}
