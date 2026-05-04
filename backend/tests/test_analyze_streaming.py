"""
Tests for SSE streaming variant of /api/analyze.
We don't hit the real Anthropic API - just verify the function exists,
the generator yields expected stages, and the JSON path still works.
"""
import pytest
from unittest.mock import patch, MagicMock


def test_analyze_workflow_function_exists():
    """Sanity: the route handler is defined and importable."""
    from app.api.routes.workflows import analyze_workflow, _perform_analysis_sync
    assert callable(analyze_workflow)
    assert callable(_perform_analysis_sync)


def test_perform_analysis_yields_expected_stages(monkeypatch):
    """Generator yields analyzing -> roi -> n8n -> done in order."""
    from app.api.routes.workflows import _perform_analysis_sync

    # Mock AIAnalyzer at the module level so the generator picks it up
    fake_analyzer = MagicMock()
    fake_analyzer.analyze_tasks_batch.return_value = [{
        'ai_readiness_score': 75,
        'time_saved_percentage': 60,
        'recommendation': 'Use Zapier',
        'difficulty': 'low',
        'estimated_hours_saved': 100,
    }]
    fake_analyzer.calculate_roi.return_value = {
        'automation_score': 75,
        'hours_saved': 100,
        'annual_savings': 5000,
    }
    monkeypatch.setattr(
        'app.api.routes.workflows.AIAnalyzer',
        lambda: fake_analyzer,
    )

    # Build a fake workflow + task
    fake_task = MagicMock()
    fake_task.id = 1
    fake_task.name = 'Test'
    fake_task.description = 'desc'
    fake_task.frequency = 'daily'
    fake_task.time_per_task = 30
    fake_task.category = 'general'
    fake_task.complexity = 'low'

    fake_workflow = MagicMock()
    fake_workflow.id = 1
    fake_workflow.name = 'Test workflow'
    fake_workflow.tasks = [fake_task]
    fake_workflow.analysis_context = 'individual'
    fake_workflow.team_size = None
    fake_workflow.industry = None
    fake_workflow.client_ip = '1.2.3.4'

    # Mock DB session
    fake_db = MagicMock()
    fake_db.query.return_value.filter.return_value.first.return_value = fake_workflow

    # Mock n8n client so we don't hit the network
    monkeypatch.setattr(
        'app.services.n8n_template_client.N8nTemplateClient.get_curated_templates',
        lambda self, job_title, tasks: []
    )
    monkeypatch.setattr(
        'app.services.job_scanner.JobScanner._generate_n8n_workflow',
        lambda self, name, tasks: {'nodes': [], 'connections': {}}
    )
    # Skip the DB write step
    monkeypatch.setattr(
        'app.api.routes.workflows._json_lib',
        type('JL', (), {'dumps': lambda o: '{}'})()
    )

    # Force fake DB engine path (not Turso)
    from app.core import config as _cfg
    monkeypatch.setattr(_cfg.settings, 'TURSO_DATABASE_URL', '', raising=False)
    monkeypatch.setattr(_cfg.settings, 'TURSO_AUTH_TOKEN', '', raising=False)

    # Mock the SQLAlchemy engine connect to be a no-op
    class _DummyConn:
        def execute(self, *a, **k): pass
        def commit(self): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass
    class _DummyEngine:
        def connect(self): return _DummyConn()
    monkeypatch.setattr(
        'app.core.database.engine',
        _DummyEngine()
    )

    stages = []
    for stage, payload in _perform_analysis_sync(1, 50.0, fake_db):
        stages.append(stage)
        if stage == 'done':
            break

    assert 'analyzing' in stages, f"Missing analyzing in {stages}"
    assert 'roi' in stages, f"Missing roi in {stages}"
    assert 'n8n' in stages, f"Missing n8n in {stages}"
    assert stages[-1] == 'done', f"Last stage should be done, got {stages}"
    # Ordering invariant
    assert stages.index('analyzing') < stages.index('roi') < stages.index('n8n') < stages.index('done'), \
        f"Stages out of order: {stages}"


def test_perform_analysis_yields_error_for_missing_workflow():
    """If the workflow doesn't exist, we yield an error (not raise)."""
    from app.api.routes.workflows import _perform_analysis_sync

    fake_db = MagicMock()
    fake_db.query.return_value.filter.return_value.first.return_value = None

    events = list(_perform_analysis_sync(999, 50.0, fake_db))
    assert len(events) == 1
    stage, payload = events[0]
    assert stage == 'error'
    assert payload.get('status') == 404


def test_perform_analysis_yields_error_for_workflow_with_no_tasks():
    """Empty workflow -> 400 error."""
    from app.api.routes.workflows import _perform_analysis_sync

    fake_workflow = MagicMock()
    fake_workflow.tasks = []
    fake_db = MagicMock()
    fake_db.query.return_value.filter.return_value.first.return_value = fake_workflow

    events = list(_perform_analysis_sync(1, 50.0, fake_db))
    assert len(events) == 1
    stage, payload = events[0]
    assert stage == 'error'
    assert payload.get('status') == 400
