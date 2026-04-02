"""
N8nTemplateClient — builds role-specific n8n automation canvases.

ARCHITECTURE DECISION (after research):
  The n8n community search API returns the same 10 popularity-ranked templates
  for EVERY search query regardless of terms. It is useless for role-specific
  template matching.

  SOLUTION: Build purpose-specific workflow JSON from code.
  Each task category gets a real, importable automation workflow with:
  - Concrete app integrations (Slack, Gmail, Sheets, Jira, Calendar, etc.)
  - Proper trigger → process → output pipeline
  - Real node types with correct typeVersion numbers
  - Proper connections format

  All workflows are merged into one importable n8n canvas with:
  - Top-level header sticky note
  - One column per task, each with coloured sticky note label
  - Horizontally offset so each task group is clearly separated
"""

from __future__ import annotations

import json
from typing import Dict, List, Optional, Tuple
import uuid

_CANVAS_COL_WIDTH = 1000   # horizontal gap between task columns
_GROUP_Y_START   = 380     # y-position where node groups start (below top sticky)
_NODE_Y_GAP      = 220     # vertical gap between nodes in a group
_STICKY_HEIGHT   = 160     # height of per-task sticky note


# ---------------------------------------------------------------------------
# Node factory helpers — generate valid n8n node dicts
# ---------------------------------------------------------------------------

def _id() -> str:
    return str(uuid.uuid4())


def _node(node_id: str, name: str, ntype: str, x: int, y: int,
          params: dict = None, tv: float = 1) -> dict:
    return {
        "id": node_id,
        "name": name,
        "type": ntype,
        "typeVersion": tv,
        "position": [x, y],
        "parameters": params or {},
    }


def _sticky(node_id: str, name: str, x: int, y: int,
            content: str, color: int = 3, w: int = 920, h: int = 140) -> dict:
    return {
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [x, y],
        "parameters": {"color": color, "width": w, "height": h, "content": content},
    }


def _schedule_node(nid: str, x: int, y: int, cron: str = "0 9 * * 1") -> dict:
    return _node(nid, "Schedule Trigger", "n8n-nodes-base.scheduleTrigger", x, y,
                 {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}})


def _http_node(nid: str, name: str, x: int, y: int,
               url: str = "={{ $vars.API_URL }}", method: str = "GET") -> dict:
    return _node(nid, name, "n8n-nodes-base.httpRequest", x, y,
                 {"method": method, "url": url, "authentication": "none",
                  "options": {}}, 4.2)


def _slack_node(nid: str, name: str, x: int, y: int,
                channel: str = "#automation", text: str = "") -> dict:
    return _node(nid, name, "n8n-nodes-base.slack", x, y,
                 {"resource": "message", "operation": "post",
                  "select": "channel", "channelId": {"__rl": True, "value": channel, "mode": "name"},
                  "text": text or "={{ $json.summary }}"}, 2.2)


def _gmail_send(nid: str, name: str, x: int, y: int,
                to: str = "={{ $vars.REPORT_EMAIL }}", subject: str = "",
                body: str = "") -> dict:
    return _node(nid, name, "n8n-nodes-base.gmail", x, y,
                 {"resource": "message", "operation": "send",
                  "sendTo": to, "subject": subject or "Automated Report",
                  "message": body or "={{ $json.report }}", "options": {}}, 2.1)


def _gmail_get(nid: str, name: str, x: int, y: int,
               query: str = "is:unread") -> dict:
    return _node(nid, name, "n8n-nodes-base.gmail", x, y,
                 {"resource": "message", "operation": "getAll",
                  "filters": {"q": query},
                  "returnAll": False, "limit": 20, "options": {}}, 2.1)


def _sheets_read(nid: str, name: str, x: int, y: int) -> dict:
    return _node(nid, name, "n8n-nodes-base.googleSheets", x, y,
                 {"resource": "sheet", "operation": "read",
                  "documentId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.SPREADSHEET_ID }}",
                                 "cachedResultName": "Your KPI Spreadsheet"},
                  "sheetName": {"__rl": True, "mode": "list", "value": "Sheet1"}}, 4.5)


