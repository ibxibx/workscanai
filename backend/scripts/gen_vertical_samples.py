"""
One-off generator: create 5 pre-generated vertical sample reports in PRODUCTION
via the live API (so the share codes exist in prod Turso). Marketing reuses the
existing sample e07429, so it is intentionally NOT regenerated here.

Bypasses nothing: goes through the normal /api/workflows -> /api/analyze flow,
so it consumes real IP quota (5/24h). Run once. Re-running would create NEW
codes and burn quota again — don't.

Run: backend/venv/Scripts/python.exe scripts/gen_vertical_samples.py
Output: prints share_code + numbers per vertical -> paste into the frontend
templates config (VERTICALS in src/app/templates/verticals.ts).
"""
import requests, json, sys, time

BASE = "https://workscanai.onrender.com"

# hourly_rate mirrors the €/$ figure used for the existing marketing sample (50).
HOURLY_RATE = 50.0

# 5 verticals (Marketing reuses e07429). Each: realistic 5-task workflow in the
# context that best fits how that function actually buys/uses automation.
#  - support / finance / hr / sales -> team (a function's shared workload)
#  - agency -> team (a small automation agency's own delivery workload; the S1 wedge)
VERTICALS = [
    {
        "key": "support",
        "name": "Customer Support Team Workflow",
        "context": "team",
        "team_size": "6-20",
        "industry": "SaaS",
        "tasks": [
            {"name": "Triage and tag incoming support tickets", "description": "Read each new ticket, categorize by topic/urgency, assign to the right queue or agent", "category": "communication", "frequency": "daily", "time_per_task": 6, "complexity": "low"},
            {"name": "Reply to common how-to questions with macros", "description": "Answer repetitive product questions using saved reply templates, lightly personalized", "category": "communication", "frequency": "daily", "time_per_task": 8, "complexity": "low"},
            {"name": "Escalate and route bug reports to engineering", "description": "Identify genuine bugs, gather repro steps, file an issue and notify the on-call engineer", "category": "communication", "frequency": "daily", "time_per_task": 12, "complexity": "medium"},
            {"name": "Update help-center articles from recurring tickets", "description": "Spot repeated questions and turn them into or update knowledge-base docs", "category": "reporting", "frequency": "weekly", "time_per_task": 45, "complexity": "medium"},
            {"name": "Compile weekly CSAT and ticket-volume report", "description": "Pull metrics from the helpdesk, chart trends, summarize for the team lead", "category": "reporting", "frequency": "weekly", "time_per_task": 60, "complexity": "low"},
        ],
    },
    {
        "key": "finance",
        "name": "Finance & Accounting Team Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "Professional Services",
        "tasks": [
            {"name": "Process and code incoming supplier invoices", "description": "Read invoices, match to POs, assign GL codes, enter into the accounting system", "category": "data_entry", "frequency": "daily", "time_per_task": 10, "complexity": "low"},
            {"name": "Reconcile bank transactions against ledger", "description": "Match bank feed lines to recorded transactions, flag and investigate mismatches", "category": "analysis", "frequency": "weekly", "time_per_task": 90, "complexity": "medium"},
            {"name": "Chase overdue accounts-receivable payments", "description": "Identify overdue invoices, send reminder emails, log promised-to-pay dates", "category": "communication", "frequency": "weekly", "time_per_task": 40, "complexity": "low"},
            {"name": "Prepare monthly expense and budget report", "description": "Aggregate spend by category, compare to budget, write a short variance commentary", "category": "reporting", "frequency": "monthly", "time_per_task": 120, "complexity": "medium"},
            {"name": "Review expense claims for policy compliance", "description": "Check submitted expenses against policy, request missing receipts, approve or reject", "category": "analysis", "frequency": "weekly", "time_per_task": 30, "complexity": "medium"},
        ],
    },
    {
        "key": "hr",
        "name": "HR & Recruiting Team Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "Technology",
        "tasks": [
            {"name": "Screen inbound applications against role criteria", "description": "Read resumes, check must-have criteria, shortlist or reject with a reason", "category": "analysis", "frequency": "daily", "time_per_task": 8, "complexity": "medium"},
            {"name": "Schedule interviews across candidate and panel calendars", "description": "Find mutual availability, send invites, handle reschedules", "category": "communication", "frequency": "daily", "time_per_task": 15, "complexity": "low"},
            {"name": "Send candidate status and rejection emails", "description": "Notify candidates at each stage with appropriate, on-brand messaging", "category": "communication", "frequency": "daily", "time_per_task": 6, "complexity": "low"},
            {"name": "Run new-hire onboarding checklist", "description": "Trigger accounts, equipment, paperwork and first-week schedule for each new hire", "category": "management", "frequency": "weekly", "time_per_task": 60, "complexity": "medium"},
            {"name": "Compile monthly hiring-funnel and time-to-fill report", "description": "Pull ATS metrics, calculate funnel conversion and time-to-fill, summarize", "category": "reporting", "frequency": "monthly", "time_per_task": 90, "complexity": "low"},
        ],
    },
    {
        "key": "sales",
        "name": "Sales Operations Team Workflow",
        "context": "team",
        "team_size": "6-20",
        "industry": "B2B SaaS",
        "tasks": [
            {"name": "Enrich and route inbound leads to reps", "description": "Look up company data, score the lead, assign to the right rep by territory/segment", "category": "data_entry", "frequency": "daily", "time_per_task": 7, "complexity": "low"},
            {"name": "Send personalized follow-up sequences", "description": "Draft and send follow-up emails after calls/demos, adjusted per prospect", "category": "communication", "frequency": "daily", "time_per_task": 12, "complexity": "medium"},
            {"name": "Keep CRM records and deal stages current", "description": "Log activities, update deal stages, fix stale or duplicate records", "category": "data_entry", "frequency": "daily", "time_per_task": 15, "complexity": "low"},
            {"name": "Generate and send quotes and proposals", "description": "Build a quote from the price book, apply approved discounts, send for signature", "category": "management", "frequency": "weekly", "time_per_task": 35, "complexity": "medium"},
            {"name": "Build the weekly pipeline and forecast report", "description": "Pull pipeline by stage, weight by probability, summarize forecast vs quota", "category": "reporting", "frequency": "weekly", "time_per_task": 75, "complexity": "medium"},
        ],
    },
    {
        "key": "agency",
        "name": "Automation Agency Delivery Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "Automation Consulting",
        "tasks": [
            {"name": "Map a client's process into discrete steps", "description": "Interview the client, document each step, inputs, outputs and hand-offs", "category": "analysis", "frequency": "weekly", "time_per_task": 120, "complexity": "high"},
            {"name": "Scope and quote an automation build", "description": "Estimate effort per workflow, price the engagement, write the proposal", "category": "management", "frequency": "weekly", "time_per_task": 60, "complexity": "medium"},
            {"name": "Build and test n8n / Make workflows", "description": "Implement the automation, wire integrations, test happy-path and edge cases", "category": "analysis", "frequency": "daily", "time_per_task": 90, "complexity": "high"},
            {"name": "Write client-facing workflow documentation", "description": "Document what each automation does and how to maintain it, in plain English", "category": "reporting", "frequency": "weekly", "time_per_task": 50, "complexity": "medium"},
            {"name": "Monitor deployed workflows and handle errors", "description": "Watch for failed runs, diagnose, add retries/fallbacks, notify the client", "category": "management", "frequency": "daily", "time_per_task": 25, "complexity": "medium"},
        ],
    },
]


