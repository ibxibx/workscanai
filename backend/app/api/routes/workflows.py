"""
API routes for workflow management and analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import StreamingResponse
import asyncio
import json as _json_lib
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import check_rate_limit, verify_recaptcha
from app.models.workflow import Workflow, Task, Analysis, AnalysisResult, User, _gen_share_code
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

    # k-factor attribution: if this analysis was started from a shared report,
    # the frontend passes that report's share_code. Only store it if it matches
    # an existing report (ignore junk / self-referrals).
    referred_by = None
    if workflow_data.referred_by_code:
        ref = workflow_data.referred_by_code.strip()[:16]
        if ref and db.query(Workflow.id).filter(Workflow.share_code == ref).first():
            referred_by = ref

    # Create workflow
    workflow = Workflow(
        share_code=_gen_share_code(),
        name=workflow_data.name,
        description=workflow_data.description,
        source_text=workflow_data.source_text,
        input_mode=workflow_data.input_mode,
        analysis_context=workflow_data.analysis_context,
        team_size=workflow_data.team_size,
        industry=workflow_data.industry,
        user_email=x_user_email.lower().strip() if x_user_email else None,
        referred_by_code=referred_by,
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


def _get_ip_daily_analyses(ip: str, db: Session) -> int:
    """Count analyses in the last 24 hours for this IP address."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return (
        db.query(sqlfunc.count(Analysis.id))
        .join(Workflow, Analysis.workflow_id == Workflow.id)
        .filter(Workflow.client_ip == ip)
        .filter(Analysis.created_at >= since)
        .scalar() or 0
    )


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting common proxy headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _perform_analysis_sync(workflow_id, hourly_rate, db):
    """
    Run the analysis synchronously, yielding (stage_name, payload) tuples
    at each milestone. The route wrapper turns these into either a single
    JSON response or an SSE stream.
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        yield ('error', {'status': 404, 'message': 'Workflow not found'})
        return
    if not workflow.tasks:
        yield ('error', {'status': 400, 'message': 'Workflow has no tasks to analyze'})
        return

    yield ('analyzing', {'task_count': len(workflow.tasks)})

    analyzer = AIAnalyzer()
    task_dicts = [
        {
            'name': task.name,
            'description': task.description,
            'frequency': task.frequency,
            'time_per_task': task.time_per_task,
            'category': task.category,
            'complexity': task.complexity,
            'analysis_context': workflow.analysis_context or 'individual',
            'team_size': workflow.team_size,
            'industry': workflow.industry,
        }
        for task in workflow.tasks
    ]
    batch_results = analyzer.analyze_tasks_batch(task_dicts)

    tasks_analysis = []
    for task, task_dict, analysis_result in zip(workflow.tasks, task_dicts, batch_results):
        analysis_result['task'] = task_dict
        analysis_result['task_obj'] = task
        tasks_analysis.append(analysis_result)

    yield ('roi', {})

    roi_metrics = analyzer.calculate_roi(tasks_analysis, hourly_rate)
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
            agent_phase=task_analysis.get('agent_phase'),
            agent_label=task_analysis.get('agent_label'),
            agent_milestone=task_analysis.get('agent_milestone'),
            orchestration=task_analysis.get('orchestration'),
            countdown_window=task_analysis.get('countdown_window'),
            human_edge_score=task_analysis.get('human_edge_score'),
            pivot_skills=task_analysis.get('pivot_skills'),
            pivot_roles=task_analysis.get('pivot_roles'),
            decision_layer=task_analysis.get('decision_layer'),
        )
        db.add(result)
    db.commit()
    db.refresh(analysis)

    yield ('n8n', {})

    try:
        import os as _os
        from app.services.n8n_template_client import N8nTemplateClient
        _api_key = _os.getenv("ANTHROPIC_API_KEY", "")
        _client = N8nTemplateClient(anthropic_api_key=_api_key)
        _top_tasks = task_dicts[:6]
        _workflow_name = workflow.name or "Workflow Analysis"
        _suggested = _client.get_curated_templates(job_title=_workflow_name, tasks=_top_tasks)
        if _suggested:
            _n8n = _client.build_merged_canvas(job_title=_workflow_name, suggested_templates=_suggested)
        else:
            from app.services.job_scanner import JobScanner as _JS
            _n8n = _JS()._generate_n8n_workflow(_workflow_name, _top_tasks)
        _n8n_str = _json_lib.dumps(_n8n)
        from app.core.config import settings as _settings
        if _settings.TURSO_DATABASE_URL and _settings.TURSO_AUTH_TOKEN:
            from app.core.turso_dbapi import connect as _tc
            _conn = _tc(_settings.TURSO_DATABASE_URL, _settings.TURSO_AUTH_TOKEN)
            try:
                _cur = _conn.cursor()
                _cur.execute("UPDATE workflows SET n8n_workflow_json = ? WHERE id = ?", (_n8n_str, workflow.id))
                _conn.commit()
            finally:
                _conn.close()
        else:
            from app.core.database import engine as _engine
            from sqlalchemy import text as _text
            with _engine.connect() as _c:
                _c.execute(_text("UPDATE workflows SET n8n_workflow_json = :j WHERE id = :i"), {"j": _n8n_str, "i": workflow.id})
                _c.commit()
    except Exception as _exc:
        print(f"[n8n] workflow generation error for regular analysis: {_exc}")

    db.refresh(analysis)
    _ = analysis.workflow
    _ = analysis.results
    for r in analysis.results:
        _ = r.task

    yield ('done', {'analysis': analysis})


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_workflow(
    request: AnalyzeRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """Analyze a workflow using AI - no auth required, IP-rate-limited.

    Supports SSE streaming when client sends Accept: text/event-stream.
    Falls back to single JSON response otherwise (backward compatible).
    """

    client_ip = _get_client_ip(http_request)

    ip_count = _get_ip_daily_analyses(client_ip, db)
    if ip_count >= DAILY_ANALYSIS_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limit", "message": f"Daily limit reached ({DAILY_ANALYSIS_LIMIT} analyses per 24 hours). Try again tomorrow.", "retry_after_seconds": 86400},
        )

    if x_user_email:
        email = x_user_email.lower().strip()
        count = _get_user_daily_analyses(email, db)
        if count >= DAILY_ANALYSIS_LIMIT:
            raise HTTPException(
                status_code=429,
                detail={"error": "rate_limit", "message": f"Daily limit reached ({DAILY_ANALYSIS_LIMIT} analyses per 24 hours). Try again tomorrow.", "retry_after_seconds": 86400},
            )

    if request.recaptcha_token:
        await verify_recaptcha(request.recaptcha_token)

    workflow = db.query(Workflow).filter(Workflow.id == request.workflow_id).first()
    if workflow and not workflow.client_ip:
        workflow.client_ip = client_ip
        db.flush()

    accept = (http_request.headers.get('accept') or '').lower()
    wants_sse = 'text/event-stream' in accept

    if not wants_sse:
        analysis_obj = None
        for stage, payload in _perform_analysis_sync(request.workflow_id, request.hourly_rate, db):
            if stage == 'error':
                raise HTTPException(status_code=payload.get('status', 500), detail=payload.get('message', 'Analysis failed'))
            if stage == 'done':
                analysis_obj = payload['analysis']
        if analysis_obj is None:
            raise HTTPException(status_code=500, detail='Analysis produced no result')
        return analysis_obj

    async def event_stream():
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def _producer():
            try:
                for stage, payload in _perform_analysis_sync(request.workflow_id, request.hourly_rate, db):
                    if stage == 'done':
                        out = {'stage': 'done', 'workflow_id': request.workflow_id}
                    else:
                        safe = {k: v for k, v in payload.items() if isinstance(v, (str, int, float, bool, type(None)))}
                        out = {'stage': stage, **safe}
                    asyncio.run_coroutine_threadsafe(queue.put(out), loop)
            except Exception as exc:
                asyncio.run_coroutine_threadsafe(
                    queue.put({'stage': 'error', 'status': 500, 'message': str(exc)}), loop
                )
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(None), loop)

        loop.run_in_executor(None, _producer)

        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield ': ping\n\n'
                continue
            if msg is None:
                return
            yield f"data: {_json_lib.dumps(msg)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        },
    )


@router.get("/results/{workflow_id}", response_model=AnalysisResponse)
def get_analysis_results(
    workflow_id: int,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None),
):
    """Get analysis results for a workflow — requires ownership via x-user-email header."""

    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this workflow")

    # Ownership check: workflow must belong to the requesting user.
    # Workflows with no owner (user_email is None) are only accessible if the
    # request carries no email either — i.e. the session that created it on the
    # same device (handled by localStorage in the frontend).  When an email IS
    # provided, it must match exactly.
    workflow = analysis.workflow
    if workflow.user_email:
        # Guest IDs are device-local anonymous identifiers — allow any bearer
        is_guest = workflow.user_email.startswith('guest_')
        if not is_guest:
            # Real email: must match exactly
            if not x_user_email or x_user_email.lower().strip() != workflow.user_email.lower().strip():
                raise HTTPException(status_code=403, detail="Access denied")
        # For guest workflows: anyone with the workflow ID can view it
        # (share URLs use share_code which is a separate public endpoint)

    # Eagerly load relationships
    _ = analysis.results
    for r in analysis.results:
        _ = r.task

    return analysis


# ── Public share-code endpoints (no auth required) ────────────────────────────

@router.get("/share/{share_code}", response_model=AnalysisResponse)
def get_analysis_by_share_code(share_code: str, db: Session = Depends(get_db)):
    """Fetch a workflow's analysis by its human-readable share code. Public — no auth."""
    workflow = db.query(Workflow).filter(Workflow.share_code == share_code).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Report not found")

    analysis = db.query(Analysis).filter(Analysis.workflow_id == workflow.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not yet available for this report")

    _ = analysis.workflow
    _ = analysis.results
    for r in analysis.results:
        _ = r.task

    return analysis


@router.get("/share/{share_code}/workflow", response_model=WorkflowResponse)
def get_workflow_by_share_code(share_code: str, db: Session = Depends(get_db)):
    """Fetch workflow metadata by share code. Public — no auth."""
    workflow = db.query(Workflow).filter(Workflow.share_code == share_code).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Report not found")
    return workflow
