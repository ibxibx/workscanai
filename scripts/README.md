# scripts/ — developer convenience scripts

One-off helper scripts for local setup and dev workflows. None of these run in
production (Vercel/Render); they are for working on the project locally on Windows.

| Script | Purpose |
|--------|---------|
| `setup-backend.ps1` | Create the backend Python venv and install dependencies. |
| `install-backend-deps.bat` | Install backend Python dependencies (batch equivalent). |
| `install-deps.ps1` | Install all project dependencies (backend + frontend). |
| `quick-start.bat` | Start backend + frontend together for a quick local run. |
| `start-all.bat` | Launch the full local stack (backend + frontend). |
| `generate_report.py` | Generate a sample analysis report PDF locally. |

Backend-specific maintenance scripts (DB seeding, n8n backfills, category checks)
live in `backend/scripts/` instead.
