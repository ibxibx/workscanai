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
from app.models.workflow import User, Workflow, Task, Analysis, AnalysisResult

router = APIRouter()


def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    secret = os.getenv("ADMIN_SECRET", "")
    if not secret or x_admin_secret != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


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
        })

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
        "users": users_list,
        "workflows": workflows_list,
    }
