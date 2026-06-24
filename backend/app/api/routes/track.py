"""
Traffic tracking — first-party analytics for the growth dashboard.
POST /api/track  → record one page view (country resolved from IP).

Designed to never fail the caller: any error returns {"ok": true} quietly so
a tracking hiccup never affects the user's experience.
"""
import os
import hashlib
import ipaddress
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_client_ip
from app.models.workflow import PageView

router = APIRouter()

_IP_SALT = os.getenv("TRACK_IP_SALT", "workscanai-default-salt")


class TrackPayload(BaseModel):
    path: Optional[str] = None
    referrer: Optional[str] = None


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{_IP_SALT}:{ip}".encode()).hexdigest()


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return not (addr.is_private or addr.is_loopback or addr.is_reserved)
    except ValueError:
        return False


def _resolve_country(ip: str) -> tuple[Optional[str], Optional[str]]:
    """Look up ISO country code + name from an IP. Returns (code, name).
    Free, no-key service with a tight timeout; fails soft to (None, None)."""
    if not _is_public_ip(ip):
        return None, None
    try:
        r = httpx.get(f"https://ipapi.co/{ip}/json/", timeout=2.0)
        if r.status_code == 200:
            d = r.json()
            return d.get("country_code"), d.get("country_name")
    except Exception:
        pass
    return None, None


@router.post("/track")
async def track_page_view(
    payload: TrackPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        ip = get_client_ip(request)
        code, name = _resolve_country(ip)
        pv = PageView(
            path=(payload.path or "")[:255] or None,
            country=code,
            country_name=name,
            referrer=(payload.referrer or "")[:500] or None,
            ip_hash=_hash_ip(ip) if ip and ip != "unknown" else None,
        )
        db.add(pv)
        db.commit()
    except Exception as e:
        # Never surface tracking errors to the client.
        print(f"[track] swallowed error: {e}")
    return {"ok": True}
