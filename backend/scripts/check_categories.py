import sys; sys.stdout.reconfigure(encoding='utf-8')
from app.core.turso_dbapi import connect as turso_connect
from app.core.config import settings

conn = turso_connect(settings.TURSO_DATABASE_URL, settings.TURSO_AUTH_TOKEN)
cur = conn.cursor()

cur.execute('SELECT category, COUNT(*) as cnt FROM tasks GROUP BY category ORDER BY cnt DESC')
print('Task categories in DB:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print()
cur.execute("SELECT name FROM workflows WHERE input_mode='job_scan' ORDER BY id DESC LIMIT 30")
print('Recent job scans:')
for row in cur.fetchall():
    print(f'  {row[0]}')
conn.close()
