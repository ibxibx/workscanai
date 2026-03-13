import sys
import os

# On Vercel, __file__ = /var/task/api/index.py
# root_dir = /var/task (the frontend/ directory contents)
# The FastAPI app package is at /var/task/backend_app/
this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(this_dir, '..'))

# Add root_dir to sys.path so we can import backend_app
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend_app.main import handler
