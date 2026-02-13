"""
Simple AI service for workflow analysis using Claude API
"""
import os
from anthropic import Anthropic
from typing import List, Dict


class AIAnalyzer:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=api_key)
    
    def analyze_task(self, task: Dict) -> Dict:
        """
        Analyze a single task for automation potential
        Returns: AI readiness score and recommendation
        """
        prompt = f"""You are an expert automation consultant analyzing work tasks for AI automation potential.

TASK TO ANALYZE:
{task['name']}

Additional Context:
- Description: {task.get('description', 'Same as task name')}
- Frequency: {task.get('frequency', 'Unknown')} 
- Time per occurrence: {task.get('time_per_task', 'Unknown')} minutes
- Category: {task.get('category', 'Unknown')}
- Complexity: {task.get('complexity', 'Unknown')}

IMPORTANT INSTRUCTIONS:
1. Analyze THIS SPECIFIC TASK, not a generic example
2. Consider the ACTUAL task name and description provided
3. Don't assume this is a marketing task unless it clearly is
4. Provide concrete, specific recommendations based on what this task actually involves

PROVIDE YOUR ANALYSIS:

1. AI Readiness Score (0-100): 
   - How easily can THIS specific task be automated with current AI/tools?
   - Consider: Is it repetitive? Rule-based? Data-heavy? Requires creativity/judgment?
   
2. Time Saved Percentage (0-100):
   - Realistically, how much time could be saved by automating THIS task?
   - Consider partial automation vs full automation
   
3. Implementation Difficulty (easy/medium/hard):
   - easy: No-code tools, simple setup (Zapier, templates, etc.)
   - medium: Requires some technical setup (Python scripts, API integration)
   - hard: Complex custom development needed
   
4. Specific Recommendation:
   - Provide a CONCRETE recommendation for THIS specific task
   - Mention specific tools, approaches, or services that would work
   - Be specific to what this task actually involves
   - One clear sentence

Respond in this EXACT format (no extra text):
SCORE: [number 0-100]
TIME_SAVED: [number 0-100]
DIFFICULTY: [easy/medium/hard]
RECOMMENDATION: [one specific sentence about how to automate THIS task]"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            
            # Parse the response
            lines = response_text.strip().split('\n')
            result = {}
            
            for line in lines:
                if line.startswith('SCORE:'):
                    result['ai_readiness_score'] = float(line.split(':')[1].strip())
                elif line.startswith('TIME_SAVED:'):
                    result['time_saved_percentage'] = float(line.split(':')[1].strip())
                elif line.startswith('DIFFICULTY:'):
                    result['difficulty'] = line.split(':')[1].strip().lower()
                elif line.startswith('RECOMMENDATION:'):
                    result['recommendation'] = line.split(':', 1)[1].strip()
            
            return result
            
        except Exception as e:
            print(f"AI analysis error: {e}")
            # Return default values on error
            return {
                'ai_readiness_score': 50.0,
                'time_saved_percentage': 25.0,
                'difficulty': 'medium',
                'recommendation': 'Could not analyze - using default values'
            }
    
    def calculate_roi(self, tasks_analysis: List[Dict], hourly_rate: float) -> Dict:
        """
        Calculate ROI metrics from analyzed tasks
        """
        total_score = 0
        total_hours_saved = 0
        
        for analysis in tasks_analysis:
            total_score += analysis['ai_readiness_score']
            
            # Calculate hours saved per year
            task = analysis['task']
            time_per_task = task.get('time_per_task', 0) / 60  # Convert to hours
            time_saved_pct = analysis.get('time_saved_percentage', 0) / 100
            
            # Estimate frequency
            freq = task.get('frequency', 'weekly')
            if freq == 'daily':
                yearly_occurrences = 250  # work days
            elif freq == 'weekly':
                yearly_occurrences = 52
            elif freq == 'monthly':
                yearly_occurrences = 12
            else:
                yearly_occurrences = 52  # default to weekly
            
            hours_saved = time_per_task * time_saved_pct * yearly_occurrences
            total_hours_saved += hours_saved
            analysis['estimated_hours_saved'] = hours_saved
        
        avg_score = total_score / len(tasks_analysis) if tasks_analysis else 0
        annual_savings = total_hours_saved * hourly_rate
        
        return {
            'automation_score': round(avg_score, 2),
            'hours_saved': round(total_hours_saved, 2),
            'annual_savings': round(annual_savings, 2)
        }
