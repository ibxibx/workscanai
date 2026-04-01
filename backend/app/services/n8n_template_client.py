"""
N8nTemplateClient — fetches real, importable workflow templates from
https://api.n8n.io/templates, curates them per-task using Claude,
and merges them into one importable n8n canvas file.

Architecture (Benedikt's MVP):
  Job -> split tasks -> per-task: search + LLM rank -> fetch real JSONs
  -> merge all into one n8n canvas with sticky-note section headers
  -> user imports one file, sees all workflows laid out by task

Key improvements over v1:
  - Per-task curation: each task gets its own best-matching template
  - Stronger curation prompt: scores by specific task name, penalises
    generic "AI assistant" templates, requires concrete integration nodes
  - Merged canvas: all templates combined into one importable file with
    sticky note headers and vertically offset node groups per task
  - suggested_templates[] returned for UI display cards
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

import httpx
from anthropic import Anthropic

# ---------------------------------------------------------------------------
# Category -> search query mapping (2 queries per category)
# ---------------------------------------------------------------------------
_CATEGORY_QUERIES: Dict[str, List[str]] = {
    "data_entry":    ["data entry google sheets automation", "form submission database automation"],
    "reporting":     ["automated report slack email", "weekly metrics report google sheets"],
    "scheduling":    ["calendar meeting scheduling automation", "automated calendar invite reminder"],
    "communication": ["email triage classification automation", "slack inbox notification automation"],
    "analysis":      ["metrics kpi dashboard automation", "data analysis monitoring alert"],
    "research":      ["web scraping content research automation", "rss news feed aggregation"],
    "management":    ["jira trello task management automation", "project status update slack"],
    "general":       ["business process automation workflow", "productivity automation trigger"],
}

_N8N_TEMPLATE_BASE = "https://api.n8n.io"
_HEADERS = {"User-Agent": "WorkScanAI/2.0 (workscanai.vercel.app)"}
_SEARCH_RESULTS_PER_QUERY = 6
_MAX_CANDIDATES_PER_TASK = 8   # candidates shown to LLM per task
_CANVAS_COL_WIDTH = 900        # horizontal spacing between task groups
_CANVAS_ROW_HEIGHT = 220       # vertical spacing between nodes within a group
_STICKY_NOTE_OFFSET_Y = -180   # sticky note sits above each group


class N8nTemplateClient:
    def __init__(self, anthropic_api_key: str):
        self._claude = Anthropic(api_key=anthropic_api_key)
        self._workflow_cache: Dict[int, Optional[Dict]] = {}

    # ------------------------------------------------------------------
    # PUBLIC ENTRY POINT
    # ------------------------------------------------------------------

    def get_curated_templates(
        self,
        job_title: str,
        tasks: List[Dict],
    ) -> List[Dict]:
        """
        Returns suggested_templates[] for UI display cards.
        Each entry: id, name, description, url, relevance_reason,
                    node_count, nodes_preview, workflow_json, task_name
        """
        suggested: List[Dict] = []
        seen_template_ids: set = set()

        for task in tasks[:6]:  # max 6 tasks to keep latency reasonable
            task_name = task.get("name", "")
            category = task.get("category", "general")

            candidates = self._search_for_task(task_name, category)
            if not candidates:
                continue

            best_id, reason = self._curate_one_task(job_title, task, candidates)
            if best_id is None or best_id in seen_template_ids:
                continue

            wf_json = self._fetch_workflow_json(best_id)
            if wf_json is None:
                continue

            seen_template_ids.add(best_id)
            meta = next((c for c in candidates if c["id"] == best_id), {})
            suggested.append({
                "id": best_id,
                "name": meta.get("name", f"Template {best_id}"),
                "description": meta.get("description", ""),
                "url": f"https://n8n.io/workflows/{best_id}/",
                "relevance_reason": reason,
                "node_count": meta.get("node_count", 0),
                "nodes_preview": meta.get("nodes_preview", []),
                "workflow_json": wf_json,
                "task_name": task_name,
            })

        return suggested

    def build_merged_canvas(
        self,
        job_title: str,
        suggested_templates: List[Dict],
    ) -> Dict:
        """
        Merges all per-task workflow JSONs into one importable n8n canvas.
        Each task's nodes are grouped in a vertical column with a sticky-note
        header. Columns are spaced horizontally so the canvas reads left-to-right.

        Returns a single dict ready to be saved as n8n_workflow_json.
        """
        all_nodes: List[Dict] = []
        all_connections: Dict = {}

        for col_idx, tpl in enumerate(suggested_templates):
            task_name = tpl.get("task_name", tpl.get("name", f"Task {col_idx + 1}"))
            wf = tpl.get("workflow_json", {})
            source_nodes = wf.get("nodes", [])
            source_conns = wf.get("connections", {})
            tpl_name = tpl.get("name", "")

            x_offset = col_idx * _CANVAS_COL_WIDTH
            y_offset = 400  # start below the top sticky

            # --- Sticky note header for this task group ---
            sticky_id = f"wsai_sticky_{col_idx}"
            all_nodes.append({
                "id": sticky_id,
                "name": f"📌 Task {col_idx + 1}: {task_name}",
                "type": "n8n-nodes-base.stickyNote",
                "typeVersion": 1,
                "position": [x_offset, y_offset + _STICKY_NOTE_OFFSET_Y],
                "parameters": {
                    "color": col_idx % 6 + 1,
                    "width": 780,
                    "height": 140,
                    "content": (
                        f"## Task {col_idx + 1}: {task_name}\n"
                        f"**Template:** {tpl_name}\n"
                        f"**Relevance:** {tpl.get('relevance_reason', '')}\n"
                        f"[View on n8n.io]({tpl.get('url', '')})"
                    ),
                },
            })

            # --- Re-position and rename each node in this group ---
            node_id_map: Dict[str, str] = {}
            for row_idx, node in enumerate(source_nodes):
                old_id = node.get("id", f"node_{col_idx}_{row_idx}")
                new_id = f"wsai_{col_idx}_{row_idx}_{old_id[:8]}"
                node_id_map[old_id] = new_id

                orig_pos = node.get("position", [0, 0])
                new_node = dict(node)
                new_node["id"] = new_id
                new_node["position"] = [
                    x_offset + (orig_pos[0] if orig_pos[0] < 600 else orig_pos[0] % 600),
                    y_offset + row_idx * _CANVAS_ROW_HEIGHT,
                ]
                all_nodes.append(new_node)

            # --- Remap connections to new node IDs ---
            for src_name, conn_data in source_conns.items():
                # Find new node name by matching old node name
                new_src_name = src_name  # connections key by name, not id
                if new_src_name not in all_connections:
                    all_connections[new_src_name] = {}
                for conn_type, targets_list in conn_data.items():
                    if conn_type not in all_connections[new_src_name]:
                        all_connections[new_src_name][conn_type] = []
                    all_connections[new_src_name][conn_type].extend(targets_list)

        # Top-level canvas sticky note
        all_nodes.insert(0, {
            "id": "wsai_canvas_header",
            "name": f"🤖 WorkScanAI — {job_title}",
            "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1,
            "position": [0, 0],
            "parameters": {
                "color": 7,
                "width": max(900, len(suggested_templates) * _CANVAS_COL_WIDTH),
                "height": 200,
                "content": (
                    f"# WorkScanAI Automation Canvas — {job_title}\n"
                    f"Generated by [WorkScanAI](https://workscanai.vercel.app) · "
                    f"{len(suggested_templates)} tasks · "
                    f"Each column = one automation task\n\n"
                    f"**How to use:** Review each task column. Activate the workflows "
                    f"that match your stack. Add your credentials in each node."
                ),
            },
        })

        return {
            "name": f"{job_title} — WorkScanAI Automation Canvas",
            "nodes": all_nodes,
            "connections": all_connections,
            "active": False,
            "settings": {"executionOrder": "v1"},
            "meta": {
                "generatedBy": "WorkScanAI",
                "jobTitle": job_title,
                "taskCount": len(suggested_templates),
                "source": "n8n community templates",
            },
        }

    # ------------------------------------------------------------------
    # STEP 1 — PER-TASK SEARCH
    # ------------------------------------------------------------------

    def _search_for_task(self, task_name: str, category: str) -> List[Dict]:
        """Search for templates relevant to a specific task."""
        seen_ids: set = set()
        candidates: List[Dict] = []

        queries = list(_CATEGORY_QUERIES.get(category, _CATEGORY_QUERIES["general"]))
        # Add a task-specific query using key words from the task name
        task_words = " ".join(task_name.lower().split()[:4])
        queries.insert(0, task_words)

        for query in queries:
            try:
                results = self._search_one_query(query, limit=_SEARCH_RESULTS_PER_QUERY)
                for r in results:
                    if r["id"] not in seen_ids:
                        seen_ids.add(r["id"])
                        candidates.append(r)
                        if len(candidates) >= _MAX_CANDIDATES_PER_TASK:
                            break
            except Exception as exc:
                print(f"[n8n search] query='{query}' error: {exc}")
            if len(candidates) >= _MAX_CANDIDATES_PER_TASK:
                break

        return candidates

    def _search_one_query(self, query: str, limit: int) -> List[Dict]:
        url = f"{_N8N_TEMPLATE_BASE}/templates/search"
        params = f"?q={query.replace(' ', '+')}&limit={limit}"
        resp = httpx.get(url + params, headers=_HEADERS, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for wf in data.get("workflows", []):
            template_id = wf.get("id")
            if not template_id:
                continue
            nodes_preview = [
                n.get("type", "").replace("n8n-nodes-base.", "").replace("@n8n/n8n-nodes-langchain.", "🤖 ")
                for n in (wf.get("nodes") or [])
                if n.get("type") and "stickyNote" not in n.get("type", "")
            ]
            results.append({
                "id": template_id,
                "name": wf.get("name", ""),
                "description": (wf.get("description") or "")[:200],
                "node_count": len(nodes_preview),
                "nodes_preview": nodes_preview[:6],
            })
        return results

    # ------------------------------------------------------------------
    # STEP 2 — PER-TASK LLM CURATION (tighter prompt)
    # ------------------------------------------------------------------

    def _curate_one_task(
        self,
        job_title: str,
        task: Dict,
        candidates: List[Dict],
    ) -> tuple[Optional[int], str]:
        """
        Pick the single best template for one specific task.
        Returns (template_id, reason_string) or (None, "").
        Stronger scoring: penalises generic AI chat templates,
        rewards concrete integration nodes matching the task.
        """
        task_name = task.get("name", "")
        category = task.get("category", "general")
        frequency = task.get("frequency", "weekly")

        candidate_lines = "\n".join(
            f"ID={c['id']} | \"{c['name']}\" | nodes:[{', '.join(c['nodes_preview'][:5])}] | {c['description'][:120]}"
            for c in candidates
        )

        json_example = '{"id": 1234, "reason": "Sends weekly Slack summary from Google Sheets metrics"}'

        prompt = (
            f"You are a workflow automation expert selecting the BEST n8n template for ONE specific task.\n\n"
            f"ROLE: {job_title}\n"
            f"TASK: \"{task_name}\" (category: {category}, frequency: {frequency})\n\n"
            f"CANDIDATES:\n{candidate_lines}\n\n"
            f"SCORING RULES (apply strictly):\n"
            f"1. MUST match the task name directly — e.g. if task is 'Generate weekly report', pick a reporting/email template\n"
            f"2. PENALISE heavily: generic AI chatbots, 'talk to your data', ChatGPT wrappers, LLM assistants — these are NOT automation\n"
            f"3. REWARD: templates with concrete app integrations (Slack, Gmail, Sheets, Jira, Linear, Notion, Airtable, HTTP Request)\n"
            f"4. PREFER: templates that automate the actual work described, not just AI chat interfaces\n"
            f"5. If no candidate scores above 3/10 relevance, return null\n\n"
            f"Output ONLY a JSON object with exactly two keys:\n"
            f"  'id': integer (the best template ID, or null if none relevant)\n"
            f"  'reason': string, max 12 words explaining WHY it matches this task\n\n"
            f"Example: {json_example}\n"
            f"Output ONLY the JSON object. No markdown. No explanation."
        )

        try:
            msg = self._claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
                timeout=15.0,
            )
            raw = msg.content[0].text.strip().replace("```json", "").replace("```", "").strip()
            obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if not obj_match:
                return None, ""
            pick = json.loads(obj_match.group(0))
            tid = pick.get("id")
            reason = pick.get("reason", "")
            if tid is None:
                return None, ""
            return int(tid), reason
        except Exception as exc:
            print(f"[n8n curation] task='{task_name}' LLM error: {exc}")
            # Fallback: first candidate
            return (candidates[0]["id"], "Best available match") if candidates else (None, "")

    # ------------------------------------------------------------------
    # STEP 3 — FETCH IMPORTABLE WORKFLOW JSON (with cache)
    # ------------------------------------------------------------------

    def _fetch_workflow_json(self, template_id: int) -> Optional[Dict]:
        if template_id in self._workflow_cache:
            return self._workflow_cache[template_id]
        try:
            url = f"{_N8N_TEMPLATE_BASE}/templates/workflows/{template_id}"
            resp = httpx.get(url, headers=_HEADERS, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()

            outer = data.get("workflow", {})
            inner = outer.get("workflow", {})

            workflow = {
                "name": outer.get("name", f"n8n Template {template_id}"),
                "nodes": inner.get("nodes", []),
                "connections": inner.get("connections", {}),
                "active": False,
                "settings": {"executionOrder": "v1"},
                "id": f"workscanai-template-{template_id}",
                "meta": {
                    "templateId": template_id,
                    "templateUrl": f"https://n8n.io/workflows/{template_id}/",
                    "source": "n8n community templates",
                    "importedBy": "WorkScanAI",
                },
            }
            self._workflow_cache[template_id] = workflow
            return workflow
        except Exception as exc:
            print(f"[n8n fetch] template_id={template_id} error: {exc}")
            self._workflow_cache[template_id] = None
            return None
