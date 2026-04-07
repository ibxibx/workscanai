"""
WorkScanAI — Backend Test Suite
================================
Fast, dependency-free unit tests that run without a live DB or API key.
Integration smoke tests are gated by the WORKSCANAI_INTEGRATION env var.

Run:
    cd backend
    venv\\Scripts\\activate
    pytest tests/ -v
"""
import json
import sys
import os
import pytest

# Make sure the backend app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# ---------------------------------------------------------------------------
# 1.  AIAnalyzer — parser & ROI (no API key needed)
# ---------------------------------------------------------------------------

class TestAIAnalyzerParser:
    """Unit-test the block parser in isolation — no Claude call."""

    def setup_method(self):
        # Bypass API-key check by patching env before import
        os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")
        from app.services.ai_analyzer import AIAnalyzer
        self.analyzer = AIAnalyzer.__new__(AIAnalyzer)
        # Manually initialise only what the parser needs (no Anthropic client)
        from app.services.ai_analyzer import AIAnalyzer as _A
        self.analyzer._clean = _A._clean.__get__(self.analyzer, _A)
        self.analyzer._assign_field = _A._assign_field.__get__(self.analyzer, _A)
        self.analyzer._parse_block = _A._parse_block.__get__(self.analyzer, _A)
        self.analyzer._parse_batch_response = _A._parse_batch_response.__get__(self.analyzer, _A)
        self.analyzer._defaults = _A._defaults.__get__(self.analyzer, _A)
        self.analyzer._float = _A._float.__get__(self.analyzer, _A)
        self.analyzer._int = _A._int.__get__(self.analyzer, _A)

    # --- single block parsing ---

    def test_parse_block_numeric_fields(self):
        block = (
            "SCORE_REPEATABILITY: 85\n"
            "SCORE_DATA: 70\n"
            "SCORE_ERROR: 60\n"
            "SCORE_INTEGRATION: 75\n"
            "COMPOSITE_SCORE: 74\n"
            "TIME_SAVED: 65\n"
            "DIFFICULTY: medium\n"
            "RISK_LEVEL: safe\n"
            "RISK_FLAG: Safe to automate.\n"
            "RECOMMENDATION: Use Zapier.\n"
            "DECISION_LAYER: none\n"
            "AGENT_PHASE: 2\n"
            "AGENT_LABEL: Phase 2: Supervised\n"
            "AGENT_MILESTONE: Automate 50% of volume.\n"
            "ORCHESTRATION: Trigger + Sheets + Slack.\n"
            "COUNTDOWN_WINDOW: now\n"
            "HUMAN_EDGE_SCORE: 30\n"
            'PIVOT_SKILLS: ["Python","SQL","Prompt Engineering"]\n'
            'PIVOT_ROLES: [{"role":"AI Ops","risk":"low","pivot_distance":"easy","automation_score_pct":40}]\n'
        )
        result = self.analyzer._parse_block(block)
        assert result["ai_readiness_score"] == 74.0
        assert result["score_repeatability"] == 85.0
        assert result["score_data_availability"] == 70.0
        assert result["difficulty"] == "medium"
        assert result["risk_level"] == "safe"
        assert result["countdown_window"] == "now"
        assert result["decision_layer"] == "none"
        assert result["agent_phase"] == 2
        assert result["human_edge_score"] == 30.0

    def test_parse_block_multiline_recommendation(self):
        block = (
            "SCORE_REPEATABILITY: 70\nSCORE_DATA: 60\nSCORE_ERROR: 55\nSCORE_INTEGRATION: 65\n"
            "COMPOSITE_SCORE: 63\nTIME_SAVED: 50\nDIFFICULTY: hard\nRISK_LEVEL: caution\n"
            "RISK_FLAG: Handles PII — review before deploying.\n"
            "RECOMMENDATION: Option 1 - Zapier (free): connects Gmail to Sheets.\n"
            "Automates data entry. Setup 2h, payback 1w.\n"
            "Option 2 - Make.com ($9/mo): more complex flows.\n"
            "DECISION_LAYER: partial\nAGENT_PHASE: 1\nAGENT_LABEL: Phase 1: Human-in-Loop\n"
            "AGENT_MILESTONE: Track error rate.\nORCHESTRATION: Webhook trigger.\n"
            "COUNTDOWN_WINDOW: 12-24\nHUMAN_EDGE_SCORE: 55\n"
            'PIVOT_SKILLS: ["Data Analysis"]\nPIVIT_ROLES: []\n'
        )
        result = self.analyzer._parse_block(block)
        assert "Option 1" in result["recommendation"]
        assert "Option 2" in result["recommendation"]
        assert result["risk_flag"] == "Handles PII -- review before deploying."
        assert result["difficulty"] == "hard"

    def test_parse_block_invalid_enum_values_use_defaults(self):
        block = (
            "COMPOSITE_SCORE: 55\nDIFFICULTY: extreme\nRISK_LEVEL: catastrophic\n"
            "DECISION_LAYER: maybe\nCOUNTDOWN_WINDOW: tomorrow\n"
        )
        result = self.analyzer._parse_block(block)
        assert result["difficulty"] == "medium"       # fallback
        assert result["risk_level"] == "safe"         # fallback
        assert result["decision_layer"] == "partial"  # fallback
        assert result["countdown_window"] == "24-48"  # fallback
    def test_parse_block_missing_fields_get_defaults(self):
        """Incomplete block should be filled with sensible defaults."""
        result = self.analyzer._parse_block("COMPOSITE_SCORE: 60\n")
        assert result["ai_readiness_score"] == 60.0
        assert result["difficulty"] == "medium"
        assert result["risk_level"] == "safe"
        assert "recommendation" in result
        assert result["pivot_skills"] is not None

    def test_parse_batch_response_three_tasks(self):
        raw = (
            "---TASK_1---\nCOMPOSITE_SCORE: 80\nDIFFICULTY: easy\n"
            "RISK_LEVEL: safe\nDECISION_LAYER: none\nCOUNTDOWN_WINDOW: now\n\n"
            "---TASK_2---\nCOMPOSITE_SCORE: 55\nDIFFICULTY: medium\n"
            "RISK_LEVEL: caution\nDECISION_LAYER: partial\nCOUNTDOWN_WINDOW: 12-24\n\n"
            "---TASK_3---\nCOMPOSITE_SCORE: 35\nDIFFICULTY: hard\n"
            "RISK_LEVEL: warning\nDECISION_LAYER: full\nCOUNTDOWN_WINDOW: 48+\n"
        )
        results = self.analyzer._parse_batch_response(raw, 3)
        assert len(results) == 3
        assert results[0]["ai_readiness_score"] == 80.0
        assert results[1]["ai_readiness_score"] == 55.0
        assert results[2]["ai_readiness_score"] == 35.0
        assert results[0]["countdown_window"] == "now"
        assert results[2]["decision_layer"] == "full"

    def test_parse_batch_response_pads_missing_blocks(self):
        """If Claude returns fewer blocks than expected, defaults fill the gap."""
        raw = "---TASK_1---\nCOMPOSITE_SCORE: 70\n"
        results = self.analyzer._parse_batch_response(raw, 3)
        assert len(results) == 3
        assert results[1]["ai_readiness_score"] == 50.0  # default

    def test_parse_batch_response_ignores_leading_prose(self):
        raw = (
            "Here are my analyses:\n\n"
            "---TASK_1---\nCOMPOSITE_SCORE: 72\n\n"
            "---TASK_2---\nCOMPOSITE_SCORE: 48\n"
        )
        results = self.analyzer._parse_batch_response(raw, 2)
        assert results[0]["ai_readiness_score"] == 72.0
        assert results[1]["ai_readiness_score"] == 48.0

    # --- pivot_skills / pivot_roles JSON parsing ---

    def test_parse_pivot_skills_valid_json(self):
        block = (
            'COMPOSITE_SCORE: 60\n'
            'PIVOT_SKILLS: ["Python", "SQL", "Prompt Engineering", "Data Vis", "APIs", "Statistics"]\n'
            'PIVOT_ROLES: [{"role":"Data Analyst","risk":"low","pivot_distance":"easy","automation_score_pct":38}]\n'
        )
        result = self.analyzer._parse_block(block)
        skills = json.loads(result["pivot_skills"])
        assert isinstance(skills, list)
        assert "Python" in skills
        roles = json.loads(result["pivot_roles"])
        assert roles[0]["role"] == "Data Analyst"

    def test_parse_pivot_skills_malformed_json(self):
        block = 'COMPOSITE_SCORE: 60\nPIVOT_SKILLS: not_valid_json\n'
        result = self.analyzer._parse_block(block)
        # Should not raise — malformed pivot_skills lands as None
        assert result["pivot_skills"] is None

    # --- _clean unicode sanitiser ---

    def test_clean_strips_emoji(self):
        from app.services.ai_analyzer import AIAnalyzer
        a = AIAnalyzer.__new__(AIAnalyzer)
        a._UNICODE_REPLACEMENTS = AIAnalyzer._UNICODE_REPLACEMENTS
        cleaned = AIAnalyzer._clean(a, "Use Zapier \U0001f916 to automate \u2192 results")
        assert "\U0001f916" not in cleaned
        assert "->" in cleaned

    def test_clean_preserves_euro_sign(self):
        from app.services.ai_analyzer import AIAnalyzer
        a = AIAnalyzer.__new__(AIAnalyzer)
        a._UNICODE_REPLACEMENTS = AIAnalyzer._UNICODE_REPLACEMENTS
        cleaned = AIAnalyzer._clean(a, "Saves \u20ac500/month")
        assert "\u20ac" in cleaned


