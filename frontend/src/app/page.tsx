import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            WorkScanAI
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            AI-Powered Workflow Analysis for the Age of Automation
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Identify which tasks in your workflow can be automated today. 
            Get actionable insights in minutes, not months.
          </p>
          <Link 
            href="/dashboard/analyze"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Analyze Your Workflow →
          </Link>
        </div>

        {/* Problem Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">The Problem</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-700 mb-4">
              We're in the middle of what Elon Musk calls a "bumpy transition" to AGI. 
              Within 3-7 years, AI will automate most white-collar work—essentially anything 
              involving "bits manipulation" (typing, clicking, data entry).
            </p>
            <p className="text-gray-700 font-semibold">
              Companies face a critical question: <span className="text-blue-600">
              Which of our tasks can be automated today, and what's the ROI?
              </span>
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-3">Workflow Parser</h3>
              <p className="text-gray-600">
                Automatically breaks down jobs into analyzable micro-tasks
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-3">AI-Readiness Scoring</h3>
              <p className="text-gray-600">
                Evaluates if current LLMs can handle each specific task
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-3">ROI Calculator</h3>
              <p className="text-gray-600">
                Quantifies time saved and cost reduction potential
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold mb-3">Implementation Roadmap</h3>
              <p className="text-gray-600">
                Prioritized automation strategy tailored to your workflow
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3">Visual Dashboard</h3>
              <p className="text-gray-600">
                Interactive reports perfect for stakeholder presentations
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Instant Analysis</h3>
              <p className="text-gray-600">
                Get comprehensive insights in minutes instead of months
              </p>
            </div>

          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Future-Proof Your Workflow?</h2>
            <p className="text-gray-600 mb-6">
              Upload your task list and get actionable automation insights instantly
            </p>
            <Link 
              href="/dashboard/analyze"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Free Analysis
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Built by Ian Baumeister | Inspired by the transition to AGI</p>
        </footer>
      </div>
    </div>
  )
}