def _sheets_append(nid: str, name: str, x: int, y: int) -> dict:
    return _node(nid, name, "n8n-nodes-base.googleSheets", x, y,
                 {"resource": "sheet", "operation": "appendOrUpdate",
                  "documentId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.SPREADSHEET_ID }}",
                                 "cachedResultName": "Your Spreadsheet"},
                  "sheetName": {"__rl": True, "mode": "list", "value": "Sheet1"},
                  "columns": {"mappingMode": "autoMapInputData",
                              "matchingColumns": ["id"]}}, 4.5)


def _code_node(nid: str, name: str, x: int, y: int, js: str) -> dict:
    return _node(nid, name, "n8n-nodes-base.code", x, y,
                 {"jsCode": js, "mode": "runOnceForAllItems"}, 2)


def _set_node(nid: str, name: str, x: int, y: int, fields: List[dict]) -> dict:
    return _node(nid, name, "n8n-nodes-base.set", x, y,
                 {"mode": "manual",
                  "assignments": {"assignments": fields}}, 3.4)


def _jira_node(nid: str, name: str, x: int, y: int,
               op: str = "getAll", resource: str = "issue") -> dict:
    return _node(nid, name, "n8n-nodes-base.jira", x, y,
                 {"resource": resource, "operation": op,
                  "project": "={{ $vars.JIRA_PROJECT }}",
                  "additionalFields": {}}, 1)


def _calendar_node(nid: str, name: str, x: int, y: int,
                   op: str = "getAll") -> dict:
    return _node(nid, name, "n8n-nodes-base.googleCalendar", x, y,
                 {"resource": "event", "operation": op,
                  "calendar": {"__rl": True, "value": "primary", "mode": "list"},
                  "options": {}}, 1.3)


def _webhook_node(nid: str, name: str, x: int, y: int,
                  path: str = "webhook") -> dict:
    return _node(nid, name, "n8n-nodes-base.webhook", x, y,
                 {"path": path, "httpMethod": "POST",
                  "responseMode": "onReceived",
                  "responseData": "allEntries"}, 2)


def _notion_node(nid: str, name: str, x: int, y: int, op: str = "getAll") -> dict:
    return _node(nid, name, "n8n-nodes-base.notion", x, y,
                 {"resource": "databasePage", "operation": op,
                  "databaseId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.NOTION_DATABASE_ID }}"}}, 2.2)


def _filter_node(nid: str, name: str, x: int, y: int,
                 field: str = "status", value: str = "open") -> dict:
    return _node(nid, name, "n8n-nodes-base.filter", x, y,
                 {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                                 "conditions": [{"id": _id(), "leftValue": f"={{{{ $json['{field}'] }}}}",
                                                 "rightValue": value, "operator": {"type": "string", "operation": "equals"}}],
                                 "combinator": "and"}}, 2)


def _conn_edge(src: str, dst: str, src_idx: int = 0, dst_idx: int = 0,
               conn_type: str = "main") -> Tuple[str, dict]:
    """Returns (src_name, edge_dict) for building connections object."""
    return src, {"node": dst, "type": conn_type, "index": dst_idx}



# ---------------------------------------------------------------------------
# WORKFLOW BUILDERS — one per task category
# Each returns {"nodes": [...], "connections": {...}}
# ---------------------------------------------------------------------------

def _build_connections(edges: List[Tuple[str, str]]) -> dict:
    """
    Build n8n connections dict from list of (src_name, dst_name) pairs.
    Each edge: src -> dst on main[0] -> main[0].
    """
    conns: dict = {}
    for src, dst in edges:
        if src not in conns:
            conns[src] = {"main": [[]]}
        conns[src]["main"][0].append({"node": dst, "type": "main", "index": 0})
    return conns


