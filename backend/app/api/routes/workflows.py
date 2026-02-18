"""
API routes for workflow management and analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import check_rate_limit, verify_recaptcha
from app.models.workflow import Workflow, Task, Analysis, AnalysisResult
from app.schemas.workflow import (
    WorkflowCreate, WorkflowResponse,
    AnalyzeRequest, AnalysisResponse, AnalysisResultResponse
)
from app.services.ai_analyzer import AIAnalyzer

router = APIRouter()


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
def create_workflow(workflow_data: WorkflowCreate, db: Session = Depends(get_db)):
    """Create a new workflow with tasks"""
    
    print(f"Received workflow data: {workflow_data}")
    print(f"Tasks count: {len(workflow_data.tasks)}")
    
    # Create workflow
    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description
    )
    db.add(workflow)
    db.flush()  # Get workflow.id
    
    # Create tasks
    for task_data in workflow_data.tasks:
        print(f"Creating task: {task_data}")
        task = Task(
            workflow_id=workflow.id,
            name=task_data.name,
            description=task_data.description,
            frequency=task_data.frequency,
            time_per_task=task_data.time_per_task,
            category=task_data.category,
            complexity=task_data.complexity
        )
        db.add(task)
    
    db.commit()
    db.refresh(workflow)
    
    return workflow


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Get a workflow by ID"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow


@router.get("/workflows", response_model=List[WorkflowResponse])
def list_workflows(db: Session = Depends(get_db)):
    """List all workflows"""
    workflows = db.query(Workflow).all()
    return workflows


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_workflow(request: AnalyzeRequest, http_request: Request, db: Session = Depends(get_db)):
    """Analyze a workflow using AI (rate-limited + CAPTCHA-protected)"""

    # 1. Rate limiting — max N analyses per IP per hour
    check_rate_limit(http_request)

    # 2. reCAPTCHA v3 — skip silently if token absent in dev mode
    if request.recaptcha_token:
        await verify_recaptcha(request.recaptcha_token)
    
    # Get workflow with tasks
    workflow = db.query(Workflow).filter(Workflow.id == request.workflow_id).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if not workflow.tasks:
        raise HTTPException(status_code=400, detail="Workflow has no tasks to analyze")
    
    # Initialize AI analyzer
    analyzer = AIAnalyzer()
    
    # Analyze each task
    tasks_analysis = []
    for task in workflow.tasks:
        task_dict = {
            'name': task.name,
            'description': task.description,
            'frequency': task.frequency,
            'time_per_task': task.time_per_task,
            'category': task.category,
            'complexity': task.complexity
        }
        
        analysis_result = analyzer.analyze_task(task_dict)
        analysis_result['task'] = task_dict
        analysis_result['task_obj'] = task
        tasks_analysis.append(analysis_result)
    
    # Calculate ROI
    roi_metrics = analyzer.calculate_roi(tasks_analysis, request.hourly_rate)
    
    # Save analysis to database
    analysis = Analysis(
        workflow_id=workflow.id,
        automation_score=roi_metrics['automation_score'],
        hours_saved=roi_metrics['hours_saved'],
        annual_savings=roi_metrics['annual_savings']
    )
    db.add(analysis)
    db.flush()
    
    # Save individual task results
    for task_analysis in tasks_analysis:
        result = AnalysisResult(
            analysis_id=analysis.id,
            task_id=task_analysis['task_obj'].id,
            ai_readiness_score=task_analysis['ai_readiness_score'],
            time_saved_percentage=task_analysis.get('time_saved_percentage'),
            recommendation=task_analysis.get('recommendation'),
            difficulty=task_analysis.get('difficulty'),
            estimated_hours_saved=task_analysis.get('estimated_hours_saved')
        )
        db.add(result)
    
    db.commit()
    db.refresh(analysis)
    
    return analysis


@router.get("/results/{workflow_id}", response_model=AnalysisResponse)
def get_analysis_results(workflow_id: int, db: Session = Depends(get_db)):
    """Get analysis results for a workflow"""
    
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")
    
    return analysis
