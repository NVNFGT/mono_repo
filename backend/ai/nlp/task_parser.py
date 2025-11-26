"""
Task Parser - Natural Language Processing for Task Analysis

This module provides comprehensive NLP capabilities for parsing and analyzing
task descriptions, extracting meaningful information like priorities, due dates,
and categories from natural language input.
"""

import re
import spacy
import nltk
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dateutil import parser as date_parser
from dataclasses import dataclass
import logging

# Import our date parser
try:
    from ...utils.date_parser import DateParser
except ImportError:
    from utils.date_parser import DateParser

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ParsedTask:
    """Represents a parsed task with extracted information"""
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    due_date: Optional[Dict[str, Any]] = None  # structured date object
    category: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None  # estimated duration in minutes
    confidence: float = 0.0
    raw_input: str = ""

@dataclass
class TaskSuggestion:
    """Represents an AI suggestion for task improvement"""
    suggestion_type: str  # priority_clarification, description_improve, breakdown, due_date_add, reminder, delegation
    suggestion: str
    confidence: float
    reasoning: str
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        """Ensure metadata is never None"""
        if self.metadata is None:
            self.metadata = {}

class TaskParser:
    """Advanced NLP task parser using spaCy and rule-based extraction"""
    
    def __init__(self, spacy_model: str = "en_core_web_sm"):
        """Initialize the TaskParser with spaCy model"""
        try:
            self.nlp = spacy.load(spacy_model)
            logger.info(f"Loaded spaCy model: {spacy_model}")
        except OSError:
            logger.warning(f"SpaCy model '{spacy_model}' not found. Install with: python -m spacy download {spacy_model}")
            # Use basic English model as fallback
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.error("No spaCy model available. Please install en_core_web_sm")
                raise
        
        # Initialize NLTK components
        self._init_nltk()
        
        # Initialize date parser
        self.date_parser = DateParser()
        
        # Priority keywords mapping
        self.priority_keywords = {
            "high": ["urgent", "asap", "immediately", "critical", "emergency", "high priority", "important"],
            "medium": ["soon", "medium priority", "moderate", "normal"],
            "low": ["someday", "eventually", "low priority", "when possible", "nice to have"]
        }
        
        # Category keywords
        self.category_keywords = {
            "work": ["work", "office", "meeting", "project", "client", "business", "professional"],
            "personal": ["personal", "home", "family", "self", "health", "exercise"],
            "shopping": ["buy", "purchase", "shop", "get", "pick up", "order"],
            "finance": ["pay", "bill", "invoice", "money", "bank", "budget", "expense"],
            "learning": ["learn", "study", "course", "tutorial", "practice", "research"],
            "social": ["call", "email", "text", "message", "contact", "friend", "social"]
        }
        
        # Time extraction patterns
        self.time_patterns = [
            r'(?:by|due|before|until)\s+(\w+day|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)',
            r'(?:in)\s+(\d+)\s+(days?|weeks?|months?)',
            r'(?:next)\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)',
            r'(?:tomorrow|today)',
            r'\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?',
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}',
        ]
    
    def _init_nltk(self):
        """Initialize required NLTK data"""
        try:
            # Download required NLTK data if not present
            import ssl
            try:
                _create_unverified_https_context = ssl._create_unverified_context
            except AttributeError:
                pass
            else:
                ssl._create_default_https_context = _create_unverified_https_context
            
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            nltk.download('wordnet', quiet=True)
            logger.info("NLTK data initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize NLTK data: {e}")
    
    def parse_task(self, input_text: str, context: Optional[Dict[str, Any]] = None) -> ParsedTask:
        """
        Parse natural language input into structured task information
        
        Args:
            input_text: Raw task description from user
            context: Optional context with user preferences and existing tasks
            
        Returns:
            ParsedTask with extracted information
        """
        if not input_text or not input_text.strip():
            return ParsedTask(title="", confidence=0.0, raw_input=input_text)
        
        input_text = input_text.strip()
        
        # Process with spaCy
        doc = self.nlp(input_text)
        
        # Extract components
        title = self._extract_title(input_text, doc)
        description = self._extract_description(input_text, doc)
        priority = self._extract_priority(input_text, doc)
        due_date = self._extract_due_date(input_text, doc, context)
        category = self._extract_category(input_text, doc)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(input_text, doc, {
            'title': title,
            'priority': priority,
            'due_date': due_date,
            'category': category
        })
        
        # Create initial parsed task
        parsed_task = ParsedTask(
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            category=category,
            confidence=confidence,
            raw_input=input_text
        )
        
        # Estimate duration
        parsed_task.estimated_duration_minutes = self.estimate_duration_minutes(parsed_task)
        
        return parsed_task
    
    def _extract_title(self, text: str, doc) -> str:
        """Extract the main task title from input"""
        # Remove time and priority indicators to get clean title
        clean_text = text
        
        # Remove common prefixes
        prefixes = [r'^(?:task|todo|need to|have to|must|should|remember to)\s+', 
                   r'^(?:i need to|i have to|i must|i should)\s+']
        for prefix in prefixes:
            clean_text = re.sub(prefix, '', clean_text, flags=re.IGNORECASE)
        
        # Remove priority indicators
        for priority_list in self.priority_keywords.values():
            for keyword in priority_list:
                clean_text = re.sub(rf'\\b{re.escape(keyword)}\\b', '', clean_text, flags=re.IGNORECASE)
        
        # Remove time expressions
        for pattern in self.time_patterns:
            clean_text = re.sub(pattern, '', clean_text, flags=re.IGNORECASE)
        
        # Clean up whitespace
        clean_text = ' '.join(clean_text.split())
        
        return clean_text[:100] if clean_text else text[:100]  # Limit title length
    
    def _extract_description(self, text: str, doc) -> Optional[str]:
        """Extract additional description if the input is long enough"""
        if len(text) > 100:
            # For longer inputs, use the full text as description
            return text
        return None
    
    def _extract_priority(self, text: str, doc) -> str:
        """Extract priority level from text"""
        text_lower = text.lower()
        
        # Check for explicit priority keywords
        for priority, keywords in self.priority_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return priority
        
        # Analyze urgency indicators
        urgency_indicators = ['!', 'urgent', 'asap', 'now', 'immediately']
        if any(indicator in text_lower for indicator in urgency_indicators):
            return "high"
        
        # Note: Due date proximity check moved to avoid circular dependency
        # This could be enhanced later by checking context for existing parsed due_date
        
        return "medium"  # Default priority
    
    def _extract_due_date(self, text: str, doc, context: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """Extract due date from text using DateParser and return structured format"""
        
        # Extract date expressions from text
        date_expressions = []
        
        # First, try spaCy's built-in date detection
        for ent in doc.ents:
            if ent.label_ in ["DATE", "TIME"]:
                date_expressions.append(ent.text)
        
        # Try pattern-based extraction
        for pattern in self.time_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = ' '.join(match)
                date_expressions.append(match)
        
        # Check for common date words
        date_words = ['tomorrow', 'today', 'tonight', 'next week', 'next month', 'friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
        for word in date_words:
            if word in text.lower():
                date_expressions.append(word)
        
        # Use DateParser to parse the best candidate
        best_result = None
        best_confidence = 0.0
        
        for expression in date_expressions:
            result = self.date_parser.parse_date(expression, context)
            if result['confidence'] > best_confidence and result['parsed']:
                best_result = result
                best_confidence = result['confidence']
        
        return best_result
    
    def _extract_category(self, text: str, doc) -> Optional[str]:
        """Extract task category based on keywords and context"""
        text_lower = text.lower()
        
        # Score each category
        category_scores = {}
        for category, keywords in self.category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                category_scores[category] = score
        
        # Return the highest scoring category
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
        return None
    
    def _calculate_confidence(self, text: str, doc, extracted_info: Dict) -> float:
        """Calculate confidence score for the parsing results"""
        confidence_factors = []
        
        # Text length factor (longer text usually means more information)
        length_factor = min(len(text) / 50, 1.0)  # Normalize to 0-1
        confidence_factors.append(length_factor * 0.2)
        
        # Entity recognition factor
        entities = len([ent for ent in doc.ents if ent.label_ in ["DATE", "TIME", "PERSON", "ORG"]])
        entity_factor = min(entities / 3, 1.0)  # Normalize to 0-1
        confidence_factors.append(entity_factor * 0.3)
        
        # Keyword match factor
        total_keywords = sum(len(keywords) for keywords in self.priority_keywords.values())
        matched_keywords = sum(1 for keywords in self.priority_keywords.values() 
                             for keyword in keywords if keyword in text.lower())
        keyword_factor = matched_keywords / max(total_keywords, 1)
        confidence_factors.append(keyword_factor * 0.3)
        
        # Structure factor (presence of verbs, proper sentence structure)
        verbs = [token for token in doc if token.pos_ == "VERB"]
        structure_factor = min(len(verbs) / 2, 1.0)
        confidence_factors.append(structure_factor * 0.2)
        
        return min(sum(confidence_factors), 1.0)
    
    def estimate_duration_minutes(self, parsed_task: ParsedTask) -> Optional[int]:
        """
        Estimate task duration in minutes based on complexity indicators
        """
        title = parsed_task.title.lower() if parsed_task.title else ""
        description = parsed_task.description.lower() if parsed_task.description else ""
        full_text = f"{title} {description}".strip()
        
        # Base duration by task length and complexity
        word_count = len(full_text.split())
        
        # Duration keywords and their typical times (in minutes) - updated for realism
        duration_indicators = {
            'quick': 30, 'brief': 45, 'short': 60,
            'meeting': 60, 'call': 45, 'email': 20,
            'research': 180, 'analyze': 120, 'study': 240,
            'write': 90, 'create': 120, 'design': 180,
            'review': 45, 'check': 30, 'update': 45,
            'plan': 75, 'organize': 90, 'setup': 75,
            'install': 60, 'configure': 90, 'implement': 240,
            'project': 480, 'presentation': 150, 'report': 240
        }
        
        # Find duration clues
        estimated_duration = None
        for keyword, minutes in duration_indicators.items():
            if keyword in full_text:
                if estimated_duration is None:
                    estimated_duration = minutes
                else:
                    # Take average if multiple indicators
                    estimated_duration = (estimated_duration + minutes) // 2
        
        # Adjust based on priority and complexity
        if estimated_duration:
            if parsed_task.priority == "high":
                estimated_duration = int(estimated_duration * 1.2)  # High priority tasks often take longer
            elif parsed_task.priority == "low":
                estimated_duration = int(estimated_duration * 0.8)  # Low priority might be simpler
            
            # Adjust for task description length
            if word_count > 20:
                estimated_duration = int(estimated_duration * 1.3)  # Complex descriptions suggest longer tasks
            elif word_count < 5:
                estimated_duration = max(30, int(estimated_duration * 0.8))  # Very short tasks - minimum 30 minutes
        
        else:
            # Fallback estimation based on word count and priority - more realistic estimates
            if word_count < 5:
                estimated_duration = 45  # Very simple task (was 15)
            elif word_count < 10:
                estimated_duration = 60  # Simple task (was 30)
            elif word_count < 20:
                estimated_duration = 90  # Medium complexity (was 60)
            else:
                estimated_duration = 150  # Complex task (was 120)
                
            # Adjust for priority
            if parsed_task.priority == "high":
                estimated_duration = int(estimated_duration * 1.5)
            elif parsed_task.priority == "low":
                estimated_duration = max(30, int(estimated_duration * 0.7))  # Minimum 30 minutes
        
        return estimated_duration

    def generate_suggestions(self, parsed_task: ParsedTask) -> List[TaskSuggestion]:
        """
        Generate targeted improvement suggestions based on task analysis gaps.
        Only suggests improvements for actual weaknesses or missing information.
        """
        suggestions = []
        suggestion_counter = 0  # For consistent ID generation
        title = parsed_task.title.lower() if parsed_task.title else ""
        description = parsed_task.description.lower() if parsed_task.description else ""
        full_text = f"{title} {description}".strip()
        
        def add_suggestion(suggestion_type: str, suggestion: str, confidence: float, reasoning: str, metadata: Optional[Dict[str, Any]] = None):
            """Helper to add suggestions with normalized IDs"""
            nonlocal suggestion_counter
            suggestions.append(TaskSuggestion(
                suggestion_type=suggestion_type,
                suggestion=suggestion,
                confidence=confidence,
                reasoning=reasoning,
                metadata=metadata or {}
            ))
            suggestion_counter += 1
        
        # 1. Priority Clarification - only if priority is unclear or conflicting signals
        priority_signals = {
            'high': ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'now'],
            'low': ['someday', 'eventually', 'when possible', 'nice to have', 'optional']
        }
        
        high_signals = sum(1 for word in priority_signals['high'] if word in full_text)
        low_signals = sum(1 for word in priority_signals['low'] if word in full_text)
        
        if high_signals > 0 and parsed_task.priority == "medium":
            add_suggestion(
                "priority_clarification",
                "This task contains urgency indicators - consider setting priority to 'high'",
                0.8,
                f"Detected {high_signals} urgency keyword(s) but priority is set to medium"
            )
        elif parsed_task.priority == "medium" and high_signals == 0 and low_signals == 0:
            # Only suggest if there are no clear priority indicators and task is genuinely ambiguous
            vague_indicators = ['should', 'need to', 'have to', 'must', 'important']
            # Only suggest priority clarification for truly ambiguous cases
            if not any(indicator in full_text for indicator in vague_indicators) and len(full_text.split()) < 5:
                add_suggestion(
                    "priority_clarification",
                    "Consider specifying the priority level (high/medium/low) for better planning",
                    0.5,
                    "Very brief task with no clear priority indicators"
                )
        
        # 2. Due Date Addition - only if no date mentioned and task seems time-sensitive
        if not parsed_task.due_date:
            time_sensitive_words = ['deadline', 'by', 'before', 'until', 'due', 'meeting', 'appointment', 'event']
            urgency_words = ['urgent', 'asap', 'soon', 'quickly', 'immediately']
            
            if any(word in full_text for word in time_sensitive_words + urgency_words):
                add_suggestion(
                    "due_date_add",
                    "This task seems time-sensitive - consider adding a specific due date",
                    0.8,
                    "Task contains time-sensitive or urgency keywords but no due date specified"
                )
            elif parsed_task.priority == "high":
                add_suggestion(
                    "due_date_add",
                    "High priority tasks benefit from having clear deadlines",
                    0.7,
                    "High priority task without a specified due date"
                )
        
        # 3. Description Improvement - only if genuinely unclear or too vague
        if len(parsed_task.title) < 15:  # Very short title
            add_suggestion(
                "description_improve",
                "Add more specific details about what needs to be accomplished",
                0.7,
                "Task title is very brief and may lack clarity",
                {
                    "title_length": len(parsed_task.title),
                    "improvement_type": "length",
                    "suggested_min_length": 20
                }
            )
        elif not parsed_task.description and len(parsed_task.title) < 25:
            # Check if title contains vague verbs
            vague_verbs = ['do', 'handle', 'deal with', 'work on', 'check', 'look at']
            found_vague_verbs = [verb for verb in vague_verbs if verb in title]
            if found_vague_verbs:
                add_suggestion(
                    "description_improve",
                    "Clarify the specific actions needed to complete this task",
                    0.8,
                    "Task uses vague action words that could be more specific",
                    {
                        "vague_verbs_found": found_vague_verbs,
                        "improvement_type": "specificity",
                        "suggestion_examples": ["What specific outcome do you want?", "What are the concrete steps?"]
                    }
                )
        
        # 4. Task Breakdown - for large or complex tasks
        complex_indicators = ['project', 'plan', 'organize', 'setup', 'implement', 'research', 'analyze']
        multiple_actions = len([word for word in full_text.split() if word in ['and', '&', 'then', 'also', 'plus']])
        
        if any(indicator in full_text for indicator in complex_indicators) or multiple_actions >= 2:
            if len(full_text.split()) > 8:  # Reasonably complex task
                add_suggestion(
                    "breakdown",
                    "Consider breaking this into smaller, more manageable sub-tasks",
                    0.7,
                    "Task appears complex and could benefit from being divided into steps",
                    {
                        "complexity_indicators": [ind for ind in complex_indicators if ind in full_text],
                        "multiple_actions_count": multiple_actions,
                        "word_count": len(full_text.split())
                    }
                )
        
        # 5. Reminder Suggestions - for future or important tasks (avoid duplicates)
        reminder_added = False
        if parsed_task.due_date and parsed_task.due_date.get('parsed'):
            try:
                # Check if we already have reminder suggestions
                if not any(s.suggestion_type == "reminder" for s in suggestions):
                    add_suggestion(
                        "reminder",
                        "Set a reminder 1-2 days before the due date to ensure timely completion",
                        0.6,
                        "Tasks with due dates benefit from advance reminders",
                        {"suggested_reminder_days_before": 1, "reminder_type": "due_date_based"}
                    )
                    reminder_added = True
            except:
                pass
        
        # Add reminder for high priority tasks without due dates (if no reminder already added)
        if not reminder_added and parsed_task.priority == "high" and not parsed_task.due_date:
            add_suggestion(
                "reminder",
                "Consider setting a regular check-in reminder for this high-priority task",
                0.5,
                "High priority tasks benefit from regular progress tracking",
                {"suggested_reminder_frequency": "daily", "reminder_type": "priority_based"}
            )
        
        # 6. Delegation Opportunities - for collaborative or teamwork tasks
        delegation_keywords = ['team', 'meeting', 'discuss', 'collaborate', 'share', 'delegate', 'assign']
        matched_keywords = [kw for kw in delegation_keywords if kw in full_text]
        if matched_keywords:
            add_suggestion(
                "delegation",
                "Consider if any part of this task can be delegated or shared with team members",
                0.5,
                "Task involves collaborative elements that might allow for delegation",
                {
                    "delegation_indicators": matched_keywords,
                    "suggested_delegation_type": "collaborative" if "collaborate" in matched_keywords else "assignable",
                    "teamwork_complexity": "high" if len(matched_keywords) > 2 else "medium"
                }
            )
        
        return suggestions