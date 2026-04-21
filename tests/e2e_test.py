"""
WorkScanAI E2E Test Suite
Tests: parse-tasks, workflow creation, analysis pipeline, reports (PDF/DOCX),
       share URL, quota, n8n templates, extract-tasks, admin stats (expected 401),
       job-scan pipeline.
"""
import json
import time
import sys
import os
import io
from pathlib import Path

import httpx

BASE = "https://workscanai.onrender.com"
FRONT = "https://workscanai.vercel.app"
OUT = Path(r"C:\Users\damya\Projects\workscanai\tests\out")
OUT.mkdir(parents=True, exist_ok=True)

results = []  # list of dicts: name, status, duration_ms, detail

def log(name, ok, t0, detail=""):
    ms = int((time.time() - t0) * 1000)
    results.append({"name": name, "status": "PASS" if ok else "FAIL", "ms": ms, "detail": detail})
    marker = "OK  " if ok else "FAIL"
    print(f"[{marker}] {name:40s} {ms:6d}ms  {detail}")
    sys.stdout.flush()

client = httpx.Client(timeout=180.0, headers={"User-Agent": "workscanai-e2e/1.0"})

# --- 1. Health ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/health")
    log("health", r.status_code == 200 and r.json().get("status") == "healthy", t0, f"status={r.status_code}")
except Exception as e:
    log("health", False, t0, str(e))

# --- 2. Quota pre-check ---
t0 = time.time()
quota_before = None
try:
    r = client.get(f"{BASE}/api/quota")
    quota_before = r.json()
    log("quota_pre", r.status_code == 200, t0, json.dumps(quota_before))
except Exception as e:
    log("quota_pre", False, t0, str(e))

# --- 3. Frontend reachable ---
t0 = time.time()
try:
    r = client.get(FRONT)
    log("frontend_reachable", r.status_code == 200, t0, f"status={r.status_code} bytes={len(r.content)}")
except Exception as e:
    log("frontend_reachable", False, t0, str(e))

# --- 4. Admin stats (expect 401 without auth) ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/api/admin/stats")
    log("admin_stats_gated", r.status_code == 401, t0, f"status={r.status_code} (expected 401)")
except Exception as e:
    log("admin_stats_gated", False, t0, str(e))

# --- 5. parse-tasks (marketing team example from README) ---
t0 = time.time()
marketing_text = """Our marketing team handles the following daily activities:
1. Writing social media posts across LinkedIn, Twitter, and Instagram - 30 minutes every day
2. Scheduling posts across all platforms using our social media tool - 15 minutes every day
3. Responding to comments, DMs, and messages from followers - 45 minutes every day
4. Generating weekly performance reports with engagement metrics - 2 hours every week
5. Researching trending topics and competitor content - 1 hour every day"""
parsed_tasks = None
try:
    r = client.post(f"{BASE}/api/parse-tasks", json={"text": marketing_text})
    ok = r.status_code == 200
    if ok:
        parsed_tasks = r.json().get("tasks", [])
        ok = len(parsed_tasks) >= 3
    log("parse_tasks", ok, t0, f"status={r.status_code} tasks={len(parsed_tasks or [])}")
    (OUT / "01_parsed_tasks.json").write_text(json.dumps(parsed_tasks or r.text, indent=2), encoding="utf-8")
except Exception as e:
    log("parse_tasks", False, t0, str(e))

