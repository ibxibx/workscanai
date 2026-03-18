"""
Minimal PEP 249-compatible DBAPI shim for Turso (libSQL HTTP pipeline API).
Uses httpx (sync) — zero Rust compilation, no aiohttp event loop conflicts.

SQLAlchemy uses this as a drop-in sqlite3 replacement via creator= parameter,
so all ORM models, routes and services stay 100% unchanged.
"""
from __future__ import annotations
import httpx
from typing import Any, List, Optional, Sequence

# ── PEP 249 module attributes ──────────────────────────────────────────────
apilevel    = "2.0"
threadsafety = 1
paramstyle  = "qmark"

class Error(Exception):          pass
class DatabaseError(Error):      pass
class OperationalError(DatabaseError): pass
class InterfaceError(Error):     pass


def _args(params) -> list:
    """Convert qmark/positional params → Turso pipeline args format."""
    if not params:
        return []
    def _val(v):
        if v is None:
            return {"type": "null"}
        if isinstance(v, bool):
            return {"type": "integer", "value": str(int(v))}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        if isinstance(v, float):
            return {"type": "float", "value": str(v)}
        return {"type": "text", "value": str(v)}
    return [_val(v) for v in params]


def _py(col_type: str, value: Any) -> Any:
    if value is None:
        return None
    t = (col_type or "").lower()
    if t in ("integer", "int", "bigint"):
        try: return int(value)
        except: return value
    if t in ("real", "float", "double", "numeric"):
        try: return float(value)
        except: return value
    return value

class Cursor:
    def __init__(self, conn: "Connection"):
        self._conn = conn
        self.description: Optional[list] = None
        self.rowcount: int = -1
        self.lastrowid: Optional[int] = None
        self._rows: List[tuple] = []
        self._pos: int = 0
        self.arraysize: int = 1

    def execute(self, sql: str, parameters=None):
        result = self._conn._run(sql, parameters)
        self._load(result)
        return self

    def executemany(self, sql: str, seq):
        for p in seq:
            self.execute(sql, p)

    def _load(self, result: dict):
        cols  = result.get("cols",  [])
        rows  = result.get("rows",  [])
        self.rowcount  = result.get("affected_row_count", len(rows))
        self.lastrowid = result.get("last_insert_rowid")
        if cols:
            self.description = [
                (c["name"], None, None, None, None, None, None)
                for c in cols
            ]
            self._rows = [
                tuple(_py(cols[i].get("decltype",""), v)
                      for i, v in enumerate(row))
                for row in rows
            ]
        else:
            self.description = None
            self._rows = []
        self._pos = 0

    def fetchone(self):
        if self._pos >= len(self._rows): return None
        r = self._rows[self._pos]; self._pos += 1; return r

    def fetchmany(self, size=None):
        sz = size or self.arraysize
        r  = self._rows[self._pos:self._pos+sz]; self._pos += len(r); return r

    def fetchall(self):
        r = self._rows[self._pos:]; self._pos = len(self._rows); return r

    def close(self): pass
    def __iter__(self): return iter(self._rows[self._pos:])


class Connection:
    def __init__(self, url: str, token: str):
        # Turso URL: libsql://xxx.turso.io  →  https://xxx.turso.io
        self._url   = url.rstrip("/").replace("libsql://", "https://")
        self._token = token
        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            },
            timeout=30,
        )

    def _run(self, sql: str, params=None) -> dict:
        """Execute one statement via Turso pipeline API and return result dict."""
        payload = {
            "requests": [
                {"type": "execute",
                 "stmt": {"sql": sql, "args": _args(params)}},
                {"type": "close"},
            ]
        }
        resp = self._client.post(f"{self._url}/v2/pipeline", json=payload)
        resp.raise_for_status()
        data = resp.json()
        r0 = data["results"][0]
        if r0["type"] == "error":
            raise OperationalError(r0.get("error", {}).get("message", "Turso error"))
        return r0.get("response", {}).get("result", {})

    def cursor(self) -> Cursor:
        return Cursor(self)

    # SQLAlchemy calls commit/rollback around transactions.
    # Turso is auto-commit per statement — these are no-ops for us.
    def commit(self):   pass
    def rollback(self): pass

    def close(self):
        try: self._client.close()
        except: pass

    def __enter__(self):  return self
    def __exit__(self, *a): self.close()


def connect(url: str, auth_token: str = "") -> Connection:
    return Connection(url, auth_token)
