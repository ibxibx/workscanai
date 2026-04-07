import sys, os, asyncio
sys.path.insert(0, '.')

from app.services.turso_dbapi import connect
import datetime

db = connect()
result = db.execute("SELECT ip_address, request_count, window_start, last_request FROM rate_limits ORDER BY last_request DESC LIMIT 20")
rows = result.fetchall()
cols = [d[0] for d in result.description]
print("Rate limit table:")
for row in rows:
    print(dict(zip(cols, row)))

result2 = db.execute("SELECT COUNT(*) as cnt FROM workflows WHERE created_at > datetime('now', '-1 day')")
row2 = result2.fetchone()
print(f"Workflows in last 24h: {row2[0]}")

result3 = db.execute("SELECT id, name, input_mode, created_at FROM workflows ORDER BY id DESC LIMIT 10")
rows3 = result3.fetchall()
cols3 = [d[0] for d in result3.description]
print("Recent workflows:")
for row in rows3:
    print(dict(zip(cols3, row)))