# --- 6. Create workflow from parsed tasks ---
t0 = time.time()
workflow_id = None
try:
    body = {
        "name": "E2E Test - Marketing Team",
        "description": "Automated end-to-end test run",
        "source_text": marketing_text,
        "input_mode": "text",
        "analysis_context": "marketing team daily workflows",
        "team_size": "small",
        "industry": "marketing",
        "tasks": parsed_tasks or []
    }
    r = client.post(f"{BASE}/api/workflows", json=body)
    ok = r.status_code in (200, 201)
    if ok:
        data = r.json()
        workflow_id = data.get("id")
        ok = workflow_id is not None
    log("create_workflow", ok, t0, f"status={r.status_code} workflow_id={workflow_id}")
    (OUT / "02_workflow_created.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("create_workflow", False, t0, str(e))

# --- 7. Analyze workflow ---
t0 = time.time()
analysis = None
try:
    r = client.post(f"{BASE}/api/analyze", json={"workflow_id": workflow_id, "hourly_rate": 50.0})
    ok = r.status_code == 200
    if ok:
        analysis = r.json()
    log("analyze", ok, t0, f"status={r.status_code}")
    (OUT / "03_analysis.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("analyze", False, t0, str(e))

# --- 8. Get results ---
t0 = time.time()
results_data = None
share_code = None
try:
    r = client.get(f"{BASE}/api/results/{workflow_id}")
    ok = r.status_code == 200
    if ok:
        results_data = r.json()
        share_code = results_data.get("share_code") or results_data.get("workflow", {}).get("share_code")
    log("get_results", ok, t0, f"status={r.status_code} share_code={share_code}")
    (OUT / "04_results.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("get_results", False, t0, str(e))

# --- 9. Score sanity check ---
t0 = time.time()
try:
    score = None
    savings = None
    if results_data:
        # common locations
        score = (results_data.get("overall_score")
                 or results_data.get("automation_score")
                 or (results_data.get("analysis") or {}).get("overall_score")
                 or (results_data.get("analysis") or {}).get("automation_score"))
        savings = (results_data.get("annual_savings")
                   or (results_data.get("analysis") or {}).get("annual_savings")
                   or (results_data.get("roi") or {}).get("annual_savings"))
    ok = score is not None and 0 <= float(score) <= 100
    log("score_sanity", ok, t0, f"score={score} savings={savings}")
except Exception as e:
    log("score_sanity", False, t0, str(e))

# --- 10. PDF export ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/api/reports/{workflow_id}/pdf")
    ok = r.status_code == 200 and r.content[:4] == b"%PDF"
    if ok:
        (OUT / "05_report.pdf").write_bytes(r.content)
    log("pdf_export", ok, t0, f"status={r.status_code} bytes={len(r.content)}")
except Exception as e:
    log("pdf_export", False, t0, str(e))

# --- 11. DOCX export ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/api/reports/{workflow_id}/docx")
    # docx is a zip: starts with PK
    ok = r.status_code == 200 and r.content[:2] == b"PK"
    if ok:
        (OUT / "06_report.docx").write_bytes(r.content)
    log("docx_export", ok, t0, f"status={r.status_code} bytes={len(r.content)}")
except Exception as e:
    log("docx_export", False, t0, str(e))

# --- 12. Public share URL ---
t0 = time.time()
try:
    if share_code:
        r = client.get(f"{BASE}/api/share/{share_code}")
        ok = r.status_code == 200
        log("public_share_api", ok, t0, f"status={r.status_code}")
        # also frontend report page
        r2 = client.get(f"{FRONT}/report/{share_code}")
        log("public_share_frontend", r2.status_code == 200, t0, f"status={r2.status_code}")
    else:
        log("public_share_api", False, t0, "no share_code")
except Exception as e:
    log("public_share_api", False, t0, str(e))

# --- 13. n8n templates endpoint ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/api/job-scan/n8n-templates?query=social+media+scheduling")
    ok = r.status_code == 200
    log("n8n_templates", ok, t0, f"status={r.status_code} bytes={len(r.content)}")
    if ok:
        (OUT / "07_n8n_templates.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("n8n_templates", False, t0, str(e))

# --- 14. Job-scan research (Tavily) ---
t0 = time.time()
job_research = None
try:
    r = client.post(f"{BASE}/api/job-scan/research", json={"job_title": "Senior Marketing Manager", "industry": "SaaS"})
    ok = r.status_code == 200
    if ok:
        job_research = r.json()
    log("job_scan_research", ok, t0, f"status={r.status_code}")
    (OUT / "08_job_research.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("job_scan_research", False, t0, str(e))

# --- 15. Job-scan analyze (full pipeline — consumes quota slot) ---
t0 = time.time()
try:
    payload = {"job_title": "Senior Marketing Manager", "industry": "SaaS"}
    if job_research:
        payload["research"] = job_research
    r = client.post(f"{BASE}/api/job-scan/analyze", json=payload)
    ok = r.status_code == 200
    log("job_scan_analyze", ok, t0, f"status={r.status_code}")
    (OUT / "09_job_scan_analysis.json").write_text(r.text, encoding="utf-8")
except Exception as e:
    log("job_scan_analyze", False, t0, str(e))

# --- 16. Quota post-check ---
t0 = time.time()
try:
    r = client.get(f"{BASE}/api/quota")
    quota_after = r.json()
    log("quota_post", r.status_code == 200, t0, json.dumps(quota_after) + f" (was {json.dumps(quota_before)})")
except Exception as e:
    log("quota_post", False, t0, str(e))

# --- Summary ---
print("\n" + "=" * 80)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
print(f"SUMMARY: {passed} passed, {failed} failed, {len(results)} total")
print("=" * 80)
for r in results:
    print(f"  {r['status']:4s}  {r['name']:30s}  {r['ms']:>6d}ms  {r['detail'][:80]}")
print("=" * 80)

(OUT / "_summary.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(f"\nArtifacts in: {OUT}")
sys.exit(0 if failed == 0 else 1)
