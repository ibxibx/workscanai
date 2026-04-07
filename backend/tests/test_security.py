"""
Tests for the security / rate-limit module.
"""
import sys, os, time, pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")


class TestRateLimiter:
    """Unit-test the in-memory rate limiter without a real Request object."""

    def setup_method(self):
        # Reset the in-memory log before every test
        from app.core import security
        security._analyze_log.clear()
        self.security = security

    def _make_request(self, ip: str):
        """Minimal mock that satisfies get_client_ip."""
        from unittest.mock import MagicMock
        req = MagicMock()
        req.headers = {}
        req.client.host = ip
        return req

    def test_first_call_passes(self):
        req = self._make_request("10.0.0.1")
        self.security.check_rate_limit(req)  # should not raise

    def test_within_limit_passes(self):
        ip = "10.0.0.2"
        from app.core.config import settings
        limit = settings.MAX_ANALYSES_PER_HOUR
        for _ in range(limit - 1):
            self.security._analyze_log[ip].append(time.time())
        req = self._make_request(ip)
        self.security.check_rate_limit(req)  # still within limit — should not raise

    def test_exceeding_limit_raises_429(self):
        from fastapi import HTTPException
        from app.core.config import settings
        ip = "10.0.0.3"
        limit = settings.MAX_ANALYSES_PER_HOUR
        for _ in range(limit):
            self.security._analyze_log[ip].append(time.time())
        req = self._make_request(ip)
        with pytest.raises(HTTPException) as exc_info:
            self.security.check_rate_limit(req)
        assert exc_info.value.status_code == 429

    def test_owner_ip_bypasses_limit(self):
        from app.core.config import settings
        original = settings.OWNER_IP
        settings.OWNER_IP = "192.168.1.100"
        ip = "192.168.1.100"
        # Pre-fill beyond limit
        for _ in range(settings.MAX_ANALYSES_PER_HOUR + 10):
            self.security._analyze_log[ip].append(time.time())
        req = self._make_request(ip)
        try:
            self.security.check_rate_limit(req)  # should NOT raise
        finally:
            settings.OWNER_IP = original

    def test_expired_entries_are_pruned(self):
        from fastapi import HTTPException
        from app.core.config import settings
        ip = "10.0.0.4"
        limit = settings.MAX_ANALYSES_PER_HOUR
        old_ts = time.time() - (self.security.WINDOW_SECONDS + 10)
        for _ in range(limit):
            self.security._analyze_log[ip].append(old_ts)
        req = self._make_request(ip)
        self.security.check_rate_limit(req)   # old entries pruned — should pass

    def test_get_client_ip_from_forwarded_header(self):
        from unittest.mock import MagicMock
        req = MagicMock()
        req.headers = {"x-forwarded-for": "203.0.113.5, 10.0.0.1"}
        ip = self.security.get_client_ip(req)
        assert ip == "203.0.113.5"

    def test_get_client_ip_fallback_to_client_host(self):
        from unittest.mock import MagicMock
        req = MagicMock()
        req.headers = {}
        req.client.host = "172.16.0.1"
        ip = self.security.get_client_ip(req)
        assert ip == "172.16.0.1"


# ---------------------------------------------------------------------------
# Utility: settings sanity
# ---------------------------------------------------------------------------

class TestSettings:

    def test_max_analyses_is_positive_int(self):
        from app.core.config import settings
        assert isinstance(settings.MAX_ANALYSES_PER_HOUR, int)
        assert settings.MAX_ANALYSES_PER_HOUR > 0

    def test_app_name_set(self):
        from app.core.config import settings
        assert settings.APP_NAME == "WorkScanAI"

    def test_cors_origins_default_contains_vercel(self):
        """The default value for CORS_ORIGINS must always include the production origin.
        (The local .env may override the full string, so we check the config default.)
        """
        from app.core.config import Settings
        # Instantiate a fresh Settings with no env overrides for CORS_ORIGINS
        default_origins = Settings.model_fields["CORS_ORIGINS"].default
        assert "workscanai.vercel.app" in default_origins
