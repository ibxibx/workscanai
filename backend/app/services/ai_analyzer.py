"""
AI service for workflow analysis — F1 sub-scores, F2 tool pricing, F3 risk flags,
F4 readiness, F9 agentification roadmap, F13 multi-agent orchestration
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
        prompt = f"""You are a Principal at McKinsey Digital, specializing in enterprise AI transformation. Analyze this task with the rigor of a senior automation consultant producing a board-level deliverable.

TASK:
Name: {task['name']}
Description: {task.get('description', task['name'])}
Frequency: {task.get('frequency', 'weekly')}
Time per occurrence: {task.get('time_per_task', 30)} minutes
Category: {task.get('category', 'general')}
Complexity: {task.get('complexity', 'medium')}

OUTPUT EXACTLY this format — no extra text, no markdown, no blank lines between fields:

SCORE_REPEATABILITY: [0-100]
SCORE_DATA: [0-100]
SCORE_ERROR: [0-100]
SCORE_INTEGRATION: [0-100]
COMPOSITE_SCORE: [SCORE_REPEATABILITY*0.3 + SCORE_DATA*0.3 + SCORE_ERROR*0.2 + SCORE_INTEGRATION*0.2]
TIME_SAVED: [0-100]
DIFFICULTY: [easy/medium/hard]
RISK_LEVEL: [safe/caution/warning]
RISK_FLAG: [one sentence with emoji — safe="✅ Safe to automate." caution="⚠️ Review outputs — [reason]." warning="🔴 Contains [PII/financial/medical] — [mitigation]."]
RECOMMENDATION: Option 1 — [Exact tool + plan + real price]: [What it does for this exact task. Setup: X hrs. Payback: Y weeks.] Option 2 — [Alternative tool + plan + price]: [What it does. Setup: X hrs. Payback: Y weeks.]
AGENT_PHASE: [1/2/3]
AGENT_LABEL: [Phase 1: Human-in-Loop AI Draft / Phase 2: Supervised Automation / Phase 3: Full Agent Delegation]
AGENT_MILESTONE: [One concrete milestone: what gets built, what gets retired, what KPI is hit]
ORCHESTRATION: [If COMPOSITE_SCORE >= 70: name the orchestration pattern — e.g. "Zapier multi-step Zap: trigger on [event] → Claude drafts [output] → routes to [destination]" or "n8n workflow: [step1] → [step2] → [step3]". If < 70: "Human oversight required — AI assists [specific subtask] only."]

SCORING RULES:
- Vary scores meaningfully — no clustering around 75. High complexity = lower repeatability. PII = lower error tolerance.
- COMPOSITE = SCORE_REPEATABILITY*0.3 + SCORE_DATA*0.3 + SCORE_ERROR*0.2 + SCORE_INTEGRATION*0.2

AGENTIFICATION PHASES:
- Phase 1 (score < 55 OR risk=warning): AI drafts, human reviews every output before action
- Phase 2 (score 55-79 OR risk=caution): AI executes, human reviews exceptions only  
- Phase 3 (score >= 80 AND risk=safe): Full agent delegation — AI acts autonomously

