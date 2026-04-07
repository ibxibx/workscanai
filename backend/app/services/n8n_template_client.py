"""
N8nTemplateClient â€” purpose-built n8n automation canvases per task category.

ARCHITECTURE (final, after research):
  The n8n community search API returns the SAME 10 templates for EVERY query
  regardless of search terms â€” confirmed with 10 different queries all returning
  identical results. It is completely broken for relevance matching.

  SOLUTION: Purpose-built workflow JSON per task category.
  20 distinct workflow patterns covering every major job function.
  No API dependency. Always relevant. Always importable.

  SUPPORTED CATEGORIES (20):
    Core:       reporting, management, communication, scheduling, data_entry,
                research, analysis, general, testing, documentation
    Extended:   customer_support, sales, marketing, hr, finance,
                design, devops, legal, content, product

  Canvas format:
    - One merged n8n JSON file per job scan
    - Top header sticky note (color 7, full canvas width)
    - One column per task (x-offset 1000px each)
    - Per-task coloured sticky note above each column
    - Real trigger -> process -> output chains
    - Correct node types with correct typeVersion numbers
    - Valid connections dict format
"""

from __future__ import annotations
import uuid
from typing import Dict, List, Tuple

_COL_W    = 1000  # horizontal gap between task columns
_Y_START  = 380   # y where node chains begin (below top sticky)
_Y_GAP    = 200   # vertical gap between nodes within a column
_STICKY_H = 160   # height of per-task sticky note header


# ---------------------------------------------------------------------------
# Node factory helpers
# ---------------------------------------------------------------------------

def _uid() -> str:
    return str(uuid.uuid4())

def _node(nid, name, ntype, x, y, params=None, tv=1):
    return {"id": nid, "name": name, "type": ntype,
            "typeVersion": tv, "position": [x, y],
            "parameters": params or {}}

def _sticky(nid, name, x, y, content, color=3, w=940, h=140):
    return {"id": nid, "name": name, "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1, "position": [x, y],
            "parameters": {"color": color, "width": w, "height": h, "content": content}}

def _sched(nid, x, y, cron="0 9 * * 1"):
    return _node(nid, "Schedule Trigger", "n8n-nodes-base.scheduleTrigger", x, y,
                 {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}})

def _webhook(nid, name, x, y, path="webhook"):
    return _node(nid, name, "n8n-nodes-base.webhook", x, y,
                 {"path": path, "httpMethod": "POST",
                  "responseMode": "onReceived", "responseData": "allEntries"}, 2)

def _http(nid, name, x, y, url="={{ $vars.API_URL }}", method="GET"):
    return _node(nid, name, "n8n-nodes-base.httpRequest", x, y,
                 {"method": method, "url": url, "authentication": "none", "options": {}}, 4.2)

def _code(nid, name, x, y, js):
    return _node(nid, name, "n8n-nodes-base.code", x, y,
                 {"jsCode": js, "mode": "runOnceForAllItems"}, 2)

def _set_node(nid, name, x, y, assignments):
    return _node(nid, name, "n8n-nodes-base.set", x, y,
                 {"mode": "manual", "assignments": {"assignments": [
                     {"id": _uid(), "name": k, "value": v, "type": "string"}
                     for k, v in assignments.items()]}}, 3.4)

def _filter(nid, name, x, y, left, op, right):
    return _node(nid, name, "n8n-nodes-base.filter", x, y,
                 {"conditions": {"options": {"caseSensitive": False, "typeValidation": "loose"},
                  "conditions": [{"id": _uid(), "leftValue": left,
                                  "rightValue": right,
                                  "operator": {"type": "string", "operation": op}}],
                  "combinator": "and"}}, 2)

def _slack(nid, name, x, y, channel="#automation", text="={{ $json.summary }}"):
    return _node(nid, name, "n8n-nodes-base.slack", x, y,
                 {"resource": "message", "operation": "post",
                  "select": "channel",
                  "channelId": {"__rl": True, "value": channel, "mode": "name"},
                  "text": text, "otherOptions": {}}, 2.2)

def _gmail_send(nid, name, x, y, to="={{ $vars.REPORT_EMAIL }}",
                subject="Report", body="={{ $json.report }}"):
    return _node(nid, name, "n8n-nodes-base.gmail", x, y,
                 {"resource": "message", "operation": "send",
                  "sendTo": to, "subject": subject, "message": body, "options": {}}, 2.1)

def _gmail_get(nid, name, x, y, q="is:unread"):
    return _node(nid, name, "n8n-nodes-base.gmail", x, y,
                 {"resource": "message", "operation": "getAll",
                  "filters": {"q": q}, "returnAll": False, "limit": 20, "options": {}}, 2.1)

def _sheets_read(nid, name, x, y, sheet="Sheet1"):
    return _node(nid, name, "n8n-nodes-base.googleSheets", x, y,
                 {"resource": "sheet", "operation": "read",
                  "documentId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.SPREADSHEET_ID }}",
                                 "cachedResultName": "Spreadsheet"},
                  "sheetName": {"__rl": True, "mode": "list", "value": sheet}}, 4.5)

def _sheets_append(nid, name, x, y):
    return _node(nid, name, "n8n-nodes-base.googleSheets", x, y,
                 {"resource": "sheet", "operation": "appendOrUpdate",
                  "documentId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.SPREADSHEET_ID }}",
                                 "cachedResultName": "Log Sheet"},
                  "sheetName": {"__rl": True, "mode": "list", "value": "Sheet1"},
                  "columns": {"mappingMode": "autoMapInputData",
                              "matchingColumns": ["id"]}}, 4.5)

def _jira(nid, name, x, y, op="getAll", resource="issue"):
    return _node(nid, name, "n8n-nodes-base.jira", x, y,
                 {"resource": resource, "operation": op,
                  "project": "={{ $vars.JIRA_PROJECT }}", "additionalFields": {}}, 1)

def _calendar(nid, name, x, y, op="getAll"):
    return _node(nid, name, "n8n-nodes-base.googleCalendar", x, y,
                 {"resource": "event", "operation": op,
                  "calendar": {"__rl": True, "value": "primary", "mode": "list"},
                  "options": {}}, 1.3)

def _notion(nid, name, x, y, op="getAll"):
    return _node(nid, name, "n8n-nodes-base.notion", x, y,
                 {"resource": "databasePage", "operation": op,
                  "databaseId": {"__rl": True, "mode": "list",
                                 "value": "={{ $vars.NOTION_DATABASE_ID }}"}}, 2.2)

def _airtable(nid, name, x, y, op="list"):
    return _node(nid, name, "n8n-nodes-base.airtable", x, y,
                 {"operation": op,
                  "base": {"__rl": True, "mode": "list", "value": "={{ $vars.AIRTABLE_BASE_ID }}"},
                  "table": {"__rl": True, "mode": "list", "value": "={{ $vars.AIRTABLE_TABLE_ID }}"}}, 2.1)

def _hubspot(nid, name, x, y, op="getAll", resource="contact"):
    return _node(nid, name, "n8n-nodes-base.hubspot", x, y,
                 {"resource": resource, "operation": op,
                  "additionalFields": {}}, 2)

def _github(nid, name, x, y, op="getAll", resource="pullRequest"):
    return _node(nid, name, "n8n-nodes-base.github", x, y,
                 {"resource": resource, "operation": op,
                  "owner": "={{ $vars.GITHUB_OWNER }}",
                  "repository": "={{ $vars.GITHUB_REPO }}"}, 1)

def _typeform(nid, name, x, y):
    return _node(nid, name, "n8n-nodes-base.typeformTrigger", x, y,
                 {"formId": "={{ $vars.TYPEFORM_FORM_ID }}"}, 1)

def _conns(pairs: List[Tuple[str, str]]) -> dict:
    c: dict = {}
    for src, dst in pairs:
        c.setdefault(src, {"main": [[]]})["main"][0].append(
            {"node": dst, "type": "main", "index": 0})
    return c


# ---------------------------------------------------------------------------
# WORKFLOW BUILDERS â€” 20 categories, each returns (nodes, connections)
# ---------------------------------------------------------------------------

