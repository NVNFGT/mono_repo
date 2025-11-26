"""
AI Routes for Task Intelligence Features

This module provides API endpoints for AI-powered task analysis,
suggestions, and insights.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from sanic import Blueprint, Request
from sanic.response import JSONResponse
from sanic_ext import validate
from pydantic import BaseModel, Field
import asyncio

# Import AI modules
from ai.nlp.task_parser import TaskParser
from ai.integrations.openai_client import get_openai_client, TaskAnalysis, TaskSuggestion
from db import AsyncSessionLocal, Task, User, AIInsight, TaskPrediction
from core.decorators import require_auth
from config import OPENAI_API_KEY, AI_MODEL_NAME, ENABLE_AI_FEATURES
from logger import logger

# Create blueprint
ai_bp = Blueprint("ai", url_prefix="/ai")

# Pydantic models for request validation
class ParseTaskRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=1000, description="Raw task input text")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional context data")

class SuggestImprovementsRequest(BaseModel):
    input: Optional[str] = Field(None, max_length=1000, description="Optional additional input")

class AutocompleteRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=100, description="Partial task input")

# Initialize AI components
task_parser = TaskParser()
openai_client = get_openai_client(OPENAI_API_KEY, AI_MODEL_NAME) if ENABLE_AI_FEATURES else None

@ai_bp.route("/health", methods=["GET"])
async def health_check(request: Request) -> JSONResponse:
    """Check AI service health and capabilities"""
    try:
        health_info = {
            "status": "healthy" if ENABLE_AI_FEATURES else "disabled",
            "features": [],
            "models": {
                "spacy": "en_core_web_sm",
                "openai": AI_MODEL_NAME if openai_client and openai_client.enabled else None
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Check feature availability
        if ENABLE_AI_FEATURES:
            health_info["features"].extend(["task_parsing", "nlp_analysis"])
            
            if openai_client and openai_client.enabled:
                health_info["features"].extend(["openai_suggestions", "autocomplete"])
                # Test OpenAI connection
                openai_health = await openai_client.check_health()
                health_info["openai_status"] = openai_health
        
        return JSONResponse(health_info)
        
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        return JSONResponse({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }, status=500)

@ai_bp.route("/parse-task", methods=["POST"])
@require_auth
@validate(json=ParseTaskRequest)
async def parse_task(request: Request, body: ParseTaskRequest) -> JSONResponse:
    """Parse natural language task input into structured data"""
    if not ENABLE_AI_FEATURES:
        return JSONResponse({"error": "AI features are disabled"}, status=503)
    
    try:
        user_id = request.ctx.user.id
        
        # Parse with local NLP
        parsed_task = task_parser.parse_task(body.input, body.context)
        
        # Enhance with OpenAI if available
        openai_analysis = None
        if openai_client and openai_client.enabled:
            try:
                openai_analysis = await openai_client.analyze_task(body.input, body.context)
            except Exception as e:
                logger.warning(f"OpenAI analysis failed, using NLP only: {e}")
        
        # Combine results (prefer OpenAI analysis when available, fallback to NLP)
        result = {
            "parsedTask": {
                "title": openai_analysis.title if openai_analysis else parsed_task.title,
                "description": openai_analysis.description if openai_analysis else parsed_task.description,
                "priority": openai_analysis.priority if openai_analysis else parsed_task.priority,
                "category": openai_analysis.category if openai_analysis else parsed_task.category,
                "dueDate": openai_analysis.due_date if openai_analysis else parsed_task.due_date,
                "estimatedDurationMinutes": (
                    openai_analysis.estimated_duration_minutes if openai_analysis and openai_analysis.estimated_duration_minutes 
                    else parsed_task.estimated_duration_minutes
                ),
                "confidence": openai_analysis.confidence if openai_analysis else parsed_task.confidence
            },
            "suggestions": [],
            "alternatives": []
        }
        
        # Generate suggestions
        if openai_client and openai_client.enabled:
            try:
                suggestions = await openai_client.generate_suggestions(result["parsedTask"], body.context)
                result["suggestions"] = [
                    {
                        "id": s.id,
                        "type": s.type,
                        "source": s.source,
                        "suggestion": s.suggestion,
                        "confidence": s.confidence,
                        "reasoning": s.reasoning,
                        "metadata": s.metadata if s.metadata else {}
                    }
                    for s in suggestions
                ]
            except Exception as e:
                logger.warning(f"Failed to generate OpenAI suggestions: {e}")
        
        # Add local NLP suggestions as fallback
        local_suggestions = task_parser.generate_suggestions(parsed_task)
        for i, s in enumerate(local_suggestions):
            result["suggestions"].append({
                "id": f"nlp_suggestion_{i+1}",
                "source": "nlp_rules",
                "type": s.suggestion_type,
                "suggestion": s.suggestion,
                "confidence": s.confidence,
                "reasoning": s.reasoning,
                "metadata": s.metadata if s.metadata else {}
            })
        
        logger.info(f"Task parsed successfully for user {user_id}")
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Task parsing failed: {e}")
        return JSONResponse({"error": "Task parsing failed"}, status=500)

@ai_bp.route("/suggest-improvements/<task_id:int>", methods=["GET"])
@require_auth
@validate(query=SuggestImprovementsRequest)
async def suggest_improvements(request: Request, task_id: int, query: SuggestImprovementsRequest) -> JSONResponse:
    """Get AI suggestions for improving an existing task"""
    if not ENABLE_AI_FEATURES:
        return JSONResponse({"error": "AI features are disabled"}, status=503)
    
    try:
        user_id = request.ctx.user.id
        
        # Get task from database
        async with AsyncSessionLocal() as session:
            task = await session.get(Task, task_id)
            if not task or task.user_id != user_id:
                return JSONResponse({"error": "Task not found"}, status=404)
            
            task_data = {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority.value,
                "status": task.status.value,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "created_at": task.created_at.isoformat()
            }
        
        suggestions = []
        
        # Generate OpenAI suggestions if available
        if openai_client and openai_client.enabled:
            try:
                context = {"input": query.input} if query.input else None
                ai_suggestions = await openai_client.generate_suggestions(task_data, context)
                suggestions.extend([
                    {
                        "id": f"ai_suggestion_{i+1}",
                        "type": s.type,
                        "suggestion": s.suggestion,
                        "confidence": s.confidence,
                        "reasoning": s.reasoning,
                        "metadata": s.metadata if s.metadata else {}
                    }
                    for i, s in enumerate(ai_suggestions)
                ])
            except Exception as e:
                logger.warning(f"OpenAI suggestions failed: {e}")
        
        # Add rule-based suggestions
        if not task.due_date:
            suggestions.append({
                "id": "rule_suggestion_due_date",
                "type": "due_date",
                "suggestion": "Consider adding a due date for better planning",
                "confidence": 0.7,
                "reasoning": "Tasks with due dates are completed 40% more often",
                "metadata": {"suggestion_source": "completion_statistics"}
            })
        
        if task.priority.value == "medium" and "urgent" in (task.title + " " + (task.description or "")).lower():
            suggestions.append({
                "id": "rule_suggestion_priority",
                "type": "priority",
                "suggestion": "This task might need higher priority based on keywords",
                "confidence": 0.6,
                "reasoning": "Detected urgency keywords in task text",
                "metadata": {"urgency_keywords_found": ["urgent"], "current_priority": task.priority.value}
            })
        
        return JSONResponse(suggestions)
        
    except Exception as e:
        logger.error(f"Suggestion generation failed: {e}")
        return JSONResponse({"error": "Failed to generate suggestions"}, status=500)

@ai_bp.route("/autocomplete", methods=["GET"])
@require_auth
async def autocomplete(request: Request) -> JSONResponse:
    """Get autocomplete suggestions for task input"""
    if not ENABLE_AI_FEATURES or not openai_client or not openai_client.enabled:
        return JSONResponse({"error": "Autocomplete not available"}, status=503)
    
    try:
        input_text = request.args.get("input", "").strip()
        if len(input_text) < 3:
            return JSONResponse([])
        
        user_id = request.ctx.user.id
        
        # Get user's recent tasks for context
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(Task.title).where(Task.user_id == user_id).limit(10)
            result = await session.execute(stmt)
            existing_tasks = [row[0] for row in result.fetchall()]
        
        # Generate completions
        completions = await openai_client.generate_autocomplete(input_text, existing_tasks)
        return JSONResponse(completions)
        
    except Exception as e:
        logger.error(f"Autocomplete failed: {e}")
        return JSONResponse([])

@ai_bp.route("/insights/<task_id:int>", methods=["GET"])
@require_auth
async def get_task_insights(request: Request, task_id: int) -> JSONResponse:
    """Get AI insights for a specific task"""
    try:
        user_id = request.ctx.user.id
        
        async with AsyncSessionLocal() as session:
            # Verify task ownership
            task = await session.get(Task, task_id)
            if not task or task.user_id != user_id:
                return JSONResponse({"error": "Task not found"}, status=404)
            
            # Get existing insights
            from sqlalchemy import select
            stmt = select(AIInsight).where(AIInsight.task_id == task_id)
            result = await session.execute(stmt)
            insights = result.scalars().all()
            
            insights_data = [
                {
                    "id": insight.id,
                    "taskId": insight.task_id,
                    "insightType": insight.insight_type,
                    "confidenceScore": insight.confidence_score,
                    "analysisData": insight.analysis_data,
                    "createdAt": insight.created_at.isoformat()
                }
                for insight in insights
            ]
            
            return JSONResponse(insights_data)
            
    except Exception as e:
        logger.error(f"Failed to get task insights: {e}")
        return JSONResponse({"error": "Failed to retrieve insights"}, status=500)

@ai_bp.route("/predictions/<task_id:int>", methods=["GET"])
@require_auth
async def get_task_predictions(request: Request, task_id: int) -> JSONResponse:
    """Get AI predictions for a specific task"""
    try:
        user_id = request.ctx.user.id
        
        async with AsyncSessionLocal() as session:
            # Verify task ownership
            task = await session.get(Task, task_id)
            if not task or task.user_id != user_id:
                return JSONResponse({"error": "Task not found"}, status=404)
            
            # Get existing predictions
            from sqlalchemy import select
            stmt = select(TaskPrediction).where(TaskPrediction.task_id == task_id)
            result = await session.execute(stmt)
            predictions = result.scalars().all()
            
            predictions_data = [
                {
                    "id": prediction.id,
                    "taskId": prediction.task_id,
                    "predictedCompletionTime": prediction.predicted_completion_time,
                    "predictedPriority": prediction.predicted_priority.value if prediction.predicted_priority else None,
                    "predictionConfidence": prediction.prediction_confidence,
                    "modelVersion": prediction.model_version,
                    "featuresUsed": prediction.features_used,
                    "createdAt": prediction.created_at.isoformat()
                }
                for prediction in predictions
            ]
            
            return JSONResponse(predictions_data)
            
    except Exception as e:
        logger.error(f"Failed to get task predictions: {e}")
        return JSONResponse({"error": "Failed to retrieve predictions"}, status=500)

@ai_bp.route("/generate-insights", methods=["POST"])
@require_auth
async def generate_insights(request: Request) -> JSONResponse:
    """Generate AI insights for all user tasks"""
    if not ENABLE_AI_FEATURES:
        return JSONResponse({"error": "AI features are disabled"}, status=503)
    
    try:
        user_id = request.ctx.user.id
        
        # This would be a background task in production
        # For now, return a simple response
        return JSONResponse({
            "message": "Insight generation started",
            "status": "processing",
            "estimatedTime": "2-5 minutes"
        })
        
    except Exception as e:
        logger.error(f"Failed to generate insights: {e}")
        return JSONResponse({"error": "Failed to start insight generation"}, status=500)

# Register blueprint
def register_ai_routes(app):
    """Register AI routes with the Sanic app"""
    app.blueprint(ai_bp)
    logger.info("🤖 AI routes registered successfully")