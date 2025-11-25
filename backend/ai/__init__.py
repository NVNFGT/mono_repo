"""
AI Module for Multiuser Todo App

This module provides AI-powered features including:
- Natural Language Processing for task parsing
- Machine Learning for priority prediction and insights
- Integration with external AI services (OpenAI, etc.)
"""

from .nlp.task_parser import TaskParser
from .integrations.openai_client import OpenAIClient

__version__ = "1.0.0"
__all__ = ["TaskParser", "OpenAIClient"]