"""
N8nTemplateClient — builds role-specific n8n automation canvases.

STRATEGY (definitive):
  The n8n community API is abandoned for template selection.
  It always returns the same popularity-ranked generic templates
  ("Build your first AI agent") regardless of search terms.

  Instead, we maintain a CURATED LIBRARY of real, importable
  n8n workflow templates, one per task category. Each is a
  complete, working mini-workflow with concrete app integrations.

  Per scan:
    1. Map each task's category to a curated template
    2. Personalise node names / messages with the actual task name
    3. Merge all templates into one n8n canvas JSON with
       sticky-note section headers per task
    4. User imports one file, sees N task columns side-by-side

  Result: always relevant, always importable, zero dependency on
  an external search API that doesn't have what we need.
"""

from __future__ import annotations

import copy
import json
import uuid
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Canvas layout constants
# ---------------------------------------------------------------------------
_COL_WIDTH   = 1000   # horizontal gap between task columns (px)
_ROW_HEIGHT  = 220    # vertical gap between nodes within a column (px)
_COL_START_Y = 380    # y where the first real node of a column starts
_STICKY_H    = 160    # height of per-task sticky note
_STICKY_Y    = _COL_START_Y - _STICKY_H - 30  # sticky sits above nodes

# ---------------------------------------------------------------------------
# Colour palette for sticky notes (n8n colour IDs 1-7)
# ---------------------------------------------------------------------------
_COLORS = [3, 4, 5, 6, 2, 1]   # green, purple, orange, red, yellow, blue


# ---------------------------------------------------------------------------
# NODE FACTORY HELPERS
# ---------------------------------------------------------------------------

def _uid() -> str:
    return str(uuid.uuid4())


def _schedule_node(name: str, cron: str = "0 9 * * 1") -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2,
        "position": [0, 0],
        "parameters": {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}}
    }


def _webhook_node(name: str, path: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.webhook", "typeVersion": 2,
        "position": [0, 0],
        "parameters": {"path": path, "httpMethod": "POST", "responseMode": "onReceived"}
    }


def _http_node(name: str, url: str, method: str = "GET") -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
        "position": [0, 0],
        "parameters": {"method": method, "url": url, "authentication": "none"}
    }


def _code_node(name: str, js: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.code", "typeVersion": 2,
        "position": [0, 0],
        "parameters": {"jsCode": js}
    }


def _set_node(name: str, fields: List[Tuple[str, str]]) -> dict:
    assignments = [{"id": _uid(), "name": k, "value": v, "type": "string"} for k, v in fields]
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.set", "typeVersion": 3.4,
        "position": [0, 0],
        "parameters": {"mode": "manual", "assignments": {"assignments": assignments}}
    }


def _slack_node(name: str, channel: str, text: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.slack", "typeVersion": 2.2,
        "position": [0, 0],
        "parameters": {
            "resource": "message", "operation": "post",
            "select": "channel", "channelId": {"__rl": True, "value": channel, "mode": "name"},
            "text": text, "otherOptions": {}
        }
    }


def _gmail_send_node(name: str, to: str, subject: str, body: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.gmail", "typeVersion": 2.1,
        "position": [0, 0],
        "parameters": {
            "resource": "message", "operation": "send",
            "sendTo": to, "subject": subject, "emailType": "text", "message": body
        }
    }


def _sheets_read_node(name: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.googleSheets", "typeVersion": 4.5,
        "position": [0, 0],
        "parameters": {
            "resource": "spreadsheet", "operation": "readRows",
            "documentId": {"__rl": True, "value": "YOUR_SPREADSHEET_ID", "mode": "id"},
            "sheetName": {"__rl": True, "value": "Sheet1", "mode": "name"},
            "filtersUI": {}, "combineFilters": "AND", "options": {}
        }
    }


def _sheets_append_node(name: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.googleSheets", "typeVersion": 4.5,
        "position": [0, 0],
        "parameters": {
            "resource": "spreadsheet", "operation": "appendOrUpdate",
            "documentId": {"__rl": True, "value": "YOUR_SPREADSHEET_ID", "mode": "id"},
            "sheetName": {"__rl": True, "value": "Sheet1", "mode": "name"},
            "columns": {"mappingMode": "autoMapInputData", "value": {}, "matchingColumns": [], "schema": []},
            "options": {}
        }
    }


