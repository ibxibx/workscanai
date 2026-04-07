"""
Backfill n8n merged canvas for workflow 73 (Frontend Software Engineer - Figma, Javascript)
using the new per-task N8nTemplateClient.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.core.config import settings
from app.services.n8n_template_client import N8nTemplateClient

WORKFLOW_ID = 73
JOB_TITLE = "Frontend Software Engineer (Figma, Javascript)"
TASKS = [
    {"name": "Convert Figma designs to React components", "category": "data_entry",    "frequency": "daily"},
    {"name": "Code review pull requests for UI changes",  "category": "analysis",      "frequency": "daily"},
    {"name": "Debug responsive layout issues",            "category": "analysis",      "frequency": "daily"},
    {"name": "Sync design system updates with developers","category": "communication", "frequency": "weekly"},
    {"name": "Write unit tests for UI components",        "category": "analysis",      "frequency": "weekly"},
    {"name": "Update component documentation in Storybook","category": "reporting",   "frequency": "weekly"},
]

print(f"Fetching per-task templates for: {JOB_TITLE}")
client = N8nTemplateClient(anthropic_api_key=settings.ANTHROPIC_API_KEY)

suggested = client.get_curated_templates(job_title=JOB_TITLE, tasks=TASKS)
print(f"Templates curated: {len(suggested)}")
for t in suggested:
    print(f"  Task: {t.get('task_name')} -> Template: {t.get('name')} (reason: {t.get('relevance_reason')})")

if suggested:
    merged = client.build_merged_canvas(job_title=JOB_TITLE, suggested_templates=suggested)
    print(f"Merged canvas: {merged.get('name')}, {len(merged.get('nodes', []))} nodes")
    n8n_json_str = json.dumps(merged)
else:
    print("No templates found — keeping existing skeleton")
    sys.exit(0)

# Write to Turso directly
from app.core.turso_dbapi import connect as turso_connect
conn = turso_connect(settings.TURSO_DATABASE_URL, settings.TURSO_AUTH_TOKEN)
cur = conn.cursor()
cur.execute("UPDATE workflows SET n8n_workflow_json = ? WHERE id = ?", (n8n_json_str, WORKFLOW_ID))
conn.commit()
conn.close()
print(f"Backfilled workflow {WORKFLOW_ID} with merged canvas ({len(n8n_json_str)} chars)")
