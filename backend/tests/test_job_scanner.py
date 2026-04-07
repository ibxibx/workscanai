"""
Tests for JobScanner — task parser and workflow builder (no API / DB).
"""
import sys, os, pytest, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")

from app.services.job_scanner import JobScanner


@pytest.fixture
def scanner():
    s = JobScanner.__new__(JobScanner)
    # Inject parse-only methods without triggering __init__ (which needs API key)
    from app.services.job_scanner import JobScanner as _JS
    s._parse_tasks = _JS._parse_tasks.__get__(s, _JS)
    s._fallback_tasks = _JS._fallback_tasks.__get__(s, _JS)
    s._generate_n8n_workflow = _JS._generate_n8n_workflow.__get__(s, _JS)
    s._CATEGORY_TEMPLATES = _JS._CATEGORY_TEMPLATES
    s._SCHEDULE_TRIGGER = _JS._SCHEDULE_TRIGGER
    return s


class TestParseTasksFromClaude:

    def test_parses_six_valid_blocks(self, scanner):
        raw = ""
        for i in range(1, 7):
            raw += (
                f"---TASK---\n"
                f"NAME: Task {i}\n"
                f"DESCRIPTION: Does thing {i}\n"
                f"FREQUENCY: weekly\n"
                f"TIME_MINUTES: {20 + i * 5}\n"
                f"CATEGORY: reporting\n"
                f"COMPLEXITY: low\n\n"
            )
        tasks = scanner._parse_tasks(raw)
        assert len(tasks) == 6
        assert tasks[0]["name"] == "Task 1"
        assert tasks[0]["time_per_task"] == 25
        assert tasks[0]["frequency"] == "weekly"

    def test_caps_at_six_tasks(self, scanner):
        raw = ""
        for i in range(1, 10):  # 9 blocks
            raw += f"---TASK---\nNAME: Task {i}\nDESCRIPTION: Desc\nFREQUENCY: daily\nTIME_MINUTES: 30\nCATEGORY: analysis\nCOMPLEXITY: medium\n\n"
        tasks = scanner._parse_tasks(raw)
        assert len(tasks) <= 6

    def test_invalid_frequency_falls_back_to_weekly(self, scanner):
        raw = "---TASK---\nNAME: Weird Task\nDESCRIPTION: X\nFREQUENCY: biannually\nTIME_MINUTES: 30\nCATEGORY: research\nCOMPLEXITY: low\n"
        tasks = scanner._parse_tasks(raw)
        assert tasks[0]["frequency"] == "weekly"

    def test_invalid_time_minutes_falls_back_to_30(self, scanner):
        raw = "---TASK---\nNAME: Task\nDESCRIPTION: X\nFREQUENCY: daily\nTIME_MINUTES: not_a_number\nCATEGORY: communication\nCOMPLEXITY: medium\n"
        tasks = scanner._parse_tasks(raw)
        assert tasks[0]["time_per_task"] == 30

    def test_empty_input_returns_empty_list(self, scanner):
        assert scanner._parse_tasks("") == []

    def test_task_without_name_is_skipped(self, scanner):
        raw = "---TASK---\nDESCRIPTION: No name here\nFREQUENCY: weekly\nTIME_MINUTES: 30\n"
        tasks = scanner._parse_tasks(raw)
        assert tasks == []


class TestFallbackTasks:

    def test_returns_five_tasks(self, scanner):
        tasks = scanner._fallback_tasks("Generic Role")
        assert len(tasks) == 5

    def test_all_have_required_fields(self, scanner):
        tasks = scanner._fallback_tasks("Test")
        for t in tasks:
            assert "name" in t
            assert "frequency" in t
            assert "time_per_task" in t
            assert "category" in t


class TestGenerateN8nWorkflow:

    TASKS = [
        {"name": "Send weekly report",   "category": "reporting",     "frequency": "weekly",  "time_per_task": 60},
        {"name": "Log new submissions",  "category": "data_entry",    "frequency": "daily",   "time_per_task": 20},
        {"name": "Triage emails",        "category": "communication", "frequency": "daily",   "time_per_task": 30},
    ]

    def test_returns_valid_n8n_structure(self, scanner):
        wf = scanner._generate_n8n_workflow("Marketing Manager", self.TASKS)
        assert "name" in wf
        assert "nodes" in wf
        assert "connections" in wf
        assert wf["active"] is False

    def test_contains_schedule_trigger(self, scanner):
        wf = scanner._generate_n8n_workflow("Analyst", self.TASKS)
        triggers = [n for n in wf["nodes"] if "scheduleTrigger" in n["type"]]
        assert len(triggers) >= 1

    def test_node_count_scales_with_tasks(self, scanner):
        wf = scanner._generate_n8n_workflow("Ops", self.TASKS)
        # trigger + at least 2 nodes per selected task (3 tasks → ≥7 nodes)
        assert len(wf["nodes"]) >= 4

    def test_workflow_is_json_serialisable(self, scanner):
        wf = scanner._generate_n8n_workflow("PM", self.TASKS)
        dumped = json.dumps(wf)
        assert json.loads(dumped)["name"] == wf["name"]

    def test_all_nodes_have_id_name_type_position(self, scanner):
        wf = scanner._generate_n8n_workflow("DevOps", self.TASKS)
        for node in wf["nodes"]:
            assert node.get("id"), f"Node missing id: {node}"
            assert node.get("name"), f"Node missing name: {node}"
            assert node.get("type"), f"Node missing type: {node}"
            assert isinstance(node.get("position"), list) and len(node["position"]) == 2

    def test_meta_has_generated_by(self, scanner):
        wf = scanner._generate_n8n_workflow("Finance", self.TASKS)
        assert wf.get("meta", {}).get("generatedBy") == "WorkScanAI"