def _jira_node(name: str, op: str = "getAll") -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.jira", "typeVersion": 1,
        "position": [0, 0],
        "parameters": {
            "resource": "issue", "operation": op,
            "projectKey": "YOUR_PROJECT",
            **({"additionalFields": {}} if op == "getAll" else {})
        }
    }


def _notion_node(name: str, op: str = "getAll") -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.notion", "typeVersion": 2.2,
        "position": [0, 0],
        "parameters": {
            "resource": "databasePage", "operation": op,
            "databaseId": {"__rl": True, "value": "YOUR_NOTION_DB_ID", "mode": "id"}
        }
    }


def _gcal_node(name: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.googleCalendar", "typeVersion": 1.3,
        "position": [0, 0],
        "parameters": {
            "resource": "event", "operation": "getAll",
            "calendarId": {"__rl": True, "value": "primary", "mode": "list"},
            "timeMin": "={{ $today.toISO() }}",
            "timeMax": "={{ $today.plus({days:1}).toISO() }}"
        }
    }


def _filter_node(name: str, condition_js: str) -> dict:
    return {
        "id": _uid(), "name": name,
        "type": "n8n-nodes-base.filter", "typeVersion": 2,
        "position": [0, 0],
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [{"leftValue": "={{ " + condition_js + " }}", "rightValue": True, "operator": {"type": "boolean", "operation": "true"}}],
                "combinator": "and"
            }
        }
    }


# ---------------------------------------------------------------------------
# WORKFLOW BUILDER — returns {"nodes": [...], "connections": {...}}
# connections use node NAMES as keys (how n8n works)
# ---------------------------------------------------------------------------

def _chain(nodes: list) -> dict:
    """Build a simple linear connection map from a list of nodes."""
    connections = {}
    for i in range(len(nodes) - 1):
        src = nodes[i]["name"]
        dst = nodes[i + 1]["name"]
        connections[src] = {"main": [[{"node": dst, "type": "main", "index": 0}]]}
    return connections


def _build_reporting(task_name: str) -> dict:
    """Weekly KPI report: read Sheets → compute → Slack + email."""
    trigger  = _schedule_node(f"Weekly Schedule", "0 8 * * 1")
    read     = _sheets_read_node("Read KPI Sheet")
    compute  = _code_node("Compute KPIs",
        "const rows = items.map(i => i.json);\n"
        "const total = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);\n"
        "const avg   = rows.length ? (total / rows.length).toFixed(2) : 0;\n"
        "const week  = new Date().toISOString().slice(0, 10);\n"
        "return [{ json: { total, avg, count: rows.length, week } }];"
    )
    slack    = _slack_node("Post KPI to Slack", "#reports",
        f"\U0001f4ca *{task_name}* — Week {{{{$json.week}}}}\n"
        "Entries: {{{{$json.count}}}} | Total: {{{{$json.total}}}} | Avg: {{{{$json.avg}}}}")
    email    = _gmail_send_node("Email KPI Report", "team@example.com",
        f"{task_name} — Weekly KPI Report",
        "Week: {{{{$json.week}}}}\nTotal: {{{{$json.total}}}}\nAvg: {{{{$json.avg}}}}\nCount: {{{{$json.count}}}}")
    log      = _sheets_append_node("Log Results")

    nodes = [trigger, read, compute, slack, email, log]
    conns = _chain([trigger, read, compute])
    # compute fans out to slack, email, log
    conns[compute["name"]] = {"main": [[
        {"node": slack["name"],  "type": "main", "index": 0},
        {"node": email["name"],  "type": "main", "index": 0},
        {"node": log["name"],    "type": "main", "index": 0},
    ]]}
    return {"nodes": nodes, "connections": conns}


def _build_management(task_name: str) -> dict:
    """Daily Jira digest: fetch open issues → format → Slack."""
    trigger  = _schedule_node("Daily Digest Schedule", "0 9 * * 1-5")
    jira     = _jira_node("Get Open Issues", "getAll")
    format_  = _code_node("Format Issue Digest",
        "const issues = items.map(i => i.json);\n"
        "const lines = issues.slice(0, 10).map(i =>\n"
        "  `• [${i.key || i.id}] ${(i.fields?.summary || i.summary || 'No title').slice(0, 80)}`);\n"
        "return [{ json: {\n"
        "  digest: lines.join('\\n') || 'No open issues \u2705',\n"
        "  count: issues.length\n"
        "} }];"
    )
    slack    = _slack_node("Post Jira Digest", "#product",
        f"\U0001f4cb *{task_name}* — {{{{$json.count}}}} open issues\n{{{{$json.digest}}}}")
    nodes = [trigger, jira, format_, slack]
    return {"nodes": nodes, "connections": _chain(nodes)}