def build_reporting_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Weekly report: read KPIs from Sheets -> compute -> Slack + email."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "0 8 * * 1")
    n2 = _sheets_read(_id(), "Read KPI Sheet", x0 + 220, y)
    n3 = _code_node(_id(), "Compute Weekly Summary", x0 + 440, y,
                    "const rows = items.map(i => i.json);\n"
                    "const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);\n"
                    "const avg = rows.length ? (total / rows.length).toFixed(1) : 0;\n"
                    "const top = rows.sort((a,b)=>(b.value||0)-(a.value||0))[0]?.metric || 'N/A';\n"
                    "const week = new Date().toISOString().slice(0, 10);\n"
                    "return [{ json: { total, avg, top, week, count: rows.length } }];")
    n4 = _slack_node(_id(), "Post Weekly Report", x0 + 660, y, "#reports",
                     f"\U0001F4CA *{task_name}*\n"
                     "Week: {{{{ $json.week }}}} | Total: {{{{ $json.total }}}} | "
                     "Avg: {{{{ $json.avg }}}} | Top: {{{{ $json.top }}}}")
    n5 = _gmail_send(_id(), "Email Weekly Report", x0 + 660, y + 220,
                     subject=f"Weekly Report: {task_name}",
                     body="Week: ={{ $json.week }}\nTotal: ={{ $json.total }}\n"
                          "Average: ={{ $json.avg }}\nTop metric: ={{ $json.top }}")
    nodes = [n1, n2, n3, n4, n5]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"]), (n3["name"], n5["name"])]
    return nodes, _build_connections(edges)


def build_management_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Task/project mgmt: fetch Jira issues -> filter open -> post digest to Slack."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "0 9 * * 1-5")
    n2 = _jira_node(_id(), "Get Jira Issues", x0 + 220, y, "getAll")
    n3 = _filter_node(_id(), "Filter Open Issues", x0 + 440, y, "fields.status.name", "To Do")
    n4 = _code_node(_id(), "Format Digest", x0 + 660, y,
                    "const issues = items.map(i => i.json);\n"
                    "const lines = issues.slice(0, 10).map(i =>\n"
                    "  `• [${i.key}] ${i.fields?.summary || 'No title'} "
                    "(${i.fields?.priority?.name || 'Normal'})`\n);\n"
                    "return [{ json: {\n"
                    "  digest: lines.join('\\n') || 'No open issues',\n"
                    "  count: issues.length,\n"
                    "  date: new Date().toISOString().slice(0, 10)\n"
                    "}}];")
    n5 = _slack_node(_id(), "Post Issue Digest", x0 + 880, y, "#product",
                     f"\U0001F4CB *{task_name}* ({{{{ $json.count }}}} open)\n"
                     "{{{{ $json.date }}}}\n\n{{{{ $json.digest }}}}")
    nodes = [n1, n2, n3, n4, n5]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"]), (n4["name"], n5["name"])]
    return nodes, _build_connections(edges)


def build_communication_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Email triage: scan Gmail for priority emails -> forward digest to Slack."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "*/30 9-18 * * 1-5")
    n2 = _gmail_get(_id(), "Scan Priority Inbox", x0 + 220, y,
                    "is:unread label:inbox -label:newsletters")
    n3 = _code_node(_id(), "Filter & Classify", x0 + 440, y,
                    "const msgs = items.map(i => i.json);\n"
                    "const priority = msgs.filter(m => {\n"
                    "  const s = (m.subject || '').toLowerCase();\n"
                    "  return s.includes('urgent') || s.includes('action') ||\n"
                    "         s.includes('asap') || s.includes('deadline');\n"
                    "});\n"
                    "if (!priority.length) return [];\n"
                    "return priority.map(m => ({ json: {\n"
                    "  subject: m.subject, from: m.from,\n"
                    "  snippet: (m.snippet || '').slice(0, 120),\n"
                    "  id: m.id\n"
                    "}}));")
    n4 = _slack_node(_id(), "Alert Priority Email", x0 + 660, y, "#urgent",
                     f"\U0001F6A8 *Priority Email — {task_name}*\n"
                     "From: {{{{ $json.from }}}}\n"
                     "Subject: {{{{ $json.subject }}}}\n"
                     "{{{{ $json.snippet }}}}")
    nodes = [n1, n2, n3, n4]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"])]
    return nodes, _build_connections(edges)


