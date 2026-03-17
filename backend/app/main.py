# FastAPI main application

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.routes import workflows, extraction, reports, auth
from mangum import Mangum
from sqlalchemy import text

# Create database tables (graceful — don't crash if DB unreachable at boot)
try:
    Base.metadata.create_all(bind=engine)
    # Safe migrations: add new columns if not present
    with engine.connect() as conn:
        for ddl in [
            "ALTER TABLE magic_tokens ADD COLUMN otp_code VARCHAR(6)",
            "ALTER TABLE analysis_results ADD COLUMN agent_phase INTEGER",
            "ALTER TABLE analysis_results ADD COLUMN agent_label VARCHAR(100)",
            "ALTER TABLE analysis_results ADD COLUMN agent_milestone TEXT",
            "ALTER TABLE analysis_results ADD COLUMN orchestration TEXT",
            "ALTER TABLE workflows ADD COLUMN share_code VARCHAR(16)",
            "ALTER TABLE workflows ADD COLUMN user_email VARCHAR(255)",
            # older columns that may be missing from pre-migration DBs
            "ALTER TABLE workflows ADD COLUMN source_text TEXT",
            "ALTER TABLE workflows ADD COLUMN input_mode VARCHAR(50)",
            "ALTER TABLE workflows ADD COLUMN analysis_context VARCHAR(50)",
            "ALTER TABLE workflows ADD COLUMN team_size VARCHAR(50)",
            "ALTER TABLE workflows ADD COLUMN industry VARCHAR(100)",
            "ALTER TABLE analysis_results ADD COLUMN score_repeatability REAL",
            "ALTER TABLE analysis_results ADD COLUMN score_data_availability REAL",
            "ALTER TABLE analysis_results ADD COLUMN score_error_tolerance REAL",
            "ALTER TABLE analysis_results ADD COLUMN score_integration REAL",
            "ALTER TABLE analysis_results ADD COLUMN risk_level VARCHAR(20)",
            "ALTER TABLE analysis_results ADD COLUMN risk_flag TEXT",
            "ALTER TABLE analysis_results ADD COLUMN countdown_window VARCHAR(20)",
            "ALTER TABLE analysis_results ADD COLUMN human_edge_score REAL",
            "ALTER TABLE analysis_results ADD COLUMN pivot_skills TEXT",
            "ALTER TABLE analysis_results ADD COLUMN pivot_roles TEXT",
            "ALTER TABLE analyses ADD COLUMN readiness_score REAL",
            "ALTER TABLE analyses ADD COLUMN readiness_data_quality REAL",
            "ALTER TABLE analyses ADD COLUMN readiness_process_docs REAL",
            "ALTER TABLE analyses ADD COLUMN readiness_tool_maturity REAL",
            "ALTER TABLE analyses ADD COLUMN readiness_team_skills REAL",
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                pass  # column already exists
        # Backfill share_code for existing rows that have none
        try:
            from app.models.workflow import Workflow as _WF, _gen_share_code
            with engine.connect() as _conn:
                from sqlalchemy import text as _t
                rows = _conn.execute(_t("SELECT id FROM workflows WHERE share_code IS NULL")).fetchall()
                for row in rows:
                    code = _gen_share_code()
                    _conn.execute(_t("UPDATE workflows SET share_code=:c WHERE id=:i"), {"c": code, "i": row[0]})
                _conn.commit()
        except Exception as _e:
            print(f"Warning: share_code backfill failed: {_e}")
except Exception as e:
    print(f"Warning: Could not create DB tables at startup: {e}")

app = FastAPI(title="WorkScanAI API", version="1.0.0")

# CORS settings
_cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
_cors_origins = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "WorkScanAI API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers
app.include_router(workflows.router, prefix="/api", tags=["workflows"])
app.include_router(extraction.router, prefix="/api", tags=["extraction"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(auth.router, prefix="/api", tags=["auth"])

# Vercel serverless handler
handler = Mangum(app, lifespan="off")
