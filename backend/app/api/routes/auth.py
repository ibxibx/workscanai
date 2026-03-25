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

class OTPVerifyRequest(BaseModel):
    email: str
    code: str


def _get_or_create_user(email: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


async def _send_otp_email(email: str, otp_code: str):
    resend_key = os.getenv("RESEND_API_KEY", "")

    if not resend_key:
        print(f"[DEV] OTP code for {email}: {otp_code}")
        return

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 40px auto; padding: 40px 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
      <div style="margin-bottom: 28px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <div style="width: 28px; height: 28px; background: #0071e3; border-radius: 8px; display: inline-block;"></div>
          <span style="font-size: 16px; font-weight: 600; color: #1d1d1f;">WorkScanAI</span>
        </div>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1d1d1f;">Your sign-in code</h2>
      <p style="color: #6b7280; margin: 0 0 32px; font-size: 15px; line-height: 1.5;">
        Enter this code in the app to sign in. It expires in {TOKEN_TTL_MINUTES} minutes.
      </p>
      <div style="background: #f5f5f7; border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
        <div style="font-size: 56px; font-weight: 700; letter-spacing: 16px; color: #1d1d1f; font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1;">{otp_code}</div>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    """

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [email], "subject": f"{otp_code} is your WorkScanAI code", "html": html},
            timeout=10,
        )
        if resp.status_code >= 400:
            print(f"[auth] Resend error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=500, detail="Failed to send email")


@router.post("/auth/request")
async def request_magic_link(body: MagicLinkRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if '@' not in email or '.' not in email.split('@')[-1]:
        raise HTTPException(status_code=422, detail="Invalid email address.")
    _get_or_create_user(email, db)

    # Invalidate old unused tokens for this email
    db.query(MagicToken).filter(MagicToken.email == email, MagicToken.used == False).delete()
    db.commit()

    token = secrets.token_urlsafe(32)
    # Generate a 4-digit OTP code
    otp_code = ''.join(random.choices(string.digits, k=4))
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
    magic = MagicToken(email=email, token=token, expires_at=expires, otp_code=otp_code)
    db.add(magic)
    db.commit()

    try:
        await _send_otp_email(email, otp_code)
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
    if row.otp_code != code:
        raise HTTPException(status_code=400, detail="Incorrect code. Please try again.")

    row.used = True
    db.commit()
    _get_or_create_user(row.email, db)
    return {"email": row.email}


@router.get("/auth/me")
def get_me(db: Session = Depends(get_db)):
    # Validated by frontend sending x-user-email header — just confirm user exists
    return {"ok": True}
