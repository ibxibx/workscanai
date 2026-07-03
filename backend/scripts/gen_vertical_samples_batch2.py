"""
Generate 5 ADDITIONAL vertical sample reports (batch 2) in PRODUCTION via the
live API, for the most in-demand 2026 business activities not yet covered:
e-commerce ops, real estate, healthcare admin, digital marketing agency, IT/dev.

Auth for the rate-limit bypass (so this doesn't hit the public 5/24h cap):
  - Preferred: set the admin secret WITHOUT exposing it in code:
      set WSAI_ADMIN_SECRET=<secret>   (Windows)   then run this script.
    The script sends it as the x-admin-secret header. Requires the /api/analyze
    owner/admin bypass to be DEPLOYED first.
  - Or: if this machine's public IP is set as OWNER_IP on Render, no secret is
    needed (the bypass matches by IP).
  - If neither is available and quota is exhausted, /api/analyze returns 429.

Run: set WSAI_ADMIN_SECRET=...  &&  backend/venv/Scripts/python.exe scripts/gen_vertical_samples_batch2.py
Output: prints share_code + numbers per vertical -> paste into VERTICALS in
frontend/src/app/templates/verticals.ts.
"""
import requests, json, sys, os, time

BASE = "https://workscanai.onrender.com"
HOURLY_RATE = 50.0
ADMIN_SECRET = os.getenv("WSAI_ADMIN_SECRET", "").strip()

VERTICALS = [
    {
        "key": "ecommerce",
        "name": "E-commerce Operations Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "E-commerce / Retail",
        "tasks": [
            {"name": "Process and track customer orders", "description": "Confirm orders, generate shipping labels, update tracking, handle exceptions", "category": "data_entry", "frequency": "daily", "time_per_task": 8, "complexity": "low"},
            {"name": "Update product listings and inventory", "description": "Sync stock levels, update prices and descriptions across channels", "category": "data_entry", "frequency": "daily", "time_per_task": 20, "complexity": "low"},
            {"name": "Handle returns and refund requests", "description": "Review return requests, issue refunds, update inventory, notify the customer", "category": "communication", "frequency": "daily", "time_per_task": 12, "complexity": "medium"},
            {"name": "Answer pre-sale product questions", "description": "Reply to questions about sizing, shipping, availability across chat and email", "category": "communication", "frequency": "daily", "time_per_task": 6, "complexity": "low"},
            {"name": "Compile weekly sales and stock report", "description": "Pull sales by SKU, flag low stock, summarize trends for the owner", "category": "reporting", "frequency": "weekly", "time_per_task": 60, "complexity": "medium"},
        ],
    },
    {
        "key": "realestate",
        "name": "Real Estate Agency Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "Real Estate",
        "tasks": [
            {"name": "Qualify and route incoming buyer leads", "description": "Capture enquiries, qualify budget and intent, assign to the right agent", "category": "communication", "frequency": "daily", "time_per_task": 10, "complexity": "low"},
            {"name": "Schedule and confirm property viewings", "description": "Coordinate viewing times between buyers, sellers and agents, send reminders", "category": "communication", "frequency": "daily", "time_per_task": 12, "complexity": "low"},
            {"name": "Draft and publish property listings", "description": "Write listing copy, format photos, publish to portals and social", "category": "reporting", "frequency": "weekly", "time_per_task": 45, "complexity": "medium"},
            {"name": "Prepare contracts and disclosure paperwork", "description": "Fill standard contract templates, gather signatures, track deadlines", "category": "management", "frequency": "weekly", "time_per_task": 60, "complexity": "medium"},
            {"name": "Send follow-up nurture emails to prospects", "description": "Keep warm leads engaged with new listings and market updates", "category": "communication", "frequency": "weekly", "time_per_task": 30, "complexity": "low"},
        ],
    },
    {
        "key": "healthcare",
        "name": "Medical Practice Admin Workflow",
        "context": "team",
        "team_size": "2-5",
        "industry": "Healthcare",
        "tasks": [
            {"name": "Schedule and confirm patient appointments", "description": "Book, reschedule and confirm appointments, send reminders, manage the waitlist", "category": "communication", "frequency": "daily", "time_per_task": 8, "complexity": "low"},
            {"name": "Verify insurance and process claims", "description": "Check patient eligibility, submit claims, track and resubmit denials", "category": "data_entry", "frequency": "daily", "time_per_task": 15, "complexity": "medium"},
            {"name": "Update and file patient records", "description": "Enter intake forms and visit notes into the practice system, keep records current", "category": "data_entry", "frequency": "daily", "time_per_task": 10, "complexity": "medium"},
            {"name": "Handle billing and payment reminders", "description": "Generate invoices, send payment reminders, reconcile payments received", "category": "reporting", "frequency": "weekly", "time_per_task": 40, "complexity": "medium"},
            {"name": "Answer routine patient enquiries", "description": "Respond to common questions about hours, prep instructions and results by phone/portal", "category": "communication", "frequency": "daily", "time_per_task": 6, "complexity": "low"},
        ],
    },
    {
        "key": "digitalagency",
        "name": "Digital Marketing Agency Workflow",
        "context": "team",
        "team_size": "6-20",
        "industry": "Marketing Agency",
        "tasks": [
            {"name": "Produce and schedule client content", "description": "Draft posts, ads and emails per client brief, schedule across platforms", "category": "reporting", "frequency": "daily", "time_per_task": 40, "complexity": "medium"},
            {"name": "Build client performance dashboards", "description": "Pull ad and analytics data, update dashboards, write plain-English commentary", "category": "reporting", "frequency": "weekly", "time_per_task": 75, "complexity": "medium"},
            {"name": "Manage and optimize ad campaigns", "description": "Adjust budgets, pause underperformers, test creatives across accounts", "category": "analysis", "frequency": "daily", "time_per_task": 35, "complexity": "high"},
            {"name": "Prepare monthly client reports", "description": "Aggregate results per client, benchmark vs goals, format a branded report", "category": "reporting", "frequency": "monthly", "time_per_task": 120, "complexity": "medium"},
            {"name": "Onboard new clients and gather assets", "description": "Collect brand assets, access and goals, set up accounts and trackers", "category": "management", "frequency": "monthly", "time_per_task": 90, "complexity": "medium"},
        ],
    },
    {
        "key": "itteam",
        "name": "IT / Software Team Workflow",
        "context": "team",
        "team_size": "6-20",
        "industry": "Software / IT",
        "tasks": [
            {"name": "Triage incoming bug reports and tickets", "description": "Categorize, prioritize and route incoming issues to the right engineer", "category": "analysis", "frequency": "daily", "time_per_task": 8, "complexity": "medium"},
            {"name": "Review pull requests", "description": "Read diffs, run checks, leave review comments, approve or request changes", "category": "analysis", "frequency": "daily", "time_per_task": 20, "complexity": "high"},
            {"name": "Write and update technical documentation", "description": "Document APIs, runbooks and architecture; keep docs in sync with changes", "category": "reporting", "frequency": "weekly", "time_per_task": 50, "complexity": "medium"},
            {"name": "Respond to internal IT support requests", "description": "Handle access, tooling and how-to requests from the rest of the company", "category": "communication", "frequency": "daily", "time_per_task": 10, "complexity": "low"},
            {"name": "Run release and deployment checklists", "description": "Execute pre-release checks, coordinate deploys, monitor and roll back if needed", "category": "management", "frequency": "weekly", "time_per_task": 45, "complexity": "high"},
        ],
    },
]