# ---------------------------------------------------------------------------
# 2.  ROI Calculator
# ---------------------------------------------------------------------------

class TestROICalculator:
    def setup_method(self):
        os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")
        from app.services.ai_analyzer import AIAnalyzer
        self.analyzer = AIAnalyzer.__new__(AIAnalyzer)
        from app.services.ai_analyzer import AIAnalyzer as _A
        self.analyzer.calculate_roi = _A.calculate_roi.__get__(self.analyzer, _A)

    def _make_task_analysis(self, score, time_per_task, frequency, time_saved_pct):
        return {
            "ai_readiness_score": score,
            "time_saved_percentage": time_saved_pct,
            "score_repeatability": score,
            "score_data_availability": score,
            "score_error_tolerance": score,
            "score_integration": score,
            "task": {
                "name": "Test Task",
                "time_per_task": time_per_task,
                "frequency": frequency,
            }
        }

    def test_roi_daily_task(self):
        tasks = [self._make_task_analysis(80, 60, "daily", 50)]  # 1h/day, 50% saved
        roi = self.analyzer.calculate_roi(tasks, hourly_rate=50.0)
        # 1h * 50% * 250 days = 125 hours saved; 125 * 50 = €6250
        assert abs(roi["hours_saved"] - 125.0) < 1.0
        assert abs(roi["annual_savings"] - 6250.0) < 10.0
        assert roi["automation_score"] == 80.0

    def test_roi_weekly_task(self):
        tasks = [self._make_task_analysis(60, 120, "weekly", 80)]  # 2h/week, 80% saved
        roi = self.analyzer.calculate_roi(tasks, hourly_rate=75.0)
        # 2h * 80% * 52 = 83.2h; 83.2 * 75 = €6240
        assert abs(roi["hours_saved"] - 83.2) < 1.0
        assert abs(roi["annual_savings"] - 6240.0) < 10.0

    def test_roi_multiple_tasks_averages_score(self):
        tasks = [
            self._make_task_analysis(80, 30, "daily", 60),
            self._make_task_analysis(40, 30, "daily", 20),
        ]
        roi = self.analyzer.calculate_roi(tasks, hourly_rate=50.0)
        assert roi["automation_score"] == 60.0  # (80+40)/2

    def test_roi_zero_tasks_returns_zero(self):
        roi = self.analyzer.calculate_roi([], hourly_rate=50.0)
        assert roi["automation_score"] == 0
        assert roi["hours_saved"] == 0
        assert roi["annual_savings"] == 0
