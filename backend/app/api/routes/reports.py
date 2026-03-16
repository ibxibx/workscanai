"""
Report generation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
import tempfile

from app.core.database import get_db
from app.models.workflow import Workflow, Analysis
from app.services.report_generator import ReportGenerator

router = APIRouter()


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
