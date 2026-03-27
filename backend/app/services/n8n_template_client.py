"""
N8nTemplateClient — fetches real, importable workflow templates from
https://api.n8n.io/templates and uses Claude to curate the most
relevant ones for a given job title + task list.

MVP implementation of Benedikt's architecture:
  Job → fetch existing n8n community workflows → LLM ranks relevance
  → return curated list the user can import directly into n8n.

No workflow generation / hallucination.  Every workflow returned is a
real, community-tested automation that has been live on n8n.io.
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

import httpx
from anthropic import Anthropic

# ---------------------------------------------------------------------------
# Category → search query mapping
# Each category gets 2 queries so we cast a wider net and get more templates.
# ---------------------------------------------------------------------------
_CATEGORY_QUERIES: Dict[str, List[str]] = {
    "data_entry":    ["data entry automation", "form submission google sheets"],
    "reporting":     ["automated report email", "weekly report google sheets slack"],
    "scheduling":    ["meeting scheduling automation", "calendar invite automation"],
    "communication": ["email triage automation", "inbox management slack notification"],
    "analysis":      ["data analysis automation", "metrics dashboard automation"],
    "research":      ["web scraping research automation", "rss feed content research"],
    "management":    ["project management jira automation", "task tracking slack notification"],
    "general":       ["workflow automation productivity", "business process automation"],
}

_N8N_TEMPLATE_BASE = "https://api.n8n.io"
_HEADERS = {"User-Agent": "WorkScanAI/2.0 (workscanai.vercel.app)"}
_SEARCH_RESULTS_PER_QUERY = 4   # fetch N results per query term
_MAX_TEMPLATES_TO_CURATE = 12   # cap sent to LLM to keep prompt size sane
_FINAL_TEMPLATES_TO_RETURN = 5  # how many the LLM selects for the user


class N8nTemplateClient:
    def __init__(self, anthropic_api_key: str):
        self._claude = Anthropic(api_key=anthropic_api_key)

    # ------------------------------------------------------------------
    # PUBLIC ENTRY POINT
    # ------------------------------------------------------------------

    def get_curated_templates(
        self,
        job_title: str,
        tasks: List[Dict],
    ) -> List[Dict]:
        """
        Returns up to _FINAL_TEMPLATES_TO_RETURN template dicts, each with:
          - id, name, description, url  (template metadata)
          - relevance_reason            (LLM one-liner for the user)
          - workflow_json               (importable n8n workflow body)
          - nodes_preview               (list of node type strings)
        """
        # 1. Determine which categories are present in the task list
        categories = list({t.get("category", "general") for t in tasks})

        # 2. Search for candidate templates
        candidates = self._search_templates(categories, job_title)
        if not candidates:
            return []

        # 3. LLM curation — rank & explain relevance
        curated_ids = self._curate_with_llm(job_title, tasks, candidates)

        # 4. Fetch full workflow JSON for each selected template
        result = []
        for template_id in curated_ids:
            meta = next((c for c in candidates if c["id"] == template_id), None)
            if not meta:
                continue
            workflow_json = self._fetch_workflow_json(template_id)
            if workflow_json is None:
                continue
            result.append({
                "id": template_id,
                "name": meta["name"],
                "description": meta.get("description", ""),
                "url": f"https://n8n.io/workflows/{template_id}/",
                "relevance_reason": meta.get("relevance_reason", ""),
                "node_count": meta.get("node_count", 0),
                "nodes_preview": meta.get("nodes_preview", []),
                "workflow_json": workflow_json,
            })

        return result

    # ------------------------------------------------------------------
    # STEP 1 — SEARCH
    # ------------------------------------------------------------------

    def _search_templates(
        self, categories: List[str], job_title: str
    ) -> List[Dict]:
        """
        Run multiple search queries and deduplicate results.
        Returns a flat list of candidate metadata dicts.
        """
        seen_ids: set = set()
        candidates: List[Dict] = []

        # Always include a direct job-title query
        all_queries: List[str] = [job_title]
        for cat in categories:
            all_queries.extend(_CATEGORY_QUERIES.get(cat, _CATEGORY_QUERIES["general"]))

        for query in all_queries:
            try:
                results = self._search_one_query(query, limit=_SEARCH_RESULTS_PER_QUERY)
                for r in results:
                    if r["id"] not in seen_ids:
                        seen_ids.add(r["id"])
                        candidates.append(r)
                        if len(candidates) >= _MAX_TEMPLATES_TO_CURATE:
                            break
            except Exception as exc:
                print(f"[n8n search] query='{query}' error: {exc}")
            if len(candidates) >= _MAX_TEMPLATES_TO_CURATE:
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

            # Collect node type names visible in the search result
            nodes_preview = [
                n.get("type", "").replace("n8n-nodes-base.", "")
                for n in (wf.get("nodes") or [])
                if n.get("type")
            ]

            results.append({
                "id": template_id,
                "name": wf.get("name", ""),
                "description": (wf.get("description") or "")[:300],
                "node_count": len(nodes_preview),
                "nodes_preview": nodes_preview[:8],
            })
        return results

    # ------------------------------------------------------------------
    # STEP 2 — LLM CURATION
    # ------------------------------------------------------------------

    def _curate_with_llm(
        self,
        job_title: str,
        tasks: List[Dict],
        candidates: List[Dict],
    ) -> List[int]:
        """
        Ask Claude (haiku) which candidates are most relevant and why.
        Returns an ordered list of template IDs (best first).
        """
        task_summary = "\n".join(
            f"- {t['name']} ({t.get('category', 'general')}, {t.get('frequency', 'weekly')})"
            for t in tasks[:8]
        )
        candidate_lines = "\n".join(
            f"ID={c['id']} | {c['name']} | nodes: {', '.join(c['nodes_preview'][:5]) or 'unknown'} | {c['description'][:120]}"
            for c in candidates
        )

        prompt = (
            f"You are a workflow automation consultant helping a {job_title}.\n\n"
            f"THEIR TASKS:\n{task_summary}\n\n"
            f"AVAILABLE n8n COMMUNITY TEMPLATES:\n{candidate_lines}\n\n"
            f"Select the {_FINAL_TEMPLATES_TO_RETURN} most useful templates for this role.\n"
            f"Output ONLY a JSON array of objects with keys 'id' (integer) and 'reason' (max 15 words).\n"
            f"Example: [{{'id': 123, 'reason': 'Automates weekly report generation and email delivery'}}]\n"
            f"No markdown, no explanation, only the JSON array."
        )

        try:
            msg = self._claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
                timeout=20.0,
            )
            raw = msg.content[0].text.strip()
            # Strip accidental markdown fences
            raw = raw.replace("```json", "").replace("```", "").strip()
            picks = json.loads(raw)

            # Attach reason back to candidate metadata and return ordered IDs
            id_to_candidate = {c["id"]: c for c in candidates}
            ordered_ids = []
            for pick in picks:
                tid = int(pick.get("id", 0))
                if tid in id_to_candidate:
                    id_to_candidate[tid]["relevance_reason"] = pick.get("reason", "")
                    ordered_ids.append(tid)
            return ordered_ids

        except Exception as exc:
            print(f"[n8n curation] LLM error: {exc}")
            # Fallback: just return first N candidates in order
            return [c["id"] for c in candidates[:_FINAL_TEMPLATES_TO_RETURN]]

    # ------------------------------------------------------------------
    # STEP 3 — FETCH IMPORTABLE WORKFLOW JSON
    # ------------------------------------------------------------------

    def _fetch_workflow_json(self, template_id: int) -> Optional[Dict]:
        """
        Fetches the actual importable workflow body for a template.
        Returns a dict ready to be serialised and downloaded as .json.
        """
        try:
            url = f"{_N8N_TEMPLATE_BASE}/templates/workflows/{template_id}"
            resp = httpx.get(url, headers=_HEADERS, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()

            # Structure: data['workflow']['workflow'] = {nodes, connections}
            outer = data.get("workflow", {})
            inner = outer.get("workflow", {})

            # Build a fully importable n8n workflow JSON
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
            return workflow

        except Exception as exc:
            print(f"[n8n fetch] template_id={template_id} error: {exc}")
            return None
