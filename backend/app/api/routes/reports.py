"""
Report generation endpoints
"""
import base64
import os
import tempfile

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.workflow import Workflow, Analysis, ReportLead
from app.services.report_generator import ReportGenerator

router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@workscanai.com")
APP_URL = os.getenv("APP_URL", "https://workscanai.vercel.app")


def _build_analysis_data(workflow: Workflow, analysis: Analysis) -> dict:
    """Shared helper — build the analysis dict used by ReportGenerator."""
    data = {
        'workflow': {
            'id': workflow.id,
            'name': workflow.name,
            'description': workflow.description,
            'source_text': workflow.source_text or '',
            'input_mode': workflow.input_mode or 'manual',
        },
        'automation_score': analysis.automation_score,
        'hours_saved': analysis.hours_saved,
        'annual_savings': analysis.annual_savings,
        'hourly_rate': 50,
        # F4 AI readiness
        'readiness_score': analysis.readiness_score,
        'readiness_data_quality': analysis.readiness_data_quality,
        'readiness_process_docs': analysis.readiness_process_docs,
        'readiness_tool_maturity': analysis.readiness_tool_maturity,
        'readiness_team_skills': analysis.readiness_team_skills,
        # context
        'analysis_context': workflow.analysis_context or 'individual',
        'results': [],
    }
    for result in analysis.results:
        task = result.task
        data['results'].append({
            'task': {
                'name': task.name,
                'description': task.description,
                'frequency': task.frequency,
                'time_per_task': task.time_per_task,
                'category': task.category,
                'complexity': task.complexity,
            },
            'ai_readiness_score': result.ai_readiness_score,
            # F1 sub-scores
            'score_repeatability': result.score_repeatability,
            'score_data_availability': result.score_data_availability,
            'score_error_tolerance': result.score_error_tolerance,
            'score_integration': result.score_integration,
            'time_saved_percentage': result.time_saved_percentage,
            # F2 tool recommendations
            'recommendation': result.recommendation,
            'difficulty': result.difficulty,
            'estimated_hours_saved': result.estimated_hours_saved,
            # F3 risk flags
            'risk_level': result.risk_level,
            'risk_flag': result.risk_flag,
            # #10 score confidence
            'score_confidence': result.score_confidence,
            # F9 agentification
            'agent_phase': result.agent_phase,
            'agent_label': result.agent_label,
            'agent_milestone': result.agent_milestone,
            # F13 orchestration
            'orchestration': result.orchestration,
            # Context-aware fields
            'countdown_window': result.countdown_window,
            'human_edge_score': result.human_edge_score,
            'pivot_skills': result.pivot_skills,
            'pivot_roles': result.pivot_roles,
        })
    return data


