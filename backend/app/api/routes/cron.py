"""
Cron-triggered retention jobs (#9 — Quick Win of the Week T+3 digest).

Hit once daily by the existing cron-job.org account, secured by the same
x-admin-secret header used by the admin dashboard. Picks up report-gate leads
captured ~3 days ago that haven't yet received a digest, finds the single
highest-ROI quick win in their report, and emails it as a gentle nudge to act.
This is the retention loop: turn a one-time report view into a second touch.
"""
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.workflow import ReportLead, Workflow, Analysis, AnalysisResult

router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@workscanai.com")
APP_URL = os.getenv("APP_URL", "https://workscanai.vercel.app")


def _require_admin(x_admin_secret: Optional[str] = Header(None)):
    secret = os.getenv("ADMIN_SECRET", "")
    if not secret or x_admin_secret != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _pick_quick_win(results):
    """The single best quick win: high score + easy difficulty, max hours saved.
    Falls back progressively so we always have something worth sending."""
    if not results:
        return None
    easy_high = [r for r in results
                 if (r.ai_readiness_score or 0) >= 65
                 and (r.difficulty or '').lower() == 'easy']
    pool = easy_high or [r for r in results if (r.ai_readiness_score or 0) >= 60] or results
    return max(pool, key=lambda r: (r.estimated_hours_saved or 0, r.ai_readiness_score or 0))


def _digest_html(name: str, task_name: str, score, hours, rec: str, report_url: str) -> str:
    hours_str = f"{round(hours):,}h/yr" if hours else "real time"
    score_str = f"{round(score)}%" if score is not None else ""
    # Keep the recommendation short for an email — first ~280 chars.
    rec_short = (rec or "").strip()
    if len(rec_short) > 280:
        rec_short = rec_short[:277].rsplit(' ', 1)[0] + '...'
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 40px 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
      <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; background: #0071e3; border-radius: 8px;"></div>
        <span style="font-size: 16px; font-weight: 600; color: #1d1d1f;">WorkScanAI</span>
      </div>
      <div style="font-size: 12px; font-weight: 700; color: #0071e3; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px;">Your quick win this week</div>
      <h2 style="margin: 0 0 12px; font-size: 21px; font-weight: 600; color: #1d1d1f; line-height: 1.3;">{task_name}</h2>
      <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px; line-height: 1.55;">
        Of everything in your <strong>{name}</strong> report, this one is the fastest payback &mdash; {score_str} automation-ready and worth about <strong>{hours_str}</strong>. If you do one thing this week, do this.
      </p>
      <div style="background: #f5f5f7; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">How to start</div>
        <div style="font-size: 14px; color: #1d1d1f; line-height: 1.5;">{rec_short}</div>
      </div>
      <a href="{report_url}" style="display: block; text-align: center; background: #0071e3; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 12px; margin-bottom: 16px;">
        Open your full report
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
        Stuck on this one? Reply and tell me where &mdash; I read every email and I'll point you to the exact tool. &mdash; Ian
      </p>
    </div>
    """


async def _send_digest(email: str, name: str, task_name: str, score, hours,
                       rec: str, report_url: str) -> bool:
    if not RESEND_API_KEY:
        print(f"[cron] (dev) would send quick-win digest to {email}: '{task_name}'")
        return False
    send_to = os.getenv("RESEND_TEST_EMAIL", "") or email
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": FROM_EMAIL,
                "to": [send_to],
                "subject": f"Your quick win this week: {task_name}",
                "html": _digest_html(name, task_name, score, hours, rec, report_url),
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            print(f"[cron] Resend digest error {resp.status_code}: {resp.text}")
            return False
    return True


@router.post("/cron/quick-win-digest")
async def quick_win_digest(db: Session = Depends(get_db), _=Depends(_require_admin),
                           dry_run: bool = False):
    """Send the T+3 quick-win digest to leads captured ~3 days ago.

    Idempotent: only picks leads with digest_sent_at IS NULL in the 3–4 day
    window, and stamps digest_sent_at after each send so re-runs never double-send.
    Pass ?dry_run=true to preview who would receive it without sending.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=4)
    window_end = now - timedelta(days=3)

    leads = db.query(ReportLead).filter(and_(
        ReportLead.digest_sent_at.is_(None),
        ReportLead.created_at >= window_start,
        ReportLead.created_at < window_end,
    )).all()

    sent, skipped, previews = 0, 0, []
    seen_emails = set()

    for lead in leads:
        # De-dupe: one digest per email per run even if they gated multiple reports.
        if lead.email in seen_emails:
            skipped += 1
            continue

        workflow = None
        if lead.workflow_id:
            workflow = db.query(Workflow).filter(Workflow.id == lead.workflow_id).first()
        if not workflow and lead.share_code:
            workflow = db.query(Workflow).filter(Workflow.share_code == lead.share_code).first()
        if not workflow:
            skipped += 1
            continue

        analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow.id).first()
        if not analysis:
            skipped += 1
            continue

        qw = _pick_quick_win(analysis.results)
        if not qw:
            skipped += 1
            continue

        task_name = qw.task.name if qw.task else "your top automation opportunity"
        report_url = f"{APP_URL}/report/{workflow.share_code}" if workflow.share_code else APP_URL

        if dry_run:
            previews.append({"email": lead.email, "task": task_name,
                             "score": qw.ai_readiness_score, "workflow": workflow.name})
            seen_emails.add(lead.email)
            continue

        ok = await _send_digest(
            lead.email, workflow.name, task_name,
            qw.ai_readiness_score, qw.estimated_hours_saved,
            qw.recommendation, report_url,
        )
        lead.digest_sent_at = now  # stamp regardless so a cold Resend doesn't loop retries forever
        db.commit()
        seen_emails.add(lead.email)
        if ok:
            sent += 1
            try:
                from app.core.posthog_client import capture_event
                capture_event(lead.email, "quick_win_digest_sent",
                              {"workflow_id": workflow.id, "task": task_name,
                               "score": qw.ai_readiness_score})
            except Exception as e:
                print(f"[cron] posthog capture failed (non-fatal): {e}")
        else:
            skipped += 1

    if dry_run:
        return {"dry_run": True, "candidates": len(previews), "previews": previews}
    return {"sent": sent, "skipped": skipped, "considered": len(leads)}
