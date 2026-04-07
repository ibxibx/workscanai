"""
Tests for the n8n canvas generator — no API key, no DB required.
"""
import sys, os, json, pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")

from app.services.n8n_template_client import build_canvas, _resolve_category


SAMPLE_TASKS = [
    {"name": "Generate weekly KPI report",    "category": "reporting",    "frequency": "weekly"},
    {"name": "Triage incoming support emails","category": "communication","frequency": "daily"},
    {"name": "Update project tracker",        "category": "data_entry",   "frequency": "daily"},
    {"name": "Research competitor landscape", "category": "research",     "frequency": "weekly"},
    {"name": "Manage Jira backlog",           "category": "management",   "frequency": "weekly"},
    {"name": "Schedule team syncs",           "category": "scheduling",   "frequency": "weekly"},
]


class TestBuildCanvas:

    def setup_method(self):
        self.canvas = build_canvas("Product Manager", SAMPLE_TASKS)

    def test_returns_valid_dict_with_required_keys(self):
        assert isinstance(self.canvas, dict)
        for key in ("name", "nodes", "connections", "active", "settings", "meta"):
            assert key in self.canvas, f"Missing key: {key}"

    def test_canvas_name_contains_job_title(self):
        assert "Product Manager" in self.canvas["name"]

    def test_node_count_is_reasonable(self):
        nodes = self.canvas["nodes"]
        assert len(nodes) >= len(SAMPLE_TASKS) * 2  # at least sticky + 1 node per task
        assert len(nodes) <= len(SAMPLE_TASKS) * 8  # sanity upper bound

    def test_connections_is_dict(self):
        assert isinstance(self.canvas["connections"], dict)

    def test_active_is_false(self):
        assert self.canvas["active"] is False

    def test_all_nodes_have_required_fields(self):
        required = {"id", "name", "type", "position"}
        for node in self.canvas["nodes"]:
            missing = required - set(node.keys())
            assert not missing, f"Node '{node.get('name')}' missing: {missing}"

    def test_position_is_two_element_list(self):
        for node in self.canvas["nodes"]:
            pos = node["position"]
            assert isinstance(pos, list) and len(pos) == 2, \
                f"Node '{node['name']}' has bad position: {pos}"

    def test_vertical_layout_no_y_overlap(self):
        """Working nodes must be at distinct y positions (one per task row)."""
        working_nodes = [n for n in self.canvas["nodes"] if "stickyNote" not in n["type"]]
        y_values = sorted({n["position"][1] for n in working_nodes})
        # With 6 tasks there should be 6 distinct y levels
        assert len(y_values) == len(SAMPLE_TASKS), \
            f"Expected {len(SAMPLE_TASKS)} distinct y-levels, got {y_values}"

    def test_each_task_row_starts_at_x0(self):
        """Every task chain must start at x=0 (left-aligned rows)."""
        working_nodes = [n for n in self.canvas["nodes"] if "stickyNote" not in n["type"]]
        # Group by y and check the leftmost x in each group is 0
        from collections import defaultdict
        by_y = defaultdict(list)
        for n in working_nodes:
            by_y[n["position"][1]].append(n["position"][0])
        for y, xs in by_y.items():
            assert min(xs) == 0, f"Row y={y} does not start at x=0, starts at x={min(xs)}"

    def test_sticky_notes_span_full_width(self):
        """Per-task sticky notes must have width == CANVAS_W (1800)."""
        task_stickies = [
            n for n in self.canvas["nodes"]
            if "stickyNote" in n["type"] and "Task" in n["name"]
        ]
        assert len(task_stickies) == len(SAMPLE_TASKS)
        for s in task_stickies:
            w = s["parameters"].get("width", 0)
            assert w == 1800, f"Sticky '{s['name']}' width={w}, expected 1800"

    def test_working_nodes_prefixed_with_task_number(self):
        """All working nodes must be prefixed T1:, T2:, …, T6:"""
        working = [n for n in self.canvas["nodes"] if "stickyNote" not in n["type"]]
        for n in working:
            assert n["name"].startswith("T") and ":" in n["name"], \
                f"Node '{n['name']}' not prefixed with T{{n}}:"

    def test_meta_field_present(self):
        meta = self.canvas.get("meta", {})
        assert meta.get("generatedBy") == "WorkScanAI"
        assert meta.get("taskCount") == len(SAMPLE_TASKS)

    def test_canvas_serialises_to_valid_json(self):
        dumped = json.dumps(self.canvas)
        reloaded = json.loads(dumped)
        assert reloaded["name"] == self.canvas["name"]

    def test_single_task_canvas(self):
        single = build_canvas("Analyst", [SAMPLE_TASKS[0]])
        nodes = single["nodes"]
        working = [n for n in nodes if "stickyNote" not in n["type"]]
        assert len(working) >= 1


class TestResolveCategory:

    def test_known_category_passes_through(self):
        assert _resolve_category("reporting") == "reporting"
        assert _resolve_category("management") == "management"
        assert _resolve_category("data_entry") == "data_entry"

    def test_alias_resolves(self):
        # "seo" is an extended alias — should resolve to something valid
        resolved = _resolve_category("seo")
        assert isinstance(resolved, str) and len(resolved) > 0

    def test_unknown_category_returns_general(self):
        assert _resolve_category("totally_unknown_xyz") == "general"

    def test_empty_string_returns_general(self):
        assert _resolve_category("") == "general"

    def test_none_returns_general(self):
        assert _resolve_category(None) == "general"
