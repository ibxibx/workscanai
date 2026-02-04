# FastAPI main application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.routes import workflows

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WorkScanAI API", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