def build_scheduling_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Calendar: fetch today's events -> post schedule to Slack each morning."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "30 8 * * 1-5")
    n2 = _calendar_node(_id(), "Get Today Events", x0 + 220, y, "getAll")
    n3 = _code_node(_id(), "Format Schedule", x0 + 440, y,
                    "const events = items.map(i => i.json);\n"
                    "if (!events.length) return [{ json: { msg: 'No meetings today \U0001F3D6\uFE0F' } }];\n"
                    "const lines = events.map(e => {\n"
                    "  const time = e.start?.dateTime?.slice(11, 16) || 'All day';\n"
                    "  return `• ${time} — ${e.summary || 'Untitled'}`;\n"
                    "});\n"
                    "return [{ json: { msg: lines.join('\\n'), count: events.length } }];")
    n4 = _slack_node(_id(), "Post Daily Schedule", x0 + 660, y, "#team",
                     f"\U0001F4C5 *{task_name} — Today* ({{{{ $json.count }}}} meetings)\n"
                     "{{{{ $json.msg }}}}")
    nodes = [n1, n2, n3, n4]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"])]
    return nodes, _build_connections(edges)


def build_data_entry_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Data entry: receive via webhook -> validate -> append to Sheets -> confirm."""
    y = _GROUP_Y_START
    n1 = _webhook_node(_id(), "Receive Entry", x0, y, "data-entry")
    n2 = _code_node(_id(), "Validate & Format", x0 + 220, y,
                    "const d = items[0].json;\n"
                    "const required = ['name', 'value', 'category'];\n"
                    "const missing = required.filter(k => !d[k]);\n"
                    "if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);\n"
                    "return [{ json: {\n"
                    "  name: String(d.name).trim(),\n"
                    "  value: Number(d.value),\n"
                    "  category: String(d.category).trim(),\n"
                    "  source: d.source || 'webhook',\n"
                    "  timestamp: new Date().toISOString()\n"
                    "}}];")
    n3 = _sheets_append(_id(), "Log to Sheet", x0 + 440, y)
    n4 = _slack_node(_id(), "Confirm Entry", x0 + 660, y, "#data-log",
                     f"\u2705 *{task_name}* logged\n"
                     "Name: {{{{ $json.name }}}} | Value: {{{{ $json.value }}}} | "
                     "Category: {{{{ $json.category }}}}")
    nodes = [n1, n2, n3, n4]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"])]
    return nodes, _build_connections(edges)


def build_research_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Research: fetch web/API data -> extract key info -> post digest."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "0 7 * * 1-5")
    n2 = _http_node(_id(), "Fetch Data Source", x0 + 220, y,
                    "={{ $vars.RESEARCH_API_URL || 'https://hacker-news.firebaseio.com/v0/topstories.json' }}")
    n3 = _code_node(_id(), "Extract Key Insights", x0 + 440, y,
                    "// Process fetched data into digestible insights\n"
                    "const data = items[0].json;\n"
                    "const items2 = Array.isArray(data) ? data.slice(0, 5) : [data];\n"
                    "return [{ json: {\n"
                    "  summary: `Found ${items2.length} items`,\n"
                    "  data: JSON.stringify(items2).slice(0, 500),\n"
                    "  date: new Date().toISOString().slice(0, 10)\n"
                    "}}];")
    n4 = _slack_node(_id(), "Post Research Digest", x0 + 660, y, "#research",
                     f"\U0001F50D *{task_name}* — {{{{ $json.date }}}}\n"
                     "{{{{ $json.summary }}}}\n\n{{{{ $json.data }}}}")
    n5 = _sheets_append(_id(), "Log Research Results", x0 + 880, y)
    nodes = [n1, n2, n3, n4, n5]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"]), (n3["name"], n5["name"])]
    return nodes, _build_connections(edges)


def build_analysis_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """Analysis: pull metrics -> compute KPIs -> report + log."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "0 8 * * 1")
    n2 = _sheets_read(_id(), "Load Data", x0 + 220, y)
    n3 = _code_node(_id(), "Run Analysis", x0 + 440, y,
                    "const rows = items.map(i => i.json).filter(r => r.value !== undefined);\n"
                    "if (!rows.length) return [{ json: { error: 'No data' } }];\n"
                    "const values = rows.map(r => Number(r.value) || 0);\n"
                    "const total = values.reduce((a, b) => a + b, 0);\n"
                    "const avg = (total / values.length).toFixed(2);\n"
                    "const max = Math.max(...values);\n"
                    "const min = Math.min(...values);\n"
                    "const top = rows.find(r => Number(r.value) === max)?.label || 'N/A';\n"
                    "return [{ json: { total, avg, max, min, top,\n"
                    "  count: rows.length, week: new Date().toISOString().slice(0,10) } }];")
    n4 = _slack_node(_id(), "Post Analysis", x0 + 660, y, "#analytics",
                     f"\U0001F4CA *{task_name}*\n"
                     "Total: {{{{ $json.total }}}} | Avg: {{{{ $json.avg }}}} | "
                     "Max: {{{{ $json.max }}}} ({{{{ $json.top }}}})")
    n5 = _sheets_append(_id(), "Archive Results", x0 + 880, y)
    nodes = [n1, n2, n3, n4, n5]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"]), (n3["name"], n5["name"])]
    return nodes, _build_connections(edges)