def _wf_reporting(task_name, x0):
    """Weekly KPI report: Sheets -> compute -> Slack + email."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Read KPI Data", x0+220, y),
          _code(_uid(), "Compute Summary", x0+440, y,
            "const rows=items.map(i=>i.json);\n"
            "const vals=rows.map(r=>Number(r.value)||0);\n"
            "const total=vals.reduce((a,b)=>a+b,0);\n"
            "const avg=rows.length?(total/rows.length).toFixed(1):0;\n"
            "const top=rows.sort((a,b)=>(b.value||0)-(a.value||0))[0]?.metric||'N/A';\n"
            "return [{json:{total,avg,top,count:rows.length,week:new Date().toISOString().slice(0,10)}}];"),
          _slack(_uid(), "Post to Slack", x0+660, y, "#reports",
            f"\U0001f4ca *{task_name}*\n"
            "Week: {{{{ $json.week }}}} | Total: {{{{ $json.total }}}} | "
            "Avg: {{{{ $json.avg }}}} | Top: {{{{ $json.top }}}}"),
          _gmail_send(_uid(), "Email Report", x0+660, y+_Y_GAP,
            subject=f"Weekly Report: {task_name}",
            body="Week: ={{ $json.week }}\nTotal: ={{ $json.total }}\nAvg: ={{ $json.avg }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_management(task_name, x0):
    """Jira backlog digest: fetch open issues -> format -> Slack."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1-5"),
          _jira(_uid(), "Get Open Issues", x0+220, y),
          _code(_uid(), "Format Digest", x0+440, y,
            "const issues=items.map(i=>i.json);\n"
            "const lines=issues.slice(0,10).map(i=>`\u2022 [${i.key}] ${i.fields?.summary||'(no title)'} \u2014 ${i.fields?.priority?.name||'Normal'}`);\n"
            "return [{json:{digest:lines.join('\\n')||'No open issues',count:issues.length,date:new Date().toISOString().slice(0,10)}}];"),
          _slack(_uid(), "Post Issue Digest", x0+660, y, "#product",
            f"\U0001f4cb *{task_name}* ({{{{ $json.count }}}} open) \u2014 {{{{ $json.date }}}}\n\n{{{{ $json.digest }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_communication(task_name, x0):
    """Email triage: scan Gmail every 30min, filter urgent, alert Slack."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "*/30 9-18 * * 1-5"),
          _gmail_get(_uid(), "Scan Inbox", x0+220, y, "is:unread label:inbox -label:newsletters"),
          _code(_uid(), "Filter Urgent", x0+440, y,
            "const msgs=items.map(i=>i.json);\n"
            "const urgent=msgs.filter(m=>{\n"
            "  const s=(m.subject||'').toLowerCase();\n"
            "  return s.includes('urgent')||s.includes('action needed')||s.includes('asap')||s.includes('deadline');\n"
            "});\n"
            "if(!urgent.length) return [];\n"
            "return urgent.map(m=>({json:{subject:m.subject,from:m.from,snippet:(m.snippet||'').slice(0,150)}}));"),
          _slack(_uid(), "Alert Priority Email", x0+660, y, "#urgent",
            f"\U0001f6a8 *Priority Email \u2014 {task_name}*\n"
            "From: {{{{ $json.from }}}}\n*{{{{ $json.subject }}}}*\n{{{{ $json.snippet }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_scheduling(task_name, x0):
    """Calendar digest: fetch today's events each morning, post to Slack."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "30 8 * * 1-5"),
          _calendar(_uid(), "Get Today Events", x0+220, y),
          _code(_uid(), "Format Schedule", x0+440, y,
            "const evts=items.map(i=>i.json);\n"
            "if(!evts.length) return [{json:{msg:'No meetings today \U0001f3d6\ufe0f',count:0}}];\n"
            "const lines=evts.map(e=>{\n"
            "  const t=e.start?.dateTime?.slice(11,16)||'All day';\n"
            "  return `\u2022 ${t} \u2014 ${e.summary||'Untitled'}`;\n"
            "});\n"
            "return [{json:{msg:lines.join('\\n'),count:evts.length}}];"),
          _slack(_uid(), "Post Daily Schedule", x0+660, y, "#team",
            f"\U0001f4c5 *{task_name} \u2014 Today* ({{{{ $json.count }}}} events)\n{{{{ $json.msg }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_data_entry(task_name, x0):
    """Data entry: webhook -> validate -> Sheets append -> Slack confirm."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "Receive Entry", x0, y, "data-entry"),
          _code(_uid(), "Validate & Format", x0+220, y,
            "const d=items[0].json;\n"
            "const req=['name','value'];\n"
            "const miss=req.filter(k=>!d[k]);\n"
            "if(miss.length) throw new Error('Missing: '+miss.join(', '));\n"
            "return [{json:{name:String(d.name).trim(),value:Number(d.value),\n"
            "  category:String(d.category||'general').trim(),\n"
            "  source:d.source||'webhook',timestamp:new Date().toISOString()}}];"),
          _sheets_append(_uid(), "Log to Sheet", x0+440, y),
          _slack(_uid(), "Confirm Logged", x0+660, y, "#data-log",
            f"\u2705 *{task_name}* logged\n"
            "Name: {{{{ $json.name }}}} | Value: {{{{ $json.value }}}} | {{{{ $json.timestamp }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_research(task_name, x0):
    """Research digest: fetch API/feed -> extract insights -> Slack + log."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7 * * 1-5"),
          _http(_uid(), "Fetch Data Source", x0+220, y,
            "={{ $vars.RESEARCH_API_URL || 'https://hacker-news.firebaseio.com/v0/topstories.json' }}"),
          _code(_uid(), "Extract Insights", x0+440, y,
            "const data=items[0].json;\n"
            "const arr=Array.isArray(data)?data.slice(0,5):[data];\n"
            "return [{json:{summary:`Found ${arr.length} items from data source`,\n"
            "  items:JSON.stringify(arr).slice(0,400),date:new Date().toISOString().slice(0,10)}}];"),
          _slack(_uid(), "Post Research Digest", x0+660, y, "#research",
            f"\U0001f50d *{task_name}* \u2014 {{{{ $json.date }}}}\n{{{{ $json.summary }}}}\n\n{{{{ $json.items }}}}"),
          _sheets_append(_uid(), "Log Research", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_analysis(task_name, x0):
    """Data analysis: read Sheets -> compute KPIs -> Slack + archive."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Load Dataset", x0+220, y),
          _code(_uid(), "Run Analysis", x0+440, y,
            "const rows=items.map(i=>i.json).filter(r=>r.value!==undefined);\n"
            "if(!rows.length) return [{json:{error:'No data found'}}];\n"
            "const vals=rows.map(r=>Number(r.value)||0);\n"
            "const total=vals.reduce((a,b)=>a+b,0);\n"
            "const avg=(total/vals.length).toFixed(2);\n"
            "const max=Math.max(...vals);\n"
            "const top=rows.find(r=>Number(r.value)===max)?.label||'N/A';\n"
            "return [{json:{total,avg,max,top,count:rows.length,week:new Date().toISOString().slice(0,10)}}];"),
          _slack(_uid(), "Report Analysis", x0+660, y, "#analytics",
            f"\U0001f4ca *{task_name}*\n"
            "Total: {{{{ $json.total }}}} | Avg: {{{{ $json.avg }}}} | Max: {{{{ $json.max }}}} ({{{{ $json.top }}}})"),
          _sheets_append(_uid(), "Archive Results", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_testing(task_name, x0):
    """CI/CD test monitoring: poll GitHub Actions status -> alert Slack on failure."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "*/15 * * * *"),
          _github(_uid(), "Get Workflow Runs", x0+220, y, "list", "workflowRun"),
          _code(_uid(), "Check Failures", x0+440, y,
            "const runs=items.map(i=>i.json);\n"
            "const failed=runs.filter(r=>r.conclusion==='failure'||r.conclusion==='cancelled');\n"
            "if(!failed.length) return [];\n"
            "return failed.map(r=>({json:{name:r.name||'Unknown',\n"
            "  conclusion:r.conclusion,url:r.html_url,\n"
            "  branch:r.head_branch,sha:(r.head_sha||'').slice(0,7)}}));"),
          _slack(_uid(), "Alert Build Failure", x0+660, y, "#dev-alerts",
            f"\U0001f6a8 *Build Failed \u2014 {task_name}*\n"
            "Workflow: {{{{ $json.name }}}} | Branch: {{{{ $json.branch }}}}\n"
            "Status: {{{{ $json.conclusion }}}} | SHA: {{{{ $json.sha }}}}\n{{{{ $json.url }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_documentation(task_name, x0):
    """Docs update reminder: check Notion pages not updated in 30d -> Slack digest."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 10 * * 1"),
          _notion(_uid(), "Get Doc Pages", x0+220, y, "getAll"),
          _code(_uid(), "Find Stale Docs", x0+440, y,
            "const pages=items.map(i=>i.json);\n"
            "const cutoff=Date.now()-30*24*60*60*1000;\n"
            "const stale=pages.filter(p=>{\n"
            "  const edited=new Date(p.last_edited_time||0).getTime();\n"
            "  return edited<cutoff;\n"
            "});\n"
            "return stale.slice(0,10).map(p=>({json:{\n"
            "  title:p.properties?.Name?.title?.[0]?.plain_text||'Untitled',\n"
            "  last_edited:p.last_edited_time?.slice(0,10)||'unknown',\n"
            "  url:p.url\n"
            "}}));"),
          _slack(_uid(), "Remind to Update Docs", x0+660, y, "#docs",
            f"\U0001f4dd *Stale Documentation \u2014 {task_name}*\n"
            "\u2022 {{{{ $json.title }}}} (last edited: {{{{ $json.last_edited }}}})\n{{{{ $json.url }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_customer_support(task_name, x0):
    """Support ticket triage: webhook from support tool -> classify -> route to Slack channel."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "Receive Support Ticket", x0, y, "support-ticket"),
          _code(_uid(), "Classify & Route", x0+220, y,
            "const t=items[0].json;\n"
            "const subject=(t.subject||t.title||'').toLowerCase();\n"
            "const body=(t.body||t.description||'').toLowerCase();\n"
            "const text=subject+' '+body;\n"
            "let priority='normal'; let channel='#support';\n"
            "if(text.includes('urgent')||text.includes('broken')||text.includes('down')){\n"
            "  priority='high'; channel='#support-urgent';}\n"
            "else if(text.includes('billing')||text.includes('payment')||text.includes('refund')){\n"
            "  priority='billing'; channel='#support-billing';}\n"
            "return [{json:{id:t.id||_uid(),subject:t.subject||t.title||'No subject',\n"
            "  from:t.email||t.from||'unknown',priority,channel,\n"
            "  created:new Date().toISOString()}}];",
          ),
          _sheets_append(_uid(), "Log Ticket", x0+440, y),
          _slack(_uid(), "Route to Channel", x0+660, y, "={{ $json.channel }}",
            f"\U0001f3ab *New Ticket \u2014 {task_name}*\n"
            "ID: {{{{ $json.id }}}} | Priority: {{{{ $json.priority }}}}\n"
            "From: {{{{ $json.from }}}}\nSubject: {{{{ $json.subject }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[1]["name"],n[3]["name"])])
    return n, c


def _wf_sales(task_name, x0):
    """Sales pipeline: fetch HubSpot deals -> identify stalled -> alert reps."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _hubspot(_uid(), "Get Open Deals", x0+220, y, "getAll", "deal"),
          _code(_uid(), "Find Stalled Deals", x0+440, y,
            "const deals=items.map(i=>i.json);\n"
            "const cutoff=Date.now()-14*24*60*60*1000;\n"
            "const stalled=deals.filter(d=>{\n"
            "  const mod=new Date(d.properties?.hs_lastmodifieddate||0).getTime();\n"
            "  return mod<cutoff && d.properties?.dealstage!=='closedwon';\n"
            "});\n"
            "return stalled.slice(0,10).map(d=>({json:{\n"
            "  name:d.properties?.dealname||'Unnamed deal',\n"
            "  amount:d.properties?.amount||'0',\n"
            "  stage:d.properties?.dealstage||'unknown',\n"
            "  owner:d.properties?.hubspot_owner_id||'unassigned'\n"
            "}}));"),
          _slack(_uid(), "Alert Stalled Deals", x0+660, y, "#sales",
            f"\U0001f4b0 *Stalled Deal \u2014 {task_name}*\n"
            "\u2022 {{{{ $json.name }}}} | Stage: {{{{ $json.stage }}}} | Amount: ${{{{ $json.amount }}}}\n"
            "Owner ID: {{{{ $json.owner }}}}"),
          _sheets_append(_uid(), "Log Deal Activity", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_marketing(task_name, x0):
    """Marketing analytics: fetch campaign metrics -> compute ROI -> weekly report."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _http(_uid(), "Fetch Campaign Metrics", x0+220, y,
            "={{ $vars.MARKETING_API_URL || 'https://api.example.com/campaigns/metrics' }}"),
          _code(_uid(), "Compute Campaign ROI", x0+440, y,
            "const metrics=items[0].json;\n"
            "const campaigns=Array.isArray(metrics)?metrics:[metrics];\n"
            "const summary=campaigns.map(c=>({\n"
            "  name:c.name||'Campaign',\n"
            "  spend:Number(c.spend||0).toFixed(0),\n"
            "  revenue:Number(c.revenue||0).toFixed(0),\n"
            "  roi:c.spend?((c.revenue-c.spend)/c.spend*100).toFixed(1)+'%':'N/A',\n"
            "  clicks:c.clicks||0,conversions:c.conversions||0\n"
            "}));\n"
            "return summary.map(s=>({json:s}));"),
          _slack(_uid(), "Post Campaign Report", x0+660, y, "#marketing",
            f"\U0001f4f0 *{task_name} \u2014 Weekly*\n"
            "{{{{ $json.name }}}}: Spend ${{{{ $json.spend }}}} | Revenue ${{{{ $json.revenue }}}} | "
            "ROI {{{{ $json.roi }}}} | Clicks {{{{ $json.clicks }}}}"),
          _gmail_send(_uid(), "Email Campaign Report", x0+880, y,
            subject=f"Weekly Campaign Report: {task_name}",
            body="={{ $json.name }}: ROI ={{ $json.roi }}, Revenue $={{ $json.revenue }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_hr(task_name, x0):
    """HR workflow: monitor new applications via webhook -> log -> notify recruiter."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Application Received", x0, y, "hr-application"),
          _code(_uid(), "Parse & Score Application", x0+220, y,
            "const app=items[0].json;\n"
            "const name=app.name||app.applicant_name||'Unknown';\n"
            "const role=app.role||app.position||'Not specified';\n"
            "const email=app.email||'no-email';\n"
            "const source=app.source||app.referral||'Direct';\n"
            "const keywords=['python','react','leadership','management','sales','marketing'];\n"
            "const resume=(app.resume||app.cover_letter||'').toLowerCase();\n"
            "const matched=keywords.filter(k=>resume.includes(k));\n"
            "const score=Math.min(100,matched.length*15+20);\n"
            "return [{json:{name,role,email,source,score,\n"
            "  skills:matched.join(', ')||'Not detected',\n"
            "  applied:new Date().toISOString()}}];"),
          _sheets_append(_uid(), "Log to Applicant Tracker", x0+440, y),
          _slack(_uid(), "Notify Recruiter", x0+660, y, "#recruiting",
            f"\U0001f464 *New Application \u2014 {task_name}*\n"
            "Name: {{{{ $json.name }}}} | Role: {{{{ $json.role }}}}\n"
            "Source: {{{{ $json.source }}}} | Score: {{{{ $json.score }}}}/100\n"
            "Skills: {{{{ $json.skills }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[1]["name"],n[3]["name"])])
    return n, c

def _wf_finance(task_name, x0):
    """Finance: pull expense data from Sheets -> flag anomalies -> alert CFO."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Read Expense Data", x0+220, y),
          _code(_uid(), "Detect Anomalies", x0+440, y,
            "const rows=items.map(i=>i.json);\n"
            "const amounts=rows.map(r=>Number(r.amount)||0);\n"
            "const avg=amounts.reduce((a,b)=>a+b,0)/amounts.length;\n"
            "const stddev=Math.sqrt(amounts.map(v=>Math.pow(v-avg,2)).reduce((a,b)=>a+b,0)/amounts.length);\n"
            "const anomalies=rows.filter(r=>Math.abs(Number(r.amount)-avg)>2*stddev);\n"
            "const total=amounts.reduce((a,b)=>a+b,0);\n"
            "return [{json:{\n"
            "  total:total.toFixed(2),avg:avg.toFixed(2),\n"
            "  anomaly_count:anomalies.length,\n"
            "  anomalies:anomalies.slice(0,3).map(r=>`${r.category||'?'}: $${r.amount}`).join(', ')||'None',\n"
            "  week:new Date().toISOString().slice(0,10)\n"
            "}}];"),
          _slack(_uid(), "Finance Weekly Alert", x0+660, y, "#finance",
            f"\U0001f4b3 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
            "Total: ${{{{ $json.total }}}} | Avg: ${{{{ $json.avg }}}}\n"
            "Anomalies: {{{{ $json.anomaly_count }}}} ({{{{ $json.anomalies }}}})"),
          _gmail_send(_uid(), "Email Finance Report", x0+880, y,
            subject=f"Weekly Finance Report: {task_name}",
            body="Week: ={{ $json.week }}\nTotal: $={{ $json.total }}\nAnomalies: ={{ $json.anomaly_count }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_design(task_name, x0):
    """Design workflow: monitor Figma comments via webhook -> log -> notify team."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "Figma Comment Webhook", x0, y, "figma-comment"),
          _code(_uid(), "Parse Comment Event", x0+220, y,
            "const evt=items[0].json;\n"
            "const comment=evt.comment?.[0]?.text||evt.message||'(no text)';\n"
            "const author=evt.triggered_by?.handle||evt.author||'Unknown';\n"
            "const file=evt.file_name||'Unknown file';\n"
            "const url=evt.comment?.[0]?.client_meta?.node_id\n"
            "  ?`https://figma.com/file/${evt.file_key}?node-id=${evt.comment[0].client_meta.node_id}`\n"
            "  :`https://figma.com/file/${evt.file_key||'unknown'}`;\n"
            "return [{json:{comment:comment.slice(0,200),author,file,url,\n"
            "  timestamp:new Date().toISOString()}}];"),
          _slack(_uid(), "Notify Design Team", x0+440, y, "#design",
            f"\U0001f5bc\ufe0f *Figma Comment \u2014 {task_name}*\n"
            "{{{{ $json.author }}}}: {{{{ $json.comment }}}}\n"
            "File: {{{{ $json.file }}}} | {{{{ $json.url }}}}"),
          _notion(_uid(), "Log to Design Tracker", x0+660, y, "create")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c

def _wf_devops(task_name, x0):
    """DevOps: monitor GitHub PRs -> check open >2d -> remind on Slack."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 10 * * 1-5"),
          _github(_uid(), "Get Open PRs", x0+220, y, "getAll", "pullRequest"),
          _code(_uid(), "Find Stale PRs", x0+440, y,
            "const prs=items.map(i=>i.json);\n"
            "const cutoff=Date.now()-2*24*60*60*1000;\n"
            "const stale=prs.filter(pr=>new Date(pr.created_at).getTime()<cutoff);\n"
            "return stale.slice(0,5).map(pr=>({json:{\n"
            "  title:(pr.title||'').slice(0,60),\n"
            "  author:pr.user?.login||'unknown',\n"
            "  url:pr.html_url||'',\n"
            "  age:Math.floor((Date.now()-new Date(pr.created_at).getTime())/86400000)+'d'\n"
            "}}));"),
          _slack(_uid(), "Remind PR Review", x0+660, y, "#engineering",
            f"\u23f0 *Stale PR \u2014 {task_name}*\n"
            "{{{{ $json.title }}}}\nAuthor: {{{{ $json.author }}}} | Age: {{{{ $json.age }}}}\n{{{{ $json.url }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c

def _wf_legal(task_name, x0):
    """Legal: contract deadline monitor -> alert on upcoming expirations."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Read Contract Register", x0+220, y),
          _code(_uid(), "Find Expiring Contracts", x0+440, y,
            "const rows=items.map(i=>i.json);\n"
            "const now=Date.now();\n"
            "const soon=30*24*60*60*1000;\n"
            "const expiring=rows.filter(r=>{\n"
            "  if(!r.expiry_date) return false;\n"
            "  const exp=new Date(r.expiry_date).getTime();\n"
            "  return exp>now && exp<now+soon;\n"
            "});\n"
            "return expiring.map(r=>({json:{\n"
            "  contract:r.contract_name||r.name||'Unnamed',\n"
            "  party:r.counterparty||r.party||'Unknown',\n"
            "  expiry:r.expiry_date,\n"
            "  days:Math.ceil((new Date(r.expiry_date).getTime()-now)/86400000)\n"
            "}}));"),
          _slack(_uid(), "Alert Expiring Contracts", x0+660, y, "#legal",
            f"\u2696\ufe0f *Contract Expiring \u2014 {task_name}*\n"
            "{{{{ $json.contract }}}} with {{{{ $json.party }}}}\n"
            "Expires: {{{{ $json.expiry }}}} (in {{{{ $json.days }}}} days)"),
          _gmail_send(_uid(), "Email Legal Alert", x0+880, y,
            subject=f"Contract Expiry Alert: {task_name}",
            body="Contract: ={{ $json.contract }}\nParty: ={{ $json.party }}\nExpires: ={{ $json.expiry }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_content(task_name, x0):
    """Content: schedule posts -> track performance -> weekly digest."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _http(_uid(), "Fetch Content Performance", x0+220, y,
            "={{ $vars.CONTENT_API_URL || 'https://api.example.com/content/performance' }}"),
          _code(_uid(), "Rank Top Content", x0+440, y,
            "const data=items[0].json;\n"
            "const posts=Array.isArray(data)?data:data.posts||[data];\n"
            "const ranked=posts\n"
            "  .map(p=>({...p,score:(p.views||0)+(p.shares||0)*5+(p.comments||0)*3}))\n"
            "  .sort((a,b)=>b.score-a.score)\n"
            "  .slice(0,5);\n"
            "return ranked.map(p=>({json:{\n"
            "  title:(p.title||'Untitled').slice(0,50),\n"
            "  views:p.views||0,shares:p.shares||0,\n"
            "  score:p.score,url:p.url||''\n"
            "}}));"),
          _slack(_uid(), "Post Content Digest", x0+660, y, "#content",
            f"\U0001f4dd *Top Content \u2014 {task_name}*\n"
            "\u2022 {{{{ $json.title }}}}\n"
            "Views: {{{{ $json.views }}}} | Shares: {{{{ $json.shares }}}} | {{{{ $json.url }}}}"),
          _sheets_append(_uid(), "Log Performance", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_product(task_name, x0):
    """Product: collect user feedback via webhook -> categorize -> Notion + Slack."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "Receive User Feedback", x0, y, "product-feedback"),
          _code(_uid(), "Categorize Feedback", x0+220, y,
            "const fb=items[0].json;\n"
            "const text=(fb.feedback||fb.message||fb.body||'').toLowerCase();\n"
            "let category='general';\n"
            "if(text.includes('bug')||text.includes('broken')||text.includes('error')) category='bug';\n"
            "else if(text.includes('feature')||text.includes('would love')||text.includes('wish')) category='feature';\n"
            "else if(text.includes('slow')||text.includes('performance')||text.includes('lag')) category='performance';\n"
            "else if(text.includes('confus')||text.includes('unclear')||text.includes('ux')) category='ux';\n"
            "return [{json:{\n"
            "  text:(fb.feedback||fb.message||'').slice(0,200),\n"
            "  category,user:fb.user||fb.email||'anonymous',\n"
            "  sentiment:text.includes('love')||text.includes('great')?'positive':\n"
            "    text.includes('hate')||text.includes('awful')?'negative':'neutral',\n"
            "  received:new Date().toISOString()\n"
            "}}];"),
          _notion(_uid(), "Log to Product DB", x0+440, y, "create"),
          _slack(_uid(), "Notify Product Team", x0+660, y, "#product-feedback",
            f"\U0001f4ac *User Feedback \u2014 {task_name}*\n"
            "Category: {{{{ $json.category }}}} | Sentiment: {{{{ $json.sentiment }}}}\n"
            "User: {{{{ $json.user }}}}\n_{{{{ $json.text }}}}_")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c

def _wf_general(task_name, x0):
    """General: scheduled data fetch -> process -> Slack notification."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1-5"),
          _http(_uid(), "Fetch Data", x0+220, y,
            "={{ $vars.API_ENDPOINT || 'https://api.example.com/data' }}"),
          _code(_uid(), "Process & Format", x0+440, y,
            "const data=items[0].json;\n"
            "const summary=typeof data==='object'?JSON.stringify(data).slice(0,300):String(data).slice(0,300);\n"
            "return [{json:{summary,timestamp:new Date().toISOString()}}];"),
          _slack(_uid(), "Send Notification", x0+660, y, "#automation",
            f"\u26a1 *{task_name}*\n{{{{ $json.summary }}}}\n_{{{{ $json.timestamp }}}}_")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


# ===========================================================================
# EXTENDED WORKFLOW LIBRARY â€” 20 additional builders (doubles total to 40)
# Each covers a distinct job sub-discipline with genuinely relevant automation
# ===========================================================================

def _wf_seo(task_name, x0):
    """SEO: fetch Search Console/rank data -> flag drops -> Slack + Sheets log."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7 * * 1"),
          _http(_uid(), "Fetch Search Console Data", x0+220, y,
                "={{ $vars.SEARCH_CONSOLE_API_URL || 'https://api.example.com/seo/metrics' }}"),
          _code(_uid(), "Detect Rank Drops", x0+440, y,
                "const data = items[0].json;\n"
                "const pages = Array.isArray(data) ? data : data.pages || [data];\n"
                "const drops = pages.filter(p => (p.position_delta || 0) > 3);\n"
                "const winners = pages.filter(p => (p.position_delta || 0) < -3);\n"
                "return [{ json: {\n"
                "  total_pages: pages.length,\n"
                "  drops: drops.length,\n"
                "  drop_list: drops.slice(0,3).map(p => `${p.url||'?'}: +${p.position_delta||0} pos`).join('\\n'),\n"
                "  winners: winners.length,\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Post SEO Alert", x0+660, y, "#seo",
                f"\U0001f50e *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "\U0001f4c9 Drops: {{{{ $json.drops }}}} | \U0001f4c8 Wins: {{{{ $json.winners }}}}\n{{{{ $json.drop_list }}}}"),
          _sheets_append(_uid(), "Log SEO Data", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_social_media(task_name, x0):
    """Social: monitor engagement metrics -> flag viral posts -> daily digest."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * *"),
          _http(_uid(), "Fetch Social Metrics", x0+220, y,
                "={{ $vars.SOCIAL_API_URL || 'https://api.example.com/social/metrics' }}"),
          _code(_uid(), "Rank Engagement", x0+440, y,
                "const data = items[0].json;\n"
                "const posts = Array.isArray(data) ? data : data.posts || [data];\n"
                "const scored = posts.map(p => ({...p,\n"
                "  score: (p.likes||0) + (p.shares||0)*3 + (p.comments||0)*2\n"
                "})).sort((a,b) => b.score - a.score);\n"
                "const top = scored[0] || {};\n"
                "return [{ json: {\n"
                "  top_post: (top.text||top.caption||'N/A').slice(0,80),\n"
                "  top_score: top.score || 0,\n"
                "  total_posts: posts.length,\n"
                "  total_likes: posts.reduce((s,p)=>s+(p.likes||0),0),\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Post Engagement Digest", x0+660, y, "#social-media",
                f"\U0001f4f1 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Top post score: {{{{ $json.top_score }}}} | Posts: {{{{ $json.total_posts }}}} | Likes: {{{{ $json.total_likes }}}}\n"
                "_{{{{ $json.top_post }}}}_"),
          _sheets_append(_uid(), "Log Social Stats", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_email_marketing(task_name, x0):
    """Email marketing: fetch campaign stats -> flag low open rates -> alert."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 10 * * 2"),
          _http(_uid(), "Fetch Campaign Stats", x0+220, y,
                "={{ $vars.EMAIL_PLATFORM_API || 'https://api.example.com/email/campaigns' }}"),
          _code(_uid(), "Analyse Open Rates", x0+440, y,
                "const camps = Array.isArray(items[0].json) ? items[0].json : [items[0].json];\n"
                "const with_stats = camps.map(c => ({\n"
                "  name: c.name || c.subject || 'Campaign',\n"
                "  sent: c.sent || c.recipients || 0,\n"
                "  opens: c.opens || 0,\n"
                "  clicks: c.clicks || 0,\n"
                "  open_rate: c.sent ? ((c.opens||0)/c.sent*100).toFixed(1)+'%' : 'N/A',\n"
                "  click_rate: c.opens ? ((c.clicks||0)/c.opens*100).toFixed(1)+'%' : 'N/A',\n"
                "  flag: c.sent && (c.opens||0)/c.sent < 0.15 ? '\u26a0\ufe0f Low' : '\u2705 OK'\n"
                "}));\n"
                "return with_stats.map(s => ({ json: s }));"),
          _slack(_uid(), "Email Campaign Report", x0+660, y, "#marketing",
                f"\U0001f4e7 *{task_name}*\n"
                "{{{{ $json.name }}}}: {{{{ $json.flag }}}} | Open: {{{{ $json.open_rate }}}} | "
                "Click: {{{{ $json.click_rate }}}} | Sent: {{{{ $json.sent }}}}"),
          _sheets_append(_uid(), "Log Campaign Stats", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_pr_comms(task_name, x0):
    """PR/Comms: monitor brand mentions via RSS/API -> flag negative -> alert."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _http(_uid(), "Fetch Brand Mentions", x0+220, y,
                "={{ $vars.MENTION_API_URL || 'https://news.google.com/rss/search?q=YOUR_BRAND' }}"),
          _code(_uid(), "Classify Sentiment", x0+440, y,
                "const body = items[0].json.body || '';\n"
                "const titles = [...body.matchAll(/<title>(.*?)<\\/title>/g)].slice(1,8).map(m=>m[1]);\n"
                "const negative_kw = ['lawsuit','scandal','outage','breach','complaint','recall','warning'];\n"
                "const negative = titles.filter(t => negative_kw.some(k => t.toLowerCase().includes(k)));\n"
                "return [{ json: {\n"
                "  total: titles.length,\n"
                "  negative: negative.length,\n"
                "  negative_list: negative.join('\\n') || 'None',\n"
                "  all_titles: titles.slice(0,5).join('\\n'),\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Media Mention Alert", x0+660, y, "#pr-comms",
                f"\U0001f4f0 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Mentions: {{{{ $json.total }}}} | \u26a0\ufe0f Negative: {{{{ $json.negative }}}}\n{{{{ $json.all_titles }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_account_management(task_name, x0):
    """Account management: flag accounts not contacted in 14d, expiring soon."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Load Account Register", x0+220, y),
          _code(_uid(), "Flag At-Risk Accounts", x0+440, y,
                "const accounts = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const week14 = 14*24*60*60*1000;\n"
                "const month1 = 30*24*60*60*1000;\n"
                "const at_risk = accounts.filter(a => {\n"
                "  const last = new Date(a.last_contact || 0).getTime();\n"
                "  const renew = new Date(a.renewal_date || 0).getTime();\n"
                "  return (now - last > week14) || (renew > now && renew < now + month1);\n"
                "});\n"
                "return at_risk.slice(0,8).map(a => ({ json: {\n"
                "  account: a.account_name || a.company || 'Unknown',\n"
                "  csm: a.owner || a.csm || 'Unassigned',\n"
                "  last_contact: a.last_contact || 'Never',\n"
                "  renewal: a.renewal_date || 'N/A',\n"
                "  arr: a.arr || a.mrr || ''\n"
                "}}));"),
          _slack(_uid(), "At-Risk Account Alert", x0+660, y, "#customer-success",
                f"\U0001f6a8 *At-Risk Account \u2014 {task_name}*\n"
                "{{{{ $json.account }}}} ({{{{ $json.csm }}}})\n"
                "Last contact: {{{{ $json.last_contact }}}} | Renewal: {{{{ $json.renewal }}}} | ARR: {{{{ $json.arr }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_sales_ops(task_name, x0):
    """Sales ops: quota attainment tracker, pipeline hygiene, weekly forecast."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7 * * 1"),
          _sheets_read(_uid(), "Load Pipeline Data", x0+220, y),
          _code(_uid(), "Compute Forecast", x0+440, y,
                "const rows = items.map(i => i.json);\n"
                "const open = rows.filter(r => r.stage !== 'Closed Won' && r.stage !== 'Closed Lost');\n"
                "const won = rows.filter(r => r.stage === 'Closed Won');\n"
                "const total_pipe = open.reduce((s,r) => s+(Number(r.amount)||0), 0);\n"
                "const total_won = won.reduce((s,r) => s+(Number(r.amount)||0), 0);\n"
                "const quota = Number(process.env.SALES_QUOTA || 100000);\n"
                "const attainment = quota ? ((total_won/quota)*100).toFixed(1)+'%' : 'N/A';\n"
                "const stale = open.filter(r => {\n"
                "  const mod = new Date(r.last_modified || r.updated_at || 0).getTime();\n"
                "  return Date.now() - mod > 21*24*60*60*1000;\n"
                "});\n"
                "return [{ json: { total_pipe: total_pipe.toFixed(0), total_won: total_won.toFixed(0),\n"
                "  attainment, stale_deals: stale.length, open_deals: open.length,\n"
                "  week: new Date().toISOString().slice(0,10) } }];"),
          _slack(_uid(), "Weekly Sales Forecast", x0+660, y, "#sales-ops",
                f"\U0001f4b9 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Won: ${{{{ $json.total_won }}}} | Attainment: {{{{ $json.attainment }}}}\n"
                "Pipeline: ${{{{ $json.total_pipe }}}} | Open: {{{{ $json.open_deals }}}} | Stale: {{{{ $json.stale_deals }}}}"),
          _sheets_append(_uid(), "Log Forecast Snapshot", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_recruiting(task_name, x0):
    """Recruiting: track candidate pipeline stages, flag stalled, weekly summary."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Candidate Pipeline", x0+220, y),
          _code(_uid(), "Analyse Pipeline", x0+440, y,
                "const candidates = items.map(i => i.json);\n"
                "const stages = {};\n"
                "candidates.forEach(c => { const s=c.stage||'Unknown'; stages[s]=(stages[s]||0)+1; });\n"
                "const stalled = candidates.filter(c => {\n"
                "  const upd = new Date(c.last_updated || c.modified || 0).getTime();\n"
                "  return Date.now() - upd > 7*24*60*60*1000 && c.stage !== 'Hired' && c.stage !== 'Rejected';\n"
                "});\n"
                "const stage_summary = Object.entries(stages).map(([s,n])=>`${s}: ${n}`).join(' | ');\n"
                "return [{ json: {\n"
                "  total: candidates.length, stalled: stalled.length,\n"
                "  stages: stage_summary,\n"
                "  stalled_names: stalled.slice(0,3).map(c=>c.name||'?').join(', '),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Recruiting Weekly Digest", x0+660, y, "#recruiting",
                f"\U0001f464 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Total: {{{{ $json.total }}}} | Stalled: {{{{ $json.stalled }}}}\n"
                "Stages: {{{{ $json.stages }}}}\nStalled: {{{{ $json.stalled_names }}}}"),
          _gmail_send(_uid(), "Email Pipeline Report", x0+880, y,
                subject=f"Weekly Recruiting Pipeline: {task_name}",
                body="Total: ={{ $json.total }}, Stalled: ={{ $json.stalled }}, Stages: ={{ $json.stages }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_onboarding(task_name, x0):
    """Onboarding: webhook for new hire -> create task checklist -> notify manager."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Hire Webhook", x0, y, "new-hire"),
          _code(_uid(), "Build Onboarding Plan", x0+220, y,
                "const hire = items[0].json;\n"
                "const name = hire.name || hire.employee_name || 'New Hire';\n"
                "const role = hire.role || hire.title || 'Team Member';\n"
                "const start = hire.start_date || new Date().toISOString().slice(0,10);\n"
                "const manager = hire.manager || hire.manager_email || 'manager@company.com';\n"
                "const checklist = [\n"
                "  'Send welcome email and first-day schedule',\n"
                "  'Set up laptop and software access',\n"
                "  'Add to Slack channels and Google Workspace',\n"
                "  'Schedule 1:1 with manager for day 1',\n"
                "  'Share team handbook and culture docs',\n"
                "  'Assign onboarding buddy',\n"
                "  'Schedule 30/60/90 day check-ins'\n"
                "].map((t,i)=>`${i+1}. ${t}`).join('\\n');\n"
                "return [{ json: { name, role, start, manager, checklist } }];"),
          _notion(_uid(), "Create Onboarding Page", x0+440, y, "create"),
          _slack(_uid(), "Notify Manager", x0+660, y, "#hr",
                f"\U0001f389 *New Hire Onboarding \u2014 {task_name}*\n"
                "Name: {{{{ $json.name }}}} | Role: {{{{ $json.role }}}} | Start: {{{{ $json.start }}}}\n"
                "Manager: {{{{ $json.manager }}}}\n\n{{{{ $json.checklist }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c

def _wf_data_engineering(task_name, x0):
    """Data engineering: monitor ETL pipeline health, failed jobs, data quality."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "*/30 * * * *"),
          _http(_uid(), "Check Pipeline Status", x0+220, y,
                "={{ $vars.PIPELINE_STATUS_API || 'https://api.example.com/pipelines/status' }}"),
          _code(_uid(), "Detect Failed Jobs", x0+440, y,
                "const data = items[0].json;\n"
                "const jobs = Array.isArray(data) ? data : data.jobs || [data];\n"
                "const failed = jobs.filter(j => j.status === 'failed' || j.status === 'error');\n"
                "const slow = jobs.filter(j => j.duration_minutes && j.duration_minutes > 60);\n"
                "if (!failed.length && !slow.length) return [];\n"
                "return [{ json: {\n"
                "  failed_count: failed.length,\n"
                "  slow_count: slow.length,\n"
                "  failed_jobs: failed.slice(0,3).map(j=>j.name||j.id||'unknown').join(', '),\n"
                "  slow_jobs: slow.slice(0,2).map(j=>`${j.name||'?'} (${j.duration_minutes}min)`).join(', '),\n"
                "  timestamp: new Date().toISOString()\n"
                "}}];"),
          _slack(_uid(), "Pipeline Failure Alert", x0+660, y, "#data-engineering",
                f"\U0001f6a8 *Pipeline Alert \u2014 {task_name}*\n"
                "Failed: {{{{ $json.failed_count }}}} ({{{{ $json.failed_jobs }}}})\n"
                "Slow: {{{{ $json.slow_count }}}} ({{{{ $json.slow_jobs }}}})\n_{{{{ $json.timestamp }}}}_")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_security(task_name, x0):
    """Security: scan access logs for anomalies, failed logins, cert expiry."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 6 * * 1-5"),
          _sheets_read(_uid(), "Load Security Log Data", x0+220, y),
          _code(_uid(), "Detect Anomalies", x0+440, y,
                "const logs = items.map(i => i.json);\n"
                "const failed_logins = logs.filter(l => l.event_type === 'failed_login' || l.status === 'failed');\n"
                "const new_ips = logs.filter(l => l.is_new_ip === true || l.is_new_ip === 'true');\n"
                "const after_hours = logs.filter(l => {\n"
                "  const hr = new Date(l.timestamp || 0).getHours();\n"
                "  return hr < 6 || hr > 22;\n"
                "});\n"
                "if (!failed_logins.length && !new_ips.length && !after_hours.length) return [];\n"
                "return [{ json: {\n"
                "  failed_logins: failed_logins.length,\n"
                "  new_ips: new_ips.length,\n"
                "  after_hours: after_hours.length,\n"
                "  top_user: failed_logins[0]?.user || failed_logins[0]?.email || 'unknown',\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Security Anomaly Alert", x0+660, y, "#security",
                f"\U0001f512 *Security Alert \u2014 {task_name}*\n"
                "Failed logins: {{{{ $json.failed_logins }}}} | New IPs: {{{{ $json.new_ips }}}}\n"
                "After-hours activity: {{{{ $json.after_hours }}}} | Top user: {{{{ $json.top_user }}}}"),
          _gmail_send(_uid(), "Email Security Report", x0+880, y,
                subject=f"Security Alert: {task_name}",
                body="Failed logins: ={{ $json.failed_logins }}, New IPs: ={{ $json.new_ips }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_cloud_infra(task_name, x0):
    """Cloud/infra: fetch AWS/GCP cost and usage, flag anomalies, weekly report."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _http(_uid(), "Fetch Cloud Cost Data", x0+220, y,
                "={{ $vars.CLOUD_COST_API || 'https://api.example.com/cloud/costs' }}"),
          _code(_uid(), "Detect Cost Anomalies", x0+440, y,
                "const data = items[0].json;\n"
                "const services = Array.isArray(data) ? data : data.services || [data];\n"
                "const total = services.reduce((s,sv) => s+(Number(sv.cost)||0), 0);\n"
                "const prev_total = services.reduce((s,sv) => s+(Number(sv.prev_cost)||0), 0);\n"
                "const delta_pct = prev_total ? ((total-prev_total)/prev_total*100).toFixed(1) : '0';\n"
                "const spikes = services.filter(sv => {\n"
                "  const prev = Number(sv.prev_cost)||0;\n"
                "  return prev > 0 && (Number(sv.cost)||0)/prev > 1.3;\n"
                "});\n"
                "return [{ json: {\n"
                "  total: total.toFixed(2), prev_total: prev_total.toFixed(2),\n"
                "  delta: delta_pct+'%', spikes: spikes.length,\n"
                "  spike_services: spikes.slice(0,3).map(s=>s.service||s.name||'?').join(', '),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Cloud Cost Report", x0+660, y, "#infrastructure",
                f"\u2601\ufe0f *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Total: ${{{{ $json.total }}}} | vs prev: {{{{ $json.delta }}}}\n"
                "Cost spikes: {{{{ $json.spikes }}}} services ({{{{ $json.spike_services }}}})"),
          _gmail_send(_uid(), "Email Cost Report", x0+880, y,
                subject=f"Cloud Cost Report: {task_name}",
                body="Week: ={{ $json.week }}, Total: $={{ $json.total }}, vs prev: ={{ $json.delta }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_product_analytics(task_name, x0):
    """Product analytics: pull funnel data, flag drop-offs, A/B test alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _http(_uid(), "Fetch Funnel Metrics", x0+220, y,
                "={{ $vars.ANALYTICS_API || 'https://api.example.com/analytics/funnel' }}"),
          _code(_uid(), "Detect Drop-offs", x0+440, y,
                "const data = items[0].json;\n"
                "const steps = Array.isArray(data) ? data : data.steps || [data];\n"
                "const drop_offs = [];\n"
                "for (let i=1; i<steps.length; i++) {\n"
                "  const prev = Number(steps[i-1].users || steps[i-1].count || 0);\n"
                "  const curr = Number(steps[i].users || steps[i].count || 0);\n"
                "  const drop = prev > 0 ? ((prev-curr)/prev*100).toFixed(1) : '0';\n"
                "  if (Number(drop) > 40) drop_offs.push(`${steps[i].name||`Step ${i}`}: -${drop}%`);\n"
                "}\n"
                "return [{ json: {\n"
                "  total_steps: steps.length,\n"
                "  critical_drops: drop_offs.length,\n"
                "  drop_list: drop_offs.join('\\n') || 'No critical drops',\n"
                "  top_step: steps[0]?.name || 'Entry',\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Funnel Drop-off Alert", x0+660, y, "#product-analytics",
                f"\U0001f4c9 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Critical drops: {{{{ $json.critical_drops }}}}\n{{{{ $json.drop_list }}}}"),
          _sheets_append(_uid(), "Log Funnel Snapshot", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_ecommerce(task_name, x0):
    """Ecommerce: process new orders, low inventory alerts, abandoned cart digest."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Order Webhook", x0, y, "ecommerce-order"),
          _code(_uid(), "Process Order", x0+220, y,
                "const order = items[0].json;\n"
                "const total = Number(order.total || order.amount || 0).toFixed(2);\n"
                "const items_count = order.items?.length || order.line_items?.length || 1;\n"
                "const customer = order.customer?.name || order.billing?.first_name || 'Customer';\n"
                "const email = order.customer?.email || order.billing?.email || '';\n"
                "const order_id = order.id || order.order_number || 'N/A';\n"
                "const sku_list = (order.items||order.line_items||[]).map(i=>i.sku||i.product_id||'?').slice(0,3);\n"
                "return [{ json: { order_id, customer, email, total, items_count,\n"
                "  skus: sku_list.join(', '), received: new Date().toISOString() } }];"),
          _sheets_append(_uid(), "Log Order to Sheet", x0+440, y),
          _slack(_uid(), "New Order Alert", x0+660, y, "#ecommerce",
                f"\U0001f6d2 *New Order \u2014 {task_name}*\n"
                "Order: {{{{ $json.order_id }}}} | Customer: {{{{ $json.customer }}}}\n"
                "Total: ${{{{ $json.total }}}} | Items: {{{{ $json.items_count }}}} | SKUs: {{{{ $json.skus }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c


def _wf_logistics(task_name, x0):
    """Logistics: track shipments, flag delivery exceptions, warehouse alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7,13 * * 1-5"),
          _http(_uid(), "Fetch Shipment Status", x0+220, y,
                "={{ $vars.LOGISTICS_API || 'https://api.example.com/shipments/active' }}"),
          _code(_uid(), "Flag Exceptions", x0+440, y,
                "const shipments = Array.isArray(items[0].json) ? items[0].json : [items[0].json];\n"
                "const exceptions = shipments.filter(s =>\n"
                "  ['delayed','exception','failed_delivery','returned'].includes((s.status||'').toLowerCase()));\n"
                "const on_time = shipments.filter(s => s.status === 'delivered');\n"
                "if (!exceptions.length) return [{ json: {\n"
                "  total: shipments.length, exceptions: 0, on_time: on_time.length,\n"
                "  status: 'All shipments on track', date: new Date().toISOString().slice(0,10) } }];\n"
                "return exceptions.slice(0,5).map(s => ({ json: {\n"
                "  tracking: s.tracking_number || s.id || 'N/A',\n"
                "  status: s.status, carrier: s.carrier || 'Unknown',\n"
                "  destination: s.destination || 'Unknown',\n"
                "  exception_reason: s.exception_reason || s.reason || 'No reason given'\n"
                "}}));"),
          _slack(_uid(), "Shipment Exception Alert", x0+660, y, "#logistics",
                f"\U0001f4e6 *{task_name} Alert*\n"
                "Tracking: {{{{ $json.tracking }}}} | Status: {{{{ $json.status }}}}\n"
                "Carrier: {{{{ $json.carrier }}}} | Reason: {{{{ $json.exception_reason }}}}"),
          _sheets_append(_uid(), "Log Exceptions", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_procurement(task_name, x0):
    """Procurement: PO approval workflow, vendor invoice tracking, budget alerts."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Purchase Request", x0, y, "purchase-request"),
          _code(_uid(), "Validate & Route PO", x0+220, y,
                "const po = items[0].json;\n"
                "const amount = Number(po.amount || po.total || 0);\n"
                "const vendor = po.vendor || po.supplier || 'Unknown Vendor';\n"
                "const requester = po.requester || po.requested_by || 'Unknown';\n"
                "const category = po.category || po.cost_center || 'General';\n"
                "let approver = 'manager@company.com';\n"
                "let channel = '#procurement';\n"
                "if (amount > 10000) { approver = 'cfo@company.com'; channel = '#finance-approvals'; }\n"
                "else if (amount > 1000) { approver = 'finance@company.com'; channel = '#procurement'; }\n"
                "return [{ json: { amount: amount.toFixed(2), vendor, requester,\n"
                "  category, approver, channel, po_id: po.id || Date.now().toString(),\n"
                "  submitted: new Date().toISOString() } }];"),
          _slack(_uid(), "Request PO Approval", x0+440, y, "={{ $json.channel }}",
                f"\U0001f4b0 *PO Approval Required \u2014 {task_name}*\n"
                "PO: {{{{ $json.po_id }}}} | Vendor: {{{{ $json.vendor }}}}\n"
                "Amount: ${{{{ $json.amount }}}} | Category: {{{{ $json.category }}}}\n"
                "Requester: {{{{ $json.requester }}}} | Approver: {{{{ $json.approver }}}}"),
          _sheets_append(_uid(), "Log PO to Register", x0+660, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c


def _wf_compliance(task_name, x0):
    """Compliance: track policy review deadlines, audit prep tasks, reg alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Compliance Register", x0+220, y),
          _code(_uid(), "Flag Upcoming Deadlines", x0+440, y,
                "const items2 = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const days30 = 30*24*60*60*1000;\n"
                "const days7 = 7*24*60*60*1000;\n"
                "const critical = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.due_date || 0).getTime();\n"
                "  return due > now && due < now + days7;\n"
                "});\n"
                "const upcoming = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.due_date || 0).getTime();\n"
                "  return due > now + days7 && due < now + days30;\n"
                "});\n"
                "return [{ json: {\n"
                "  critical: critical.length,\n"
                "  upcoming: upcoming.length,\n"
                "  critical_list: critical.map(r=>`${r.requirement||r.name||'?'} (due ${r.deadline||'?'})`).join('\\n'),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Compliance Deadline Alert", x0+660, y, "#compliance",
                f"\u2696\ufe0f *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "\U0001f534 Critical (7d): {{{{ $json.critical }}}}\n{{{{ $json.critical_list }}}}\n"
                "\U0001f7e1 Upcoming (30d): {{{{ $json.upcoming }}}}"),
          _gmail_send(_uid(), "Email Compliance Alert", x0+880, y,
                subject=f"Compliance Deadline Alert: {task_name}",
                body="Critical: ={{ $json.critical }}, Upcoming: ={{ $json.upcoming }}\n={{ $json.critical_list }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_investor_relations(task_name, x0):
    """IR: board report prep digest, fundraising pipeline, investor email tracker."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Load Investor Pipeline", x0+220, y),
          _code(_uid(), "Compile IR Digest", x0+440, y,
                "const rows = items.map(i => i.json);\n"
                "const stages = { interested:0, diligence:0, committed:0, passed:0 };\n"
                "let total_committed = 0;\n"
                "rows.forEach(r => {\n"
                "  const s = (r.stage||'').toLowerCase();\n"
                "  if (s in stages) stages[s]++;\n"
                "  if (s === 'committed') total_committed += Number(r.amount||0);\n"
                "});\n"
                "return [{ json: {\n"
                "  total_investors: rows.length,\n"
                "  committed: stages.committed, committed_amount: total_committed.toFixed(0),\n"
                "  in_diligence: stages.diligence, interested: stages.interested,\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "IR Weekly Digest", x0+660, y, "#investor-relations",
                f"\U0001f4b8 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Committed: {{{{ $json.committed }}}} (${{{{ $json.committed_amount }}}})\n"
                "In diligence: {{{{ $json.in_diligence }}}} | Interested: {{{{ $json.interested }}}}"),
          _gmail_send(_uid(), "Email IR Report", x0+880, y,
                subject=f"Weekly IR Update: {task_name}",
                body="Committed: $={{ $json.committed_amount }}, Diligence: ={{ $json.in_diligence }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_executive(task_name, x0):
    """Executive: daily briefing from multiple sources â€” KPIs, news, calendar."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "30 7 * * 1-5"),
          _calendar(_uid(), "Get Today Meetings", x0+220, y),
          _code(_uid(), "Build Executive Brief", x0+440, y,
                "const meetings = items.map(i => i.json);\n"
                "const mlines = meetings.slice(0,5).map(e => {\n"
                "  const t = e.start?.dateTime?.slice(11,16) || 'All day';\n"
                "  return `\u2022 ${t} \u2014 ${e.summary||'Meeting'}`;\n"
                "});\n"
                "const date = new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});\n"
                "return [{ json: {\n"
                "  date,\n"
                "  meetings_count: meetings.length,\n"
                "  schedule: mlines.join('\\n') || 'No meetings today'\n"
                "}}];"),
          _slack(_uid(), "Post Executive Brief", x0+660, y, "#executives",
                f"\U0001f31f *Daily Brief \u2014 {{{{ $json.date }}}}*\n"
                f"*{task_name}*\n\n"
                "\U0001f4c5 *Today ({{{{ $json.meetings_count }}}} meetings)*\n{{{{ $json.schedule }}}}"),
          _gmail_send(_uid(), "Email Daily Brief", x0+880, y,
                subject=f"Daily Executive Brief: {task_name}",
                body="Date: ={{ $json.date }}\nMeetings: ={{ $json.meetings_count }}\n={{ $json.schedule }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_academic(task_name, x0):
    """Academic: track paper submission deadlines, citation alerts, grant status."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Academic Deadlines", x0+220, y),
          _code(_uid(), "Flag Paper Deadlines", x0+440, y,
                "const items2 = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const days14 = 14*24*60*60*1000;\n"
                "const upcoming = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.submission_date || 0).getTime();\n"
                "  return due > now && due < now + days14;\n"
                "});\n"
                "return upcoming.map(r => ({ json: {\n"
                "  title: (r.title || r.conference || r.journal || 'Unknown').slice(0,60),\n"
                "  deadline: r.deadline || r.submission_date,\n"
                "  type: r.type || r.category || 'Submission',\n"
                "  days_left: Math.ceil((new Date(r.deadline||r.submission_date||0)-now)/86400000)\n"
                "}}));"),
          _slack(_uid(), "Academic Deadline Reminder", x0+660, y, "#research",
                f"\U0001f4da *{task_name} Deadline*\n"
                "{{{{ $json.type }}}}: {{{{ $json.title }}}}\n"
                "Due: {{{{ $json.deadline }}}} ({{{{ $json.days_left }}}} days)"),
          _gmail_send(_uid(), "Email Deadline Reminder", x0+880, y,
                subject=f"Academic Deadline: {task_name}",
                body="Title: ={{ $json.title }}\nDeadline: ={{ $json.deadline }}\nDays left: ={{ $json.days_left }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_healthcare_admin(task_name, x0):
    """Healthcare admin: appointment reminders, billing follow-ups, compliance."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _sheets_read(_uid(), "Load Appointment Schedule", x0+220, y),
          _code(_uid(), "Build Reminder List", x0+440, y,
                "const appts = items.map(i => i.json);\n"
                "const tomorrow = new Date();\n"
                "tomorrow.setDate(tomorrow.getDate()+1);\n"
                "const tmrw_str = tomorrow.toISOString().slice(0,10);\n"
                "const upcoming = appts.filter(a => (a.date||a.appointment_date||'').startsWith(tmrw_str));\n"
                "const no_shows = appts.filter(a => a.status === 'no_show' && !a.follow_up_sent);\n"
                "return [{ json: {\n"
                "  upcoming_count: upcoming.length,\n"
                "  upcoming_list: upcoming.slice(0,5).map(a=>`${a.time||'?'} \u2014 ${a.patient||a.name||'?'}`).join('\\n'),\n"
                "  no_show_count: no_shows.length,\n"
                "  date: tmrw_str\n"
                "}}];"),
          _slack(_uid(), "Appointment Reminder Digest", x0+660, y, "#admin",
                f"\U0001f3e5 *{task_name} \u2014 Tomorrow {{{{ $json.date }}}}*\n"
                "Appointments: {{{{ $json.upcoming_count }}}}\n{{{{ $json.upcoming_list }}}}\n"
                "No-shows to follow up: {{{{ $json.no_show_count }}}}"),
          _gmail_send(_uid(), "Email Admin Digest", x0+880, y,
                subject=f"Daily Schedule: {task_name}",
                body="Tomorrow: ={{ $json.date }}, Appointments: ={{ $json.upcoming_count }}, No-shows: ={{ $json.no_show_count }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


# ---------------------------------------------------------------------------
# CATEGORY REGISTRY â€” maps every category to its builder + metadata
# ---------------------------------------------------------------------------

_BUILDERS: Dict[str, object] = {
    # Core task categories
    "reporting":        _wf_reporting,
    "management":       _wf_management,
    "communication":    _wf_communication,
    "scheduling":       _wf_scheduling,
    "data_entry":       _wf_data_entry,
    "research":         _wf_research,
    "analysis":         _wf_analysis,
    "testing":          _wf_testing,
    "documentation":    _wf_documentation,
    "general":          _wf_general,
    # Job-function categories
    "customer_support":   _wf_customer_support,
    "sales":              _wf_sales,
    "marketing":          _wf_marketing,
    "hr":                 _wf_hr,
    "finance":            _wf_finance,
    "design":             _wf_design,
    "devops":             _wf_devops,
    "legal":              _wf_legal,
    "content":            _wf_content,
    "product":            _wf_product,
    # Extended job-function categories (20 additional)
    "seo":                _wf_seo,
    "social_media":       _wf_social_media,
    "email_marketing":    _wf_email_marketing,
    "pr_comms":           _wf_pr_comms,
    "account_management": _wf_account_management,
    "sales_ops":          _wf_sales_ops,
    "recruiting":         _wf_recruiting,
    "onboarding":         _wf_onboarding,
    "data_engineering":   _wf_data_engineering,
    "security":           _wf_security,
    "cloud_infra":        _wf_cloud_infra,
    "product_analytics":  _wf_product_analytics,
    "ecommerce":          _wf_ecommerce,
    "logistics":          _wf_logistics,
    "procurement":        _wf_procurement,
    "compliance":         _wf_compliance,
    "investor_relations": _wf_investor_relations,
    "executive":          _wf_executive,
    "academic":           _wf_academic,
    "healthcare_admin":   _wf_healthcare_admin,
}

# Human-readable tool stack per category (shown in sticky notes)
_TOOLS: Dict[str, str] = {
    "reporting":        "Schedule + Google Sheets + Code + Slack + Gmail",
    "management":       "Schedule + Jira + Code + Slack",
    "communication":    "Schedule + Gmail + Code + Slack",
    "scheduling":       "Schedule + Google Calendar + Code + Slack",
    "data_entry":       "Webhook + Code + Google Sheets + Slack",
    "research":         "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "analysis":         "Schedule + Google Sheets + Code + Slack",
    "testing":          "Schedule + GitHub + Code + Slack",
    "documentation":    "Schedule + Notion + Code + Slack",
    "general":          "Schedule + HTTP Request + Code + Slack",
    "customer_support": "Webhook + Code + Google Sheets + Slack",
    "sales":            "Schedule + HubSpot + Code + Slack + Google Sheets",
    "marketing":        "Schedule + HTTP Request + Code + Slack + Gmail",
    "hr":               "Webhook + Code + Google Sheets + Slack",
    "finance":          "Schedule + Google Sheets + Code + Slack + Gmail",
    "design":           "Webhook (Figma) + Code + Slack + Notion",
    "devops":           "Schedule + GitHub + Code + Slack",
    "legal":            "Schedule + Google Sheets + Code + Slack + Gmail",
    "content":          "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "product":          "Webhook + Code + Notion + Slack",
    # Extended
    "seo":              "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "social_media":     "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "email_marketing":  "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "pr_comms":         "Schedule + HTTP Request + Code + Slack",
    "account_management":"Schedule + Google Sheets + Code + Slack",
    "sales_ops":        "Schedule + Google Sheets + Code + Slack + Google Sheets",
    "recruiting":       "Schedule + Google Sheets + Code + Slack + Gmail",
    "onboarding":       "Webhook + Code + Notion + Slack",
    "data_engineering": "Schedule + HTTP Request + Code + Slack",
    "security":         "Schedule + Google Sheets + Code + Slack + Gmail",
    "cloud_infra":      "Schedule + HTTP Request + Code + Slack + Gmail",
    "product_analytics":"Schedule + HTTP Request + Code + Slack + Google Sheets",
    "ecommerce":        "Webhook + Code + Google Sheets + Slack",
    "logistics":        "Schedule + HTTP Request + Code + Slack + Google Sheets",
    "procurement":      "Webhook + Code + Slack + Google Sheets",
    "compliance":       "Schedule + Google Sheets + Code + Slack + Gmail",
    "investor_relations":"Schedule + Google Sheets + Code + Slack + Gmail",
    "executive":        "Schedule + Google Calendar + Code + Slack + Gmail",
    "academic":         "Schedule + Google Sheets + Code + Slack + Gmail",
    "healthcare_admin": "Schedule + Google Sheets + Code + Slack + Gmail",
}

# Aliases: map variant names to canonical category keys
_ALIASES: Dict[str, str] = {
    # General
    "other":            "general",
    "admin":            "management",
    "operations":       "management",
    "ops":              "management",
    "project_mgmt":     "management",
    "project":          "management",
    "coordination":     "scheduling",
    "meeting":          "scheduling",
    "planning":         "scheduling",
    # Technical
    "coding":           "testing",
    "development":      "devops",
    "engineering":      "devops",
    "qa":               "testing",
    "quality":          "testing",
    "monitoring":       "devops",
    "deployment":       "devops",
    "infrastructure":   "devops",
    # Business
    "support":          "customer_support",
    "service":          "customer_support",
    "crm":              "sales",
    "business_dev":     "sales",
    "bd":               "sales",
    "growth":           "marketing",
    "seo":              "marketing",
    "social":           "content",
    "social_media":     "content",
    "copywriting":      "content",
    "writing":          "content",
    "accounting":       "finance",
    "budgeting":        "finance",
    "procurement":      "finance",
    "recruiting":       "hr",
    "talent":           "hr",
    "people":           "hr",
    "training":         "hr",
    "onboarding":       "hr",
    "ux":               "design",
    "ui":               "design",
    "creative":         "design",
    "compliance":       "legal",
    "contracts":        "legal",
    "risk":             "legal",
    "strategy":         "product",
    "roadmap":          "product",
    "product_mgmt":     "product",
    "feedback":         "product",
    "docs":             "documentation",
    "data":             "analysis",
    "metrics":          "analysis",
    "kpi":              "reporting",
    "email":            "communication",
    "outreach":         "communication",
    # Extended category aliases
    "search":           "seo",
    "search_engine":    "seo",
    "sem":              "seo",
    "paid_search":      "seo",
    "social":           "social_media",
    "instagram":        "social_media",
    "twitter":          "social_media",
    "linkedin":         "social_media",
    "tiktok":           "social_media",
    "email_campaigns":  "email_marketing",
    "newsletters":      "email_marketing",
    "drip":             "email_marketing",
    "pr":               "pr_comms",
    "communications":   "pr_comms",
    "brand":            "pr_comms",
    "media":            "pr_comms",
    "press":            "pr_comms",
    "csm":              "account_management",
    "customer_success": "account_management",
    "renewals":         "account_management",
    "retention":        "account_management",
    "revenue_ops":      "sales_ops",
    "revops":           "sales_ops",
    "sales_enablement": "sales_ops",
    "pipeline":         "sales_ops",
    "quota":            "sales_ops",
    "talent_acquisition":"recruiting",
    "headhunting":      "recruiting",
    "staffing":         "recruiting",
    "new_hire":         "onboarding",
    "employee_onboarding":"onboarding",
    "etl":              "data_engineering",
    "data_pipeline":    "data_engineering",
    "data_ops":         "data_engineering",
    "mlops":            "data_engineering",
    "cybersecurity":    "security",
    "infosec":          "security",
    "access_control":   "security",
    "aws":              "cloud_infra",
    "gcp":              "cloud_infra",
    "azure":            "cloud_infra",
    "cloud":            "cloud_infra",
    "sre":              "cloud_infra",
    "platform":         "cloud_infra",
    "growth_analytics": "product_analytics",
    "user_analytics":   "product_analytics",
    "conversion":       "product_analytics",
    "retention_analytics":"product_analytics",
    "online_retail":    "ecommerce",
    "store":            "ecommerce",
    "orders":           "ecommerce",
    "inventory":        "ecommerce",
    "warehouse":        "logistics",
    "supply_chain":     "logistics",
    "shipping":         "logistics",
    "fulfillment":      "logistics",
    "purchasing":       "procurement",
    "vendor":           "procurement",
    "sourcing":         "procurement",
    "regulatory":       "compliance",
    "audit":            "compliance",
    "gdpr":             "compliance",
    "fundraising":      "investor_relations",
    "vc":               "investor_relations",
    "board":            "investor_relations",
    "ceo":              "executive",
    "cto":              "executive",
    "cfo":              "executive",
    "coo":              "executive",
    "director":         "executive",
    "vp":               "executive",
    "research":         "academic",
    "phd":              "academic",
    "professor":        "academic",
    "scientist":        "academic",
    "clinical":         "healthcare_admin",
    "medical":          "healthcare_admin",
    "hospital":         "healthcare_admin",
    "patient":          "healthcare_admin",
}


def _resolve_category(category: str) -> str:
    """Normalize a category string to a known key."""
    c = (category or "general").lower().strip().replace(" ", "_").replace("-", "_")
    if c in _BUILDERS:
        return c
    if c in _ALIASES:
        return _ALIASES[c]
    # Fuzzy: check if any known key is a substring
    for key in _BUILDERS:
        if key in c or c in key:
            return key
    return "general"


# ---------------------------------------------------------------------------
# CANVAS BUILDER
# ---------------------------------------------------------------------------

def _merge_connections(conn_list: List[dict]) -> dict:
    merged: dict = {}
    for conns in conn_list:
        for src, data in conns.items():
            if src not in merged:
                merged[src] = {"main": [[]]}
            for edge in data.get("main", [[]])[0]:
                merged[src]["main"][0].append(edge)
    return merged


def build_canvas(job_title: str, tasks: List[dict]) -> dict:
    """
    Build one merged importable n8n workflow for all tasks.
    Each task gets its own horizontal row with a sticky note header.
    Rows are stacked vertically so they never overlap.
    Returns a complete importable n8n workflow JSON dict.
    """
    all_nodes: List[dict] = []
    all_conns: List[dict] = []
    num = len(tasks)
    # Layout constants for vertical stacking
    _HEADER_H   = 220   # top canvas header sticky height
    _HEADER_GAP = 80    # gap below header before first task
    _TASK_STICKY_H = 180  # per-task sticky note height (4 lines + padding)
    _TASK_NODE_H   = 200  # vertical space occupied by the node row
    _TASK_GAP      = 120  # gap between task blocks (generous isolation)
    _ROW_H = _TASK_STICKY_H + 30 + _TASK_NODE_H + _TASK_GAP  # total height per task row
    CANVAS_W = 1800     # fixed canvas width (wide enough for any node chain)
    COLORS = [3, 4, 5, 6, 2, 1]

    # Top canvas header sticky note
    all_nodes.append(_sticky(
        _uid(),
        f"\U0001f916 WorkScanAI \u2014 {job_title}",
        0, 0,
        f"# \U0001f916 WorkScanAI Automation Canvas\n"
        f"**Role:** {job_title} | **{num} automation workflows** below\n\n"
        f"**Setup:** Add credentials in each node (Slack, Gmail, Google Sheets, Jira, GitHub, HubSpot).\n"
        f"Set n8n variables: `SPREADSHEET_ID`, `JIRA_PROJECT`, `REPORT_EMAIL`, `GITHUB_OWNER`, `GITHUB_REPO`.\n"
        f"Each row is independent \u2014 activate the ones matching your stack.",
        color=7, w=CANVAS_W, h=_HEADER_H
    ))

    for idx, task in enumerate(tasks):
        name  = task.get("name", f"Task {idx+1}")
        cat   = _resolve_category(task.get("category", "general"))
        freq  = task.get("frequency", "weekly")
        color = COLORS[idx % len(COLORS)]
        tools = _TOOLS.get(cat, "Schedule + HTTP + Slack")
        builder = _BUILDERS.get(cat, _wf_general)

        # y origin for this task row
        y_row = _HEADER_H + _HEADER_GAP + idx * _ROW_H

        # Per-task sticky note header (full width, above nodes)
        all_nodes.append(_sticky(
            _uid(),
            f"\U0001f4cc Task {idx+1}: {name[:50]}",
            0, y_row,
            f"## Task {idx+1}: {name}\n"
            f"**Category:** {cat} | **Frequency:** {freq}\n"
            f"**Nodes:** {tools}\n"
            f"Connect credentials then toggle Active \u2192",
            color=color, w=CANVAS_W, h=_TASK_STICKY_H
        ))

        # Build nodes with x0=0 (builder places nodes relative to x0, y=_Y_START)
        task_nodes, task_conns = builder(name, 0)

        # Shift all non-sticky nodes to sit below this row's sticky note
        y_nodes = y_row + _TASK_STICKY_H + 30
        for node in task_nodes:
            if "stickyNote" not in node["type"]:
                node["position"][1] = y_nodes

        # ── PREFIX all working node names with T{n}: so names are unique ──
        # n8n connections are keyed by node name, so duplicate names across
        # columns cause cross-wiring. Prefixing isolates each column cleanly.
        prefix = f"T{idx+1}"
        name_map: dict = {}
        for node in task_nodes:
            if "stickyNote" not in node["type"]:
                old = node["name"]
                new = f"{prefix}: {old}"
                name_map[old] = new
                node["name"] = new

        # Remap connection keys and target node references
        prefixed_conns: dict = {}
        for src, data in task_conns.items():
            new_src = name_map.get(src, src)
            new_targets = [
                {**edge, "node": name_map.get(edge["node"], edge["node"])}
                for edge in data["main"][0]
            ]
            prefixed_conns[new_src] = {"main": [new_targets]}
        # ───────────────────────────────────────────────────────────────────

        all_nodes.extend(task_nodes)
        all_conns.append(prefixed_conns)

    return {
        "name": f"{job_title} \u2014 WorkScanAI Automation Canvas",
        "nodes": all_nodes,
        "connections": _merge_connections(all_conns),
        "active": False,
        "settings": {"executionOrder": "v1", "saveManualExecutions": True},
        "meta": {
            "generatedBy": "WorkScanAI",
            "jobTitle": job_title,
            "taskCount": num,
            "categories": list({_resolve_category(t.get("category","general")) for t in tasks}),
            "note": "Purpose-built automations. Each row = one task workflow. Add credentials to activate.",
        },
    }


# ---------------------------------------------------------------------------
# PUBLIC CLASS â€” drop-in replacement, same interface
# ---------------------------------------------------------------------------

class N8nTemplateClient:
    """
    Builds role-specific n8n canvases using purpose-built workflow code.
    20 distinct workflow patterns covering all major job functions.
    No n8n community API dependency.
    """

    def __init__(self, anthropic_api_key: str = ""):
        pass  # kept for interface compatibility

    def get_curated_templates(self, job_title: str, tasks: List[dict]) -> List[dict]:
        """Returns suggested_templates[] â€” one per task with full workflow_json."""
        suggested = []
        _REASONS = {
            "reporting":        "Reads KPIs from Google Sheets weekly, computes summary, posts to Slack and emails report",
            "management":       "Fetches open Jira issues daily and posts a prioritised digest to Slack",
            "communication":    "Scans Gmail every 30 min, filters urgent emails, alerts Slack channel",
            "scheduling":       "Fetches Google Calendar events each morning, posts daily schedule to Slack",
            "data_entry":       "Receives data via webhook, validates, appends to Google Sheets, confirms on Slack",
            "research":         "Fetches from API/feed on schedule, extracts insights, posts digest, logs to Sheets",
            "analysis":         "Reads dataset from Sheets, computes KPIs, posts to Slack, archives results",
            "testing":          "Polls GitHub Actions every 15 min, alerts Slack on failed or cancelled builds",
            "documentation":    "Checks Notion pages weekly for stale docs (not updated 30d+), posts reminder to Slack",
            "general":          "Scheduled data fetch from API, processes and formats, posts notification to Slack",
            "customer_support": "Receives support tickets via webhook, classifies by priority, routes to Slack channel",
            "sales":            "Fetches HubSpot deals daily, identifies stalled deals (14d+), alerts sales team",
            "marketing":        "Fetches campaign metrics weekly, computes ROI per campaign, posts report to Slack",
            "hr":               "Receives job applications via webhook, scores and logs them, notifies recruiter",
            "finance":          "Reads expense data weekly, detects statistical anomalies, alerts finance team",
            "design":           "Receives Figma comment webhooks, parses and routes to design Slack channel",
            "devops":           "Checks GitHub PRs daily, flags stale PRs open 2+ days, posts reminder to Slack",
            "legal":            "Scans contract register weekly, flags contracts expiring within 30 days",
            "content":          "Fetches content performance metrics weekly, ranks top posts, posts digest to Slack",
            "product":          "Receives user feedback via webhook, categorizes by type, logs to Notion, alerts team",
            # Extended
            "seo":                "Fetches Search Console rank data weekly, flags position drops, posts digest to Slack",
            "social_media":       "Fetches social engagement metrics daily, ranks top posts, posts digest to Slack",
            "email_marketing":    "Fetches email campaign stats, flags low open rates (<15%), reports per campaign",
            "pr_comms":           "Monitors brand mentions via RSS/API daily, classifies sentiment, alerts on negative coverage",
            "account_management": "Scans account register weekly for at-risk accounts (14d no contact / 30d to renewal)",
            "sales_ops":          "Computes weekly quota attainment, pipeline value, and flags stale deals (21d+)",
            "recruiting":         "Tracks candidate pipeline stages weekly, flags stalled candidates, emails summary",
            "onboarding":         "Receives new hire webhook, builds onboarding checklist, creates Notion page, notifies manager",
            "data_engineering":   "Polls pipeline status every 30 min, alerts Slack on failed or slow (60min+) jobs",
            "security":           "Scans access logs daily for failed logins, new IPs, and after-hours activity",
            "cloud_infra":        "Fetches cloud cost data weekly, flags cost spikes (30%+ vs prev), emails report",
            "product_analytics":  "Fetches funnel data daily, flags steps with 40%+ drop-off, logs to Sheets",
            "ecommerce":          "Processes new orders via webhook, logs to Sheets, alerts fulfilment team on Slack",
            "logistics":          "Polls shipment status twice daily, flags delayed/exception deliveries, logs to Sheets",
            "procurement":        "Receives purchase requests via webhook, routes by amount to correct approver on Slack",
            "compliance":         "Scans compliance register weekly, flags deadlines within 7 days (critical) and 30 days",
            "investor_relations": "Compiles fundraising pipeline weekly from Sheets, posts committed/diligence digest",
            "executive":          "Builds daily brief from Google Calendar, posts schedule to Slack, emails summary",
            "academic":           "Tracks paper/grant deadlines in Sheets, flags submissions due within 14 days",
            "healthcare_admin":   "Reads appointment schedule daily, posts tomorrow's list to Slack, flags no-shows",
        }
        for idx, task in enumerate(tasks[:6]):
            name    = task.get("name", f"Task {idx+1}")
            cat     = _resolve_category(task.get("category", "general"))
            builder = _BUILDERS.get(cat, _wf_general)
            task_nodes, task_conns = builder(name, 0)
            reason  = _REASONS.get(cat, _REASONS["general"])
            tools   = _TOOLS.get(cat, "Schedule + HTTP + Slack")
            preview = [n["type"].split(".")[-1] for n in task_nodes if "stickyNote" not in n["type"]]
            suggested.append({
                "id":               idx + 1,
                "name":             f"{name[:45]} \u2014 Automation",
                "description":      reason,
                "url":              "https://n8n.io/workflows/",
                "relevance_reason": reason,
                "node_count":       len(task_nodes),
                "nodes_preview":    preview,
                "workflow_json":    {"nodes": task_nodes, "connections": task_conns,
                                     "active": False, "settings": {"executionOrder": "v1"}},
                "task_name":        name,
            })
        return suggested

    def build_merged_canvas(self, job_title: str, suggested_templates: List[dict]) -> dict:
        """Merge suggested_templates into one importable n8n canvas."""
        tasks = [{"name":     t.get("task_name", t.get("name", "")),
                  "category": _guess_cat(t.get("relevance_reason","") + " " + t.get("description","")),
                  "frequency":"weekly"}
                 for t in suggested_templates]
        return build_canvas(job_title, tasks)


def _guess_cat(text: str) -> str:
    """Infer category from description text when not explicitly stored."""
    t = text.lower()
    if "jira" in t or "backlog" in t or "sprint" in t:              return "management"
    if "github" in t and ("pr" in t or "build" in t):               return "devops"
    if "figma" in t or "design comment" in t:                       return "design"
    if "hubspot" in t or "deal" in t or "crm" in t:                 return "sales"
    if "ticket" in t or "support" in t or "triage" in t:            return "customer_support"
    if "applicant" in t or "recruit" in t or "candidate" in t:      return "recruiting"
    if "onboard" in t or "new hire" in t:                           return "onboarding"
    if "expense" in t or "anomal" in t or "budget" in t:            return "finance"
    if "contract" in t or "expir" in t and "legal" in t:            return "legal"
    if "compliance" in t or "deadline" in t and "regul" in t:       return "compliance"
    if "feedback" in t or "notion" in t and "product" in t:         return "product"
    if "funnel" in t or "drop.off" in t or "retention" in t:        return "product_analytics"
    if "campaign" in t or "roi" in t or "marketing" in t:           return "marketing"
    if "open rate" in t or "email campaign" in t:                   return "email_marketing"
    if "mention" in t or "brand" in t or "sentiment" in t:          return "pr_comms"
    if "rank" in t or "seo" in t or "search console" in t:          return "seo"
    if "social" in t or "engagement" in t or "instagram" in t:      return "social_media"
    if "content" in t or "post" in t or "publish" in t:             return "content"
    if "at.risk account" in t or "csm" in t or "renewal" in t:      return "account_management"
    if "quota" in t or "attainment" in t or "forecast" in t:        return "sales_ops"
    if "pipeline" in t and "etl" in t or "data job" in t:           return "data_engineering"
    if "cloud cost" in t or "aws" in t or "spike" in t:             return "cloud_infra"
    if "security" in t or "login" in t or "access log" in t:        return "security"
    if "order" in t or "ecommerce" in t or "sku" in t:              return "ecommerce"
    if "shipment" in t or "logistics" in t or "delivery" in t:      return "logistics"
    if "purchase order" in t or "vendor" in t or "procurement" in t: return "procurement"
    if "investor" in t or "fundrais" in t or "board" in t:          return "investor_relations"
    if "executive brief" in t or "daily brief" in t:                return "executive"
    if "paper" in t or "grant" in t or "academic" in t:             return "academic"
    if "appointment" in t or "patient" in t or "clinic" in t:       return "healthcare_admin"
    if "gmail" in t or "email" in t or "inbox" in t:                return "communication"
    if "calendar" in t or "meeting" in t or "schedule" in t:        return "scheduling"
    if "webhook" in t or "form" in t or "entry" in t:               return "data_entry"
    if "research" in t or "fetch" in t or "rss" in t:               return "research"
    if "analys" in t or "kpi" in t or "metric" in t:                return "analysis"
    if "report" in t or "sheet" in t or "summary" in t:             return "reporting"
    if "notion" in t or "doc" in t or "stale" in t:                 return "documentation"
    return "general"

