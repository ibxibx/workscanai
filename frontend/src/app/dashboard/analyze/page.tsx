'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyzePage() {
  const router = useRouter()
  const [workflowName, setWorkflowName] = useState('')
  const [tasks, setTasks] = useState([''])
  const [isLoading, setIsLoading] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Filter out empty tasks
    const validTasks = tasks.filter(task => task.trim() !== '')

    if (validTasks.length === 0) {
      alert('Please add at least one task')
      setIsLoading(false)
      return
    }

    try {
      // TODO: Call API to create workflow and analyze
      // For now, simulate API call
      console.log('Analyzing workflow:', { workflowName, tasks: validTasks })
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Redirect to results (mock ID for now)
      router.push('/dashboard/results/demo-123')
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Analyze Workflow</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        {/* Workflow Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workflow Name
          </label>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="e.g., Marketing Team Daily Tasks"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Tasks */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tasks
          </label>
          <p className="text-sm text-gray-500 mb-4">
            List each task in your workflow. Be specific about what the task involves.
          </p>

          {tasks.map((task, index) => (
            <div key={index} className="flex gap-2 mb-3">
              <input
                type="text"
                value={task}
                onChange={(e) => updateTask(index, e.target.value)}
                placeholder={`Task ${index + 1}: e.g., Write social media posts (30 min/day)`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addTask}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            + Add Another Task
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Workflow'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
