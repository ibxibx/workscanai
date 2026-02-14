# FastAPI main application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.routes import workflows, extraction, reports

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WorkScanAI API", version="1.0.0")

# CORS settings - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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