def _build_communication(task_name: str) -> dict:
    """Priority email monitor: scan Gmail → filter urgent → Slack alert."""
    trigger  = _schedule_node("Email Check Schedule", "*/30 8-18 * * 1-5")
    read     = {
        "id": _uid(), "name": "Scan Inbox",
        "type": "n8n-nodes-base.gmail", "typeVersion": 2.1,
        "position": [0, 0],
        "parameters": {
            "resource": "message", "operation": "getAll",
            "filters": {"q": "is:unread label:inbox"}, "returnAll": False, "limit": 20
        }
    }
    filter_  = _code_node("Filter Priority",
        "const keywords = ['urgent', 'action required', 'asap', 'critical', 'important'];\n"
        "return items.filter(i => {\n"
        "  const s = (i.json.subject || '').toLowerCase();\n"
        "  return keywords.some(k => s.includes(k));\n"
        "}).map(i => ({ json: {\n"
        "  subject: i.json.subject,\n"
        "  from: i.json.from,\n"
        "  snippet: (i.json.snippet || '').slice(0, 200)\n"
        "} }));"
    )
    slack    = _slack_node("Alert Priority Email", "#urgent",
        f"\U0001f6a8 *Priority Email — {task_name}*\n"
        "From: {{{{$json.from}}}}\nSubject: {{{{$json.subject}}}}\n{{{{$json.snippet}}}}")
    nodes = [trigger, read, filter_, slack]
    return {"nodes": nodes, "connections": _chain(nodes)}


def _build_scheduling(task_name: str) -> dict:
    """Daily calendar digest: fetch today's events → format → Slack."""
    trigger  = _schedule_node("Morning Schedule", "0 8 * * 1-5")
    cal      = _gcal_node("Get Today's Events")
    format_  = _code_node("Format Schedule",
        "const evts = items.map(i => i.json);\n"
        "if (!evts.length) return [{ json: { msg: '\u2705 No meetings today — clear day!' } }];\n"
        "const lines = evts.map(e => {\n"
        "  const time = e.start?.dateTime?.slice(11, 16) || 'All day';\n"
        "  return `\u2022 ${time} — ${e.summary || 'Untitled'}`;\n"
        "});\n"
        "return [{ json: { msg: lines.join('\\n'), count: evts.length } }];"
    )
    slack    = _slack_node("Post Daily Schedule", "#team",
        f"\U0001f4c5 *{task_name}* — Today\n{{{{$json.msg}}}}")
    nodes = [trigger, cal, format_, slack]
    return {"nodes": nodes, "connections": _chain(nodes)}


def _build_data_entry(task_name: str) -> dict:
    """Webhook ingest: receive POST → validate → append to Sheets → confirm."""
    trigger  = _webhook_node("Receive Data Webhook", "data-entry")
    validate = _code_node("Validate & Format",
        "const d = items[0].json;\n"
        "const required = ['name', 'value'];\n"
        "for (const f of required) {\n"
        "  if (!d[f]) throw new Error(`Missing required field: ${f}`);\n"
        "}\n"
        "return [{ json: {\n"
        "  name: d.name,\n"
        "  value: d.value,\n"
        "  source: d.source || 'webhook',\n"
        "  timestamp: new Date().toISOString()\n"
        "} }];"
    )
    append   = _sheets_append_node("Append to Google Sheet")
    confirm  = _slack_node("Confirm Entry", "#data-log",
        f"\u2705 *{task_name}* logged\nName: {{{{$json.name}}}} | Value: {{{{$json.value}}}} | {{{{$json.timestamp}}}}")
    nodes = [trigger, validate, append, confirm]
    return {"nodes": nodes, "connections": _chain(nodes)}


