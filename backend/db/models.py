from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Float, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum

# Task status options
class StatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"

# Task priority options
class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    tasks = relationship("Task", back_populates="owner")

# Task model
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(String)
    status = Column(Enum(StatusEnum), default=StatusEnum.pending)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.medium)
    due_date = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="tasks")

# AI Insights model - stores AI analysis results for tasks
class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    insight_type = Column(String, nullable=False)  # "priority_suggestion", "due_date_prediction", "category_classification"
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    analysis_data = Column(JSON)  # Store detailed analysis results
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    task = relationship("Task")

# Task Predictions model - stores ML predictions for task completion
class TaskPrediction(Base):
    __tablename__ = "task_predictions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    predicted_completion_time = Column(Float)  # Hours
    predicted_priority = Column(Enum(PriorityEnum))
    prediction_confidence = Column(Float)  # 0.0 to 1.0
    model_version = Column(String, nullable=False)
    features_used = Column(JSON)  # Store feature vector used for prediction
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    task = relationship("Task")

# User Patterns model - stores user behavior patterns for personalization
class UserPattern(Base):
    __tablename__ = "user_patterns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pattern_type = Column(String, nullable=False)  # "productivity_peak", "task_preference", "completion_rate"
    pattern_data = Column(JSON, nullable=False)  # Store pattern analysis
    confidence_score = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    user = relationship("User")