import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link 
          href="/dashboard/analyze"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold mb-2">New Analysis</h2>
          <p className="text-gray-600">
            Start analyzing a new workflow to identify automation opportunities
          </p>
        </Link>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">Recent Analyses</h2>
          <p className="text-gray-600 mb-4">
            View your workflow analysis history
          </p>
          <p className="text-sm text-gray-500 italic">
            No analyses yet. Create your first one!
          </p>
        </div>
      </div>

      {/* Stats Overview (Placeholder) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Total Analyses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">0h</div>
            <div className="text-sm text-gray-600">Potential Savings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">0%</div>
            <div className="text-sm text-gray-600">Avg Automation Score</div>
          </div>
        </div>
      </div>
    </div>
  )
}