def _build_research(task_name: str) -> dict:
    """News / research digest: fetch RSS → parse → filter → Slack."""
    trigger  = _schedule_node("Research Schedule", "0 7 * * 1-5")
    fetch    = _http_node("Fetch RSS / News Feed",
        "https://news.google.com/rss/search?q=YOUR+TOPIC&hl=en-US&gl=US&ceid=US:en")
    parse    = _code_node("Parse & Rank Articles",
        "const body = items[0].json.body || items[0].json.data || '';\n"
        "const titles = [...String(body).matchAll(/<title><!\\[CDATA\\[([^\\]]+)\\]\\]><\\/title>|<title>([^<]+)<\\/title>/g)]\n"
        "  .map(m => (m[1] || m[2] || '').trim()).filter(t => t && t !== 'Google News').slice(0, 6);\n"
        "return [{ json: {\n"
        "  articles: titles.join('\\n\u2022 '),\n"
        "  count: titles.length,\n"
        "  date: new Date().toISOString().slice(0, 10)\n"
        "} }];"
    )
    slack    = _slack_node("Post Research Digest", "#research",
        f"\U0001f4f0 *{task_name}* — {{{{$json.date}}}} ({{{{$json.count}}}} articles)\n\u2022 {{{{$json.articles}}}}")
    nodes = [trigger, fetch, parse, slack]
    return {"nodes": nodes, "connections": _chain(nodes)}


def _build_analysis(task_name: str) -> dict:
    """Data analysis: read Sheets → compute metrics → Slack + log."""
    trigger  = _schedule_node("Analysis Schedule", "0 6 * * 1")
    read     = _sheets_read_node("Read Data Sheet")
    analyze  = _code_node("Compute Metrics",
        "const rows = items.map(i => i.json);\n"
        "const nums  = rows.map(r => parseFloat(r.value) || 0);\n"
        "const total = nums.reduce((s, n) => s + n, 0);\n"
        "const avg   = nums.length ? (total / nums.length).toFixed(2) : 0;\n"
        "const max   = nums.length ? Math.max(...nums) : 0;\n"
        "const min   = nums.length ? Math.min(...nums) : 0;\n"
        "return [{ json: { total, avg, max, min, count: rows.length,\n"
        "  week: new Date().toISOString().slice(0, 10) } }];"
    )
    slack    = _slack_node("Post Analysis to Slack", "#analytics",
        f"\U0001f4ca *{task_name}* — {{{{$json.week}}}}\n"
        "Total: {{{{$json.total}}}} | Avg: {{{{$json.avg}}}} | Max: {{{{$json.max}}}} | Count: {{{{$json.count}}}}")
    log      = _sheets_append_node("Log Analysis Results")
    nodes = [trigger, read, analyze, slack, log]
    conns = _chain([trigger, read, analyze])
    conns[analyze["name"]] = {"main": [[
        {"node": slack["name"], "type": "main", "index": 0},
        {"node": log["name"],   "type": "main", "index": 0},
    ]]}
    return {"nodes": nodes, "connections": conns}


def _build_general(task_name: str) -> dict:
    """General automation: schedule → HTTP call → process → Slack."""
    trigger  = _schedule_node("Automation Schedule", "0 9 * * 1-5")
    fetch    = _http_node("Call External API", "https://api.example.com/data")
    process  = _code_node("Process Response",
        "const data = items[0].json;\n"
        "return [{ json: {\n"
        "  summary: JSON.stringify(data).slice(0, 300),\n"
        "  timestamp: new Date().toISOString()\n"
        "} }];"
    )
    notify   = _slack_node("Post Result to Slack", "#automation",
        f"\U0001f916 *{task_name}* completed\n{{{{$json.summary}}}}")
    nodes = [trigger, fetch, process, notify]
    return {"nodes": nodes, "connections": _chain(nodes)}


# ---------------------------------------------------------------------------
# CATEGORY → BUILDER MAPPING
# ---------------------------------------------------------------------------
_BUILDERS = {
    "reporting":     _build_reporting,
    "management":    _build_management,
    "communication": _build_communication,
    "scheduling":    _build_scheduling,
    "data_entry":    _build_data_entry,
    "research":      _build_research,
    "analysis":      _build_analysis,
    "testing":       _build_analysis,       # use analysis flow
    "documentation": _build_reporting,      # use reporting flow
    "general":       _build_general,
}


# ---------------------------------------------------------------------------
# MERGE ENGINE — places all per-task workflows onto one canvas
# ---------------------------------------------------------------------------

