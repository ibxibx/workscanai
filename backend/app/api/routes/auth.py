"""
OTP authentication routes.
POST /api/auth/request      - send 4-digit OTP code by email
GET  /api/auth/verify       - verify magic link token (fallback), return session email
POST /api/auth/verify-otp   - verify 4-digit OTP code, return session email
GET  /api/auth/me           - validate session email header
"""
import secrets
import os
import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

from app.core.database import get_db
from app.models.workflow import User, MagicToken

router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@workscanai.com")
APP_URL = os.getenv("APP_URL", "https://workscanai.vercel.app")
TOKEN_TTL_MINUTES = 15


class MagicLinkRequest(BaseModel):
    email: str
    locale: str = "en"  # 'en' (default) or 'de' — chooses the email language

class OTPVerifyRequest(BaseModel):
    email: str
    code: str


# ── OTP brute-force guard ─────────────────────────────────────────────────────
# A 4-digit code is only 10,000 possibilities, so without a cap an attacker can
# try them all inside the 15-min TTL. Track failed attempts per email in-memory
# (same approach as the analyze rate limiter) and lock after MAX_OTP_ATTEMPTS
# until a new code is requested.
import time as _time
MAX_OTP_ATTEMPTS = 5
_otp_attempts: dict[str, list[float]] = {}
_OTP_ATTEMPT_WINDOW = TOKEN_TTL_MINUTES * 60


def _otp_attempts_exceeded(email: str) -> bool:
    now = _time.time()
    hits = [t for t in _otp_attempts.get(email, []) if now - t < _OTP_ATTEMPT_WINDOW]
    _otp_attempts[email] = hits
    return len(hits) >= MAX_OTP_ATTEMPTS


def _record_otp_failure(email: str) -> None:
    _otp_attempts.setdefault(email, []).append(_time.time())


def _clear_otp_attempts(email: str) -> None:
    _otp_attempts.pop(email, None)


def _get_or_create_user(email: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


async def _send_otp_email(email: str, otp_code: str, locale: str = "en"):
    resend_key = os.getenv("RESEND_API_KEY", "")

    if not resend_key:
        print(f"[DEV] OTP code for {email}: {otp_code}")
        return

    # Localised copy — English is the default; German for wsai_locale=de users.
    de = locale == "de"
    L_heading = "Ihr Anmelde-Code" if de else "Your sign-in code"
    L_body = (
        f"Geben Sie diesen Code in der App ein, um sich anzumelden. Er läuft in {TOKEN_TTL_MINUTES} Minuten ab."
        if de else
        f"Enter this code in the app to sign in. It expires in {TOKEN_TTL_MINUTES} minutes."
    )
    L_ignore = (
        "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren."
        if de else
        "If you didn't request this, you can safely ignore this email."
    )
    L_subject = f"{otp_code} ist Ihr WorkScanAI-Code" if de else f"{otp_code} is your WorkScanAI code"

    # Resend sandbox mode: onboarding@resend.dev can only send to the account owner.
    # If a RESEND_TEST_EMAIL override is set, redirect all emails there (dev/sandbox use).
    test_email_override = os.getenv("RESEND_TEST_EMAIL", "")
    send_to = test_email_override if test_email_override else email
    if test_email_override:
        print(f"[auth] RESEND_TEST_EMAIL override active — sending to {send_to} instead of {email}")

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 40px auto; padding: 40px 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
      <div style="margin-bottom: 28px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <div style="width: 28px; height: 28px; background: #0071e3; border-radius: 8px; display: inline-block;"></div>
          <span style="font-size: 16px; font-weight: 600; color: #1d1d1f;">WorkScanAI</span>
        </div>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1d1d1f;">{L_heading}</h2>
      <p style="color: #6b7280; margin: 0 0 32px; font-size: 15px; line-height: 1.5;">
        {L_body}
      </p>
      <div style="background: #f5f5f7; border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
        <div style="font-size: 56px; font-weight: 700; letter-spacing: 16px; color: #1d1d1f; font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1;">{otp_code}</div>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
        {L_ignore}
      </p>
    </div>
    """

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [send_to], "subject": L_subject, "html": html},
            timeout=10,
        )
        if resp.status_code >= 400:
            print(f"[auth] Resend error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again in a moment.")


@router.post("/auth/request")
async def request_magic_link(body: MagicLinkRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if '@' not in email or '.' not in email.split('@')[-1]:
        raise HTTPException(status_code=422, detail="Invalid email address.")
    _get_or_create_user(email, db)

    # New code issued → reset the brute-force attempt counter for this email.
    _clear_otp_attempts(email)

    # Invalidate old unused tokens for this email
    db.query(MagicToken).filter(MagicToken.email == email, MagicToken.used == False).delete()
    db.commit()

    token = secrets.token_urlsafe(32)
    # Generate a 4-digit OTP code using a cryptographically-secure RNG
    # (random.choices uses the Mersenne Twister, which is predictable).
    otp_code = ''.join(secrets.choice(string.digits) for _ in range(4))
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
    magic = MagicToken(email=email, token=token, expires_at=expires, otp_code=otp_code)
    db.add(magic)
    db.commit()

    try:
        await _send_otp_email(email, otp_code, body.locale)
    except HTTPException:
        raise  # already a proper HTTP error with detail
    except Exception as e:
        print(f"[auth] Email send failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not send verification email. The server may be warming up — please wait a moment and try again."
        )
    return {"message": "Code sent — check your email."}


@router.get("/auth/verify")
def verify_magic_token(token: str = Query(...), db: Session = Depends(get_db)):
    row = db.query(MagicToken).filter(MagicToken.token == token).first()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired link.")
    if row.used:
        raise HTTPException(status_code=400, detail="Link already used.")
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Link has expired.")

    row.used = True
    db.commit()
    _get_or_create_user(row.email, db)
    return {"email": row.email}


@router.post("/auth/verify-otp")
def verify_otp(body: OTPVerifyRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    code = body.code.strip()

    # Brute-force lock: too many wrong codes → refuse until a new code is issued.
    if _otp_attempts_exceeded(email):
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Please request a new code.",
        )

    row = (
        db.query(MagicToken)
        .filter(MagicToken.email == email, MagicToken.used == False)
        .order_by(MagicToken.expires_at.desc())
        .first()
    )
    if not row or not row.otp_code:
        raise HTTPException(status_code=400, detail="No active code found. Please request a new one.")
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code has expired. Please request a new one.")
    # Constant-time comparison to avoid leaking the code via timing.
    if not secrets.compare_digest(str(row.otp_code), code):
        _record_otp_failure(email)
        raise HTTPException(status_code=400, detail="Incorrect code. Please try again.")

    _clear_otp_attempts(email)
    row.used = True
    db.commit()
    _get_or_create_user(row.email, db)
    return {"email": row.email}


@router.get("/auth/me")
def get_me(db: Session = Depends(get_db)):
    # Validated by frontend sending x-user-email header — just confirm user exists
    return {"ok": True}