def create_and_analyze(v):
    payload = {
        "name": v["name"],
        "description": f"Pre-generated WorkScanAI sample: {v['name']}",
        "input_mode": "manual",
        "analysis_context": v["context"],
        "team_size": v.get("team_size"),
        "industry": v.get("industry"),
        "tasks": v["tasks"],
    }
    r = requests.post(f"{BASE}/api/workflows", json=payload, timeout=120)
    r.raise_for_status()
    wf = r.json()
    wid = wf["id"]
    code = wf.get("share_code")
    # single-JSON (non-SSE) analyze
    ar = requests.post(
        f"{BASE}/api/analyze",
        json={"workflow_id": wid, "hourly_rate": HOURLY_RATE},
        headers={"Accept": "application/json"},
        timeout=300,
    )
    ar.raise_for_status()
    a = ar.json()
    return {
        "key": v["key"],
        "share_code": code,
        "workflow_id": wid,
        "automation_score": round(a.get("automation_score", 0), 1),
        "annual_savings": int(a.get("annual_savings", 0) or 0),
        "hours_saved": int(a.get("hours_saved", 0) or 0),
        "tasks": len(a.get("results", [])),
    }


if __name__ == "__main__":
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    results = []
    for v in VERTICALS:
        if only and v["key"] not in only:
            continue
        print(f"[{v['key']}] creating + analyzing...", flush=True)
        try:
            res = create_and_analyze(v)
            results.append(res)
            print(f"  -> code={res['share_code']} score={res['automation_score']} "
                  f"savings={res['annual_savings']} hours={res['hours_saved']} tasks={res['tasks']}", flush=True)
        except requests.HTTPError as e:
            print(f"  !! HTTP {e.response.status_code}: {e.response.text[:300]}", flush=True)
        except Exception as e:
            print(f"  !! {type(e).__name__}: {e}", flush=True)
        time.sleep(2)
    print("\n=== SUMMARY (paste into verticals.ts) ===")
    print(json.dumps(results, indent=2))
