"""
Job Scanner routes — two-step pipeline to stay within Vercel's 60s limit.

Step 1: POST /api/job-scan/research
  → Tavily search + Claude task extraction (~15-20s)
  → Returns structured task list

Step 2: POST /api/job-scan/analyze
  → Takes task list, runs batch AI analysis + n8n generation + saves to DB (~30-40s)
  → Returns workflow_id, share_code, n8n workflow JSON
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_client_ip
from app.models.workflow import Workflow, Task, Analysis, AnalysisResult, User, _gen_share_code
from app.services.job_scanner import JobScanner
from app.services.ai_analyzer import AIAnalyzer

router = APIRouter()

DAILY_ANALYSIS_LIMIT = 5


def _get_ip_daily_count(ip: str, db: Session) -> int:
    """Count analyses in the last 24 h for this IP across ALL workflow types."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return (
        db.query(sqlfunc.count(Analysis.id))
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.client_ip == ip)
        .filter(Analysis.created_at >= since)
        .scalar() or 0
    )


def _get_email_daily_count(email: str, db: Session) -> int:
    """Count analyses in the last 24 h for this email across ALL workflow types."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return (
        db.query(sqlfunc.count(Analysis.id))
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.user_email == email)
        .filter(Analysis.created_at >= since)
        .scalar() or 0
    )


_RATE_LIMIT_DETAIL = lambda limit: {
    "error": "rate_limit",
    "message": (
        f"You've used all {limit} free analyses in the last 24 hours. "
        f"The limit resets on a rolling 24-hour basis — try again tomorrow!"
    ),
    "retry_after_seconds": 86400,
}


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class ResearchRequest(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=100)
    industry: Optional[str] = Field(None, max_length=100)
    analysis_context: Optional[str] = Field("individual")


class TaskItem(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: Optional[str] = "weekly"
    time_per_task: Optional[int] = 30
    category: Optional[str] = "general"
    complexity: Optional[str] = "medium"


class ResearchResponse(BaseModel):
    job_title: str
    industry: Optional[str]
    tasks: List[TaskItem]
    search_used: bool


class AnalyzeRequest(BaseModel):
    job_title: str
    industry: Optional[str] = None
    analysis_context: Optional[str] = "individual"
    hourly_rate: Optional[float] = Field(75.0, gt=0)
    tasks: List[TaskItem]


class AnalyzeResponse(BaseModel):
    workflow_id: int
    share_code: str
    job_title: str
    tasks_found: int
    n8n_workflow: dict
    suggested_templates: List[dict] = []
    message: str

    class Config:
        from_attributes = True


class TemplateRequest(BaseModel):
    job_title: str
    tasks: List[TaskItem] = []


@router.post("/job-scan/n8n-templates")
async def get_n8n_templates(request: TemplateRequest):
    """
    Lightweight endpoint: fetch + curate real n8n community templates
    for any job title + task list. Used by the results dashboard download button.
    No DB writes, no rate limit (template fetching is free).
    """
    try:
        import os
        from app.services.n8n_template_client import N8nTemplateClient
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        client = N8nTemplateClient(anthropic_api_key=api_key)
        task_dicts = [t.dict() for t in request.tasks]
        templates = client.get_curated_templates(
            job_title=request.job_title,
            tasks=task_dicts,
        )
        return {"suggested_templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template fetch failed: {str(e)}")


# ------------------------------------------------------------------
# Step 1 — Research
# ------------------------------------------------------------------

@router.post("/job-scan/research", response_model=ResearchResponse)
async def job_scan_research(request: ResearchRequest, http_request: Request, db: Session = Depends(get_db)):
    """
    Web-search the job title and extract a structured task list.
    Fast — ~15-20s. No DB writes. IP rate-limited (shared quota with analyze).
    """
    client_ip = get_client_ip(http_request)
    if _get_ip_daily_count(client_ip, db) >= DAILY_ANALYSIS_LIMIT:
        raise HTTPException(status_code=429, detail=_RATE_LIMIT_DETAIL(DAILY_ANALYSIS_LIMIT))

    try:
        scanner = JobScanner()
        result = scanner.scan_job(
            job_title=request.job_title,
            industry=request.industry,
            analysis_context=request.analysis_context or "individual",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")

    tasks = result.get("tasks", [])
    if not tasks:
        raise HTTPException(status_code=422, detail="Could not extract tasks for this job title")

    return ResearchResponse(
        job_title=request.job_title,
        industry=request.industry,
        tasks=[TaskItem(**t) for t in tasks],
        search_used=result.get("search_used", False),
    )


# ------------------------------------------------------------------
# Step 2 — Analyze + Save
# ------------------------------------------------------------------

@router.post("/job-scan/analyze", response_model=AnalyzeResponse, status_code=201)
async def job_scan_analyze(
    request: AnalyzeRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """
    Takes a task list from Step 1, runs full AI analysis,
    generates n8n workflow JSON, saves everything to DB.
    Fast — ~30-40s. Returns workflow_id for redirect.
    IP + email rate-limited (shared 5/24h quota).
    """
    tasks = request.tasks
    if not tasks:
        raise HTTPException(status_code=422, detail="No tasks provided")

    # ── Rate limiting ─────────────────────────────────────────────
    client_ip = get_client_ip(http_request)
    if _get_ip_daily_count(client_ip, db) >= DAILY_ANALYSIS_LIMIT:
        raise HTTPException(status_code=429, detail=_RATE_LIMIT_DETAIL(DAILY_ANALYSIS_LIMIT))
    if x_user_email:
        email_lc = x_user_email.lower().strip()
        if _get_email_daily_count(email_lc, db) >= DAILY_ANALYSIS_LIMIT:
            raise HTTPException(status_code=429, detail=_RATE_LIMIT_DETAIL(DAILY_ANALYSIS_LIMIT))

    # --- Persist user ---
    if x_user_email:
        email = x_user_email.lower().strip()
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            db.flush()

    # --- Create workflow ---
    workflow = Workflow(
        share_code=_gen_share_code(),
        name=f"{request.job_title} – Job Scanner",
        description=f"Auto-generated by WorkScanAI Job Scanner for: {request.job_title}",
        input_mode="job_scan",
        analysis_context=request.analysis_context or "individual",
        industry=request.industry,
        user_email=x_user_email.lower().strip() if x_user_email else None,
        client_ip=client_ip,
    )
    db.add(workflow)
    db.flush()

    # --- Create task rows ---
    task_objs = []
    for t in tasks:
        task_obj = Task(
            workflow_id=workflow.id,
            name=t.name,
            description=t.description,
            frequency=t.frequency or "weekly",
            time_per_task=t.time_per_task or 30,
            category=t.category or "general",
            complexity=t.complexity or "medium",
        )
        db.add(task_obj)
        task_objs.append(task_obj)
    db.flush()

    # --- Run AI analysis ---
    analyzer = AIAnalyzer()
    task_dicts = [
        {
            "name": t.name,
            "description": t.description,
            "frequency": t.frequency or "weekly",
            "time_per_task": t.time_per_task or 30,
            "category": t.category or "general",
            "complexity": t.complexity or "medium",
            "analysis_context": request.analysis_context or "individual",
            "industry": request.industry or "",
        }
        for t in tasks
    ]

    batch_results = analyzer.analyze_tasks_batch(task_dicts)

    tasks_analysis = []
    for task_obj, task_dict, result in zip(task_objs, task_dicts, batch_results):
        result["task"] = task_dict
        result["task_obj"] = task_obj
        tasks_analysis.append(result)

    roi_metrics = analyzer.calculate_roi(tasks_analysis, request.hourly_rate or 75.0)

    # --- Save analysis ---
    analysis = Analysis(
        workflow_id=workflow.id,
        automation_score=roi_metrics["automation_score"],
        hours_saved=roi_metrics["hours_saved"],
        annual_savings=roi_metrics["annual_savings"],
        readiness_score=roi_metrics.get("readiness_score"),
        readiness_data_quality=roi_metrics.get("readiness_data_quality"),
        readiness_process_docs=roi_metrics.get("readiness_process_docs"),
        readiness_tool_maturity=roi_metrics.get("readiness_tool_maturity"),
        readiness_team_skills=roi_metrics.get("readiness_team_skills"),
    )
    db.add(analysis)
    db.flush()

    for ta in tasks_analysis:
        ar = AnalysisResult(
            analysis_id=analysis.id,
            task_id=ta["task_obj"].id,
            ai_readiness_score=ta["ai_readiness_score"],
            score_repeatability=ta.get("score_repeatability"),
            score_data_availability=ta.get("score_data_availability"),
            score_error_tolerance=ta.get("score_error_tolerance"),
            score_integration=ta.get("score_integration"),
            time_saved_percentage=ta.get("time_saved_percentage"),
            recommendation=ta.get("recommendation"),
            difficulty=ta.get("difficulty"),
            estimated_hours_saved=ta.get("estimated_hours_saved"),
            risk_level=ta.get("risk_level"),
            risk_flag=ta.get("risk_flag"),
            agent_phase=ta.get("agent_phase"),
            agent_label=ta.get("agent_label"),
            agent_milestone=ta.get("agent_milestone"),
            orchestration=ta.get("orchestration"),
            countdown_window=ta.get("countdown_window"),
            human_edge_score=ta.get("human_edge_score"),
            pivot_skills=ta.get("pivot_skills"),
            pivot_roles=ta.get("pivot_roles"),
            decision_layer=ta.get("decision_layer"),
        )
        db.add(ar)

    db.commit()

    # --- Generate n8n workflow + fetch community templates ---
    # Use already-extracted tasks — do NOT re-run scan_job() which wastes
    # Tavily + Claude tokens re-doing work that Step 1 already did.
    try:
        import os
        from app.services.n8n_template_client import N8nTemplateClient
        from app.services.job_scanner import JobScanner

        top_task_dicts = [t.dict() for t in tasks[:5]]

        # 1. Assembled category-template workflow (deterministic, always works)
        scanner = JobScanner()
        n8n_workflow = scanner._generate_n8n_workflow(request.job_title, top_task_dicts)

        # 2. Real community templates from n8n API (curated by LLM)
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        client = N8nTemplateClient(anthropic_api_key=api_key)
        suggested_templates = client.get_curated_templates(
            job_title=request.job_title,
            tasks=top_task_dicts,
        )

        # 3. Persist n8n workflow JSON so share/report pages can download it
        import json as _json
        workflow.n8n_workflow_json = _json.dumps(n8n_workflow)
        db.commit()
    except Exception as exc:
        print(f"[n8n] workflow/template generation error: {exc}")
        n8n_workflow = {"name": f"{request.job_title} Workflow", "nodes": [], "connections": {}}
        suggested_templates = []

    return AnalyzeResponse(
        workflow_id=workflow.id,
        share_code=workflow.share_code,
        job_title=request.job_title,
        tasks_found=len(tasks),
        n8n_workflow=n8n_workflow,
        suggested_templates=suggested_templates,
        message=f"Analysis complete — {len(tasks)} tasks saved.",
    )
