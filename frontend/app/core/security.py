"""
In-memory rate limiter + reCAPTCHA v3 verification.
Limits each IP to MAX_ANALYSES_PER_HOUR analyze calls per rolling hour.
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException
import httpx
from app.core.config import settings

# ── Rate limit config (read from Settings / .env) ─────────────────────────────
MAX_ANALYSES_PER_HOUR = settings.MAX_ANALYSES_PER_HOUR
WINDOW_SECONDS = 86400  # 24-hour rolling window

# ip -> list of UNIX timestamps of recent /api/analyze calls
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
        retry_in_seconds = int(WINDOW_SECONDS - (now - oldest))
        retry_in_hours = max(1, round(retry_in_seconds / 3600))
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit",
                "message": (
                    f"Thank you for exploring WorkScanAI! 🎉\n\n"
                    f"You've used all {MAX_ANALYSES_PER_HOUR} free workflow scans included in this demo. "
                    f"The limit resets on a rolling 24-hour basis — your next slot opens in approximately "
                    f"{retry_in_hours} hour{'s' if retry_in_hours != 1 else ''}.\n\n"
                    f"We hope the analysis gave you a clear picture of your automation opportunities. "
                    f"Feel free to come back tomorrow and scan another workflow!"
                ),
                "retry_after_seconds": retry_in_seconds,
            },
        )

    _analyze_log[ip].append(now)


# ── reCAPTCHA v3 verification ─────────────────────────────────────────────────
RECAPTCHA_SECRET = settings.RECAPTCHA_SECRET_KEY
RECAPTCHA_MIN_SCORE = settings.RECAPTCHA_MIN_SCORE
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
