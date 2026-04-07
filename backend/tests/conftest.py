"""
conftest.py — shared pytest fixtures
"""
import os
import sys
import pytest

# Ensure backend app is importable from tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Provide a dummy API key so modules that read it at import time don't blow up
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-placeholder")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