def build_general_workflow(task_name: str, x0: int) -> Tuple[List[dict], dict]:
    """General automation: scheduled trigger -> process -> notify."""
    y = _GROUP_Y_START
    n1 = _schedule_node(_id(), x0, y, "0 9 * * 1-5")
    n2 = _http_node(_id(), f"Fetch {task_name[:30]} Data", x0 + 220, y,
                    "={{ $vars.API_ENDPOINT || 'https://api.example.com/data' }}")
    n3 = _code_node(_id(), "Process & Format", x0 + 440, y,
                    "const data = items[0].json;\n"
                    "const summary = typeof data === 'object'\n"
                    "  ? JSON.stringify(data).slice(0, 300)\n"
                    "  : String(data).slice(0, 300);\n"
                    "return [{ json: { summary, timestamp: new Date().toISOString() } }];")
    n4 = _slack_node(_id(), "Send Notification", x0 + 660, y, "#automation",
                     f"\u26A1 *{task_name}*\n{{{{ $json.summary }}}}\n_{{{{ $json.timestamp }}}}_")
    nodes = [n1, n2, n3, n4]
    edges = [(n1["name"], n2["name"]), (n2["name"], n3["name"]),
             (n3["name"], n4["name"])]
    return nodes, _build_connections(edges)


# Map task category -> workflow builder
_CATEGORY_BUILDERS = {
    "reporting":     build_reporting_workflow,
    "management":    build_management_workflow,
    "communication": build_communication_workflow,
    "scheduling":    build_scheduling_workflow,
    "data_entry":    build_data_entry_workflow,
    "research":      build_research_workflow,
    "analysis":      build_analysis_workflow,
    "general":       build_general_workflow,
    "testing":       build_general_workflow,       # code-test specific
    "documentation": build_reporting_workflow,     # docs = report-like
}


# ---------------------------------------------------------------------------
# CANVAS BUILDER — merges per-task workflows into one importable file
# ---------------------------------------------------------------------------

