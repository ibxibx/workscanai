# SQLAlchemy database models

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workflows = relationship("Workflow", back_populates="user")


class MagicToken(Base):
    __tablename__ = "magic_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    otp_code = Column(String(4), nullable=True)          # 4-digit inline code
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_text = Column(Text, nullable=True)
    input_mode = Column(String(50), nullable=True)
    analysis_context = Column(String(50), nullable=True)   # 'individual' | 'team' | 'company'
    team_size = Column(String(50), nullable=True)
    industry = Column(String(100), nullable=True)
    user_email = Column(String(255), ForeignKey("users.email"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="workflows")
    tasks = relationship("Task", back_populates="workflow", cascade="all, delete-orphan")
    analysis = relationship("Analysis", back_populates="workflow", uselist=False)


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(String(50), nullable=True)  # daily, weekly, monthly
    time_per_task = Column(Integer, nullable=True)  # minutes
    category = Column(String(100), nullable=True)  # data_entry, analysis, communication
    complexity = Column(String(50), nullable=True)  # low, medium, high
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="tasks")
    analysis_result = relationship("AnalysisResult", back_populates="task", uselist=False)


class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False, unique=True)
    automation_score = Column(Float, nullable=False)   # 0-100 avg task score
    annual_savings = Column(Float, nullable=True)
    hours_saved = Column(Float, nullable=True)
    # F4 — company AI readiness (derived from sub-scores)
    readiness_score = Column(Float, nullable=True)          # 0-100 overall
    readiness_data_quality = Column(Float, nullable=True)
    readiness_process_docs = Column(Float, nullable=True)
    readiness_tool_maturity = Column(Float, nullable=True)
    readiness_team_skills = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    workflow = relationship("Workflow", back_populates="analysis")
    results = relationship("AnalysisResult", back_populates="analysis", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    ai_readiness_score = Column(Float, nullable=False)  # 0-100 composite
    # F1 — sub-scores
    score_repeatability = Column(Float, nullable=True)      # how rule-based/repetitive
    score_data_availability = Column(Float, nullable=True)  # data structured & accessible
    score_error_tolerance = Column(Float, nullable=True)    # cost of AI mistakes
    score_integration = Column(Float, nullable=True)        # ease of tool integration
    time_saved_percentage = Column(Float, nullable=True)
    # F2 — enriched recommendation
    recommendation = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=True)
    estimated_hours_saved = Column(Float, nullable=True)
    # F3 — risk & compliance
    risk_level = Column(String(20), nullable=True)
    risk_flag = Column(Text, nullable=True)
    # F9 — agentification roadmap
    agent_phase = Column(Integer, nullable=True)        # 1/2/3
    agent_label = Column(String(100), nullable=True)
    agent_milestone = Column(Text, nullable=True)
    # F13 — multi-agent orchestration
    orchestration = Column(Text, nullable=True)
    # New context-aware fields
    countdown_window = Column(String(20), nullable=True)    # 'now'|'12-24'|'24-48'|'48+'
    human_edge_score = Column(Float, nullable=True)         # 0-100 irreplaceability
    pivot_skills = Column(Text, nullable=True)              # JSON skills to develop
    pivot_roles = Column(Text, nullable=True)               # JSON adjacent roles
    
    # Relationships
    analysis = relationship("Analysis", back_populates="results")
    task = relationship("Task", back_populates="analysis_result")