ORCHESTRATION RULES (F13):
- Score >= 70: Describe a real multi-step automation pipeline using n8n, Zapier, Make.com, or custom agent
- Score < 70: Describe the human-in-loop subtask AI can assist with
- Be specific: name triggers, data transformations, output destinations"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=700,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._parse_response(message.content[0].text)
        except Exception as e:
            print(f"AI analysis error: {e}")
            return self._defaults()

    def _parse_response(self, text: str) -> Dict:
        result = {}
        for line in text.strip().split('\n'):
            line = line.strip()
            if ':' not in line:
                continue
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip()
            if key == 'SCORE_REPEATABILITY':
                result['score_repeatability'] = self._float(val)
            elif key == 'SCORE_DATA':
                result['score_data_availability'] = self._float(val)
            elif key == 'SCORE_ERROR':
                result['score_error_tolerance'] = self._float(val)
            elif key == 'SCORE_INTEGRATION':
                result['score_integration'] = self._float(val)
            elif key == 'COMPOSITE_SCORE':
                result['ai_readiness_score'] = self._float(val)
            elif key == 'TIME_SAVED':
                result['time_saved_percentage'] = self._float(val)
            elif key == 'DIFFICULTY':
                d = val.lower()
                result['difficulty'] = d if d in ['easy', 'medium', 'hard'] else 'medium'
            elif key == 'RISK_LEVEL':
                r = val.lower()
                result['risk_level'] = r if r in ['safe', 'caution', 'warning'] else 'safe'
            elif key == 'RISK_FLAG':
                result['risk_flag'] = val
            elif key == 'RECOMMENDATION':
                result['recommendation'] = val
            elif key == 'AGENT_PHASE':
                result['agent_phase'] = self._int(val)
            elif key == 'AGENT_LABEL':
                result['agent_label'] = val
            elif key == 'AGENT_MILESTONE':
                result['agent_milestone'] = val
            elif key == 'ORCHESTRATION':
                result['orchestration'] = val

        if 'ai_readiness_score' not in result:
            subs = [
                result.get('score_repeatability', 50) * 0.3,
                result.get('score_data_availability', 50) * 0.3,
                result.get('score_error_tolerance', 50) * 0.2,
                result.get('score_integration', 50) * 0.2,
            ]
            result['ai_readiness_score'] = round(sum(subs), 1)

        for k, v in self._defaults().items():
            result.setdefault(k, v)
        return result

    def _float(self, val: str) -> float:
        try:
            return float(val.split()[0])
        except:
            return 50.0

    def _int(self, val: str) -> int:
        try:
            return int(val.split()[0])
        except:
            return 1

    def _defaults(self) -> Dict:
        return {
            'ai_readiness_score': 50.0,
            'score_repeatability': None,
            'score_data_availability': None,
            'score_error_tolerance': None,
            'score_integration': None,
            'time_saved_percentage': 25.0,
            'difficulty': 'medium',
            'risk_level': 'safe',
            'risk_flag': '✅ Safe to automate fully.',
            'recommendation': 'Review task manually for automation opportunities.',
            'agent_phase': 1,
            'agent_label': 'Phase 1: Human-in-Loop AI Draft',
            'agent_milestone': 'Pilot AI drafts on 20% of volume; measure error rate before scaling.',
            'orchestration': 'Human oversight required — AI assists with drafting only.',
        }

    def calculate_roi(self, tasks_analysis: List[Dict], hourly_rate: float) -> Dict:
        total_score = 0
        total_hours_saved = 0

        for analysis in tasks_analysis:
            total_score += analysis['ai_readiness_score']
            task = analysis['task']
            time_per_task = task.get('time_per_task', 0) / 60
            time_saved_pct = analysis.get('time_saved_percentage', 0) / 100
            freq = task.get('frequency', 'weekly')
            yearly = 250 if freq == 'daily' else 52 if freq == 'weekly' else 12
            hours_saved = time_per_task * time_saved_pct * yearly
            total_hours_saved += hours_saved
            analysis['estimated_hours_saved'] = hours_saved

        n = len(tasks_analysis)
        avg_score = total_score / n if n else 0

        def avg_sub(key):
            vals = [a.get(key) for a in tasks_analysis if a.get(key) is not None]
            return round(sum(vals) / len(vals), 1) if vals else None

        readiness_data = avg_sub('score_data_availability')
        readiness_process = avg_sub('score_repeatability')
        readiness_integration = avg_sub('score_integration')
        readiness_error = avg_sub('score_error_tolerance')

        subs = [x for x in [readiness_data, readiness_process, readiness_integration, readiness_error] if x]
        readiness_overall = round(sum(subs) / len(subs), 1) if subs else None

        return {
            'automation_score': round(avg_score, 2),
            'hours_saved': round(total_hours_saved, 2),
            'annual_savings': round(total_hours_saved * hourly_rate, 2),
            'readiness_score': readiness_overall,
            'readiness_data_quality': readiness_data,
            'readiness_process_docs': readiness_process,
            'readiness_tool_maturity': readiness_integration,
            'readiness_team_skills': readiness_error,
        }
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
        Analyze a single task returning sub-scores, priced recommendations, and risk flag.
        """
        prompt = f"""You are a senior automation consultant. Analyze this specific task with precision.

TASK:
Name: {task['name']}
Description: {task.get('description', task['name'])}
Frequency: {task.get('frequency', 'weekly')}
Time per occurrence: {task.get('time_per_task', 30)} minutes
Category: {task.get('category', 'general')}
Complexity: {task.get('complexity', 'medium')}