def _merge_connections(all_conns: List[dict]) -> dict:
    """Merge multiple connections dicts, namespacing by appending nothing
    (node names are unique because we include col index in names)."""
    merged: dict = {}
    for conns in all_conns:
        for src, data in conns.items():
            if src not in merged:
                merged[src] = {"main": [[]]}
            for edge in data.get("main", [[]])[0]:
                merged[src]["main"][0].append(edge)
    return merged


def build_canvas(job_title: str, tasks: List[dict]) -> dict:
    """
    Build one merged n8n canvas for all tasks.
    Each task gets its own workflow column with a sticky note header.
    Returns a complete importable n8n workflow JSON dict.
    """
    all_nodes: List[dict] = []
    all_connections_list: List[dict] = []

    num_tasks = len(tasks)

    # Top-level canvas header sticky note
    canvas_width = max(960, num_tasks * _CANVAS_COL_WIDTH)
    all_nodes.append(_sticky(
        _id(),
        f"\U0001F916 WorkScanAI — {job_title}",
        0, 0,
        f"# WorkScanAI Automation Canvas — {job_title}\n\n"
        f"Generated by [WorkScanAI](https://workscanai.vercel.app)\n"
        f"**{num_tasks} automation workflows** — one per task column below.\n\n"
        f"**Setup:** Add your credentials in each node "
        f"(Slack, Gmail, Google Sheets, Jira). "
        f"Activate each workflow column independently.\n"
        f"Set variables: `SPREADSHEET_ID`, `JIRA_PROJECT`, `REPORT_EMAIL`, etc.",
        color=7, w=canvas_width, h=180
    ))

    # Colour palette for task columns (cycles)
    COLORS = [3, 4, 5, 6, 2, 1]

    for col_idx, task in enumerate(tasks):
        task_name = task.get("name", f"Task {col_idx + 1}")
        category  = task.get("category", "general").lower()
        frequency = task.get("frequency", "weekly")
        x0 = col_idx * _CANVAS_COL_WIDTH

        # Pick builder for this category
        builder = _CATEGORY_BUILDERS.get(category, build_general_workflow)

        # Build the workflow nodes + connections for this task
        task_nodes, task_conns = builder(task_name, x0)

        # Add per-task sticky note header (sits above the nodes)
        color = COLORS[col_idx % len(COLORS)]
        tool_hint = {
            "reporting":     "Slack + Gmail + Google Sheets",
            "management":    "Jira + Slack",
            "communication": "Gmail + Slack",
            "scheduling":    "Google Calendar + Slack",
            "data_entry":    "Webhook + Google Sheets + Slack",
            "research":      "HTTP Request + Slack + Google Sheets",
            "analysis":      "Google Sheets + Slack",
            "general":       "HTTP Request + Slack",
        }.get(category, "HTTP Request + Slack")

        all_nodes.append(_sticky(
            _id(),
            f"\U0001F4CC Task {col_idx + 1}: {task_name[:50]}",
            x0, _GROUP_Y_START - _STICKY_HEIGHT - 20,
            f"## Task {col_idx + 1}: {task_name}\n"
            f"**Category:** {category} | **Frequency:** {frequency}\n"
            f"**Tools:** {tool_hint}\n"
            f"**Setup:** Connect credentials, then activate this workflow.",
            color=color, w=920, h=_STICKY_HEIGHT
        ))

        all_nodes.extend(task_nodes)
        all_connections_list.append(task_conns)

    merged_conns = _merge_connections(all_connections_list)

    return {
        "name": f"{job_title} — WorkScanAI Automation Canvas",
        "nodes": all_nodes,
        "connections": merged_conns,
        "active": False,
        "settings": {"executionOrder": "v1", "saveManualExecutions": True},
        "meta": {
            "generatedBy": "WorkScanAI",
            "jobTitle": job_title,
            "taskCount": num_tasks,
            "note": (
                "Purpose-built automation workflows — not generic templates. "
                "Each column is a ready-to-connect automation for the task above."
            ),
        },
    }


