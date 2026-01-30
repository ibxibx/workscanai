export default function ResultsPage({ params }: { params: { id: string } }) {
  // TODO: Fetch actual results from API using params.id
  
  // Mock data for now
  const mockResults = {
    workflowName: 'Marketing Team Daily Tasks',
    automationScore: 72,
    totalTasks: 5,
    automationReady: 3,
    annualSavings: 28000,
    hoursSaved: 436,
    tasks: [
      {
        name: 'Write social media posts',
        automationScore: 85,
        timeSaved: '40%',
        recommendation: 'Use ChatGPT/Claude with brand guidelines',
        difficulty: 'Easy'
      },
      {
        name: 'Schedule posts across platforms',
        automationScore: 95,
        timeSaved: '90%',
        recommendation: 'Use Zapier or Buffer',
        difficulty: 'Very Easy'
      },
      {
        name: 'Respond to comments',
        automationScore: 50,
        timeSaved: '30%',
        recommendation: 'AI draft responses + human review',
        difficulty: 'Medium'
      },
      {
        name: 'Generate performance reports',
        automationScore: 90,
        timeSaved: '95%',
        recommendation: 'Python script with data visualization',
        difficulty: 'Medium'
      },
      {
        name: 'Research trending topics',
        automationScore: 60,
        timeSaved: '40%',
        recommendation: 'AI topic suggestions + human curation',
        difficulty: 'Medium'
      },
    ]
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{mockResults.workflowName}</h1>
      <p className="text-gray-500 mb-8">Analysis ID: {params.id}</p>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 mb-1">Automation Score</div>
          <div className="text-4xl font-bold text-blue-600 mb-1">
            {mockResults.automationScore}%
          </div>
          <div className="text-sm text-gray-500">
            {mockResults.automationReady} of {mockResults.totalTasks} tasks ready
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 mb-1">Annual Savings</div>
          <div className="text-4xl font-bold text-green-600 mb-1">
            ${mockResults.annualSavings.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {mockResults.hoursSaved} hours per year
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 mb-1">Quick Wins</div>
          <div className="text-4xl font-bold text-purple-600 mb-1">
            {mockResults.tasks.filter(t => t.difficulty === 'Easy' || t.difficulty === 'Very Easy').length}
          </div>
          <div className="text-sm text-gray-500">
            Tasks you can automate today
          </div>
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Task Breakdown</h2>
        <div className="space-y-4">
          {mockResults.tasks.map((task, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{task.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  task.automationScore >= 80 ? 'bg-green-100 text-green-800' :
                  task.automationScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {task.automationScore}% Ready
                </span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Time Saved: </span>
                  <span className="font-medium">{task.timeSaved}</span>
                </div>
                <div>
                  <span className="text-gray-600">Difficulty: </span>
                  <span className="font-medium">{task.difficulty}</span>
                </div>
                <div className="md:col-span-1">
                  <span className="text-gray-600">Priority: </span>
                  <span className="font-medium">
                    {task.automationScore >= 80 && task.difficulty === 'Easy' ? 'High' :
                     task.automationScore >= 60 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium text-blue-800">💡 Recommendation: </span>
                <span className="text-sm text-blue-700">{task.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Download Report
        </button>
        <button className="border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
          Share Results
        </button>
      </div>
    </div>
  )
}
