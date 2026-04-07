import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from app.core.config import settings
from app.services.n8n_template_client import N8nTemplateClient

client = N8nTemplateClient(anthropic_api_key=settings.ANTHROPIC_API_KEY)

results = client._search_for_task('Code review pull requests', 'analysis')
print(f"Search returned: {len(results)} candidates")
for r in results[:5]:
    print(f"  ID={r['id']} | {r['name']}")

if results:
    tid, reason = client._curate_one_task(
        "Frontend Software Engineer",
        {"name": "Code review pull requests", "category": "analysis", "frequency": "daily"},
        results
    )
    print(f"Curated: id={tid} reason={reason}")
