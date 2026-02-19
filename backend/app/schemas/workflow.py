from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Task Schemas
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    frequency: Optional[str] = None  # daily, weekly, monthly
    time_per_task: Optional[int] = None  # minutes
    category: Optional[str] = None
    complexity: Optional[str] = None  # low, medium, high


class TaskResponse(TaskCreate):
    id: int
    workflow_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Workflow Schemas
class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tasks: List[TaskCreate] = Field(default_factory=list)


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    tasks: List[TaskResponse] = []
    
    class Config:
        from_attributes = True


# Analysis Schemas
class AnalysisResultResponse(BaseModel):
    id: int
    task_id: int
    ai_readiness_score: float
    time_saved_percentage: Optional[float]
    recommendation: Optional[str]
    difficulty: Optional[str]
    estimated_hours_saved: Optional[float]
    
    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: int
    workflow_id: int
    workflow: Optional[WorkflowResponse] = None
    automation_score: float
    annual_savings: Optional[float]
    hours_saved: Optional[float]
    created_at: datetime
    results: List[AnalysisResultResponse] = []
    
    class Config:
        from_attributes = True


class AnalyzeRequest(BaseModel):
    workflow_id: int
    hourly_rate: Optional[float] = 50.0  # Default $50/hour
    recaptcha_token: Optional[str] = None  # reCAPTCHA v3 token from frontend
