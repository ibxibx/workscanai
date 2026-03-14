# FastAPI main application

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.routes import workflows, extraction, reports
from mangum import Mangum

# Create database tables (graceful — don't crash if DB unreachable at boot)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create DB tables at startup: {e}")

app = FastAPI(title="WorkScanAI API", version="1.0.0")

# CORS settings

# Parse allowed origins from env var, fallback to localhost for dev
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

# Vercel serverless handler
handler = Mangum(app)