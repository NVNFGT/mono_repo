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

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ParsedTask:
    """Represents a parsed task with extracted information"""
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    confidence: float = 0.0
    raw_input: str = ""

@dataclass
class TaskSuggestion:
    """Represents an AI suggestion for task improvement"""
    suggestion_type: str  # priority, due_date, description, category
    suggestion: str
    confidence: float
    reasoning: str

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
        due_date = self._extract_due_date(input_text, doc)
        category = self._extract_category(input_text, doc)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(input_text, doc, {
            'title': title,
            'priority': priority,
            'due_date': due_date,
            'category': category
        })
        
        return ParsedTask(
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            category=category,
            confidence=confidence,
            raw_input=input_text
        )
    
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
        
        # Check for deadline proximity (implies higher priority)
        due_date = self._extract_due_date(text, doc)
        if due_date:
            days_until = (due_date - datetime.now()).days
            if days_until <= 1:
                return "high"
            elif days_until <= 7:
                return "medium"
        
        return "medium"  # Default priority
    
    def _extract_due_date(self, text: str, doc) -> Optional[datetime]:
        """Extract due date from text using multiple approaches"""
        
        # First, try spaCy's built-in date detection
        for ent in doc.ents:
            if ent.label_ in ["DATE", "TIME"]:
                try:
                    parsed_date = date_parser.parse(ent.text, fuzzy=True)
                    if parsed_date > datetime.now():
                        return parsed_date
                except:
                    continue
        
        # Try pattern-based extraction
        for pattern in self.time_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    if isinstance(match, tuple):
                        match = ' '.join(match)
                    
                    # Handle relative dates
                    if 'tomorrow' in match.lower():
                        return datetime.now() + timedelta(days=1)
                    elif 'today' in match.lower():
                        return datetime.now()
                    elif 'next week' in match.lower():
                        return datetime.now() + timedelta(weeks=1)
                    elif 'next month' in match.lower():
                        return datetime.now() + timedelta(days=30)
                    
                    # Try to parse as date
                    parsed_date = date_parser.parse(match, fuzzy=True)
                    if parsed_date > datetime.now():
                        return parsed_date
                except:
                    continue
        
        return None
    
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
    
    def generate_suggestions(self, parsed_task: ParsedTask) -> List[TaskSuggestion]:
        """Generate improvement suggestions for a parsed task"""
        suggestions = []
        
        # Priority suggestion
        if parsed_task.confidence < 0.7:
            suggestions.append(TaskSuggestion(
                suggestion_type="priority",
                suggestion=f"Consider specifying priority level more clearly",
                confidence=0.8,
                reasoning="Priority keywords were not clearly detected in the input"
            ))
        
        # Due date suggestion
        if not parsed_task.due_date:
            suggestions.append(TaskSuggestion(
                suggestion_type="due_date",
                suggestion="Consider adding a due date for better planning",
                confidence=0.7,
                reasoning="No due date was found in the task description"
            ))
        
        # Description enhancement
        if not parsed_task.description and len(parsed_task.title) < 30:
            suggestions.append(TaskSuggestion(
                suggestion_type="description",
                suggestion="Add more details to clarify what needs to be done",
                confidence=0.6,
                reasoning="Task description is quite brief"
            ))
        
        return suggestions