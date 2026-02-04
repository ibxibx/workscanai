"""
Simple AI Analysis Service using Claude API
"""
import os
import json
from typing import List, Dict
from anthropic import Anthropic


class AIAnalyzer:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=api_key)
    
    def analyze_tasks(self, tasks: List[Dict]) -> Dict:
        """
        Analyze tasks for automation potential
        Returns: {
            "automation_score": float,
            "results": [
                {
                    "task_id": int,
                    "ai_readiness_score": float,
                    "recommendation": str,
                    ...
                }
            ]
        }
        """
        # Create prompt for Claude
        prompt = self._create_analysis_prompt(tasks)
        
        # Call Claude API
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Parse response
            result_text = response.content[0].text
            return self._parse_analysis_result(result_text, tasks)
            
        except Exception as e:
            print(f"Error calling Claude API: {e}")
            # Return simple fallback analysis
            return self._fallback_analysis(tasks)
    
    def _create_analysis_prompt(self, tasks: List[Dict]) -> str:
        """Create analysis prompt for Claude"""
        task_list = "\n".join([
            f"{i+1}. {task['name']} - {task.get('description', 'No description')}"
            f"\n   Frequency: {task.get('frequency', 'unknown')}"
            f"\n   Time: {task.get('time_per_task', 'unknown')} minutes"
            f"\n   Complexity: {task.get('complexity', 'unknown')}"
            for i, task in enumerate(tasks)
        ])
        
        return f"""Analyze these workflow tasks for AI automation potential.

TASKS:
{task_list}

For each task, provide:
1. AI Readiness Score (0-100): How suitable for AI automation
2. Time Saved % (0-100): Percentage of time that could be saved
3. Difficulty (easy/medium/hard): Implementation difficulty
4. Recommendation: Brief actionable recommendation

Return ONLY valid JSON in this exact format:
{{
  "automation_score": 75,
  "results": [
    {{
      "task_id": 0,
      "ai_readiness_score": 85,
      "time_saved_percentage": 70,
      "difficulty": "medium",
      "recommendation": "Automate with Python script"
    }}
  ]
}}"""
    
    def _parse_analysis_result(self, text: str, tasks: List[Dict]) -> Dict:
        """Parse Claude's response into structured data"""
        try:
            # Try to extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                result = json.loads(json_str)
                return result
        except:
            pass
        
        # Fallback if parsing fails
        return self._fallback_analysis(tasks)
    
    def _fallback_analysis(self, tasks: List[Dict]) -> Dict:
        """Simple rule-based fallback analysis"""
        results = []
        total_score = 0
        
        for i, task in enumerate(tasks):
            # Simple scoring based on complexity and frequency
            complexity = task.get('complexity', 'medium')
            frequency = task.get('frequency', 'daily')
            
            # Base score
            if complexity == 'low':
                base_score = 85
            elif complexity == 'medium':
                base_score = 65
            else:
                base_score = 45
            
            # Adjust for frequency
            if frequency == 'daily':
                base_score += 10
            elif frequency == 'weekly':
                base_score += 5
            
            base_score = min(base_score, 100)
            
            results.append({
                "task_id": i,
                "ai_readiness_score": base_score,
                "time_saved_percentage": base_score * 0.7,
                "difficulty": "medium",
                "recommendation": f"Task '{task['name']}' is suitable for automation"
            })
            total_score += base_score
        
        avg_score = total_score / len(tasks) if tasks else 0
        
        return {
            "automation_score": avg_score,
            "results": results
        }
