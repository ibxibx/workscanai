"""
Single source of truth for admin authentication.

Before this module, three route files each defined their own `_require_admin`
and read ADMIN_SECRET via os.getenv — which is how one copy drifted to a
hardcoded fallback (a backdoor) and how the secret leaked into source. Now every
admin-gated route depends on `require_admin` here, and the secret is read ONLY
from the typed settings (app.core.config), which loads it from the environment.

Rules enforced here:
  - The secret comes from settings.ADMIN_SECRET (env-backed). No literals, ever.
  - Empty secret => every admin request is rejected (fail closed, not open).
  - Constant-time comparison to avoid timing side-channels.
"""
import hmac
from typing import Optional
from fastapi import Header, HTTPException

from app.core.config import settings


def is_admin_secret(candidate: Optional[str]) -> bool:
    """True iff `candidate` matches the configured admin secret.
    False when the secret is unset (fail closed) or candidate is None."""
    secret = settings.ADMIN_SECRET
    if not secret or not candidate:
        return False
    # constant-time compare
    return hmac.compare_digest(candidate, secret)


def require_admin(x_admin_secret: Optional[str] = Header(None)) -> None:
    """FastAPI dependency. Raises 401 unless a valid x-admin-secret header is sent."""
    if not is_admin_secret(x_admin_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
