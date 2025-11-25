"""
OpenAI Client for Task Intelligence

This module provides integration with OpenAI's GPT models for advanced
task analysis, intent parsing, and intelligent suggestions.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import openai
from openai import AsyncOpenAI
from dataclasses import dataclass, asdict

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class TaskAnalysis:
    """Result of OpenAI task analysis"""
    title: str
    description: Optional[str]
    priority: str  # low, medium, high
    category: Optional[str]
    estimated_duration: Optional[int]  # minutes
    due_date_suggestion: Optional[str]
    confidence: float
    reasoning: str

@dataclass
class TaskSuggestion:
    """AI-generated task improvement suggestion"""
    type: str  # priority, due_date, description, category, breakdown
    suggestion: str
    confidence: float
    reasoning: str
    action_required: bool = False

class OpenAIClient:
    """Async OpenAI client for task intelligence features"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", timeout: int = 30):
        """
        Initialize OpenAI client
        
        Args:
            api_key: OpenAI API key
            model: GPT model to use
            timeout: Request timeout in seconds
        """
        if not api_key or api_key == "your-openai-api-key-here":
            logger.warning("OpenAI API key not configured - AI features will be limited")
            self.client = None
            self.enabled = False
        else:
            self.client = AsyncOpenAI(api_key=api_key, timeout=timeout)
            self.enabled = True
            
        self.model = model
        self.timeout = timeout
        
        # System prompts for different tasks
        self.task_parsing_prompt = """
You are an expert task analysis assistant. Analyze the user's input and extract structured task information.

Parse the following task description and return a JSON response with these fields:
- title: Clean, actionable task title (required)
- description: Detailed description if provided or inferred (optional)
- priority: low, medium, or high based on urgency/importance (required)
- category: work, personal, shopping, finance, learning, social, or null (optional)
- estimated_duration: estimated time to complete in minutes (optional)
- due_date_suggestion: suggested due date in natural language if relevant (optional)
- confidence: confidence score 0.0-1.0 for the analysis (required)
- reasoning: brief explanation of your analysis (required)

Be practical and actionable. If information is unclear, make reasonable assumptions but reflect uncertainty in the confidence score.
"""

        self.suggestion_prompt = """
You are a productivity expert providing task improvement suggestions.

Analyze the given task and provide up to 3 suggestions for improvement. Return a JSON array with suggestions containing:
- type: priority, due_date, description, category, or breakdown
- suggestion: specific actionable suggestion
- confidence: confidence score 0.0-1.0
- reasoning: brief explanation
- action_required: true if user action is needed, false for informational

Focus on practical improvements that will help the user be more productive and organized.
"""
    
    async def analyze_task(self, input_text: str, context: Optional[Dict[str, Any]] = None) -> Optional[TaskAnalysis]:
        """
        Analyze task input using OpenAI GPT
        
        Args:
            input_text: Raw task description from user
            context: Optional context (user preferences, existing tasks, etc.)
            
        Returns:
            TaskAnalysis object or None if analysis fails
        """
        if not self.enabled:
            logger.warning("OpenAI client not enabled - falling back to basic analysis")
            return self._fallback_analysis(input_text)
        
        try:
            # Prepare the prompt with context
            user_prompt = f"Task to analyze: \"{input_text}\""
            if context:
                user_prompt += f"\nContext: {json.dumps(context, default=str)}"
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.task_parsing_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent parsing
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            result = json.loads(response.choices[0].message.content)
            
            return TaskAnalysis(
                title=result.get("title", input_text[:100]),
                description=result.get("description"),
                priority=result.get("priority", "medium"),
                category=result.get("category"),
                estimated_duration=result.get("estimated_duration"),
                due_date_suggestion=result.get("due_date_suggestion"),
                confidence=float(result.get("confidence", 0.5)),
                reasoning=result.get("reasoning", "AI analysis completed")
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI JSON response: {e}")
            return self._fallback_analysis(input_text)
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._fallback_analysis(input_text)
    
    async def generate_suggestions(self, task_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> List[TaskSuggestion]:
        """
        Generate improvement suggestions for a task
        
        Args:
            task_data: Current task information
            context: Optional context for personalized suggestions
            
        Returns:
            List of TaskSuggestion objects
        """
        if not self.enabled:
            return self._fallback_suggestions(task_data)
        
        try:
            # Prepare the prompt
            user_prompt = f"Task to improve: {json.dumps(task_data, default=str)}"
            if context:
                user_prompt += f"\nContext: {json.dumps(context, default=str)}"
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.suggestion_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,  # Higher temperature for creative suggestions
                max_tokens=600,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            result = json.loads(response.choices[0].message.content)
            suggestions_data = result.get("suggestions", [])
            
            return [
                TaskSuggestion(
                    type=s.get("type", "general"),
                    suggestion=s.get("suggestion", ""),
                    confidence=float(s.get("confidence", 0.5)),
                    reasoning=s.get("reasoning", ""),
                    action_required=bool(s.get("action_required", False))
                )
                for s in suggestions_data
                if s.get("suggestion")  # Only include suggestions with content
            ]
            
        except Exception as e:
            logger.error(f"Failed to generate suggestions: {e}")
            return self._fallback_suggestions(task_data)
    
    async def generate_autocomplete(self, partial_input: str, existing_tasks: Optional[List[str]] = None) -> List[str]:
        """
        Generate autocomplete suggestions for task input
        
        Args:
            partial_input: Partial task text user has typed
            existing_tasks: List of existing task titles for context
            
        Returns:
            List of completion suggestions
        """
        if not self.enabled or len(partial_input.strip()) < 3:
            return []
        
        try:
            context = ""
            if existing_tasks:
                context = f"Existing tasks: {existing_tasks[:5]}"  # Limit context
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a task completion assistant. Provide 3-5 natural, actionable task completions based on the partial input. Return only a JSON array of strings."
                    },
                    {
                        "role": "user", 
                        "content": f"Partial task: \"{partial_input}\"\n{context}\nComplete this task naturally:"
                    }
                ],
                temperature=0.8,
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            completions = result.get("completions", [])
            
            # Filter and clean completions
            filtered = []
            for completion in completions[:5]:  # Limit to 5 suggestions
                if isinstance(completion, str) and len(completion.strip()) > len(partial_input):
                    filtered.append(completion.strip())
            
            return filtered
            
        except Exception as e:
            logger.error(f"Autocomplete generation failed: {e}")
            return []
    
    async def check_health(self) -> Dict[str, Any]:
        """Check OpenAI API health and capabilities"""
        if not self.enabled:
            return {
                "status": "disabled",
                "model": self.model,
                "features": [],
                "error": "API key not configured"
            }
        
        try:
            # Test with a simple request
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Test connection"}],
                max_tokens=10
            )
            
            return {
                "status": "healthy",
                "model": self.model,
                "features": ["task_parsing", "suggestions", "autocomplete"],
                "response_time": "normal"
            }
            
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return {
                "status": "error",
                "model": self.model,
                "features": [],
                "error": str(e)
            }
    
    def _fallback_analysis(self, input_text: str) -> TaskAnalysis:
        """Fallback analysis when OpenAI is not available"""
        # Simple rule-based analysis
        priority = "high" if any(word in input_text.lower() for word in ["urgent", "asap", "immediately"]) else "medium"
        
        return TaskAnalysis(
            title=input_text[:100],
            description=input_text if len(input_text) > 50 else None,
            priority=priority,
            category=None,
            estimated_duration=None,
            due_date_suggestion=None,
            confidence=0.3,  # Low confidence for fallback
            reasoning="Fallback analysis - OpenAI not available"
        )
    
    def _fallback_suggestions(self, task_data: Dict[str, Any]) -> List[TaskSuggestion]:
        """Fallback suggestions when OpenAI is not available"""
        suggestions = []
        
        title = task_data.get("title", "")
        if len(title) < 10:
            suggestions.append(TaskSuggestion(
                type="description",
                suggestion="Consider adding more details to your task description",
                confidence=0.7,
                reasoning="Task title is quite brief",
                action_required=True
            ))
        
        if not task_data.get("due_date"):
            suggestions.append(TaskSuggestion(
                type="due_date",
                suggestion="Adding a due date can help with planning and prioritization",
                confidence=0.6,
                reasoning="No due date specified",
                action_required=False
            ))
        
        return suggestions

# Global client instance
_openai_client: Optional[OpenAIClient] = None

def get_openai_client(api_key: str, model: str = "gpt-4o-mini") -> OpenAIClient:
    """Get or create global OpenAI client instance"""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAIClient(api_key, model)
    return _openai_client