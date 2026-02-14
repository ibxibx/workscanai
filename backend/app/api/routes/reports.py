"""
Report generation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import tempfile

from app.core.database import get_db
from app.models.workflow import Workflow, Analysis
from app.services.report_generator import ReportGenerator

router = APIRouter()


@router.get("/api/reports/{workflow_id}/docx")
def generate_docx_report(workflow_id: int, db: Session = Depends(get_db)):
    """Generate and download DOCX report for a workflow analysis"""
    
    # Get workflow with analysis
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")
    
    # Prepare data for report
    analysis_data = {
        'workflow': {
            'id': workflow.id,
            'name': workflow.name,
            'description': workflow.description
        },
        'automation_score': analysis.automation_score,
        'hours_saved': analysis.hours_saved,
        'annual_savings': analysis.annual_savings,
        'results': []
    }
    
    # Add task results
    for result in analysis.results:
        task = result.task
        analysis_data['results'].append({
            'task': {
                'name': task.name,
                'description': task.description,
                'frequency': task.frequency,
                'time_per_task': task.time_per_task,
                'category': task.category,
                'complexity': task.complexity
            },
            'ai_readiness_score': result.ai_readiness_score,
            'time_saved_percentage': result.time_saved_percentage,
            'recommendation': result.recommendation,
            'difficulty': result.difficulty,
            'estimated_hours_saved': result.estimated_hours_saved
        })
    
    # Generate report
    output_path = os.path.join(tempfile.gettempdir(), f"workscan_report_{workflow_id}.docx")
    ReportGenerator.generate_docx_report(analysis_data, output_path)
    
    return FileResponse(
        output_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"WorkScanAI_Report_{workflow.name.replace(' ', '_')}.docx"
    )


@router.get("/api/reports/{workflow_id}/pdf")
def generate_pdf_report(workflow_id: int, db: Session = Depends(get_db)):
    """Generate and download PDF report for a workflow analysis"""
    
    # Get workflow with analysis
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")
    
    # Prepare data for report
    analysis_data = {
        'workflow': {
            'id': workflow.id,
            'name': workflow.name,
            'description': workflow.description
        },
        'automation_score': analysis.automation_score,
        'hours_saved': analysis.hours_saved,
        'annual_savings': analysis.annual_savings,
        'hourly_rate': 50,  # Default, could be stored in analysis
        'results': []
    }
    
    # Add task results
    for result in analysis.results:
        task = result.task
        analysis_data['results'].append({
            'task': {
                'name': task.name,
                'description': task.description,
                'frequency': task.frequency,
                'time_per_task': task.time_per_task,
                'category': task.category,
                'complexity': task.complexity
            },
            'ai_readiness_score': result.ai_readiness_score,
            'time_saved_percentage': result.time_saved_percentage,
            'recommendation': result.recommendation,
            'difficulty': result.difficulty,
            'estimated_hours_saved': result.estimated_hours_saved
        })
    
    # Generate report
    output_path = os.path.join(tempfile.gettempdir(), f"workscan_report_{workflow_id}.pdf")
    ReportGenerator.generate_pdf_report(analysis_data, output_path)
    
    return FileResponse(
        output_path,
        media_type='application/pdf',
        filename=f"WorkScanAI_Report_{workflow.name.replace(' ', '_')}.pdf"
    )
