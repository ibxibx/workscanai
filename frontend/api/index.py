import sys
import os

# On Vercel, __file__ = /var/task/api/index.py
# backend is copied to /var/task/backend_bundle/ by the build command in vercel.json
this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(this_dir, '..'))

# Try backend_bundle (Vercel production) first, then backend (local dev fallback)
for subdir in ['backend_bundle', 'backend', '']:
    candidate = os.path.join(root_dir, subdir) if subdir else root_dir
    if os.path.isdir(os.path.join(candidate, 'app')):
        if candidate not in sys.path:
            sys.path.insert(0, candidate)
        break

from app.main import handler
