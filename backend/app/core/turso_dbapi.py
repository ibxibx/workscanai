"""
Minimal PEP 249-compatible DBAPI shim for Turso (libSQL HTTP API).
Uses httpx (sync) — no Rust compilation, no aiohttp conflicts.
SQLAlchemy uses this with the sqlite dialect so all ORM code stays identical.
"""
from __future__ import annotations
import re
from typing import Any, List, Optional
import httpx

apilevel = "2.0"
threadsafety = 1
paramstyle = "qmark"


class Error(Exception): pass
class DatabaseError(Error): pass
class OperationalError(DatabaseError): pass
class ProgrammingError(DatabaseError): pass
class InterfaceError(Error): pass


def _to_args(params) -> list:
    if not params:
        return []
    def _val(v):
        if v is None:
            return {"type": "null"}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        if isinstance(v, float):
            return {"type": "float", "value": str(v)}
        return {"type": "text", "value": str(v)}
    return [_val(v) for v in params]


def _from_cell(cell: Any) -> Any:
    """Convert a Turso response cell dict to a Python value."""
    if cell is None:
        return None
    if isinstance(cell, dict):
        t = cell.get("type", "text")
        v = cell.get("value")
        if t == "null" or v is None:
            return None
        if t == "integer":
            try: return int(v)
            except: return v
        if t in ("real", "float"):
            try: return float(v)
            except: return v
        return v  # text / blob
    # Primitive (shouldn't happen but be safe)
    return cell


class Cursor:
    def __init__(self, conn: "Connection"):
        self._conn = conn
        self.description: Optional[list] = None
        self.rowcount: int = -1
        self.lastrowid: Optional[int] = None
        self._rows: list = []
        self._pos: int = 0
        self.arraysize: int = 1

    def execute(self, sql: str, parameters=None):
        self._rows = []
        self._pos = 0
        result = self._conn._send_one(sql, parameters)
        self._load(result)
        return self

    def executemany(self, sql: str, seq):
        for p in seq:
            self.execute(sql, p)

    def _load(self, result: dict):
        cols = result.get("cols", [])
        rows = result.get("rows", [])
        self.rowcount = result.get("affected_row_count", len(rows))
        self.lastrowid = result.get("last_insert_rowid") or None
        if self.lastrowid is not None:
            try: self.lastrowid = int(self.lastrowid)
            except: pass
        if cols:
            self.description = [
                (c["name"], None, None, None, None, None, None) for c in cols
            ]
            self._rows = [
                tuple(_from_cell(cell) for cell in row)
                for row in rows
            ]
        else:
            self.description = None
            self._rows = []

    def fetchone(self):
        if self._pos >= len(self._rows): return None
        r = self._rows[self._pos]; self._pos += 1; return r

    def fetchmany(self, size=None):
        size = size or self.arraysize
        r = self._rows[self._pos:self._pos+size]; self._pos += len(r); return r

    def fetchall(self):
        r = self._rows[self._pos:]; self._pos = len(self._rows); return r

    def close(self): pass
    def __iter__(self): return iter(self._rows[self._pos:])


class Connection:
    def __init__(self, url: str, auth_token: str):
        # Normalise: libsql:// → https://
        self._url = url.replace("libsql://", "https://").rstrip("/")
        self._token = auth_token
        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )

    def _send_one(self, sql: str, params=None) -> dict:
        """Send a single SQL statement via Turso pipeline API."""
        payload = {
            "requests": [
                {"type": "execute", "stmt": {"sql": sql, "args": _to_args(params)}},
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

    def _send_batch(self, stmts: list):
        """Send multiple statements as a batch (used for transactions)."""
        requests = [
            {"type": "execute", "stmt": {"sql": sql, "args": _to_args(params)}}
            for sql, params in stmts
        ]
        requests.append({"type": "close"})
        resp = self._client.post(f"{self._url}/v2/pipeline", json={"requests": requests})
        resp.raise_for_status()

    def cursor(self) -> Cursor:
        return Cursor(self)

    # SQLAlchemy calls begin/commit/rollback explicitly
    def begin(self): pass
    def commit(self): pass
    def rollback(self): pass
    def close(self): self._client.close()

    # SQLAlchemy pysqlite dialect calls these on the raw connection
    def create_function(self, name, nargs, func, **kwargs): pass
    def create_aggregate(self, name, nargs, aggregate_class): pass
    def set_authorizer(self, authorizer_callback): pass

    def __enter__(self): return self
    def __exit__(self, *a): self.close()


def connect(url: str, auth_token: str = "") -> Connection:
    return Connection(url, auth_token)
