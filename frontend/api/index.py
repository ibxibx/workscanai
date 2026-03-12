import sys
import os

# On Vercel, __file__ = /var/task/api/index.py
# backend/** is included via vercel.json includeFiles, so it lives at /var/task/backend/
this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(this_dir, '..'))
backend_dir = os.path.join(root_dir, 'backend')

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app.main import handler
