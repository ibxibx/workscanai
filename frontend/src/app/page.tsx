import Link from 'next/link'
import { ArrowRight, Brain, Calculator, Clock, MapPin, TrendingUp, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">WorkScanAI</span>
            </div>
            <Link 
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Workflow Analysis</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Discover What AI Can
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Automate Today
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Upload your task list. Get instant ROI analysis and a clear automation roadmap.
            </p>
            
            <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
              Stop guessing which workflows to automate. WorkScanAI analyzes your tasks with AI 
              and shows you exactly where to invest for maximum impact.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/dashboard/analyze"
                className="group inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>Start Free Analysis</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="#example"
                className="inline-flex items-center space-x-2 bg-white text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                <span>See Example</span>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900">< 5 min</div>
                <div className="text-sm text-gray-600">Analysis Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">0-100</div>
                <div className="text-sm text-gray-600">AI Readiness Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">$$$</div>
                <div className="text-sm text-gray-600">ROI Calculated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Problem */}
            <div>
              <div className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                The Challenge
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                The Bumpy Transition to AGI
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Within 3-7 years, AI will automate most white-collar work—anything involving 
                "bits manipulation" like typing, clicking, and data entry.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                But today, companies face a critical question:
              </p>
              <div className="bg-white border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
                <p className="text-xl font-semibold text-gray-900">
                  "Which of our tasks can be automated <span className="text-red-600">right now</span>, 
                  and what's the ROI?"
                </p>
              </div>
            </div>

            {/* Solution */}
            <div>
              <div className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                The Solution
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                WorkScanAI Answers That Question
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Stop spending months evaluating automation opportunities. Get instant, 
                AI-powered analysis of your workflows.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 bg-white p-4 rounded-lg shadow-sm">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Upload Task List</h3>
                    <p className="text-gray-600">Paste your workflows or upload a CSV</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-white p-4 rounded-lg shadow-sm">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">AI Analysis</h3>
                    <p className="text-gray-600">Claude evaluates automation potential</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 bg-white p-4 rounded-lg shadow-sm">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Get Actionable Roadmap</h3>
                    <p className="text-gray-600">Prioritized plan with ROI estimates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Make Smart Automation Decisions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive analysis powered by cutting-edge AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Workflow Parser</h3>
              <p className="text-gray-600">
                Automatically breaks down complex jobs into analyzable micro-tasks using advanced NLP
              </p>
            </div>

            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Readiness Scoring</h3>
              <p className="text-gray-600">
                Evaluates each task on a 0-100 scale based on current LLM capabilities
              </p>
            </div>

            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-green-300 hover:shadow-lg transition-all">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors">
                <Calculator className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">ROI Calculator</h3>
              <p className="text-gray-600">
                Quantifies time saved, cost reduction, and payback period for each automation opportunity
              </p>
            </div>

            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-orange-300 hover:shadow-lg transition-all">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Implementation Roadmap</h3>
              <p className="text-gray-600">
                Prioritized automation strategy from quick wins to long-term transformations
              </p>
            </div>

            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-pink-300 hover:shadow-lg transition-all">
              <div className="bg-pink-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-pink-200 transition-colors">
                <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Visual Dashboard</h3>
              <p className="text-gray-600">
                Interactive reports and visualizations perfect for stakeholder presentations
              </p>
            </div>

            <div className="group bg-white border border-gray-200 rounded-xl p-8 hover:border-indigo-300 hover:shadow-lg transition-all">
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:bg-indigo-200 transition-colors">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Analysis</h3>
              <p className="text-gray-600">
                Get comprehensive insights in under 5 minutes instead of spending months evaluating
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Use Case */}
      <div id="example" className="py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
            <p className="text-xl text-gray-600">Real example: Marketing team workflow analysis</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Input */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                Input: Marketing Tasks
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-mono">•</span>
                  <span>Write social media posts (30 min/day)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-mono">•</span>
                  <span>Schedule posts across platforms (15 min/day)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-mono">•</span>
                  <span>Respond to comments (45 min/day)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-mono">•</span>
                  <span>Generate performance reports (2 hours/week)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 font-mono">•</span>
                  <span>Research trending topics (1 hour/day)</span>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                Output: Analysis Results
              </h3>
              
              <div className="space-y-6">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Automation Score</div>
                  <div className="text-3xl font-bold text-gray-900">72/100</div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="text-sm text-gray-600 mb-1">Annual Savings</div>
                  <div className="text-3xl font-bold text-gray-900">$28,000</div>
                  <div className="text-sm text-gray-600">436 hours saved per year</div>
                </div>

                <div>
                  <div className="font-semibold text-gray-900 mb-3">Quick Wins:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Scheduling → Zapier/Buffer (90% automated)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">Reports → Python script (95% automated)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-gray-900 mb-3">Human-in-Loop:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">→</span>
                      <span className="text-gray-700">Comment responses (50% time saved)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">→</span>
                      <span className="text-gray-700">Topic research (40% time saved)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-600 mb-4">Powered by cutting-edge technology</p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                Next.js 14
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                TypeScript
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                FastAPI
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                Claude AI
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                PostgreSQL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Future-Proof Your Workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join companies preparing for the AI revolution. Get your free analysis today.
          </p>
          <Link 
            href="/dashboard/analyze"
            className="inline-flex items-center space-x-2 bg-white text-blue-600 px-10 py-5 rounded-lg text-lg font-bold hover:bg-gray-100 transition-all shadow-2xl"
          >
            <span>Start Free Analysis</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-blue-100 text-sm">
            No credit card required • Results in under 5 minutes
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-gray-900">WorkScanAI</span>
            </div>
            <div className="text-sm text-gray-600">
              Built by{' '}
              <a href="https://ianworks.dev" className="text-blue-600 hover:text-blue-700 font-medium">
                Ian Baumeister
              </a>
              {' '}• Inspired by the transition to AGI
            </div>
            <div className="flex space-x-6">
              <a href="https://github.com/ibxibx/workscanai" className="text-gray-600 hover:text-gray-900">
                GitHub
              </a>
              <a href="https://linkedin.com/in/yourprofile" className="text-gray-600 hover:text-gray-900">
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}