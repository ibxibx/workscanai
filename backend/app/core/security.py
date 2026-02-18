"""
In-memory rate limiter + reCAPTCHA v3 verification middleware.
Limits each IP to MAX_ANALYSES_PER_HOUR analyze calls.
"""
import time
import os
from collections import defaultdict
from fastapi import Request, HTTPException
import httpx

# ── Rate limit config ─────────────────────────────────────────────────────────
MAX_ANALYSES_PER_HOUR = int(os.getenv("MAX_ANALYSES_PER_HOUR", "5"))
WINDOW_SECONDS = 3600  # 1 hour rolling window

# ip -> list of timestamps of recent /api/analyze calls
_analyze_log: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """Extract real IP, honouring X-Forwarded-For from proxies / Vercel / Railway."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request) -> None:
    """
    Call this at the top of the /api/analyze endpoint.
    Raises HTTP 429 if the IP has exceeded MAX_ANALYSES_PER_HOUR.
    """
    ip = get_client_ip(request)
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    # Prune old entries
    _analyze_log[ip] = [t for t in _analyze_log[ip] if t > cutoff]

    if len(_analyze_log[ip]) >= MAX_ANALYSES_PER_HOUR:
        oldest = _analyze_log[ip][0]
        retry_in = int(WINDOW_SECONDS - (now - oldest))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit",
                "message": f"You have used all {MAX_ANALYSES_PER_HOUR} free analyses this hour. "
                           f"Please try again in {retry_in // 60} min.",
                "retry_after_seconds": retry_in,
            },
        )

    _analyze_log[ip].append(now)


# ── reCAPTCHA v3 verification ─────────────────────────────────────────────────
RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_MIN_SCORE = float(os.getenv("RECAPTCHA_MIN_SCORE", "0.5"))
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_recaptcha(token: str) -> None:
    """
    Verify a reCAPTCHA v3 token against Google's API.
    Raises HTTP 403 if the token is invalid or the score is too low.
    Skips verification entirely if RECAPTCHA_SECRET_KEY is not configured
    (useful for local development).
    """
    if not RECAPTCHA_SECRET:
        # Not configured — skip (dev mode)
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            RECAPTCHA_VERIFY_URL,
            data={"secret": RECAPTCHA_SECRET, "response": token},
            timeout=5.0,
        )

    result = resp.json()

    if not result.get("success"):
        raise HTTPException(
            status_code=403,
            detail={"error": "captcha_failed", "message": "CAPTCHA verification failed. Please refresh and try again."},
        )

    score = result.get("score", 0)
    if score < RECAPTCHA_MIN_SCORE:
        raise HTTPException(
            status_code=403,
            detail={"error": "bot_detected", "message": f"Automated request detected (score {score:.2f}). Please try again."},
        )
