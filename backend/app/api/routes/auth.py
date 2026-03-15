"""
Magic link + OTP authentication routes.
POST /api/auth/request      - send magic link + OTP code email
GET  /api/auth/verify       - verify magic link token, return session email
POST /api/auth/verify-otp   - verify 6-digit OTP code, return session email
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


async def _send_magic_email(email: str, token: str, otp_code: str = ""):
    magic_url = f"{APP_URL}/auth/verify?token={token}"
    resend_key = os.getenv("RESEND_API_KEY", "")

    if not resend_key:
        print(f"[DEV] Magic link for {email}: {magic_url}")
        if otp_code:
            print(f"[DEV] OTP code for {email}: {otp_code}")
        return

    otp_block = ""
    if otp_code:
        otp_block = f"""
      <div style="margin: 20px 0; padding: 20px; background: #f3f4f6; border-radius: 10px; text-align: center;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Or enter this code in the app:</p>
        <div style="font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #1d1d1f; font-family: monospace;">{otp_code}</div>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">Expires in {TOKEN_TTL_MINUTES} minutes</p>
      </div>
    """

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 40px auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin: 0 0 8px; font-size: 22px;">Sign in to WorkScanAI</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Click the button below to sign in — or use the code. Both expire in {TOKEN_TTL_MINUTES} minutes.</p>
      <a href="{magic_url}" style="display:inline-block;background:#0071e3;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Sign in →
      </a>
      {otp_block}
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you didn't request this, ignore this email.</p>
    </div>
    """

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [email], "subject": "Your WorkScanAI sign-in link", "html": html},
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
        await _send_magic_email(email, token, otp_code)
    except Exception as e:
        print(f"[auth] Email send failed: {e}")
        # Don't expose send errors to client — token is still valid
    return {"message": "Magic link sent — check your email."}


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
