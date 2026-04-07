"""
One-off script: backfill n8n_workflow_json for workflow IDs that are missing it.
Run with: backend\venv\Scripts\python.exe backend\backfill_n8n.py
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Load env from backend/.env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.core.config import settings
from app.services.job_scanner import JobScanner

WORKFLOW_ID = 65
JOB_TITLE = "Full Stack Software Engineer (Javascript, Node.js, AI Agents)"
TASKS = [
    {"name": "Debug Node.js API endpoint failures",       "category": "analysis",      "frequency": "daily"},
    {"name": "Write unit tests for React components",     "category": "analysis",      "frequency": "weekly"},
    {"name": "Configure AI agent prompts and parameters", "category": "management",    "frequency": "weekly"},
    {"name": "Review pull requests from team members",    "category": "communication", "frequency": "daily"},
    {"name": "Update npm package dependencies",           "category": "management",    "frequency": "weekly"},
    {"name": "Document API integration patterns",         "category": "reporting",     "frequency": "monthly"},
]

scanner = JobScanner()
n8n_workflow = scanner._generate_n8n_workflow(JOB_TITLE, TASKS)
n8n_json_str = json.dumps(n8n_workflow)

print(f"Generated workflow: {n8n_workflow.get('name')}")
print(f"Nodes: {len(n8n_workflow.get('nodes', []))}")
print(f"JSON length: {len(n8n_json_str)} chars")

# Write to Turso directly
from app.core.turso_dbapi import connect as turso_connect
conn = turso_connect(settings.TURSO_DATABASE_URL, settings.TURSO_AUTH_TOKEN)
cur = conn.cursor()
cur.execute(
    "UPDATE workflows SET n8n_workflow_json = ? WHERE id = ?",
    (n8n_json_str, WORKFLOW_ID)
)
conn.commit()
conn.close()

print(f"Backfilled workflow {WORKFLOW_ID} successfully.")
