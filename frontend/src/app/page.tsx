'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Mic, MicOff } from 'lucide-react'

export default function LandingPage() {
  const recognitionRef = useRef<any>(null)
  
  const [workflowName, setWorkflowName] = useState('')
  const [tasks, setTasks] = useState(['', '', ''])
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechSupported(false)
      }
    }
  }, [])

  useEffect(() => {
    // Recording timer
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) { // 2 minute max
            if (recognitionRef.current) {
              recognitionRef.current.stop()
              recognitionRef.current = null
            }
            return 0
          }
          return prev + 1
        })
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let silenceTimer: NodeJS.Timeout
    let fullTranscript = ''

    recognition.onstart = () => {
      setIsRecording(true)
      // Don't clear transcript - keep previous recordings!
    }

    recognition.onresult = (event: any) => {
      clearTimeout(silenceTimer)
      
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          fullTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      const currentTranscript = fullTranscript + interimTranscript
      
      // Add to existing transcript instead of replacing
      const combinedTranscript = transcript + currentTranscript
      
      // Character limit: 2000 characters
      if (combinedTranscript.length > 2000) {
        recognition.stop()
        setTranscript(combinedTranscript.substring(0, 2000))
        return
      }

      setTranscript(transcript + currentTranscript)

      // Auto-stop after 30 seconds of silence
      silenceTimer = setTimeout(() => {
        recognition.stop()
      }, 30000)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      // Don't stop on no-speech error - just continue
      if (event.error !== 'no-speech') {
        recognition.stop()
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      
      // Add space separator between recordings if there's existing text
      if (transcript.trim()) {
        setTranscript(prev => prev + ' ')
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const applyTranscriptToTasks = () => {
    if (!transcript.trim()) return

    // Clean up the transcript
    const cleanedTranscript = transcript
      .replace(/\b(um|uh|hmm|like|you know)\b/gi, '') // Remove filler words
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()

    // Split by common task separators
    const taskSeparators = /(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth(?:ly)?|also|additionally|next|then|and also|another(?:\s+task)?|task\s+\d+)/gi
    
    let detectedTasks = cleanedTranscript
      .split(taskSeparators)
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => {
        // Remove leading "is" or "task" or "I need to"
        t = t.replace(/^(?:is|task|I need to|to|I have to)\s+/i, '')
        // Capitalize first letter
        return t.charAt(0).toUpperCase() + t.slice(1)
      })
      .filter(t => t.length > 5) // Minimum meaningful task length

    // If we got good tasks, ADD them to existing tasks (not replace)
    if (detectedTasks.length > 0) {
      // Get current non-empty tasks
      const currentTasks = tasks.filter(t => t.trim() !== '')
      
      // Add new tasks to existing ones
      const allTasks = [...currentTasks, ...detectedTasks].slice(0, 20) // Max 20 tasks
      
      // Ensure at least 3 fields
      while (allTasks.length < 3) {
        allTasks.push('')
      }
      
      setTasks(allTasks)
      setTranscript('')
    } else {
      // Fallback: add full transcript as single task to existing tasks
      const currentTasks = tasks.filter(t => t.trim() !== '')
      const allTasks = [...currentTasks, cleanedTranscript]
      
      // Ensure at least 3 fields
      while (allTasks.length < 3) {
        allTasks.push('')
      }
      
      setTasks(allTasks)
      setTranscript('')
    }
  }

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks]
    newTasks[index] = value
    setTasks(newTasks)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validTasks = tasks.filter(t => t.trim() !== '')
    
    if (validTasks.length === 0 && !workflowName.trim()) {
      alert('Please enter a workflow name and at least one task')
      return
    }
    
    if (validTasks.length === 0) {
      alert('Please enter at least one task')
      return
    }

    // For now, redirect to demo results page
    // TODO: Send to backend API and get real analysis
    window.location.href = '/dashboard/results/demo-123'
  }
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
              WorkScanAI
            </Link>
            <Link 
              href="/dashboard"
              className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="relative inline-block mb-[40px]">
            <div className="absolute inset-0 -inset-x-[200px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[120px]"></div>
            <h1 className="relative text-[56px] leading-[1.07] font-semibold tracking-tight text-[#1d1d1f] px-[40px]">
              The future of work
              <br />
              starts with knowing
              <br />
              what to automate.
            </h1>
          </div>
          
          {/* Value Proposition Block */}
          <div className="max-w-[800px] mx-auto mt-[40px] mb-[40px] group">
            <div className="bg-[#fbfbfd] border border-[#e8e8ed] rounded-[18px] p-[32px] transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <p className="text-[21px] leading-[1.381] font-normal text-[#6e6e73] mb-[24px]">
                AI-powered analysis reveals which tasks are ready for automation — and exactly how much you'll save.
              </p>
              
              <div className="flex gap-[16px] justify-center items-center">
                <Link 
                  href="#analyze"
                  className="group inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all"
                >
                  <span>Analyze now</span>
                  <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
                </Link>
                
                <Link 
                  href="#example"
                  className="text-[#0071e3] hover:text-[#0077ed] text-[17px] leading-[1.17] font-normal transition-colors"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Block */}
          <div className="max-w-[700px] mx-auto group">
            <div className="bg-[#fbfbfd] border border-[#e8e8ed] rounded-[18px] p-[40px] transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <div className="flex gap-[40px] justify-center text-[14px]">
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">&lt;5 min</div>
                  <div className="text-[#86868b]">to analyze</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">0–100</div>
                  <div className="text-[#86868b]">automation score</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">€28K+</div>
                  <div className="text-[#86868b]">avg. savings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Ultra Compact */}
      <section className="py-[60px] border-y border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-[20px]">
            <div className="group">
              <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
                <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-[20px] w-[20px] text-white" />
                </div>
                <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">AI Analysis</h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                  Evaluates every task for automation readiness
                </p>
              </div>
            </div>

            <div className="group">
              <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
                <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">ROI Calculator</h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                  Calculates time and cost savings instantly
                </p>
              </div>
            </div>

            <div className="group">
              <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
                <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                  <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">Action Roadmap</h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                  Prioritized plan from quick wins to long-term
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example - Sleek */}
      <section id="example" className="py-[80px]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                From chaos to clarity.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Marketing team workflow analyzed in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-[24px]">
            {/* Input */}
            <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[20px]">
                Input
              </div>
              <div className="space-y-[12px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                <div>• Social posts (30 min/day)</div>
                <div>• Schedule platforms (15 min/day)</div>
                <div>• Comment responses (45 min/day)</div>
                <div>• Weekly reports (2 hrs/week)</div>
                <div>• Topic research (1 hr/day)</div>
              </div>
            </div>

            {/* Output */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-[#0071e3] tracking-wide uppercase mb-[20px]">
                Analysis
              </div>
              <div className="space-y-[16px]">
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">72/100</div>
                  <div className="text-[12px] text-[#6e6e73]">Automation Score</div>
                </div>
                <div>
                  <div className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">€28,000</div>
                  <div className="text-[12px] text-[#6e6e73]">Annual Savings • 436 hours</div>
                </div>
                <div className="pt-[8px] border-t border-[#d2d2d7]">
                  <div className="text-[12px] text-green-600 mb-[4px]">✓ Quick Wins</div>
                  <div className="text-[13px] text-[#6e6e73]">Scheduling, Reports (90%+)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analyze Form Section - Integrated */}
      <section id="analyze" className="py-[80px] bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                Start your analysis now.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Upload a document or enter your tasks manually.
            </p>
          </div>

          {/* Quick Form */}
          <form onSubmit={handleSubmit} className="max-w-[800px] mx-auto">
            {/* Workflow Name */}
            <div className="mb-[24px]">
              <label className="block text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Marketing Team Daily Tasks"
                className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[17px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
            </div>

            {/* File Upload */}
            <div className="mb-[24px] group">
              <label className="block text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
                Upload Document
              </label>
              <div className="bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] p-[40px] text-center transition-all hover:border-[#0071e3] hover:bg-blue-50">
                <div className="inline-flex items-center justify-center w-[56px] h-[56px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-[16px]">
                  <svg className="h-[24px] w-[24px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-[17px] font-medium mb-[8px] text-[#1d1d1f]">
                  Drop your file here
                </div>
                <div className="text-[14px] text-[#6e6e73] mb-[16px]">
                  JPG, PNG, PDF, DOCX, or TXT • Max 10MB
                </div>
                <button className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] px-[20px] py-[10px] rounded-full transition-all">
                  Browse files
                </button>
              </div>
              <div className="text-[12px] text-[#86868b] mt-[12px] text-center">
                AI will extract and analyze tasks from your document automatically
              </div>
            </div>

            {/* Voice Input Section */}
            {speechSupported && (
              <div className="mb-[24px]">
                <label className="block text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
                  Or Use Voice Input
                </label>
                
                <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
                  <div className="flex flex-col items-center gap-[16px]">
                    {/* Microphone Button */}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative group transition-all ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                      } w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-lg`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-[36px] w-[36px] text-white" />
                          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></span>
                        </>
                      ) : (
                        <Mic className="h-[36px] w-[36px] text-white" />
                      )}
                    </button>

                    {/* Status Text */}
                    <div className="text-center">
                      {isRecording ? (
                        <>
                          <div className="text-[17px] font-semibold text-red-600 mb-[4px]">
                            Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                          </div>
                          <div className="text-[13px] text-[#6e6e73]">
                            {120 - recordingTime} seconds remaining • Click to stop
                          </div>
                        </>
                      ) : transcript ? (
                        <>
                          <div className="text-[17px] font-medium text-green-600 mb-[4px]">
                            Recording saved! Click to add more
                          </div>
                          <div className="text-[13px] text-[#6e6e73]">
                            Or click "Apply to tasks" when done
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[17px] font-medium text-[#1d1d1f] mb-[4px]">
                            Click to start voice input
                          </div>
                          <div className="text-[13px] text-[#6e6e73]">
                            Describe your workflow and tasks verbally
                          </div>
                        </>
                      )}
                    </div>

                    {/* Live Transcript */}
                    {(isRecording || transcript) && (
                      <div className="w-full bg-white border border-[#d2d2d7] rounded-[12px] p-[16px] min-h-[100px] max-h-[200px] overflow-y-auto">
                        <div className="text-[14px] text-[#1d1d1f] leading-relaxed">
                          {transcript || <span className="text-[#86868b] italic">Listening...</span>}
                        </div>
                        <div className="text-[11px] text-[#86868b] mt-[8px]">
                          {transcript.length}/2000 characters
                        </div>
                      </div>
                    )}

                    {/* Apply Button */}
                    {transcript && !isRecording && (
                      <button
                        type="button"
                        onClick={applyTranscriptToTasks}
                        className="inline-flex items-center gap-[8px] bg-green-600 hover:bg-green-700 text-white text-[14px] font-semibold px-[20px] py-[10px] rounded-full transition-all"
                      >
                        <Sparkles className="h-[16px] w-[16px]" />
                        Apply to tasks
                      </button>
                    )}

                    {/* Limits Info */}
                    <div className="text-[11px] text-[#86868b] text-center max-w-[400px]">
                      Record multiple times - text accumulates • Click "Apply" when done to populate tasks
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OR Divider */}
            <div className="flex items-center gap-[16px] my-[32px]">
              <div className="flex-1 h-[1px] bg-[#d2d2d7]"></div>
              <div className="text-[12px] text-[#86868b] font-semibold tracking-wide uppercase">
                Or enter manually
              </div>
              <div className="flex-1 h-[1px] bg-[#d2d2d7]"></div>
            </div>

            {/* Task Inputs */}
            <div className="space-y-[12px] mb-[32px]">
              {tasks.map((task, index) => (
                <input
                  key={index}
                  type="text"
                  value={task}
                  onChange={(e) => updateTask(index, e.target.value)}
                  placeholder={`Task ${index + 1}: ${
                    index === 0 ? 'Write social media posts (30 min/day)' :
                    index === 1 ? 'Schedule posts across platforms (15 min/day)' :
                    'Respond to comments (45 min/day)'
                  }`}
                  className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[15px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
                />
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                type="submit"
                className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold px-[32px] py-[16px] rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Analyze workflow</span>
              </button>
              <p className="mt-[16px] text-[12px] text-[#86868b]">
                Analysis typically completes in under 5 minutes
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" className="hover:text-[#1d1d1f] transition-colors">
                Ian Baumeister
              </a>
              <a href="https://github.com/ibxibx/workscanai" className="hover:text-[#1d1d1f] transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
