"""
Minimal PEP 249-compatible DBAPI shim for Turso (libSQL HTTP API).
Uses httpx (sync) — no Rust compilation, no aiohttp conflicts.
SQLAlchemy uses this with the sqlite dialect so all ORM code stays identical.

Transaction model: we buffer all statements between BEGIN and COMMIT/ROLLBACK
and send them as a single atomic pipeline batch to Turso.
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
    """Convert Python parameter tuple/list to Turso typed-arg format.

    Turso /v2/pipeline expects:
      integers → {"type": "integer", "value": "123"}   (value as string)
      floats   → {"type": "float",   "value": 73.9}    (value as JSON number, NOT string)
      text     → {"type": "text",    "value": "hello"}
      null     → {"type": "null"}
    """
    if not params:
        return []
    def _val(v):
        if v is None:
            return {"type": "null"}
        # bool must come before int (bool is subclass of int)
        if isinstance(v, bool):
            return {"type": "integer", "value": str(int(v))}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        if isinstance(v, float):
            # Turso requires float value as a JSON number, not a string
            return {"type": "float", "value": float(v)}
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

        sql_stripped = sql.strip().upper()

        # SQLAlchemy issues these explicitly — absorb them into our tx state
        if sql_stripped in ("BEGIN", "BEGIN IMMEDIATE", "BEGIN DEFERRED"):
            self._conn._tx_begin()
            return self

        if sql_stripped == "COMMIT":
            result = self._conn._tx_commit()
            self._load(result or {})
            return self

        if sql_stripped == "ROLLBACK":
            self._conn._tx_rollback()
            return self

        # Regular statement — buffer or execute immediately
        result = self._conn._execute_or_buffer(sql, parameters)
        self._load(result or {})
        return self

    def executemany(self, sql: str, seq):
        for p in seq:
            self.execute(sql, p)

    def _load(self, result: dict):
        cols = result.get("cols", [])
        rows = result.get("rows", [])
        self.rowcount = result.get("affected_row_count", -1)
        lid = result.get("last_insert_rowid")
        self.lastrowid = int(lid) if lid is not None else None
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
        if self._pos >= len(self._rows):
            return None
        r = self._rows[self._pos]
        self._pos += 1
        return r

    def fetchmany(self, size=None):
        size = size or self.arraysize
        r = self._rows[self._pos:self._pos + size]
        self._pos += len(r)
        return r

    def fetchall(self):
        r = self._rows[self._pos:]
        self._pos = len(self._rows)
        return r

    def close(self): pass
    def __iter__(self): return iter(self._rows[self._pos:])


class Connection:
    def __init__(self, url: str, auth_token: str):
        self._url = url.replace("libsql://", "https://").rstrip("/")
        self._token = auth_token
        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        # Transaction buffer
        self._in_tx: bool = False
        self._tx_stmts: list = []   # list of (sql, params)
        # Result cache for last buffered write (for lastrowid)
        self._last_result: dict = {}

    # ── Transaction helpers ────────────────────────────────────────────────

    def _tx_begin(self):
        self._in_tx = True
        self._tx_stmts = []

    def _tx_commit(self) -> dict:
        """Flush all buffered statements as one atomic pipeline batch."""
        stmts = self._tx_stmts
        self._in_tx = False
        self._tx_stmts = []
        if not stmts:
            return {}
        return self._send_batch(stmts)

    def _tx_rollback(self):
        self._in_tx = False
        self._tx_stmts = []

    def _execute_or_buffer(self, sql: str, params=None) -> dict:
        """
        If inside a transaction, buffer the statement and return a placeholder.
        If outside, send immediately and return the result.
        SELECT statements are always sent immediately even inside a transaction
        (Turso pipeline reads see previous writes in the same pipeline).
        """
        sql_upper = sql.strip().upper()
        is_select = sql_upper.startswith("SELECT") or sql_upper.startswith("PRAGMA")

        if self._in_tx and not is_select:
            self._tx_stmts.append((sql, params))
            # Return a placeholder — real lastrowid comes from commit result
            return {}

        # Outside tx or SELECT — send immediately
        return self._send_one(sql, params)

    # ── HTTP helpers ────────────────────────────────────────────────────────

    def _send_one(self, sql: str, params=None) -> dict:
        """Send a single SQL statement via Turso pipeline API."""
        payload = {
            "requests": [
                {"type": "execute", "stmt": {"sql": sql, "args": _to_args(params)}},
                {"type": "close"},
            ]
        }
        resp = self._client.post(f"{self._url}/v2/pipeline", json=payload)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise OperationalError(f"Turso HTTP {resp.status_code}: {resp.text[:300]}") from e
        data = resp.json()
        r0 = data["results"][0]
        if r0["type"] == "error":
            raise OperationalError(r0.get("error", {}).get("message", "Turso error"))
        return r0.get("response", {}).get("result", {})

    def _send_batch(self, stmts: list) -> dict:
        """
        Send multiple statements as one atomic pipeline.
        Returns the result of the LAST statement (for lastrowid).
        """
        requests = []
        for sql, params in stmts:
            requests.append({
                "type": "execute",
                "stmt": {"sql": sql, "args": _to_args(params)}
            })
        requests.append({"type": "close"})

        payload = {"requests": requests}
        resp = self._client.post(f"{self._url}/v2/pipeline", json=payload)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise OperationalError(f"Turso batch HTTP {resp.status_code}: {resp.text[:300]}") from e

        data = resp.json()
        last_result = {}
        for i, res in enumerate(data.get("results", [])):
            if res.get("type") == "error":
                msg = res.get("error", {}).get("message", f"Turso batch error at stmt {i}")
                raise OperationalError(msg)
            if res.get("type") == "ok":
                last_result = res.get("response", {}).get("result", {})

        return last_result

    # ── SQLAlchemy interface ────────────────────────────────────────────────

    def cursor(self) -> Cursor:
        return Cursor(self)

    def begin(self):
        self._tx_begin()

    def commit(self):
        self._tx_commit()

    def rollback(self):
        self._tx_rollback()

    def close(self):
        self._client.close()

    # SQLAlchemy pysqlite dialect hooks
    def create_function(self, name, nargs, func, **kwargs): pass
    def create_aggregate(self, name, nargs, aggregate_class): pass
    def set_authorizer(self, authorizer_callback): pass

    def __enter__(self): return self
    def __exit__(self, *a): self.close()


def connect(url: str, auth_token: str = "") -> Connection:
    return Connection(url, auth_token)
