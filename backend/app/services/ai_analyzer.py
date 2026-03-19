"""AI service for workflow analysis - BATCHED: all tasks in ONE Claude call.
Context-aware for Individual / Team / Company.
"""
import os
import json
import re
from anthropic import Anthropic
from typing import List, Dict


class AIAnalyzer:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=api_key)

    # ------------------------------------------------------------------
    # PUBLIC API
    # ------------------------------------------------------------------

    def analyze_tasks_batch(self, tasks: List[Dict]) -> List[Dict]:
        """Analyze ALL tasks in a single Claude API call."""
        if not tasks:
            return []

        context = tasks[0].get('analysis_context', 'individual')
        industry = tasks[0].get('industry', '') or 'General'

        context_instruction = {
            'individual': "CONTEXT: Personal career analysis - frame as career/survival moves.",
            'team':       "CONTEXT: Team/startup analysis - frame as team productivity & velocity.",
            'company':    "CONTEXT: Company/department analysis - frame as strategic ROI decisions.",
        }.get(context, '')

        task_lines = []
        for i, t in enumerate(tasks, 1):
            task_lines.append(
                f"TASK_{i}: {t['name']} | {t.get('description','')} | "
                f"{t.get('frequency','weekly')} | {t.get('time_per_task',30)}min | "
                f"{t.get('category','general')} | {t.get('complexity','medium')} | "
                f"Industry: {industry}"
            )
        tasks_block = "\n".join(task_lines)
        n = len(tasks)

        prompt = (
            f"You are an AI automation analyst. Analyze ALL {n} tasks below in ONE response.\n"
            f"{context_instruction}\n\n"
            f"{tasks_block}\n\n"
            f"For EACH task output a block using EXACTLY this format (repeat {n} times):\n\n"
            f"---TASK_[N]---\n"
            f"SCORE_REPEATABILITY: [0-100]\n"
            f"SCORE_DATA: [0-100]\n"
            f"SCORE_ERROR: [0-100]\n"
            f"SCORE_INTEGRATION: [0-100]\n"
            f"COMPOSITE_SCORE: [R*0.3+D*0.3+E*0.2+I*0.2]\n"
            f"TIME_SAVED: [0-100]\n"
            f"DIFFICULTY: [easy/medium/hard]\n"
            f"RISK_LEVEL: [safe/caution/warning]\n"
            f"RISK_FLAG: [one sentence]\n"
            f"RECOMMENDATION: Option 1 - [Tool+price]: [what it does, setup Xh, payback Yw.] Option 2 - [Tool+price]: [what it does.]\n"
            f"AGENT_PHASE: [1/2/3]\n"
            f"AGENT_LABEL: [Phase 1: Human-in-Loop / Phase 2: Supervised / Phase 3: Full Delegation]\n"
            f"AGENT_MILESTONE: [one concrete milestone]\n"
            f"ORCHESTRATION: [pipeline if score>=70, else human-assist]\n"
            f"COUNTDOWN_WINDOW: [now/12-24/24-48/48+]\n"
            f"HUMAN_EDGE_SCORE: [0-100]\n"
            f'PIVOT_SKILLS: ["skill1","skill2","skill3","skill4","skill5","skill6"]\n'
            f'PIVOT_ROLES: [{{"role":"X","risk":"low","pivot_distance":"easy","automation_score_pct":38}},{{"role":"Y","risk":"low","pivot_distance":"medium","automation_score_pct":42}}]\n\n'
            f"Rules: vary scores meaningfully. COMPOSITE=R*0.3+D*0.3+E*0.2+I*0.2. "
            f"warning only for PII/financial/legal/medical. now=score>=75 AND tools exist today."
        )

        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=min(500 * n + 500, 8000),
                messages=[{"role": "user", "content": prompt}]
            )
            raw = message.content[0].text
            return self._parse_batch_response(raw, n)
        except Exception as e:
            print(f"Batch AI analysis error: {e}")
            return [self._defaults() for _ in tasks]

    def analyze_task(self, task: Dict) -> Dict:
        """Single-task shim - delegates to batch."""
        results = self.analyze_tasks_batch([task])
        return results[0] if results else self._defaults()


    # ------------------------------------------------------------------
    # PARSING
    # ------------------------------------------------------------------

    def _parse_batch_response(self, text: str, expected: int) -> List[Dict]:
        """Split Claude response into per-task blocks and parse each."""
        blocks = re.split(r'---TASK_\d+---', text)
        blocks = [b.strip() for b in blocks if b.strip()]
        results = []
        for i in range(expected):
            block = blocks[i] if i < len(blocks) else ''
            results.append(self._parse_block(block))
        return results

    def _parse_block(self, text: str) -> Dict:
        """Parse a single task result block into a result dict."""
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
                result['difficulty'] = d if d in ['easy','medium','hard'] else 'medium'
            elif key == 'RISK_LEVEL':
                r = val.lower()
                result['risk_level'] = r if r in ['safe','caution','warning'] else 'safe'
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
            elif key == 'COUNTDOWN_WINDOW':
                cw = val.lower().strip()
                result['countdown_window'] = cw if cw in ['now','12-24','24-48','48+'] else '24-48'
            elif key == 'HUMAN_EDGE_SCORE':
                result['human_edge_score'] = self._float(val)
            elif key == 'PIVOT_SKILLS':
                try:
                    parsed = json.loads(val)
                    normalised = [
                        s if isinstance(s, str) else s.get('skill', str(s))
                        for s in parsed
                    ] if isinstance(parsed, list) else []
                    result['pivot_skills'] = json.dumps(normalised)
                except Exception:
                    result['pivot_skills'] = None
            elif key == 'PIVOT_ROLES':
                try:
                    parsed = json.loads(val)
                    result['pivot_roles'] = json.dumps(parsed) if isinstance(parsed, list) else None
                except Exception:
                    result['pivot_roles'] = None

        # Derived fields
        if 'ai_readiness_score' not in result:
            subs = [
                result.get('score_repeatability', 50) * 0.3,
                result.get('score_data_availability', 50) * 0.3,
                result.get('score_error_tolerance', 50) * 0.2,
                result.get('score_integration', 50) * 0.2,
            ]
            result['ai_readiness_score'] = round(sum(subs), 1)

        if 'countdown_window' not in result:
            score = result.get('ai_readiness_score', 50)
            result['countdown_window'] = (
                'now' if score >= 75 else
                '12-24' if score >= 55 else
                '24-48' if score >= 35 else '48+'
            )

        if 'human_edge_score' not in result:
            result['human_edge_score'] = round(100 - result.get('ai_readiness_score', 50) * 0.7, 1)

        for k, v in self._defaults().items():
            result.setdefault(k, v)
        return result


    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _float(self, val: str) -> float:
        try:
            return float(val.split()[0])
        except Exception:
            return 50.0

    def _int(self, val: str) -> int:
        try:
            return int(val.split()[0])
        except Exception:
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
            'risk_flag': 'Safe to automate fully.',
            'recommendation': 'Review task manually for automation opportunities.',
            'agent_phase': 1,
            'agent_label': 'Phase 1: Human-in-Loop AI Draft',
            'agent_milestone': 'Pilot AI drafts on 20% of volume; measure error rate before scaling.',
            'orchestration': 'Human oversight required - AI assists with drafting only.',
            'countdown_window': '24-48',
            'human_edge_score': 50.0,
            'pivot_skills': '["AI prompt engineering","Strategic thinking","Relationship management","Data interpretation","Creative direction","Change management"]',
            'pivot_roles': '[{"role":"AI Operations Manager","risk":"low","pivot_distance":"easy","automation_score_pct":38},{"role":"Strategy Consultant","risk":"low","pivot_distance":"medium","automation_score_pct":42},{"role":"UX Researcher","risk":"low","pivot_distance":"medium","automation_score_pct":35},{"role":"Product Manager","risk":"medium","pivot_distance":"medium","automation_score_pct":52}]',
        }

    # ------------------------------------------------------------------
    # ROI CALCULATION
    # ------------------------------------------------------------------

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
