"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Task Schemas
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    frequency: Optional[str] = "daily"  # daily, weekly, monthly
    time_per_task: Optional[int] = None  # minutes
    category: Optional[str] = None  # data_entry, analysis, communication
    complexity: Optional[str] = "medium"  # low, medium, high


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
    tasks: List[TaskCreate] = Field(..., min_items=1)


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    tasks: List[TaskResponse] = []
    
    class Config:
        from_attributes = True


# Analysis Schemas
class AnalysisResultResponse(BaseModel):
    task_id: int
    task_name: str
    ai_readiness_score: float
    time_saved_percentage: Optional[float]
    recommendation: Optional[str]
    difficulty: Optional[str]
    estimated_hours_saved: Optional[float]


class AnalysisResponse(BaseModel):
    id: int
    workflow_id: int
    automation_score: float
    annual_savings: Optional[float]
    hours_saved: Optional[float]
    created_at: datetime
    results: List[AnalysisResultResponse] = []
    
    class Config:
        from_attributes = True
