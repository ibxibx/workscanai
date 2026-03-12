import sys
import os

# On Vercel, __file__ = /var/task/api/index.py
# The 'app' package is at /var/task/app/ (copied from backend/app during build)
this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(this_dir, '..'))

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.main import handler
