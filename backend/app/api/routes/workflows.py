"""
API routes for workflow management and analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import check_rate_limit, verify_recaptcha
from app.models.workflow import Workflow, Task, Analysis, AnalysisResult, User
from app.schemas.workflow import (
    WorkflowCreate, WorkflowResponse,
    AnalyzeRequest, AnalysisResponse, AnalysisResultResponse
)
from app.services.ai_analyzer import AIAnalyzer

router = APIRouter()
DAILY_ANALYSIS_LIMIT = 5


def _get_user_daily_analyses(email: str, db: Session) -> int:
    """Count analyses in the last 24 hours for this email."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return (
        db.query(sqlfunc.count(Analysis.id))
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.user_email == email)
        .filter(Analysis.created_at >= since)
        .scalar() or 0
    )


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """Create a new workflow with tasks"""
    
    print(f"Received workflow data: {workflow_data}")
    print(f"Tasks count: {len(workflow_data.tasks)}")
    print(f"User email: {x_user_email}")

    # Ensure user exists if email provided
    if x_user_email:
        email = x_user_email.lower().strip()
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            db.flush()

    # Create workflow
    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        source_text=workflow_data.source_text,
        input_mode=workflow_data.input_mode,
        user_email=x_user_email.lower().strip() if x_user_email else None,
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
def list_workflows(
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """List workflows — filtered by user email if provided"""
    q = db.query(Workflow)
    if x_user_email:
        q = q.filter(Workflow.user_email == x_user_email.lower().strip())
    return q.order_by(Workflow.created_at.desc()).all()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_workflow(
    request: AnalyzeRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """Analyze a workflow using AI (rate-limited per user email)"""

    # 1. Require authentication
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Sign in required to run analyses.")
    email = x_user_email.lower().strip()

    # 2. Rate limit — 5 analyses per 24 hours per email
    count = _get_user_daily_analyses(email, db)
    if count >= DAILY_ANALYSIS_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit reached ({DAILY_ANALYSIS_LIMIT} analyses per 24 hours). Try again later.",
        )

    # 3. IP-based rate limit (existing)
    check_rate_limit(http_request)

    # 4. reCAPTCHA — skip silently if token absent
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
        annual_savings=roi_metrics['annual_savings'],
        readiness_score=roi_metrics.get('readiness_score'),
        readiness_data_quality=roi_metrics.get('readiness_data_quality'),
        readiness_process_docs=roi_metrics.get('readiness_process_docs'),
        readiness_tool_maturity=roi_metrics.get('readiness_tool_maturity'),
        readiness_team_skills=roi_metrics.get('readiness_team_skills'),
    )
    db.add(analysis)
    db.flush()
    
    # Save individual task results
    for task_analysis in tasks_analysis:
        result = AnalysisResult(
            analysis_id=analysis.id,
            task_id=task_analysis['task_obj'].id,
            ai_readiness_score=task_analysis['ai_readiness_score'],
            score_repeatability=task_analysis.get('score_repeatability'),
            score_data_availability=task_analysis.get('score_data_availability'),
            score_error_tolerance=task_analysis.get('score_error_tolerance'),
            score_integration=task_analysis.get('score_integration'),
            time_saved_percentage=task_analysis.get('time_saved_percentage'),
            recommendation=task_analysis.get('recommendation'),
            difficulty=task_analysis.get('difficulty'),
            estimated_hours_saved=task_analysis.get('estimated_hours_saved'),
            risk_level=task_analysis.get('risk_level'),
            risk_flag=task_analysis.get('risk_flag'),
        )
        db.add(result)
    
    db.commit()
    db.refresh(analysis)
    
    # Eagerly load relationships so Pydantic can serialize them
    db.refresh(analysis)
    _ = analysis.workflow
    _ = analysis.results
    for r in analysis.results:
        _ = r.task
    
    return analysis


@router.get("/results/{workflow_id}", response_model=AnalysisResponse)
def get_analysis_results(workflow_id: int, db: Session = Depends(get_db)):
    """Get analysis results for a workflow"""
    
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")
    
    # Eagerly load relationships
    _ = analysis.workflow
    _ = analysis.results
    for r in analysis.results:
        _ = r.task
    
    return analysis
