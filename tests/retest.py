import json, httpx, pathlib
BASE = "https://workscanai.onrender.com"
OUT = pathlib.Path(r"C:\Users\damya\Projects\workscanai\tests\out")
tasks_raw = json.loads((OUT / "01_parsed_tasks.json").read_text(encoding="utf-8"))
tasks = []
for t in tasks_raw:
    item = {"name": (t.get("name") or t.get("task") or t.get("title") or "Unnamed task")}
    for k in ("description","frequency","time_per_task","category","complexity"):
        if k in t and t[k] is not None:
            item[k] = t[k]
    tasks.append(item)
print("tasks_sample:", json.dumps(tasks[:2], indent=2))
print("total_tasks:", len(tasks))
c = httpx.Client(timeout=180.0)
print()
print("--- RETEST 14: n8n-templates POST ---")
r = c.post(f"{BASE}/api/job-scan/n8n-templates", json={"job_title": "Marketing Manager", "tasks": tasks})
print(f"status={r.status_code} bytes={len(r.content)}")
if r.status_code == 200:
    data = r.json()
    print(f"top_keys={list(data.keys())[:10] if isinstance(data, dict) else type(data).__name__}")
    (OUT / "07_n8n_templates.json").write_text(r.text, encoding="utf-8")
    if isinstance(data, dict):
        wf = data.get("workflow") or data.get("n8n_workflow") or data
        has_nodes = bool(wf.get("nodes")) if isinstance(wf, dict) else False
        print(f"has_n8n_nodes_shape={has_nodes}")
else:
    print("body:", r.text[:500])
print()
print("--- RETEST 16: job-scan analyze POST ---")
payload = {"job_title": "Senior Marketing Manager", "industry": "SaaS", "hourly_rate": 75.0, "tasks": tasks}
r = c.post(f"{BASE}/api/job-scan/analyze", json=payload)
print(f"status={r.status_code} bytes={len(r.content)}")
if r.status_code in (200, 201):
    data = r.json()
    print(f"top_keys={list(data.keys())[:15]}")
    (OUT / "09_job_scan_analysis.json").write_text(r.text, encoding="utf-8")
    wf_id = data.get("workflow_id") or data.get("id")
    print(f"workflow_id={wf_id}")
    score = data.get("overall_score")
    if score is None and isinstance(data.get("analysis"), dict):
        score = data["analysis"].get("overall_score")
    print(f"score={score}")
else:
    print("body:", r.text[:800])
r = c.get(f"{BASE}/api/quota")
print()
print(f"quota_final: {r.json()}")
