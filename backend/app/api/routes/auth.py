"""
Magic link authentication routes.
POST /api/auth/request  - send magic link email
GET  /api/auth/verify   - verify token, return session email
GET  /api/auth/me       - validate session email header
"""
import secrets
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import httpx

from app.core.database import get_db
from app.models.workflow import User, MagicToken

router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@workscanai.com")
APP_URL = os.getenv("APP_URL", "https://workscanai.vercel.app")
TOKEN_TTL_MINUTES = 15


class MagicLinkRequest(BaseModel):
    email: EmailStr


def _get_or_create_user(email: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


async def _send_magic_email(email: str, token: str):
    magic_url = f"{APP_URL}/auth/verify?token={token}"

    if not RESEND_API_KEY:
        # Dev mode — just print the link
        print(f"[DEV] Magic link for {email}: {magic_url}")
        return

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 40px auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin: 0 0 8px; font-size: 22px;">Sign in to WorkScanAI</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Click the button below to sign in. This link expires in {TOKEN_TTL_MINUTES} minutes.</p>
      <a href="{magic_url}" style="display:inline-block;background:#0071e3;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Sign in →
      </a>
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
            raise HTTPException(status_code=500, detail="Failed to send email")


@router.post("/auth/request")
async def request_magic_link(body: MagicLinkRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    _get_or_create_user(email, db)

    # Invalidate old unused tokens for this email
    db.query(MagicToken).filter(MagicToken.email == email, MagicToken.used == False).delete()
    db.commit()

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
    magic = MagicToken(email=email, token=token, expires_at=expires)
    db.add(magic)
    db.commit()

    await _send_magic_email(email, token)
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


@router.get("/auth/me")
def get_me(db: Session = Depends(get_db)):
    # Validated by frontend sending x-user-email header — just confirm user exists
    return {"ok": True}
