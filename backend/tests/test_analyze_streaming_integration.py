"""
End-to-end integration test for the SSE streaming variant of /api/analyze.
Boots the real FastAPI app under TestClient with an in-memory SQLite DB,
mocks AIAnalyzer to skip Claude calls, and verifies:
  - JSON path returns AnalysisResponse (backward compat)
  - SSE path returns text/event-stream with stage events in order
"""
import json
import os
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def client(monkeypatch, tmp_path):
    """Boot a fresh FastAPI app with mocked AI + n8n services."""
    # File-based SQLite in a temp dir — survives reloads, isolated per test
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("TURSO_DATABASE_URL", "")
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "")

    # Mock AI analyzer
    fake_analyzer = MagicMock()
    fake_analyzer.analyze_tasks_batch.return_value = [{
        'ai_readiness_score': 80,
        'time_saved_percentage': 70,
        'recommendation': 'Use Zapier for this task',
        'difficulty': 'low',
        'estimated_hours_saved': 120,
        'risk_level': 'safe',
        'risk_flag': None,
    }]
    fake_analyzer.calculate_roi.return_value = {
        'automation_score': 80,
        'hours_saved': 120,
        'annual_savings': 6000,
    }
    monkeypatch.setattr(
        'app.api.routes.workflows.AIAnalyzer',
        lambda: fake_analyzer,
    )

    # Mock n8n services
    monkeypatch.setattr(
        'app.services.n8n_template_client.N8nTemplateClient.get_curated_templates',
        lambda self, job_title, tasks: []
    )
    monkeypatch.setattr(
        'app.services.job_scanner.JobScanner._generate_n8n_workflow',
        lambda self, name, tasks: {'nodes': [], 'connections': {}}
    )

    # Skip reCAPTCHA
    async def _no_recaptcha(token):
        return True
    monkeypatch.setattr('app.api.routes.workflows.verify_recaptcha', _no_recaptcha)

    # Patch the database engine to point at our test DB.
    # We do this BEFORE importing main, so main's startup create_all() runs
    # against our test engine.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    test_engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    from app.core import database as _db_mod
    monkeypatch.setattr(_db_mod, 'engine', test_engine)
    monkeypatch.setattr(_db_mod, 'SessionLocal', test_session_local)

    # Override get_db to use our test session
    def _get_test_db():
        db = test_session_local()
        try:
            yield db
        finally:
            db.close()
    monkeypatch.setattr(_db_mod, 'get_db', _get_test_db)

    # Create tables on the test engine
    _db_mod.Base.metadata.create_all(bind=test_engine)

    from app.main import app

    # Override the FastAPI dependency too (app may have already imported the original)
    from app.core.database import get_db as _orig_get_db
    app.dependency_overrides[_orig_get_db] = _get_test_db

    from fastapi.testclient import TestClient
    return TestClient(app)


def _create_workflow(client, name="SSE test workflow"):
    """Helper: create a workflow and return its ID."""
    resp = client.post(
        "/api/workflows",
        json={
            "name": name,
            "description": "Test workflow for SSE integration",
            "input_mode": "manual",
            "analysis_context": "individual",
            "tasks": [{
                "name": "Test task A",
                "description": "Process expense reports",
                "frequency": "daily",
                "time_per_task": 15,
                "category": "data_entry",
                "complexity": "low",
            }],
        },
        headers={"x-user-email": "test@example.com"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_analyze_json_path_backward_compatible(client):
    """Default Accept header → returns single JSON AnalysisResponse."""
    workflow_id = _create_workflow(client, "JSON test")

    resp = client.post(
        "/api/analyze",
        json={"workflow_id": workflow_id, "hourly_rate": 50.0, "recaptcha_token": ""},
        headers={"x-user-email": "test@example.com", "Accept": "application/json"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "automation_score" in body
    assert body["automation_score"] == 80
    assert body["hours_saved"] == 120
    assert body["annual_savings"] == 6000


def test_analyze_sse_path_streams_stages(client):
    """Accept: text/event-stream → server returns event stream with stage markers."""
    workflow_id = _create_workflow(client, "SSE test")

    with client.stream(
        "POST",
        "/api/analyze",
        json={"workflow_id": workflow_id, "hourly_rate": 50.0, "recaptcha_token": ""},
        headers={"x-user-email": "test@example.com", "Accept": "text/event-stream"},
    ) as resp:
        assert resp.status_code == 200, resp.read().decode()
        assert "text/event-stream" in resp.headers["content-type"]

        # Collect all events
        body = b""
        for chunk in resp.iter_bytes():
            body += chunk
        body_str = body.decode()

    # Parse SSE events: each event is "data: {json}\n\n"
    events = []
    for block in body_str.split("\n\n"):
        block = block.strip()
        if not block or block.startswith(":"):  # skip comments/heartbeats
            continue
        if block.startswith("data:"):
            payload = json.loads(block[len("data:"):].strip())
            events.append(payload)

    stages = [e["stage"] for e in events]
    assert "analyzing" in stages, f"Missing analyzing in {stages}"
    assert "roi" in stages, f"Missing roi in {stages}"
    assert "n8n" in stages, f"Missing n8n in {stages}"
    assert "done" in stages, f"Missing done in {stages}"

    # Order invariant
    idx = {s: stages.index(s) for s in ["analyzing", "roi", "n8n", "done"]}
    assert idx["analyzing"] < idx["roi"] < idx["n8n"] < idx["done"], \
        f"Stages out of order: {stages}"

    # done event carries the workflow_id
    done_event = next(e for e in events if e["stage"] == "done")
    assert done_event["workflow_id"] == workflow_id


def test_analyze_sse_returns_error_for_missing_workflow(client):
    """SSE error path: emits 'error' event with status code."""
    with client.stream(
        "POST",
        "/api/analyze",
        json={"workflow_id": 99999, "hourly_rate": 50.0, "recaptcha_token": ""},
        headers={"x-user-email": "test@example.com", "Accept": "text/event-stream"},
    ) as resp:
        # The route returns 200 with the stream; the error is in the payload
        assert resp.status_code == 200
        body = b""
        for chunk in resp.iter_bytes():
            body += chunk

    events = []
    for block in body.decode().split("\n\n"):
        block = block.strip()
        if not block or block.startswith(":"):
            continue
        if block.startswith("data:"):
            events.append(json.loads(block[len("data:"):].strip()))

    error_events = [e for e in events if e.get("stage") == "error"]
    assert len(error_events) == 1, f"Expected 1 error event, got {events}"
    assert error_events[0]["status"] == 404
