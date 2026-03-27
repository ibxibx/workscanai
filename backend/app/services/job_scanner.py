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
    # STEP 3 — n8n WORKFLOW GENERATION (template-based, always importable)
    # ------------------------------------------------------------------

    # Real n8n node templates keyed by task category.
    # Each entry is a list of nodes (excluding the trigger) that implement
    # a practical automation for that category.  Position x offsets are
    # relative — the assembler will re-space them across the canvas.
    _CATEGORY_TEMPLATES: Dict[str, List[Dict]] = {
        "reporting": [
            {
                "id": "tpl_sheets_read",
                "name": "Read Report Data",
                "type": "n8n-nodes-base.googleSheets",
                "typeVersion": 4,
                "position": [0, 0],
                "parameters": {
                    "operation": "getAll",
                    "documentId": {"__rl": True, "mode": "id", "value": "YOUR_SPREADSHEET_ID"},
                    "sheetName": {"__rl": True, "mode": "name", "value": "Sheet1"},
                    "options": {},
                },
            },
            {
                "id": "tpl_set_summary",
                "name": "Build Report Summary",
                "type": "n8n-nodes-base.set",
                "typeVersion": 3,
                "position": [0, 0],
                "parameters": {
                    "mode": "manual",
                    "assignments": {
                        "assignments": [
                            {"id": "field_report", "name": "reportText", "type": "string",
                             "value": "=Weekly report generated on {{ $now.format('yyyy-MM-dd') }}. Total records: {{ $json.length }}"},
                        ]
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_gmail_report",
                "name": "Email Report",
                "type": "n8n-nodes-base.gmail",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "operation": "send",
                    "sendTo": "YOUR_EMAIL@example.com",
                    "subject": "=Weekly Report — {{ $now.format('yyyy-MM-dd') }}",
                    "message": "={{ $('Build Report Summary').item.json.reportText }}",
                    "options": {},
                },
            },
        ],
        "data_entry": [
            {
                "id": "tpl_gmail_trigger_de",
                "name": "Watch Inbox for Submissions",
                "type": "n8n-nodes-base.gmailTrigger",
                "typeVersion": 1,
                "position": [0, 0],
                "parameters": {
                    "pollTimes": {"item": [{"mode": "everyHour"}]},
                    "filters": {"labelIds": ["INBOX"], "readStatus": "unread"},
                    "options": {},
                },
            },
            {
                "id": "tpl_sheets_append",
                "name": "Append Row to Sheet",
                "type": "n8n-nodes-base.googleSheets",
                "typeVersion": 4,
                "position": [0, 0],
                "parameters": {
                    "operation": "append",
                    "documentId": {"__rl": True, "mode": "id", "value": "YOUR_SPREADSHEET_ID"},
                    "sheetName": {"__rl": True, "mode": "name", "value": "Submissions"},
                    "columns": {
                        "mappingMode": "autoMapInputData",
                        "value": {},
                        "matchingColumns": [],
                        "schema": [],
                    },
                    "options": {"cellFormat": "USER_ENTERED"},
                },
            },
            {
                "id": "tpl_slack_confirm_de",
                "name": "Notify Data Logged",
                "type": "n8n-nodes-base.slack",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "resource": "message",
                    "operation": "post",
                    "channel": {"__rl": True, "mode": "name", "value": "#data-ops"},
                    "text": "=New entry logged from {{ $('Watch Inbox for Submissions').item.json.from.value[0].address }}",
                    "otherOptions": {},
                },
            },
        ],
        "scheduling": [
            {
                "id": "tpl_sheets_read_sched",
                "name": "Read Schedule Sheet",
                "type": "n8n-nodes-base.googleSheets",
                "typeVersion": 4,
                "position": [0, 0],
                "parameters": {
                    "operation": "getAll",
                    "documentId": {"__rl": True, "mode": "id", "value": "YOUR_SPREADSHEET_ID"},
                    "sheetName": {"__rl": True, "mode": "name", "value": "Schedule"},
                    "options": {},
                },
            },
            {
                "id": "tpl_if_today",
                "name": "Check If Due Today",
                "type": "n8n-nodes-base.if",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "cond_date",
                                "leftValue": "={{ $json.dueDate }}",
                                "rightValue": "={{ $now.format('yyyy-MM-dd') }}",
                                "operator": {"type": "string", "operation": "equals"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_gcal_event",
                "name": "Create Calendar Event",
                "type": "n8n-nodes-base.googleCalendar",
                "typeVersion": 1,
                "position": [0, 0],
                "parameters": {
                    "operation": "create",
                    "calendar": {"__rl": True, "mode": "id", "value": "primary"},
                    "start": "={{ $json.startTime }}",
                    "end": "={{ $json.endTime }}",
                    "additionalFields": {
                        "summary": "={{ $json.title }}",
                        "description": "Auto-scheduled via WorkScanAI n8n workflow",
                    },
                },
            },
        ],
        "communication": [
            {
                "id": "tpl_gmail_watch",
                "name": "Monitor Inbox",
                "type": "n8n-nodes-base.gmailTrigger",
                "typeVersion": 1,
                "position": [0, 0],
                "parameters": {
                    "pollTimes": {"item": [{"mode": "everyHour"}]},
                    "filters": {"labelIds": ["INBOX"], "readStatus": "unread"},
                    "options": {},
                },
            },
            {
                "id": "tpl_set_classify",
                "name": "Classify Message",
                "type": "n8n-nodes-base.set",
                "typeVersion": 3,
                "position": [0, 0],
                "parameters": {
                    "mode": "manual",
                    "assignments": {
                        "assignments": [
                            {"id": "field_from", "name": "sender", "type": "string", "value": "={{ $json.from.value[0].address }}"},
                            {"id": "field_subj", "name": "subject", "type": "string", "value": "={{ $json.subject }}"},
                            {"id": "field_body", "name": "snippet", "type": "string", "value": "={{ $json.snippet }}"},
                        ]
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_slack_comm",
                "name": "Forward to Slack Channel",
                "type": "n8n-nodes-base.slack",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "resource": "message",
                    "operation": "post",
                    "channel": {"__rl": True, "mode": "name", "value": "#inbox-triage"},
                    "text": "=*New email* from {{ $('Classify Message').item.json.sender }}\n*Subject:* {{ $('Classify Message').item.json.subject }}\n{{ $('Classify Message').item.json.snippet }}",
                    "otherOptions": {},
                },
            },
        ],
        "analysis": [
            {
                "id": "tpl_sheets_read_an",
                "name": "Fetch Data for Analysis",
                "type": "n8n-nodes-base.googleSheets",
                "typeVersion": 4,
                "position": [0, 0],
                "parameters": {
                    "operation": "getAll",
                    "documentId": {"__rl": True, "mode": "id", "value": "YOUR_SPREADSHEET_ID"},
                    "sheetName": {"__rl": True, "mode": "name", "value": "Data"},
                    "options": {},
                },
            },
            {
                "id": "tpl_set_metrics",
                "name": "Compute Key Metrics",
                "type": "n8n-nodes-base.set",
                "typeVersion": 3,
                "position": [0, 0],
                "parameters": {
                    "mode": "manual",
                    "assignments": {
                        "assignments": [
                            {"id": "field_count", "name": "totalRecords", "type": "number", "value": "={{ $input.all().length }}"},
                            {"id": "field_ts", "name": "analysisDate", "type": "string", "value": "={{ $now.format('yyyy-MM-dd') }}"},
                        ]
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_slack_analysis",
                "name": "Post Analysis Summary",
                "type": "n8n-nodes-base.slack",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "resource": "message",
                    "operation": "post",
                    "channel": {"__rl": True, "mode": "name", "value": "#analytics"},
                    "text": "=*Analysis complete* ({{ $('Compute Key Metrics').item.json.analysisDate }})\nRecords processed: {{ $('Compute Key Metrics').item.json.totalRecords }}",
                    "otherOptions": {},
                },
            },
        ],
        "research": [
            {
                "id": "tpl_rss",
                "name": "Fetch RSS / Web Feed",
                "type": "n8n-nodes-base.rssFeedRead",
                "typeVersion": 1,
                "position": [0, 0],
                "parameters": {
                    "url": "https://news.google.com/rss/search?q=YOUR+TOPIC&hl=en",
                },
            },
            {
                "id": "tpl_set_research",
                "name": "Extract Article Data",
                "type": "n8n-nodes-base.set",
                "typeVersion": 3,
                "position": [0, 0],
                "parameters": {
                    "mode": "manual",
                    "assignments": {
                        "assignments": [
                            {"id": "field_title", "name": "title", "type": "string", "value": "={{ $json.title }}"},
                            {"id": "field_link", "name": "link", "type": "string", "value": "={{ $json.link }}"},
                            {"id": "field_date", "name": "publishedDate", "type": "string", "value": "={{ $json.pubDate }}"},
                        ]
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_sheets_research",
                "name": "Log Research Findings",
                "type": "n8n-nodes-base.googleSheets",
                "typeVersion": 4,
                "position": [0, 0],
                "parameters": {
                    "operation": "append",
                    "documentId": {"__rl": True, "mode": "id", "value": "YOUR_SPREADSHEET_ID"},
                    "sheetName": {"__rl": True, "mode": "name", "value": "Research"},
                    "columns": {
                        "mappingMode": "autoMapInputData",
                        "value": {},
                        "matchingColumns": [],
                        "schema": [],
                    },
                    "options": {"cellFormat": "USER_ENTERED"},
                },
            },
        ],
        "management": [
            {
                "id": "tpl_jira_fetch",
                "name": "Fetch Open Issues",
                "type": "n8n-nodes-base.jira",
                "typeVersion": 1,
                "position": [0, 0],
                "parameters": {
                    "operation": "getAll",
                    "resource": "issue",
                    "jql": "project = YOUR_PROJECT AND status != Done ORDER BY created DESC",
                    "limit": 50,
                },
            },
            {
                "id": "tpl_if_overdue",
                "name": "Flag Overdue Items",
                "type": "n8n-nodes-base.if",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "cond_overdue",
                                "leftValue": "={{ $json.fields.duedate }}",
                                "rightValue": "={{ $now.format('yyyy-MM-dd') }}",
                                "operator": {"type": "string", "operation": "smallerEqualThan"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "options": {},
                },
            },
            {
                "id": "tpl_slack_mgmt",
                "name": "Alert Team on Overdue",
                "type": "n8n-nodes-base.slack",
                "typeVersion": 2,
                "position": [0, 0],
                "parameters": {
                    "resource": "message",
                    "operation": "post",
                    "channel": {"__rl": True, "mode": "name", "value": "#project-alerts"},
                    "text": "=:warning: Overdue task: *{{ $json.fields.summary }}* (due {{ $json.fields.duedate }})\nhttps://YOUR_JIRA.atlassian.net/browse/{{ $json.key }}",
                    "otherOptions": {},
                },
            },
        ],
    }

    # Trigger that fires at 9 AM every weekday — suitable for most office workflows
    _SCHEDULE_TRIGGER = {
        "id": "node_trigger",
        "name": "Schedule Trigger",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1,
        "position": [240, 300],
        "parameters": {
            "rule": {
                "interval": [
                    {
                        "field": "cronExpression",
                        "expression": "0 9 * * 1-5",
                    }
                ]
            }
        },
    }

    def _generate_n8n_workflow(self, job_title: str, tasks: List[Dict]) -> Dict:
        """
        Build a real, importable n8n workflow by assembling category-matched
        templates.  No LLM call — deterministic and always valid JSON.
        """
        import copy, uuid

        # Priority order: prefer the most automatable categories first
        priority = ["data_entry", "reporting", "scheduling", "analysis", "research", "communication", "management"]
        seen_categories: set = set()
        selected_tasks = []
        for cat in priority:
            for t in tasks:
                if t.get("category") == cat and cat not in seen_categories:
                    selected_tasks.append(t)
                    seen_categories.add(cat)
                    break
            if len(selected_tasks) == 3:
                break
        # Fill up to 3 with whatever remains
        for t in tasks:
            if len(selected_tasks) == 3:
                break
            if t not in selected_tasks:
                selected_tasks.append(t)

        all_nodes = [copy.deepcopy(self._SCHEDULE_TRIGGER)]
        connections: Dict = {}
        x = 460  # starting x for first task node
        y_step = 200  # vertical spacing between task chains
        prev_trigger_output = "Schedule Trigger"

        for task_idx, task in enumerate(selected_tasks):
            category = task.get("category", "reporting")
            template_nodes = copy.deepcopy(
                self._CATEGORY_TEMPLATES.get(category, self._CATEGORY_TEMPLATES["reporting"])
            )

            # Assign unique IDs and positions, rename first node after the task
            chain_first_name = None
            for node_idx, node in enumerate(template_nodes):
                unique_id = f"node_{task_idx}_{node_idx}_{uuid.uuid4().hex[:6]}"
                node["id"] = unique_id
                node["position"] = [x + node_idx * 220, 300 + task_idx * y_step]

                # Rename the first node of each chain to the actual task name (truncated)
                if node_idx == 0:
                    node["name"] = task["name"][:50]
                    chain_first_name = node["name"]

                all_nodes.append(node)

            # Wire trigger → first node of this chain
            if chain_first_name:
                connections[prev_trigger_output] = {
                    "main": [[{"node": chain_first_name, "type": "main", "index": 0}]]
                }

            # Wire nodes within the chain sequentially
            for node_idx in range(len(template_nodes) - 1):
                src_name = template_nodes[node_idx]["name"]
                dst_name = template_nodes[node_idx + 1]["name"]
                connections[src_name] = {
                    "main": [[{"node": dst_name, "type": "main", "index": 0}]]
                }

            # If-node true branch also wires forward (for scheduling/management)
            # already covered by sequential wiring above

            x += 50  # slight x drift per chain keeps canvas readable

        workflow_id = f"workscanai-{uuid.uuid4().hex[:8]}"
        return {
            "name": f"{job_title} — WorkScanAI Automation",
            "nodes": all_nodes,
            "connections": connections,
            "active": False,
            "settings": {"executionOrder": "v1"},
            "id": workflow_id,
            "meta": {
                "generatedBy": "WorkScanAI",
                "templateVersion": "2.0",
                "note": "Replace placeholder values (YOUR_SPREADSHEET_ID, YOUR_EMAIL@example.com, YOUR_PROJECT, etc.) with your actual credentials before activating.",
            },
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