@router.get("/reports/{workflow_id}/docx")
def generate_docx_report(workflow_id: int, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")

    output_path = os.path.join(tempfile.gettempdir(), f"workscan_report_{workflow_id}.docx")
    ReportGenerator.generate_docx_report(_build_analysis_data(workflow, analysis), output_path)
    return FileResponse(
        output_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"WorkScanAI_Report_{workflow.name.replace(' ', '_')}.docx",
    )


@router.get("/reports/{workflow_id}/pdf")
def generate_pdf_report(workflow_id: int, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")

    output_path = os.path.join(tempfile.gettempdir(), f"workscan_report_{workflow_id}.pdf")
    ReportGenerator.generate_pdf_report(_build_analysis_data(workflow, analysis), output_path)
    return FileResponse(
        output_path,
        media_type='application/pdf',
        filename=f"WorkScanAI_Report_{workflow.name.replace(' ', '_')}.pdf",
    )


# ── Combined multi-workflow report ────────────────────────────────────────────

class CombinedReportRequest(BaseModel):
    workflow_ids: List[int]


@router.post("/reports/combined/docx")
def generate_combined_docx(body: CombinedReportRequest, db: Session = Depends(get_db)):
    """Generate one DOCX containing all requested workflows."""
    analyses = []
    for wid in body.workflow_ids:
        workflow = db.query(Workflow).filter(Workflow.id == wid).first()
        analysis = db.query(Analysis).filter(Analysis.workflow_id == wid).first() if workflow else None
        if workflow and analysis:
            analyses.append(_build_analysis_data(workflow, analysis))

    if not analyses:
        raise HTTPException(status_code=404, detail="No analyzed workflows found for the given IDs")

    ids_str = "_".join(str(i) for i in body.workflow_ids[:5])
    output_path = os.path.join(tempfile.gettempdir(), f"workscan_combined_{ids_str}.docx")
    ReportGenerator.generate_combined_docx_report(analyses, output_path)
    return FileResponse(
        output_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename="WorkScanAI_Combined_Report.docx",
    )


@router.post("/reports/combined/pdf")
def generate_combined_pdf(body: CombinedReportRequest, db: Session = Depends(get_db)):
    """Generate one PDF containing all requested workflows."""
    analyses = []
    for wid in body.workflow_ids:
        workflow = db.query(Workflow).filter(Workflow.id == wid).first()
        analysis = db.query(Analysis).filter(Analysis.workflow_id == wid).first() if workflow else None
        if workflow and analysis:
            analyses.append(_build_analysis_data(workflow, analysis))

    if not analyses:
        raise HTTPException(status_code=404, detail="No analyzed workflows found for the given IDs")

    ids_str = "_".join(str(i) for i in body.workflow_ids[:5])
    output_path = os.path.join(tempfile.gettempdir(), f"workscan_combined_{ids_str}.pdf")
    ReportGenerator.generate_combined_pdf_report(analyses, output_path)
    return FileResponse(
        output_path,
        media_type='application/pdf',
        filename="WorkScanAI_Combined_Report.pdf",
    )


# ── Email-gated full report (#2) ──────────────────────────────────────────────
# Captures a wowed anonymous visitor as a named lead and emails them the full
# PDF report + a link to their importable n8n workflows. The single funnel step
# that converts an anonymous session into a contactable lead.

class EmailReportRequest(BaseModel):
    email: str
    audience: Optional[str] = None


def _report_email_html(workflow_name: str, report_url: str, score, hours, savings) -> str:
    score_str = f"{round(score)}%" if score is not None else "—"
    hours_str = f"{round(hours):,}h" if hours is not None else "—"
    savings_str = f"€{round(savings):,}" if savings is not None else "—"
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 40px 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
      <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <div style="width: 28px; height: 28px; background: #0071e3; border-radius: 8px; display: inline-block;"></div>
        <span style="font-size: 16px; font-weight: 600; color: #1d1d1f;">WorkScanAI</span>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1d1d1f;">Your full automation report</h2>
      <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">
        Here's the complete per-task analysis for <strong>{workflow_name}</strong>. The full PDF is attached, and your importable n8n workflows are ready at the link below.
      </p>
      <div style="display: flex; gap: 10px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f5f5f7; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #0071e3;">{score_str}</div>
          <div style="font-size: 11px; color: #86868b; margin-top: 2px;">Automation</div>
        </div>
        <div style="flex: 1; background: #f5f5f7; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #1d1d1f;">{hours_str}</div>
          <div style="font-size: 11px; color: #86868b; margin-top: 2px;">Reclaimed / yr</div>
        </div>
        <div style="flex: 1; background: #f5f5f7; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #1d1d1f;">{savings_str}</div>
          <div style="font-size: 11px; color: #86868b; margin-top: 2px;">Saved / yr</div>
        </div>
      </div>
      <a href="{report_url}" style="display: block; text-align: center; background: #0071e3; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 12px; margin-bottom: 16px;">
        Open report + download n8n workflows
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
        Want help implementing your #1 quick win? Just reply to this email — a real human (the founder) reads every one.
      </p>
    </div>
    """


async def _send_report_email(email: str, workflow_name: str, report_url: str,
                             pdf_path: str, score, hours, savings) -> bool:
    """Send the report email with the PDF attached. Returns True on success."""
    if not RESEND_API_KEY:
        print(f"[reports] (dev) would email full report for '{workflow_name}' to {email}: {report_url}")
        return False

    # Resend sandbox: redirect to owner if RESEND_TEST_EMAIL override is set.
    send_to = os.getenv("RESEND_TEST_EMAIL", "") or email

    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.b64encode(f.read()).decode("ascii")
    safe_name = workflow_name.replace(" ", "_")[:60]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": FROM_EMAIL,
                "to": [send_to],
                "subject": f"Your WorkScanAI report — {workflow_name}",
                "html": _report_email_html(workflow_name, report_url, score, hours, savings),
                "attachments": [{
                    "filename": f"WorkScanAI_Report_{safe_name}.pdf",
                    "content": pdf_b64,
                }],
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            print(f"[reports] Resend error {resp.status_code}: {resp.text}")
            return False
    return True


@router.post("/reports/{share_code}/email")
async def email_full_report(share_code: str, body: EmailReportRequest, db: Session = Depends(get_db)):
    """Email the full PDF report + n8n link for a shared report, capturing the
    visitor as a named lead (#2 — email-gated full report)."""
    email = body.email.lower().strip()
    if '@' not in email or '.' not in email.split('@')[-1]:
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    workflow = db.query(Workflow).filter(Workflow.share_code == share_code).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Report not found.")
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this report.")

    # Capture the lead first — we never want to lose it even if the email send fails.
    lead = ReportLead(
        email=email, share_code=share_code, workflow_id=workflow.id,
        audience=body.audience, source="report", sent_ok=False,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    report_url = f"{APP_URL}/report/{share_code}"
    output_path = os.path.join(tempfile.gettempdir(), f"workscan_report_{workflow.id}.pdf")
    sent_ok = False
    try:
        ReportGenerator.generate_pdf_report(_build_analysis_data(workflow, analysis), output_path)
        sent_ok = await _send_report_email(
            email, workflow.name, report_url, output_path,
            analysis.automation_score, analysis.hours_saved, analysis.annual_savings,
        )
    except Exception as e:
        print(f"[reports] email_full_report send failed: {e}")
        sent_ok = False

    if sent_ok:
        lead.sent_ok = True
        db.commit()

    # Fire server-side PostHog lead-capture event (immune to client ad-blockers).
    try:
        from app.core.posthog_client import capture_event
        capture_event(
            "report_email_captured",
            distinct_id=email,
            properties={
                "share_code": share_code,
                "workflow_id": workflow.id,
                "audience": body.audience,
                "automation_score": analysis.automation_score,
                "annual_savings": analysis.annual_savings,
                "email_sent": sent_ok,
            },
        )
    except Exception as e:
        print(f"[reports] posthog capture failed (non-fatal): {e}")

    if sent_ok:
        return {"message": "Sent — check your inbox for the full report + n8n files.", "email_sent": True}
    # Lead is still captured; degrade gracefully so the visitor sees a positive outcome
    # and still has the live link.
    return {
        "message": "You're on the list. The email service is warming up — meanwhile your full report is at the link below.",
        "email_sent": False,
        "report_url": report_url,
    }
