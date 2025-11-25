"""
Natural Language Processing module for task analysis and parsing.

This module provides:
- Task intent recognition
- Priority extraction from natural language
- Due date parsing
- Context analysis
"""

from .task_parser import TaskParser

__all__ = ["TaskParser"]