import sys
import os

# On Vercel, repo root = /var/task
# Root dir = /var/task, so frontend/ = /var/task/frontend/
# app/ package lives at /var/task/frontend/app/
this_dir = os.path.dirname(os.path.abspath(__file__))   # /var/task/api
root_dir = os.path.normpath(os.path.join(this_dir, '..'))  # /var/task
frontend_dir = os.path.join(root_dir, 'frontend')          # /var/task/frontend

for path in [frontend_dir, root_dir]:
    if os.path.isdir(os.path.join(path, 'app')) and path not in sys.path:
        sys.path.insert(0, path)
        break

from app.main import handler
