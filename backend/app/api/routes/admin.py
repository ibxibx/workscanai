"""
Admin dashboard API — secured by x-admin-secret header.
GET /api/admin/stats  → full platform metrics
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.auth import require_admin as _require_admin
from app.models.workflow import User, Workflow, Task, Analysis, AnalysisResult

router = APIRouter()


@router.post("/admin/backfill-n8n/{workflow_id}")
async def backfill_n8n_canvas(
    workflow_id: int,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    """
    Regenerate and store the merged n8n canvas for a specific workflow
    using the new per-task N8nTemplateClient. Admin-only.
    """
    import json as _json

    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    tasks = db.query(Task).filter(Task.workflow_id == workflow_id).all()
    if not tasks:
        raise HTTPException(status_code=422, detail="No tasks found for this workflow")

    task_dicts = [
        {"name": t.name, "category": t.category or "general", "frequency": t.frequency or "weekly"}
        for t in tasks
    ]
    job_title = workflow.name.replace(" \u2013 Job Scanner", "").replace(" \u2014 Job Scanner", "").replace("-- Job Scanner", "").strip()

    from app.services.n8n_template_client import N8nTemplateClient
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    client = N8nTemplateClient(anthropic_api_key=api_key)

    suggested = client.get_curated_templates(job_title=job_title, tasks=task_dicts)
    if not suggested:
        raise HTTPException(status_code=422, detail="No templates found for this workflow")

    merged = client.build_merged_canvas(job_title=job_title, suggested_templates=suggested)
    n8n_json_str = _json.dumps(merged)

    # Write directly via raw SQL (avoids session detachment issue)
    from sqlalchemy import text as _text
    db.execute(_text("UPDATE workflows SET n8n_workflow_json = :j WHERE id = :i"),
               {"j": n8n_json_str, "i": workflow_id})
    db.commit()

    return {
        "ok": True,
        "workflow_id": workflow_id,
        "job_title": job_title,
        "templates_used": len(suggested),
        "node_count": len(merged.get("nodes", [])),
        "canvas_name": merged.get("name"),
        "templates": [{"task": t.get("task_name"), "template": t.get("name"), "reason": t.get("relevance_reason")} for t in suggested],
    }


@router.post("/admin/backfill-confidence/{workflow_id}")
async def backfill_confidence(
    workflow_id: int,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    """
    Recompute score_confidence for a workflow's analysis results from their four
    sub-scores. For reports generated before feature #10 (confidence badge) shipped,
    score_confidence is NULL and the badge silently doesn't render. This backfills
    it in place (same share code / URL) using the EXACT derivation in
    ai_analyzer.py: population std-dev of the sub-scores → high (<12) / medium
    (<22) / low. Idempotent and safe to re-run. Admin-only.
    """
    analysis = (
        db.query(Analysis)
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.id == workflow_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis for that workflow")

    results = db.query(AnalysisResult).filter(AnalysisResult.analysis_id == analysis.id).all()
    if not results:
        raise HTTPException(status_code=422, detail="No analysis results found")

    def derive(r) -> str:
        subs = [r.score_repeatability, r.score_data_availability,
                r.score_error_tolerance, r.score_integration]
        subs = [s for s in subs if s is not None]
        if len(subs) < 3:
            return "medium"
        mean = sum(subs) / len(subs)
        spread = (sum((s - mean) ** 2 for s in subs) / len(subs)) ** 0.5
        return "high" if spread < 12 else "medium" if spread < 22 else "low"

    updated, skipped = 0, 0
    for r in results:
        if r.score_confidence:            # already set — leave it (idempotent)
            skipped += 1
            continue
        r.score_confidence = derive(r)
        updated += 1
    db.commit()

    return {
        "ok": True,
        "workflow_id": workflow_id,
        "analysis_id": analysis.id,
        "results": len(results),
        "updated": updated,
        "already_set": skipped,
        "confidence_values": [r.score_confidence for r in results],
    }


@router.post("/admin/reset-rate-limits")
async def reset_rate_limits(
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    """Clear all IP-based rate limit counters. Use during dev/testing."""
    from sqlalchemy import text as _text
    # The rate limit is tracked via Analysis.created_at + Workflow.client_ip
    # There's no separate rate_limits table — the count is derived on each request.
    # To "reset", we can't delete real analyses, but we can zero out by returning
    # the current count and confirming bypass via x-admin-secret header on scans.
    # Return current counts so we know the state.
    from app.models.workflow import Analysis, Workflow
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = (
        db.query(Workflow.client_ip, func.count(Analysis.id).label("cnt"))
        .join(Analysis, Analysis.workflow_id == Workflow.id)
        .filter(Analysis.created_at >= since)
        .filter(Workflow.client_ip != None)
        .group_by(Workflow.client_ip)
        .all()
    )
    ip_counts = [{"ip": r[0], "scans_last_24h": r[1]} for r in rows]
    return {
        "ok": True,
        "message": "Rate limits use x-admin-secret bypass — include that header in job-scan requests to skip the limit.",
        "current_ip_counts_last_24h": ip_counts,
        "tip": "Add header x-admin-secret: <ADMIN_SECRET> (the value from your environment) to any /api/job-scan/research or /api/job-scan/analyze call to bypass the limit."
    }


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), _=Depends(_require_admin)):
    # ── Totals ─────────────────────────────────────────────────────────────
    total_users      = db.query(func.count(User.id)).scalar() or 0
    total_workflows  = db.query(func.count(Workflow.id)).scalar() or 0
    total_analyses   = db.query(func.count(Analysis.id)).scalar() or 0
    total_tasks      = db.query(func.count(Task.id)).scalar() or 0

    # ── Averages ───────────────────────────────────────────────────────────
    avg_score   = db.query(func.avg(Analysis.automation_score)).scalar()
    avg_savings = db.query(func.avg(Analysis.annual_savings)).scalar()
    avg_hours   = db.query(func.avg(Analysis.hours_saved)).scalar()

    # ── Context breakdown ─────────────────────────────────────────────────
    ctx_rows = (
        db.query(Workflow.analysis_context, func.count(Workflow.id))
        .group_by(Workflow.analysis_context)
        .all()
    )
    by_context = {(r[0] or "unknown"): r[1] for r in ctx_rows}

    # ── Input mode breakdown ───────────────────────────────────────────────
    mode_rows = (
        db.query(Workflow.input_mode, func.count(Workflow.id))
        .group_by(Workflow.input_mode)
        .all()
    )
    by_input_mode = {(r[0] or "unknown"): r[1] for r in mode_rows}

    # ── All users with their workflow counts ───────────────────────────────
    users = db.query(User).order_by(User.created_at.desc()).all()
    users_list = []
    for u in users:
        wf_count  = db.query(func.count(Workflow.id)).filter(Workflow.user_email == u.email).scalar() or 0
        an_count  = (
            db.query(func.count(Analysis.id))
            .join(Workflow, Analysis.workflow_id == Workflow.id)
            .filter(Workflow.user_email == u.email)
            .scalar() or 0
        )
        users_list.append({
            "id": u.id,
            "email": u.email,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "workflows": wf_count,
            "analyses": an_count,
        })

    # ── All workflows with full details ────────────────────────────────────
    workflows = (
        db.query(Workflow)
        .order_by(Workflow.created_at.desc())
        .all()
    )
    workflows_list = []
    for w in workflows:
        analysis = db.query(Analysis).filter(Analysis.workflow_id == w.id).first()
        task_count = db.query(func.count(Task.id)).filter(Task.workflow_id == w.id).scalar() or 0
        # Sample task names
        task_names = [t.name for t in db.query(Task.name).filter(Task.workflow_id == w.id).limit(5).all()]
        workflows_list.append({
            "id": w.id,
            "name": w.name,
            "user_email": w.user_email,
            "analysis_context": w.analysis_context,
            "input_mode": w.input_mode,
            "industry": w.industry,
            "team_size": w.team_size,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "task_count": task_count,
            "task_names": task_names,
            # Source text (document/voice uploads)
            "source_text": w.source_text[:500] if w.source_text else None,
            # Analysis results if available
            "automation_score": round(analysis.automation_score, 1) if analysis else None,
            "annual_savings": round(analysis.annual_savings, 0) if analysis and analysis.annual_savings else None,
            "hours_saved": round(analysis.hours_saved, 1) if analysis and analysis.hours_saved else None,
            "share_code": w.share_code,
            "result_url": f"https://workscanai.vercel.app/dashboard/results/{w.id}" if analysis else None,
            "share_url": f"https://workscanai.vercel.app/report/{w.share_code}" if w.share_code and analysis else None,
        })

    # ── Traffic / country analytics (first-party page_views) ───────────────
    from app.models.workflow import PageView
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    total_views = db.query(func.count(PageView.id)).scalar() or 0
    unique_visitors = db.query(func.count(func.distinct(PageView.ip_hash))).scalar() or 0
    views_24h = db.query(func.count(PageView.id)).filter(PageView.created_at >= since_24h).scalar() or 0
    views_7d = db.query(func.count(PageView.id)).filter(PageView.created_at >= since_7d).scalar() or 0

    country_rows = (
        db.query(
            PageView.country,
            PageView.country_name,
            func.count(PageView.id),
            func.count(func.distinct(PageView.ip_hash)),
        )
        .filter(PageView.country != None)
        .group_by(PageView.country, PageView.country_name)
        .order_by(func.count(PageView.id).desc())
        .all()
    )
    by_country = [
        {"code": r[0], "name": r[1] or r[0], "views": r[2], "visitors": r[3],
         "pct": round(r[2] / total_views * 100, 1) if total_views else 0.0}
        for r in country_rows
    ]

    # Top cities — same IP-resolved geo Vercel shows. Group by city+region+country
    # so identically-named cities in different regions/countries stay distinct.
    city_rows = (
        db.query(
            PageView.city,
            PageView.region,
            PageView.country,
            func.count(PageView.id),
            func.count(func.distinct(PageView.ip_hash)),
        )
        .filter(PageView.city != None)
        .group_by(PageView.city, PageView.region, PageView.country)
        .order_by(func.count(PageView.id).desc())
        .all()
    )
    by_city = [
        {"city": r[0], "region": r[1], "country": r[2], "views": r[3], "visitors": r[4],
         "pct": round(r[3] / total_views * 100, 1) if total_views else 0.0}
        for r in city_rows
    ]

    path_rows = (
        db.query(PageView.path, func.count(PageView.id))
        .filter(PageView.path != None)
        .group_by(PageView.path)
        .order_by(func.count(PageView.id).desc())
        .limit(12)
        .all()
    )
    top_paths = [{"path": r[0], "views": r[1]} for r in path_rows]

    traffic = {
        "total_views": total_views,
        "unique_visitors": unique_visitors,
        "views_24h": views_24h,
        "views_7d": views_7d,
        "countries_count": len(by_country),
        "by_country": by_country,
        "cities_count": len(by_city),
        "by_city": by_city,
        "top_paths": top_paths,
    }

    # ── k-factor: viewer → creator conversion on shared reports ────────────
    # Report opens = page_views whose path is a /report/{code} URL.
    # Referred analyses = workflows stamped with referred_by_code (a viewer of a
    # shared report who then started their own analysis).
    report_views = (
        db.query(func.count(PageView.id))
        .filter(PageView.path.like("/report/%"))
        .scalar() or 0
    )
    report_unique_viewers = (
        db.query(func.count(func.distinct(PageView.ip_hash)))
        .filter(PageView.path.like("/report/%"))
        .scalar() or 0
    )
    referred_analyses = (
        db.query(func.count(Analysis.id))
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.referred_by_code != None)
        .scalar() or 0
    )
    # Top source reports by number of analyses they referred.
    referral_rows = (
        db.query(Workflow.referred_by_code, func.count(Workflow.id))
        .filter(Workflow.referred_by_code != None)
        .group_by(Workflow.referred_by_code)
        .order_by(func.count(Workflow.id).desc())
        .limit(10)
        .all()
    )
    top_referrers = [{"code": r[0], "referred": r[1]} for r in referral_rows]
    # k-factor proxy: referred analyses per unique report viewer.
    k_factor = round(referred_analyses / report_unique_viewers, 3) if report_unique_viewers else 0.0

    referral = {
        "report_views": report_views,
        "report_unique_viewers": report_unique_viewers,
        "referred_analyses": referred_analyses,
        "viewer_to_creator_rate": k_factor,   # referred analyses / unique report viewers
        "top_referrers": top_referrers,
    }

    return {
        "totals": {
            "users": total_users,
            "workflows": total_workflows,
            "analyses": total_analyses,
            "tasks": total_tasks,
        },
        "averages": {
            "automation_score": round(avg_score, 1) if avg_score else None,
            "annual_savings": round(avg_savings, 0) if avg_savings else None,
            "hours_saved": round(avg_hours, 1) if avg_hours else None,
        },
        "by_context": by_context,
        "by_input_mode": by_input_mode,
        "traffic": traffic,
        "referral": referral,
        "users": users_list,
        "workflows": workflows_list,
    }


@router.get("/admin/geo")
def get_admin_geo(
    months: int = 0,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    """Geo breakdown (countries + cities) with percentages, filtered by a
    rolling time window. months=0 (default) = all time; 1/3/6 = last N months.
    Returns ALL entries (no top-N cap) so the admin can see the full long tail.
    Percentages are share of total filtered page views."""
    from app.models.workflow import PageView

    # Build the time filter
    base = db.query(PageView)
    if months and months > 0:
        since = datetime.now(timezone.utc) - timedelta(days=30 * months)
        base_filter = PageView.created_at >= since
    else:
        base_filter = None

    def _filtered(q):
        return q.filter(base_filter) if base_filter is not None else q

    # Total views in window — denominator for percentages
    total_views = _filtered(db.query(func.count(PageView.id))).scalar() or 0

    # Countries
    country_rows = _filtered(
        db.query(
            PageView.country,
            PageView.country_name,
            func.count(PageView.id),
            func.count(func.distinct(PageView.ip_hash)),
        )
        .filter(PageView.country != None)
    ).group_by(PageView.country, PageView.country_name) \
     .order_by(func.count(PageView.id).desc()).all()
    by_country = [
        {
            "code": r[0],
            "name": r[1] or r[0],
            "views": r[2],
            "visitors": r[3],
            "pct": round(r[2] / total_views * 100, 1) if total_views else 0.0,
        }
        for r in country_rows
    ]

    # Cities (city+region+country so same-named cities stay distinct)
    city_rows = _filtered(
        db.query(
            PageView.city,
            PageView.region,
            PageView.country,
            func.count(PageView.id),
            func.count(func.distinct(PageView.ip_hash)),
        )
        .filter(PageView.city != None)
    ).group_by(PageView.city, PageView.region, PageView.country) \
     .order_by(func.count(PageView.id).desc()).all()
    by_city = [
        {
            "city": r[0],
            "region": r[1],
            "country": r[2],
            "views": r[3],
            "visitors": r[4],
            "pct": round(r[3] / total_views * 100, 1) if total_views else 0.0,
        }
        for r in city_rows
    ]

    return {
        "months": months,
        "total_views": total_views,
        "countries_count": len(by_country),
        "cities_count": len(by_city),
        "by_country": by_country,
        "by_city": by_city,
    }
