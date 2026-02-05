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
        prompt = f"""Analyze this work task for AI automation potential:

Task: {task['name']}
Description: {task.get('description', 'Not provided')}
Frequency: {task.get('frequency', 'Unknown')}
Time per task: {task.get('time_per_task', 'Unknown')} minutes
Category: {task.get('category', 'Unknown')}
Complexity: {task.get('complexity', 'Unknown')}

Provide:
1. AI Readiness Score (0-100): How easily can this be automated?
2. Time Saved Percentage (0-100): How much time could be saved?
3. Difficulty (easy/medium/hard): Implementation difficulty
4. Recommendation: One sentence on how to automate this

Respond in this exact format:
SCORE: [number]
TIME_SAVED: [number]
DIFFICULTY: [easy/medium/hard]
RECOMMENDATION: [one sentence]"""

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
