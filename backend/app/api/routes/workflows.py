"""
API Routes for WorkScanAI
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.workflow import Workflow, Task, Analysis, AnalysisResult
from app.api.schemas import (
    WorkflowCreate, WorkflowResponse,
    AnalysisResponse, AnalysisResultResponse
)
from app.services.ai_analyzer import AIAnalyzer

router = APIRouter()


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """Create a new workflow with tasks"""
    try:
        # Create workflow
        workflow = Workflow(
            name=workflow_data.name,
            description=workflow_data.description
        )
        db.add(workflow)
        db.flush()  # Get workflow.id
        
        # Create tasks
        for task_data in workflow_data.tasks:
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
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Get a specific workflow with tasks"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow


@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(db: Session = Depends(get_db)):
    """List all workflows"""
    workflows = db.query(Workflow).all()
    return workflows



@router.post("/workflows/{workflow_id}/analyze", response_model=AnalysisResponse)
async def analyze_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Analyze workflow for automation opportunities"""
    # Get workflow with tasks
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if not workflow.tasks:
        raise HTTPException(status_code=400, detail="Workflow has no tasks to analyze")
    
    try:
        # Prepare task data for AI
        task_data = [
            {
                "id": task.id,
                "name": task.name,
                "description": task.description,
                "frequency": task.frequency,
                "time_per_task": task.time_per_task,
                "category": task.category,
                "complexity": task.complexity
            }
            for task in workflow.tasks
        ]
        
        # Run AI analysis
        analyzer = AIAnalyzer()
        analysis_result = analyzer.analyze_tasks(task_data)
        
        # Calculate savings (simple estimate: $50/hour)
        hourly_rate = 50
        total_time_saved = 0
        
        for result in analysis_result["results"]:
            task_id = result["task_id"]
            task = next((t for t in workflow.tasks if t.id == task_data[task_id]["id"]), None)
            if task and task.time_per_task:
                saved_minutes = task.time_per_task * (result["time_saved_percentage"] / 100)
                total_time_saved += saved_minutes
        
        hours_saved_yearly = (total_time_saved / 60) * 252  # 252 working days
        annual_savings = hours_saved_yearly * hourly_rate
        
        # Create or update analysis
        analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
        if not analysis:
            analysis = Analysis(
                workflow_id=workflow_id,
                automation_score=analysis_result["automation_score"],
                annual_savings=annual_savings,
                hours_saved=hours_saved_yearly
            )
            db.add(analysis)
            db.flush()
        else:
            analysis.automation_score = analysis_result["automation_score"]
            analysis.annual_savings = annual_savings
            analysis.hours_saved = hours_saved_yearly
        
        # Delete old results
        db.query(AnalysisResult).filter(AnalysisResult.analysis_id == analysis.id).delete()
        
        # Create new results
        for result in analysis_result["results"]:
            task_id = task_data[result["task_id"]]["id"]
            
            analysis_result_obj = AnalysisResult(
                analysis_id=analysis.id,
                task_id=task_id,
                ai_readiness_score=result["ai_readiness_score"],
                time_saved_percentage=result.get("time_saved_percentage"),
                recommendation=result.get("recommendation"),
                difficulty=result.get("difficulty"),
                estimated_hours_saved=(task_data[result["task_id"]].get("time_per_task", 0) 
                                      * result.get("time_saved_percentage", 0) / 100 / 60)
            )
            db.add(analysis_result_obj)
        
        db.commit()
        db.refresh(analysis)
        
        # Format response
        response_results = []
        for ar in analysis.results:
            response_results.append(
                AnalysisResultResponse(
                    task_id=ar.task_id,
                    task_name=ar.task.name,
                    ai_readiness_score=ar.ai_readiness_score,
                    time_saved_percentage=ar.time_saved_percentage,
                    recommendation=ar.recommendation,
                    difficulty=ar.difficulty,
                    estimated_hours_saved=ar.estimated_hours_saved
                )
            )
        
        return AnalysisResponse(
            id=analysis.id,
            workflow_id=analysis.workflow_id,
            automation_score=analysis.automation_score,
            annual_savings=analysis.annual_savings,
            hours_saved=analysis.hours_saved,
            created_at=analysis.created_at,
            results=response_results
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyses/{workflow_id}", response_model=AnalysisResponse)
async def get_analysis(workflow_id: int, db: Session = Depends(get_db)):
    """Get analysis results for a workflow"""
    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Format response
    response_results = []
    for ar in analysis.results:
        response_results.append(
            AnalysisResultResponse(
                task_id=ar.task_id,
                task_name=ar.task.name,
                ai_readiness_score=ar.ai_readiness_score,
                time_saved_percentage=ar.time_saved_percentage,
                recommendation=ar.recommendation,
                difficulty=ar.difficulty,
                estimated_hours_saved=ar.estimated_hours_saved
            )
        )
    
    return AnalysisResponse(
        id=analysis.id,
        workflow_id=analysis.workflow_id,
        automation_score=analysis.automation_score,
        annual_savings=analysis.annual_savings,
        hours_saved=analysis.hours_saved,
        created_at=analysis.created_at,
        results=response_results
    )