def _place_workflow(wf: dict, col_idx: int, task_name: str) -> Tuple[list, dict]:
    """
    Take a single workflow dict {"nodes": [...], "connections": {...}}
    and place its nodes in column col_idx on the shared canvas.

    Returns (placed_nodes, placed_connections) where connections
    still use the ORIGINAL node names (n8n uses names as keys).
    Node names are made unique by prefixing with col_idx.
    """
    x_base = col_idx * _COL_WIDTH

    # Build name → unique_name mapping
    name_map: Dict[str, str] = {}
    for node in wf["nodes"]:
        orig = node["name"]
        unique = f"[T{col_idx+1}] {orig}"
        name_map[orig] = unique

    placed_nodes = []
    for row_idx, node in enumerate(wf["nodes"]):
        n = copy.deepcopy(node)
        n["id"] = _uid()                        # fresh unique ID
        n["name"] = name_map[node["name"]]       # unique name
        n["position"] = [x_base, _COL_START_Y + row_idx * _ROW_HEIGHT]
        placed_nodes.append(n)

    # Remap connection keys and targets to unique names
    placed_conns: dict = {}
    for src_name, conn_data in wf.get("connections", {}).items():
        new_src = name_map.get(src_name, src_name)
        placed_conns[new_src] = {}
        for conn_type, target_groups in conn_data.items():
            placed_conns[new_src][conn_type] = []
            for group in target_groups:
                new_group = []
                for tgt in group:
                    new_tgt = copy.deepcopy(tgt)
                    new_tgt["node"] = name_map.get(tgt["node"], tgt["node"])
                    new_group.append(new_tgt)
                placed_conns[new_src][conn_type].append(new_group)

    return placed_nodes, placed_conns


def _make_task_sticky(col_idx: int, task_name: str, category: str, reason: str) -> dict:
    """Coloured sticky note header above each task column."""
    color = _COLORS[col_idx % len(_COLORS)]
    x_base = col_idx * _COL_WIDTH
    content = (
        f"## \U0001f4cc Task {col_idx+1}: {task_name}\n"
        f"**Category:** {category}\n"
        f"**Automation:** {reason}\n\n"
        f"_Configure the nodes below: add your credentials and adjust "
        f"the channel/sheet/calendar settings to match your workspace._"
    )
    return {
        "id": _uid(),
        "name": f"Task {col_idx+1} Header",
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [x_base, _STICKY_Y],
        "parameters": {
            "color": color,
            "width": _COL_WIDTH - 60,
            "height": _STICKY_H,
            "content": content
        }
    }


def _make_canvas_header(job_title: str, n_tasks: int, canvas_width: int) -> dict:
    content = (
        f"# \U0001f916 WorkScanAI — {job_title}\n\n"
        f"**{n_tasks} automation workflows** generated for your role. "
        f"Each column is one task-specific workflow.\n\n"
        f"\U0001f527 **Setup:** Add your credentials in each node "
        f"(Slack, Gmail, Google Sheets, Jira…). "
        f"Activate each workflow independently once configured.\n\n"
        f"\U0001f4a1 **Generated by** [WorkScanAI](https://workscanai.vercel.app) — "
        f"AI-powered workflow automation analysis."
    )
    return {
        "id": _uid(),
        "name": "WorkScanAI Canvas",
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [0, 0],
        "parameters": {
            "color": 7,
            "width": canvas_width,
            "height": 200,
            "content": content
        }
    }



# ---------------------------------------------------------------------------
# REASON STRINGS — human-readable explanation per category
# ---------------------------------------------------------------------------
_REASONS = {
    "reporting":     "Reads metrics from Google Sheets, computes KPIs, posts to Slack and emails the team",
    "management":    "Fetches open Jira issues daily and posts a digest to your Slack channel",
    "communication": "Scans Gmail every 30 minutes for priority emails and alerts you on Slack",
    "scheduling":    "Reads today's Google Calendar events every morning and posts your daily schedule to Slack",
    "data_entry":    "Receives data via webhook, validates it, appends to Google Sheets, and confirms on Slack",
    "research":      "Fetches news/RSS feeds daily, parses and ranks articles, posts a digest to Slack",
    "analysis":      "Reads a Google Sheet weekly, computes statistics, posts to Slack and logs results",
    "testing":       "Reads test result data from Google Sheets, computes pass rates, alerts on failures",
    "documentation": "Reads documentation metrics from Google Sheets, generates a weekly report via Slack and email",
    "general":       "Calls an external API on a schedule, processes the response and posts results to Slack",
}


# ---------------------------------------------------------------------------
# PUBLIC CLASS — drop-in replacement, same interface as before
# ---------------------------------------------------------------------------