OUTPUT EXACTLY this format (no extra text, no markdown, no blank lines between fields):

SCORE_REPEATABILITY: [0-100] (how rule-based and repetitive — 100=pure routine, 0=always unique)
SCORE_DATA: [0-100] (is the data structured, digital, and accessible — 100=clean API/DB, 0=paper/verbal)
SCORE_ERROR: [0-100] (how tolerant of AI mistakes — 100=errors are harmless, 0=errors cause serious harm)
SCORE_INTEGRATION: [0-100] (how easy to connect tools — 100=native integrations exist, 0=custom dev needed)
COMPOSITE_SCORE: [weighted average: repeatability*0.3 + data*0.3 + error*0.2 + integration*0.2]
TIME_SAVED: [0-100]
DIFFICULTY: [easy/medium/hard]
RISK_LEVEL: [safe/caution/warning]
RISK_FLAG: [One sentence. safe="✅ Safe to automate fully — no sensitive data or compliance concerns." caution="⚠️ Review outputs before sending — [specific reason]." warning="🔴 Contains [PII/financial/medical/legal] data — anonymize before passing to external AI."]
RECOMMENDATION: Option 1 — [Specific tool + plan tier + price]: [What it does for this task. Setup time: X hours. Estimated payback: Y weeks.] Option 2 — [Alternative tool + plan + price]: [What it does for this task. Setup time: X hours. Estimated payback: Y weeks.]

