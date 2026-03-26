"""
Job Scanner service — researches a job title via Tavily web search,
extracts a structured task list, then generates an n8n workflow JSON.
"""
import os
import json
import re
from anthropic import Anthropic
from typing import List, Dict, Optional


class JobScanner:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=api_key)
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")

    # ------------------------------------------------------------------
    # PUBLIC API
    # ------------------------------------------------------------------

    def scan_job(
        self,
        job_title: str,
        industry: Optional[str] = None,
        analysis_context: str = "individual",
    ) -> Dict:
        """
        Full pipeline:
        1. Search web for job tasks (Tavily)
        2. Extract structured task list (Claude)
        3. Return tasks + n8n workflow JSON
        """
        # Step 1: Research job tasks via web search
        raw_search = self._search_job_tasks(job_title, industry)

        # Step 2: Extract structured tasks from search results
        tasks = self._extract_tasks(job_title, raw_search, analysis_context)

        # Step 3: Generate n8n workflow JSON for top automatable tasks
        n8n_workflow = self._generate_n8n_workflow(job_title, tasks)

        return {
            "job_title": job_title,
            "industry": industry,
            "tasks": tasks,
            "n8n_workflow": n8n_workflow,
            "search_used": self.tavily_api_key is not None,
        }


    # ------------------------------------------------------------------
    # STEP 1 — WEB SEARCH
    # ------------------------------------------------------------------

    def _search_job_tasks(self, job_title: str, industry: Optional[str]) -> str:
        """Search for real-world tasks for this job title using Tavily."""
        if not self.tavily_api_key:
            # Fallback: let Claude use its training knowledge only
            return f"No web search available. Use training knowledge for: {job_title}"

        try:
            import httpx
            query = f"{job_title} daily tasks responsibilities workflow"
            if industry:
                query += f" {industry} industry"

            response = httpx.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": self.tavily_api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5,
                    "include_answer": True,
                },
                timeout=15.0,
            )
            data = response.json()

            # Combine answer + top result snippets
            parts = []
            if data.get("answer"):
                parts.append(data["answer"])
            for r in data.get("results", [])[:4]:
                if r.get("content"):
                    parts.append(r["content"][:600])

            return "\n\n".join(parts) if parts else f"No results for {job_title}"

        except Exception as e:
            print(f"Tavily search error: {e}")
            return f"Search unavailable. Use training knowledge for: {job_title}"


    # ------------------------------------------------------------------
    # STEP 2 — TASK EXTRACTION
    # ------------------------------------------------------------------

    def _extract_tasks(
        self, job_title: str, search_content: str, analysis_context: str
    ) -> List[Dict]:
        """Ask Claude to extract 10-12 structured tasks from search results."""

        prompt = (
            f"You are an expert workflow analyst. Based on the research below about "
            f"the role '{job_title}', extract exactly 6 specific, concrete tasks "
            f"that this role performs regularly.\n\n"
            f"RESEARCH:\n{search_content}\n\n"
            f"For each task output EXACTLY this format (repeat 6 times):\n\n"
            f"---TASK---\n"
            f"NAME: [short task name, max 60 chars]\n"
            f"DESCRIPTION: [one sentence describing the task concretely]\n"
            f"FREQUENCY: [daily/weekly/monthly]\n"
            f"TIME_MINUTES: [realistic time in minutes per occurrence]\n"
            f"CATEGORY: [data_entry/analysis/communication/reporting/scheduling/research/management]\n"
            f"COMPLEXITY: [low/medium/high]\n\n"
            f"Rules: be specific and concrete (not generic). "
            f"Mix frequencies — not everything is daily. "
            f"Time should be realistic for the role seniority. "
            f"Include both high and low automation potential tasks."
        )

        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                timeout=30.0,
            )
            raw = message.content[0].text
            return self._parse_tasks(raw)
        except Exception as e:
            print(f"Task extraction error: {e}")
            return self._fallback_tasks(job_title)

    def _parse_tasks(self, text: str) -> List[Dict]:
        """Parse Claude's task blocks into structured dicts."""
        blocks = re.split(r'---TASK---', text)
        tasks = []
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            task = {}
            for line in block.split('\n'):
                line = line.strip()
                if ':' not in line:
                    continue
                key, _, val = line.partition(':')
                key = key.strip()
                val = val.strip()
                if key == 'NAME':
                    task['name'] = val
                elif key == 'DESCRIPTION':
                    task['description'] = val
                elif key == 'FREQUENCY':
                    f = val.lower()
                    task['frequency'] = f if f in ['daily', 'weekly', 'monthly'] else 'weekly'
                elif key == 'TIME_MINUTES':
                    try:
                        task['time_per_task'] = int(val.split()[0])
                    except Exception:
                        task['time_per_task'] = 30
                elif key == 'CATEGORY':
                    task['category'] = val.lower()
                elif key == 'COMPLEXITY':
                    c = val.lower()
                    task['complexity'] = c if c in ['low', 'medium', 'high'] else 'medium'
            if task.get('name'):
                tasks.append(task)
        return tasks[:6]


    # ------------------------------------------------------------------
    # STEP 3 — n8n WORKFLOW GENERATION
    # ------------------------------------------------------------------

    def _generate_n8n_workflow(self, job_title: str, tasks: List[Dict]) -> Dict:
        """Generate a valid importable n8n workflow JSON for the top automatable tasks."""

        # Pick top 3 most automatable tasks (data_entry, reporting, scheduling)
        priority_categories = ['data_entry', 'reporting', 'scheduling', 'analysis']
        top_tasks = [t for t in tasks if t.get('category') in priority_categories][:3]
        if not top_tasks:
            top_tasks = tasks[:3]

        task_desc = "\n".join(
            f"- {t['name']}: {t.get('description', '')} ({t.get('frequency','weekly')})"
            for t in top_tasks
        )

        prompt = (
            f"Generate a valid n8n workflow JSON that automates these tasks for a {job_title}:\n"
            f"{task_desc}\n\n"
            f"Output ONLY valid JSON. No explanation, no markdown, no backticks.\n"
            f"The JSON must follow n8n workflow format with these required top-level keys:\n"
            f"  name, nodes, connections, active, settings, id\n\n"
            f"Use real n8n node types like:\n"
            f"  n8n-nodes-base.scheduleTrigger, n8n-nodes-base.httpRequest,\n"
            f"  n8n-nodes-base.gmail, n8n-nodes-base.googleSheets,\n"
            f"  n8n-nodes-base.slack, n8n-nodes-base.set, n8n-nodes-base.if\n\n"
            f"Include 4-6 nodes. Each node needs: id, name, type, typeVersion, position, parameters.\n"
            f"connections maps node names to their outputs.\n"
            f"Make it practical and directly relevant to the tasks above."
        )

        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}],
                timeout=30.0,
            )
            raw = message.content[0].text.strip()
            # Strip any accidental markdown fences
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
            return json.loads(raw)
        except Exception as e:
            print(f"n8n generation error: {e}")
            return self._fallback_n8n_workflow(job_title, top_tasks)

    def _fallback_n8n_workflow(self, job_title: str, tasks: List[Dict]) -> Dict:
        """Minimal valid n8n workflow as fallback."""
        return {
            "name": f"{job_title} Automation Workflow",
            "nodes": [
                {
                    "id": "node_trigger",
                    "name": "Schedule Trigger",
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1,
                    "position": [240, 300],
                    "parameters": {"rule": {"interval": [{"field": "hours", "hoursInterval": 24}]}},
                },
                {
                    "id": "node_notify",
                    "name": "Send Notification",
                    "type": "n8n-nodes-base.slack",
                    "typeVersion": 1,
                    "position": [460, 300],
                    "parameters": {
                        "channel": "#automation",
                        "text": f"Daily automation run for {job_title} tasks completed.",
                    },
                },
            ],
            "connections": {"Schedule Trigger": {"main": [[{"node": "Send Notification", "type": "main", "index": 0}]]}},
            "active": False,
            "settings": {},
            "id": "workscanai-generated",
        }

    def _fallback_tasks(self, job_title: str) -> List[Dict]:
        """Generic fallback tasks if AI call fails."""
        return [
            {"name": "Review and respond to emails", "description": "Process inbox and draft replies", "frequency": "daily", "time_per_task": 45, "category": "communication", "complexity": "medium"},
            {"name": "Update project status report", "description": "Compile weekly progress notes into report", "frequency": "weekly", "time_per_task": 60, "category": "reporting", "complexity": "low"},
            {"name": "Schedule team meetings", "description": "Coordinate calendars and send invites", "frequency": "weekly", "time_per_task": 20, "category": "scheduling", "complexity": "low"},
            {"name": "Data entry and record keeping", "description": "Enter and maintain records in systems", "frequency": "daily", "time_per_task": 30, "category": "data_entry", "complexity": "low"},
            {"name": "Research and information gathering", "description": "Collect relevant data and summarise findings", "frequency": "weekly", "time_per_task": 90, "category": "research", "complexity": "medium"},
        ]
