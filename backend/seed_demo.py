"""
Demo seed script — populates WorkScanAI with 3 sample workflows + analyses
so a first-time visitor sees a meaningful dashboard instead of an empty screen.

Run with:
    cd backend
    python seed_demo.py
"""
import sys
import requests

BASE = "http://localhost:8000"

WORKFLOWS = [
    {
        "name": "Marketing Team Operations",
        "description": (
            "Daily social media management including content creation, scheduling, "
            "audience engagement, and weekly performance reporting."
        ),
        "tasks": [
            {
                "name": "Write social media posts",
                "description": "Create engaging content for LinkedIn, Twitter, and Instagram",
                "frequency": "daily", "time_per_task": 30,
                "category": "creative", "complexity": "medium",
            },
            {
                "name": "Schedule posts across platforms",
                "description": "Use scheduling tool to publish content at optimal times",
                "frequency": "daily", "time_per_task": 15,
                "category": "administrative", "complexity": "low",
            },
            {
                "name": "Respond to comments and messages",
                "description": "Engage with audience, answer questions and handle feedback",
                "frequency": "daily", "time_per_task": 45,
                "category": "communication", "complexity": "medium",
            },
            {
                "name": "Generate weekly performance reports",
                "description": "Analyse reach, engagement, and conversion metrics across channels",
                "frequency": "weekly", "time_per_task": 120,
                "category": "analysis", "complexity": "high",
            },
            {
                "name": "Research trending topics",
                "description": "Identify content opportunities from trending topics and competitor activity",
                "frequency": "daily", "time_per_task": 30,
                "category": "analysis", "complexity": "medium",
            },
        ],
    },
    {
        "name": "Customer Support Workflow",
        "description": (
            "End-to-end customer support process covering ticket handling, "
            "CRM updates, escalations, and satisfaction follow-ups."
        ),
        "tasks": [
            {
                "name": "Triage and categorise incoming tickets",
                "description": "Review new support tickets and assign priority and category",
                "frequency": "daily", "time_per_task": 20,
                "category": "data_entry", "complexity": "low",
            },
            {
                "name": "Respond to customer emails",
                "description": "Write personalised replies to customer questions and complaints",
                "frequency": "daily", "time_per_task": 90,
                "category": "communication", "complexity": "medium",
            },
            {
                "name": "Update CRM after each interaction",
                "description": "Log notes, status changes, and resolutions in the CRM",
                "frequency": "daily", "time_per_task": 15,
                "category": "data_entry", "complexity": "low",
            },
            {
                "name": "Escalate complex issues to senior agents",
                "description": "Identify tickets needing specialist handling and route them correctly",
                "frequency": "daily", "time_per_task": 20,
                "category": "analysis", "complexity": "medium",
            },
            {
                "name": "Send post-resolution satisfaction surveys",
                "description": "Email CSAT survey to customers 24 h after ticket close",
                "frequency": "daily", "time_per_task": 10,
                "category": "communication", "complexity": "low",
            },
        ],
    },
    {
        "name": "Finance & Accounting Operations",
        "description": (
            "Core finance tasks including invoice processing, expense reporting, "
            "bank reconciliation, and monthly close activities."
        ),
        "tasks": [
            {
                "name": "Process and code incoming invoices",
                "description": "Review supplier invoices, verify amounts, and enter into accounting system",
                "frequency": "daily", "time_per_task": 45,
                "category": "data_entry", "complexity": "medium",
            },
            {
                "name": "Reconcile bank statements",
                "description": "Match transactions in the accounting system against bank records",
                "frequency": "weekly", "time_per_task": 120,
                "category": "analysis", "complexity": "medium",
            },
            {
                "name": "Review and approve expense reports",
                "description": "Check employee expense submissions against policy and approve payment",
                "frequency": "weekly", "time_per_task": 60,
                "category": "analysis", "complexity": "medium",
            },
            {
                "name": "Generate monthly financial reports",
                "description": "Compile P&L, balance sheet, and cash flow statements for management",
                "frequency": "monthly", "time_per_task": 240,
                "category": "analysis", "complexity": "high",
            },
            {
                "name": "Chase overdue customer invoices",
                "description": "Identify overdue accounts and send payment reminders via email",
                "frequency": "weekly", "time_per_task": 45,
                "category": "communication", "complexity": "low",
            },
        ],
    },
]


def seed():
    print("Seeding demo workflows...\n")

    # Quick health check first
    try:
        requests.get(f"{BASE}/health", timeout=3)
    except Exception:
        print("ERROR: Backend not reachable at http://localhost:8000")
        print("Start it first:  uvicorn app.main:app --reload --port 8000")
        sys.exit(1)

    for wf in WORKFLOWS:
        # Create workflow
        r = requests.post(f"{BASE}/api/workflows", json=wf, timeout=10)
        if not r.ok:
            print(f"  FAILED to create '{wf['name']}': {r.status_code} {r.text}")
            continue
        wf_id = r.json()["id"]
        print(f"  Created workflow #{wf_id}: {wf['name']}")

        # Analyse it
        r2 = requests.post(
            f"{BASE}/api/analyze",
            json={"workflow_id": wf_id, "hourly_rate": 50},
            timeout=60,
        )
        if r2.ok:
            score = r2.json().get("automation_score", 0)
            savings = r2.json().get("annual_savings", 0)
            print(f"    -> Score: {score:.0f}/100  |  Annual savings: ${savings:,.0f}")
        else:
            print(f"    Analysis failed: {r2.status_code} {r2.text}")

    print("\nDone! Open http://localhost:3000/dashboard to see the seeded data.")


if __name__ == "__main__":
    seed()