SCORING RULES:
- Scores must reflect the SPECIFIC task — vary them meaningfully (don't cluster around 75)
- COMPOSITE_SCORE = (SCORE_REPEATABILITY*0.3 + SCORE_DATA*0.3 + SCORE_ERROR*0.2 + SCORE_INTEGRATION*0.2)
- TIME_SAVED reflects realistic automation percentage for this specific task

RISK RULES:
- warning: task involves PII (names, emails, addresses), financial transactions, medical/health info, legal documents, HR/personnel data
- caution: task involves customer-facing output, brand decisions, numerical accuracy requirements
- safe: purely internal, operational, non-sensitive data

RECOMMENDATION RULES:
- Name the EXACT plan and its REAL current price (e.g. "Zapier Professional ($49/mo)", "Make.com Core ($9/mo)", "Buffer Essentials (free)")
- Give a realistic setup time in hours
- Calculate payback in weeks: (setup_hours * hourly_rate) / (weekly_hours_saved * hourly_rate) — assume €50/hr
- Recommend tools that actually integrate with this task type

EXAMPLES OF GOOD OUTPUT:
For "Send weekly performance report to manager":
SCORE_REPEATABILITY: 92
SCORE_DATA: 85
SCORE_ERROR: 78
SCORE_INTEGRATION: 88
COMPOSITE_SCORE: 87
TIME_SAVED: 85
DIFFICULTY: easy
RISK_LEVEL: safe
RISK_FLAG: ✅ Safe to automate fully — internal reporting with no sensitive personal data.
RECOMMENDATION: Option 1 — Google Looker Studio (free): Connects to Sheets/GA/BigQuery and auto-emails a PDF report on schedule. Setup time: 3 hours. Estimated payback: 1 week. Option 2 — Zapier Professional ($49/mo): Triggers a weekly digest from your data source and emails formatted HTML summary. Setup time: 2 hours. Estimated payback: 2 weeks.

For "Review and approve employee expense claims":
SCORE_REPEATABILITY: 45
SCORE_DATA: 60
SCORE_ERROR: 25
SCORE_INTEGRATION: 55
COMPOSITE_SCORE: 47
TIME_SAVED: 35
DIFFICULTY: medium
RISK_LEVEL: warning
RISK_FLAG: 🔴 Contains financial and employee PII data — use on-premise or privacy-compliant tools only, never pipe raw receipts to public AI.
RECOMMENDATION: Option 1 — Expensify Business ($9/user/mo): OCR scans receipts, auto-categorizes, flags policy violations, and routes for human approval only on exceptions. Setup time: 4 hours. Estimated payback: 3 weeks. Option 2 — SAP Concur Essentials (from $8/user/mo): Enterprise expense automation with audit trail, approval workflows, and ERP sync — human reviews flagged items only. Setup time: 8 hours. Estimated payback: 5 weeks.

Now analyze the task above:"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            return self._parse_response(message.content[0].text)
        except Exception as e:
            print(f"AI analysis error: {e}")
            return self._defaults()

    def _parse_response(self, text: str) -> Dict:
        result = {}
        for line in text.strip().split('\n'):
            line = line.strip()
            if ':' not in line:
                continue
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip()
            if key == 'SCORE_REPEATABILITY':
                result['score_repeatability'] = self._float(val)
            elif key == 'SCORE_DATA':
                result['score_data_availability'] = self._float(val)
            elif key == 'SCORE_ERROR':
                result['score_error_tolerance'] = self._float(val)
            elif key == 'SCORE_INTEGRATION':
                result['score_integration'] = self._float(val)
            elif key == 'COMPOSITE_SCORE':
                result['ai_readiness_score'] = self._float(val)
            elif key == 'TIME_SAVED':
                result['time_saved_percentage'] = self._float(val)
            elif key == 'DIFFICULTY':
                d = val.lower()
                result['difficulty'] = d if d in ['easy', 'medium', 'hard'] else 'medium'
            elif key == 'RISK_LEVEL':
                r = val.lower()
                result['risk_level'] = r if r in ['safe', 'caution', 'warning'] else 'safe'
            elif key == 'RISK_FLAG':
                result['risk_flag'] = val
            elif key == 'RECOMMENDATION':
                result['recommendation'] = val

        # Fallback composite from sub-scores if missing
        if 'ai_readiness_score' not in result:
            subs = [
                result.get('score_repeatability', 50) * 0.3,
                result.get('score_data_availability', 50) * 0.3,
                result.get('score_error_tolerance', 50) * 0.2,
                result.get('score_integration', 50) * 0.2,
            ]
            result['ai_readiness_score'] = round(sum(subs), 1)

        # Fill any missing fields
        for k, v in self._defaults().items():
            result.setdefault(k, v)
        return result

    def _float(self, val: str) -> float:
        try:
            return float(val.split()[0])
        except:
            return 50.0

    def _defaults(self) -> Dict:
        return {
            'ai_readiness_score': 50.0,
            'score_repeatability': None,
            'score_data_availability': None,
            'score_error_tolerance': None,
            'score_integration': None,
            'time_saved_percentage': 25.0,
            'difficulty': 'medium',
            'risk_level': 'safe',
            'risk_flag': '✅ Safe to automate fully.',
            'recommendation': 'Review task manually for automation opportunities.',
        }

    def calculate_roi(self, tasks_analysis: List[Dict], hourly_rate: float) -> Dict:
        total_score = 0
        total_hours_saved = 0

        for analysis in tasks_analysis:
            total_score += analysis['ai_readiness_score']
            task = analysis['task']
            time_per_task = task.get('time_per_task', 0) / 60
            time_saved_pct = analysis.get('time_saved_percentage', 0) / 100
            freq = task.get('frequency', 'weekly')
            yearly = 250 if freq == 'daily' else 52 if freq == 'weekly' else 12
            hours_saved = time_per_task * time_saved_pct * yearly
            total_hours_saved += hours_saved
            analysis['estimated_hours_saved'] = hours_saved

        n = len(tasks_analysis)
        avg_score = total_score / n if n else 0

        # F4 — derive company AI readiness from sub-score averages
        def avg_sub(key):
            vals = [a.get(key) for a in tasks_analysis if a.get(key) is not None]
            return round(sum(vals) / len(vals), 1) if vals else None

        readiness_data = avg_sub('score_data_availability')
        readiness_process = avg_sub('score_repeatability')
        readiness_integration = avg_sub('score_integration')
        readiness_error = avg_sub('score_error_tolerance')

        # Tool maturity = integration ease, team skills = error tolerance proxy
        subs = [x for x in [readiness_data, readiness_process, readiness_integration, readiness_error] if x]
        readiness_overall = round(sum(subs) / len(subs), 1) if subs else None

        return {
            'automation_score': round(avg_score, 2),
            'hours_saved': round(total_hours_saved, 2),
            'annual_savings': round(total_hours_saved * hourly_rate, 2),
            'readiness_score': readiness_overall,
            'readiness_data_quality': readiness_data,
            'readiness_process_docs': readiness_process,
            'readiness_tool_maturity': readiness_integration,
            'readiness_team_skills': readiness_error,
        }
