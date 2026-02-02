# SQLAlchemy database models

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
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
    automation_score = Column(Float, nullable=False)  # 0-100
    annual_savings = Column(Float, nullable=True)  # USD
    hours_saved = Column(Float, nullable=True)  # hours per year
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="analysis")
    results = relationship("AnalysisResult", back_populates="analysis", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    ai_readiness_score = Column(Float, nullable=False)  # 0-100
    time_saved_percentage = Column(Float, nullable=True)  # 0-100
    recommendation = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=True)  # easy, medium, hard
    estimated_hours_saved = Column(Float, nullable=True)
    
    # Relationships
    analysis = relationship("Analysis", back_populates="results")
    task = relationship("Task", back_populates="analysis_result")
