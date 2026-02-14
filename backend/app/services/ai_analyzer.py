"""
Enhanced AI service for workflow analysis using Claude API
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
        Analyze a single task for automation potential with specific tool recommendations
        """
        prompt = f"""You are an expert automation consultant with deep knowledge of AI tools, no-code platforms, and workflow automation solutions.

TASK TO ANALYZE:
Name: {task['name']}
Description: {task.get('description', 'Same as task name')}
Frequency: {task.get('frequency', 'Unknown')} 
Time per occurrence: {task.get('time_per_task', 'Unknown')} minutes
Category: {task.get('category', 'Unknown')}
Current Complexity: {task.get('complexity', 'Unknown')}

YOUR MISSION:
Provide a practical, actionable automation assessment for THIS SPECIFIC task.

ANALYSIS CRITERIA:

1. AI READINESS SCORE (0-100):
   - 90-100: Fully automatable with existing tools (e.g., data entry, scheduling, email sorting)
   - 70-89: Highly automatable with minimal human oversight (e.g., content drafting, report generation)
   - 50-69: Partially automatable, requires human review (e.g., customer responses, analysis)
   - 30-49: AI-assisted but human-led (e.g., creative work, strategic decisions)
   - 0-29: Requires human judgment, empathy, or expertise (e.g., complex negotiations, counseling)

2. TIME SAVED PERCENTAGE (0-100):
   - Consider: Can this be 100% automated or only partially?
   - Factor in: Setup time, error checking, edge cases

3. IMPLEMENTATION DIFFICULTY:
   - easy: No-code tools, drag-and-drop setup (Zapier, Make.com, Buffer, Calendly)
   - medium: Low-code setup, API connections (Python scripts, Google Apps Script, ChatGPT API)
   - hard: Custom development required (Machine learning models, complex integrations)

4. SPECIFIC TOOL RECOMMENDATION:
   Based on the task category, recommend ACTUAL tools:
   
   DATA ENTRY & PROCESSING:
   - Zapier, Make.com (automation)
   - Google Sheets + Apps Script
   - UiPath, Automation Anywhere (RPA)
   
   COMMUNICATION & SCHEDULING:
   - Calendly, Cal.com (scheduling)
   - Superhuman, SaneBox (email management)
   - Slack workflows, Microsoft Power Automate
   
   CONTENT CREATION:
   - ChatGPT, Claude (writing assistance)
   - Jasper, Copy.ai (marketing copy)
   - Canva (visual content)
   - Descript (video/audio)
   
   ANALYSIS & REPORTING:
   - Tableau, Power BI (dashboards)
   - Python + pandas (data processing)
   - Google Data Studio
   
   CUSTOMER SERVICE:
   - Intercom, Zendesk (with AI features)
   - Chatbots (ManyChat, Drift)
   - AI phone assistants (Aircall AI)
   
   PROJECT MANAGEMENT:
   - Asana, Monday.com (with automations)
   - Jira automation rules
   
   RESEARCH & MONITORING:
   - Perplexity, ChatGPT with browsing
   - Google Alerts
   - Brand monitoring tools

RESPOND IN THIS EXACT FORMAT (no extra text, no markdown):
SCORE: [number 0-100]
TIME_SAVED: [number 0-100]
DIFFICULTY: [easy/medium/hard]
RECOMMENDATION: Use [specific tool name(s)] to automate [specific action]. [One sentence about implementation or benefit].

EXAMPLE OUTPUTS:
For "Schedule social media posts":
SCORE: 95
TIME_SAVED: 90
DIFFICULTY: easy
RECOMMENDATION: Use Buffer or Hootsuite to batch-schedule posts across platforms in 15 minutes once per week instead of daily posting.

For "Respond to customer support emails":
SCORE: 65
TIME_SAVED: 50
DIFFICULTY: medium
RECOMMENDATION: Use Zendesk AI or Intercom to generate draft responses based on common questions, then have staff review before sending.

For "Create quarterly financial forecasts":
SCORE: 40
TIME_SAVED: 30
DIFFICULTY: hard
RECOMMENDATION: Use Python with pandas and Prophet library to generate baseline forecasts from historical data, then have analysts review and adjust based on market conditions.

Now analyze the task above:"""

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
                    try:
                        result['ai_readiness_score'] = float(line.split(':')[1].strip())
                    except:
                        result['ai_readiness_score'] = 50.0
                elif line.startswith('TIME_SAVED:'):
                    try:
                        result['time_saved_percentage'] = float(line.split(':')[1].strip())
                    except:
                        result['time_saved_percentage'] = 25.0
                elif line.startswith('DIFFICULTY:'):
                    difficulty = line.split(':')[1].strip().lower()
                    result['difficulty'] = difficulty if difficulty in ['easy', 'medium', 'hard'] else 'medium'
                elif line.startswith('RECOMMENDATION:'):
                    result['recommendation'] = line.split(':', 1)[1].strip()
            
            # Ensure all required fields are present
            if 'ai_readiness_score' not in result:
                result['ai_readiness_score'] = 50.0
            if 'time_saved_percentage' not in result:
                result['time_saved_percentage'] = 25.0
            if 'difficulty' not in result:
                result['difficulty'] = 'medium'
            if 'recommendation' not in result:
                result['recommendation'] = 'Automation potential identified - review with team to determine best approach.'
            
            return result
            
        except Exception as e:
            print(f"AI analysis error: {e}")
            # Return thoughtful defaults on error
            return {
                'ai_readiness_score': 50.0,
                'time_saved_percentage': 25.0,
                'difficulty': 'medium',
                'recommendation': 'Unable to analyze at this time. Please review this task manually for automation opportunities.'
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

