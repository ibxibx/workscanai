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
    <div className="min-h-screen bg-black text-white pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header */}
        <div className="mb-[48px]">
          <h1 className="text-[48px] leading-[1.08] font-semibold tracking-tight mb-[8px]">
            {mockResults.workflowName}
          </h1>
          <p className="text-[14px] text-gray-600">Analysis ID: {params.id}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          <div className="bg-gray-900/50 border border-gray-800 rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-gray-600 tracking-wide uppercase mb-[12px]">
              Automation Score
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-blue-400 mb-[4px]">
              {mockResults.automationScore}%
            </div>
            <div className="text-[13px] text-gray-600">
              {mockResults.automationReady} of {mockResults.totalTasks} tasks ready
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-gray-600 tracking-wide uppercase mb-[12px]">
              Annual Savings
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-green-400 mb-[4px]">
              €{mockResults.annualSavings.toLocaleString()}
            </div>
            <div className="text-[13px] text-gray-600">
              {mockResults.hoursSaved} hours per year
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-gray-600 tracking-wide uppercase mb-[12px]">
              Quick Wins
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-purple-400 mb-[4px]">
              {mockResults.tasks.filter(t => t.difficulty === 'Easy' || t.difficulty === 'Very Easy').length}
            </div>
            <div className="text-[13px] text-gray-600">
              Tasks you can automate today
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-[18px] p-[40px] mb-[32px]">
          <h2 className="text-[28px] font-semibold tracking-tight mb-[32px]">Task Breakdown</h2>
          <div className="space-y-[16px]">
            {mockResults.tasks.map((task, index) => (
              <div key={index} className="border border-gray-800 rounded-[12px] p-[24px] bg-black/40">
                <div className="flex justify-between items-start mb-[16px]">
                  <h3 className="text-[19px] font-semibold text-gray-200">{task.name}</h3>
                  <span className={`px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${
                    task.automationScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    task.automationScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {task.automationScore}% Ready
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-[16px] text-[14px] mb-[16px]">
                  <div>
                    <span className="text-gray-600">Time Saved: </span>
                    <span className="font-medium text-gray-300">{task.timeSaved}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Difficulty: </span>
                    <span className="font-medium text-gray-300">{task.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority: </span>
                    <span className="font-medium text-gray-300">
                      {task.automationScore >= 80 && task.difficulty === 'Easy' ? 'High' :
                       task.automationScore >= 60 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
                <div className="p-[16px] bg-blue-500/10 border border-blue-500/20 rounded-[8px]">
                  <span className="text-[13px] font-semibold text-blue-400">💡 Recommendation: </span>
                  <span className="text-[13px] text-gray-300">{task.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-[16px]">
          <button className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">
            Download Report
          </button>
          <button className="border border-gray-800 hover:border-gray-700 hover:bg-gray-900/50 px-[28px] py-[14px] rounded-full font-medium text-[17px] text-gray-400 hover:text-white transition-all">
            Share Results
          </button>
        </div>
      </div>
    </div>
  )
}
