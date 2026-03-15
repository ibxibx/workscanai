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
    source_text: Optional[str] = None   # raw voice transcript / doc text / manual notes
    input_mode: Optional[str] = None    # 'manual' | 'voice' | 'document'
    tasks: List[TaskCreate] = Field(default_factory=list)


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    source_text: Optional[str] = None
    input_mode: Optional[str] = None
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
    # F1 sub-scores
    score_repeatability: Optional[float] = None
    score_data_availability: Optional[float] = None
    score_error_tolerance: Optional[float] = None
    score_integration: Optional[float] = None
    time_saved_percentage: Optional[float]
    recommendation: Optional[str]
    difficulty: Optional[str]
    estimated_hours_saved: Optional[float]
    # F3 risk
    risk_level: Optional[str] = None
    risk_flag: Optional[str] = None
    # F9 agentification
    agent_phase: Optional[int] = None
    agent_label: Optional[str] = None
    agent_milestone: Optional[str] = None
    # F13 orchestration
    orchestration: Optional[str] = None
    
    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: int
    workflow_id: int
    workflow: Optional[WorkflowResponse] = None
    automation_score: float
    annual_savings: Optional[float]
    hours_saved: Optional[float]
    # F4 readiness
    readiness_score: Optional[float] = None
    readiness_data_quality: Optional[float] = None
    readiness_process_docs: Optional[float] = None
    readiness_tool_maturity: Optional[float] = None
    readiness_team_skills: Optional[float] = None
    created_at: datetime
    results: List[AnalysisResultResponse] = []
    
    class Config:
        from_attributes = True


class AnalyzeRequest(BaseModel):
    workflow_id: int
    hourly_rate: Optional[float] = 50.0  # Default $50/hour
    recaptcha_token: Optional[str] = None  # reCAPTCHA v3 token from frontend
