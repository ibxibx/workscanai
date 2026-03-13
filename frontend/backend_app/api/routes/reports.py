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

from backend_app.core.database import get_db
from backend_app.models.workflow import Workflow, Analysis
from backend_app.services.report_generator import ReportGenerator

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
            'time_saved_percentage': result.time_saved_percentage,
            'recommendation': result.recommendation,
            'difficulty': result.difficulty,
            'estimated_hours_saved': result.estimated_hours_saved,
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