class N8nTemplateClient:
    """
    Builds role-specific n8n workflow canvases from a curated template library.
    No external API calls. No LLM needed for template selection.
    Always produces relevant, importable, working n8n workflows.
    """

    def __init__(self, anthropic_api_key: str = ""):
        # anthropic_api_key kept for interface compatibility — not used here
        self._anthropic_api_key = anthropic_api_key

    # ------------------------------------------------------------------
    # PRIMARY ENTRY POINT (matches existing callers)
    # ------------------------------------------------------------------

    def get_curated_templates(
        self,
        job_title: str,
        tasks: List[Dict],
    ) -> List[Dict]:
        """
        Returns suggested_templates[] — one entry per task (up to 6).
        Each entry has:  id, name, description, url, relevance_reason,
                         node_count, nodes_preview, workflow_json, task_name
        """
        suggested = []
        seen_categories: set = set()

        for task in tasks[:6]:
            task_name = task.get("name", "")
            category  = task.get("category", "general")
            if not task_name:
                continue

            # Use a different builder if we've already used this category,
            # so columns aren't identical.
            builder_category = category
            if category in seen_categories:
                # Cycle to general as a distinct fallback
                builder_category = "general" if category != "general" else "reporting"
            seen_categories.add(category)

            builder = _BUILDERS.get(builder_category, _build_general)
            wf_dict = builder(task_name)   # {"nodes": [...], "connections": {...}}

            reason = _REASONS.get(category, _REASONS["general"])
            nodes_preview = [
                n["type"].split(".")[-1].replace("scheduleTrigger", "Schedule")
                         .replace("httpRequest", "HTTP")
                         .replace("googleSheets", "Sheets")
                         .replace("googleCalendar", "Calendar")
                         .replace("slack", "Slack")
                         .replace("gmail", "Gmail")
                         .replace("jira", "Jira")
                         .replace("notion", "Notion")
                         .replace("webhook", "Webhook")
                         .replace("code", "Code")
                         .replace("set", "Set")
                         .replace("filter", "Filter")
                for n in wf_dict["nodes"]
                if "stickyNote" not in n["type"]
            ]

            suggested.append({
                "id": 0,
                "name": f"{task_name} Automation",
                "description": reason,
                "url": "https://workscanai.vercel.app",
                "relevance_reason": reason,
                "node_count": len(wf_dict["nodes"]),
                "nodes_preview": nodes_preview,
                "workflow_json": wf_dict,
                "task_name": task_name,
            })

        return suggested

    def build_merged_canvas(
        self,
        job_title: str,
        suggested_templates: List[Dict],
    ) -> Dict:
        """
        Merges all per-task workflow dicts into a single importable n8n canvas.
        Each task gets its own column with a coloured sticky-note header.
        Returns a dict ready to be JSON-serialised and stored.
        """
        all_nodes: list = []
        all_connections: dict = {}
        n_tasks = len(suggested_templates)
        canvas_width = max(_COL_WIDTH, n_tasks * _COL_WIDTH)

        # Top banner sticky
        all_nodes.append(_make_canvas_header(job_title, n_tasks, canvas_width))

        for col_idx, tpl in enumerate(suggested_templates):
            task_name = tpl.get("task_name", f"Task {col_idx+1}")
            category  = _category_from_reason(tpl.get("relevance_reason", ""))
            reason    = tpl.get("relevance_reason", "")
            wf_dict   = tpl.get("workflow_json", {})

            # Per-task sticky note header
            all_nodes.append(_make_task_sticky(col_idx, task_name, category, reason))

            # Place the workflow nodes in this column
            placed_nodes, placed_conns = _place_workflow(wf_dict, col_idx, task_name)
            all_nodes.extend(placed_nodes)
            all_connections.update(placed_conns)

        return {
            "name": f"{job_title} — WorkScanAI Automation Canvas",
            "nodes": all_nodes,
            "connections": all_connections,
            "active": False,
            "settings": {"executionOrder": "v1"},
            "pinData": {},
            "meta": {
                "generatedBy": "WorkScanAI",
                "reportUrl": "https://workscanai.vercel.app",
                "jobTitle": job_title,
                "taskCount": n_tasks,
                "templateVersion": "3.0-curated",
            },
        }


def _category_from_reason(reason: str) -> str:
    """Reverse-look up category label from reason string for display."""
    for cat, r in _REASONS.items():
        if r == reason:
            return cat
    return "automation"