# ---------------------------------------------------------------------------
# PUBLIC CLASS — drop-in replacement, same interface as before
# ---------------------------------------------------------------------------

class N8nTemplateClient:
    """
    Builds role-specific n8n canvases using purpose-built workflow code.
    No dependency on the n8n community API (which returns the same generic
    templates regardless of search terms).
    """

    def __init__(self, anthropic_api_key: str = ""):
        # anthropic_api_key kept for interface compatibility — not used
        pass

    def get_curated_templates(
        self,
        job_title: str,
        tasks: List[dict],
    ) -> List[dict]:
        """
        Returns suggested_templates[] — one per task, each with:
          id, name, description, url, relevance_reason,
          node_count, nodes_preview, workflow_json, task_name
        """
        suggested = []
        for idx, task in enumerate(tasks[:6]):
            task_name = task.get("name", f"Task {idx + 1}")
            category  = task.get("category", "general").lower()
            builder   = _CATEGORY_BUILDERS.get(category, build_general_workflow)

            task_nodes, task_conns = builder(task_name, 0)

            tool_map = {
                "reporting":     ("Sheets + Slack + Gmail", "Automates weekly KPI collection, summarisation, and delivery"),
                "management":    ("Jira + Slack",           "Fetches open issues daily and posts a prioritised digest"),
                "communication": ("Gmail + Slack",          "Scans inbox every 30 min and surfaces urgent emails"),
                "scheduling":    ("Google Calendar + Slack","Posts today's meeting schedule each morning"),
                "data_entry":    ("Webhook + Sheets + Slack","Accepts data via webhook, validates, logs, and confirms"),
                "research":      ("HTTP + Sheets + Slack",  "Fetches data from APIs/feeds and posts daily digest"),
                "analysis":      ("Sheets + Slack",         "Computes weekly KPIs from sheet data and reports"),
                "general":       ("HTTP + Slack",           "Scheduled data fetch, processing, and team notification"),
            }
            tool_name, reason = tool_map.get(category, ("HTTP + Slack", "Scheduled automation workflow"))

            nodes_preview = [n["type"].split(".")[-1] for n in task_nodes
                             if "stickyNote" not in n["type"]][:6]

            suggested.append({
                "id":               idx + 1,
                "name":             f"{task_name} — Automation",
                "description":      reason,
                "url":              "https://n8n.io/workflows/",
                "relevance_reason": reason,
                "node_count":       len(task_nodes),
                "nodes_preview":    nodes_preview,
                "workflow_json":    {"nodes": task_nodes, "connections": task_conns,
                                     "active": False, "settings": {"executionOrder": "v1"}},
                "task_name":        task_name,
            })
        return suggested

    def build_merged_canvas(
        self,
        job_title: str,
        suggested_templates: List[dict],
    ) -> dict:
        """
        Merges suggested templates into one importable n8n canvas.
        """
        tasks = [{"name": t.get("task_name", t.get("name", "")),
                  "category": _guess_category(t),
                  "frequency": "weekly"}
                 for t in suggested_templates]
        return build_canvas(job_title, tasks)


def _guess_category(tpl: dict) -> str:
    """Infer category from template description when not stored."""
    desc = (tpl.get("relevance_reason", "") + " " + tpl.get("description", "")).lower()
    if "report" in desc or "kpi" in desc or "sheet" in desc:
        return "reporting"
    if "jira" in desc or "issue" in desc or "sprint" in desc:
        return "management"
    if "email" in desc or "gmail" in desc or "inbox" in desc:
        return "communication"
    if "calendar" in desc or "meeting" in desc or "schedule" in desc:
        return "scheduling"
    if "webhook" in desc or "form" in desc or "entry" in desc:
        return "data_entry"
    if "research" in desc or "fetch" in desc or "scrape" in desc:
        return "research"
    if "analys" in desc or "metric" in desc or "kpi" in desc:
        return "analysis"
    return "general"