def _headers():
    h = {"Accept": "application/json"}
    if ADMIN_SECRET:
        h["x-admin-secret"] = ADMIN_SECRET
    return h


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
    r = requests.post(f"{BASE}/api/workflows", json=payload, headers=_headers(), timeout=120)
    r.raise_for_status()
    wf = r.json()
    wid = wf["id"]
    code = wf.get("share_code")
    ar = requests.post(
        f"{BASE}/api/analyze",
        json={"workflow_id": wid, "hourly_rate": HOURLY_RATE},
        headers=_headers(),
        timeout=300,
    )
    ar.raise_for_status()
    a = ar.json()
    return {
        "key": v["key"],
        "share_code": code,
        "workflow_id": wid,
        "score": round(a.get("automation_score", 0)),
        "annualSavings": int(a.get("annual_savings", 0) or 0),
        "hoursSaved": round(a.get("hours_saved", 0) or 0),
        "tasks": len(a.get("results", [])),
    }


if __name__ == "__main__":
    only = [x for x in sys.argv[1:] if not x.startswith("--")]
    print("admin-secret:", "set" if ADMIN_SECRET else "NOT set (relying on OWNER_IP)")
    results = []
    for v in VERTICALS:
        if only and v["key"] not in only:
            continue
        print(f"[{v['key']}] creating + analyzing...", flush=True)
        try:
            res = create_and_analyze(v)
            results.append(res)
            print(f"  -> code={res['share_code']} score={res['score']} "
                  f"save={res['annualSavings']} hrs={res['hoursSaved']} tasks={res['tasks']}", flush=True)
        except requests.HTTPError as e:
            print(f"  !! HTTP {e.response.status_code}: {e.response.text[:200]}", flush=True)
            if e.response.status_code == 429:
                print("  (rate limited — need the /api/analyze bypass deployed + admin secret or OWNER_IP)")
                break
        except Exception as e:
            print(f"  !! {type(e).__name__}: {e}", flush=True)
        time.sleep(2)
    print("\n=== SUMMARY (paste into verticals.ts) ===")
    print(json.dumps(results, indent=2))
