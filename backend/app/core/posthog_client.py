"""
Server-side PostHog client singleton.
Capture events with capture_event(); it no-ops if POSTHOG_API_KEY is unset.
"""
import os
from posthog import Posthog

_api_key = os.getenv("POSTHOG_API_KEY", "")
_host = os.getenv("POSTHOG_HOST", "")

if _api_key and _host:
    # posthog 7.x: first positional arg is the project API key (was `api_key=`
    # in <3.x). Keep host keyword. Wrapped so a bad key/host can't crash boot.
    try:
        _client: Posthog | None = Posthog(_api_key, host=_host)
    except Exception as exc:
        print(f"[posthog] init error, analytics disabled: {exc}")
        _client = None
else:
    _client = None


def capture_event(distinct_id: str, event: str, properties: dict | None = None) -> None:
    """Send a server-side event to PostHog.  Never raises — swallows all errors."""
    if _client is None:
        return
    try:
        # posthog 7.x: event is positional; distinct_id + properties are keywords.
        _client.capture(event, distinct_id=distinct_id, properties=properties or {})
    except Exception as exc:
        print(f"[posthog] capture error: {exc}")
