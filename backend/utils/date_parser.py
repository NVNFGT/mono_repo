"""
Natural Language Date Parser

Converts natural language date expressions to structured date objects
with proper ISO formatting and precision tracking.
"""

import re
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dateutil import parser as dateutil_parser
import logging

logger = logging.getLogger(__name__)

class DatePrecision:
    EXACT = "exact"      # Specific date and time
    DAY = "day"          # Specific day, no time
    WEEK = "week"        # Week-based (e.g., "next week")
    MONTH = "month"      # Month-based (e.g., "next month")
    RELATIVE = "relative" # Relative time (e.g., "in 2 hours")

class DateParser:
    """Parse natural language dates into structured format"""
    
    def __init__(self, reference_time: Optional[datetime] = None):
        """
        Initialize date parser
        
        Args:
            reference_time: Reference point for relative dates (defaults to now)
        """
        self.reference_time = reference_time or datetime.utcnow()
        
        # Common patterns for natural language dates
        self.patterns = {
            # Days of week
            r'\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b': self._parse_weekday,
            r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b': self._parse_weekday,
            
            # Relative dates
            r'\b(today|tomorrow|tonight)\b': self._parse_relative_day,
            r'\bin\s+(\d+)\s+(days?|weeks?|months?|hours?|minutes?)\b': self._parse_relative_time,
            r'\b(\d+)\s+(days?|weeks?|months?)\s+(from\s+now|later)\b': self._parse_relative_time,
            
            # Specific dates
            r'\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b': self._parse_date_format,
            r'\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b': self._parse_month_day,
            
            # Time expressions
            r'\bat\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?\b': self._parse_time,
            r'\b(\d{1,2})\s*(am|pm)\b': self._parse_time,
        }
    
    def parse_date(self, text: str, context: Optional[Dict] = None) -> Dict[str, any]:
        """
        Parse natural language date into structured format
        
        Args:
            text: Natural language date expression
            context: Optional context with timestamp and other info
            
        Returns:
            Dict with raw, parsed, and precision fields
        """
        if not text or not isinstance(text, str):
            return {
                "raw": text,
                "parsed": None,
                "precision": None,
                "confidence": 0.0
            }
        
        # Use context timestamp if available
        if context and context.get("timestamp"):
            try:
                self.reference_time = datetime.fromisoformat(
                    context["timestamp"].replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                pass
        
        text_lower = text.lower().strip()
        
        # Try each pattern
        for pattern, parser_func in self.patterns.items():
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                try:
                    parsed_date, precision = parser_func(match, text_lower)
                    if parsed_date:
                        return {
                            "raw": text,
                            "parsed": parsed_date.strftime("%Y-%m-%d") if precision == DatePrecision.DAY else parsed_date.isoformat(),
                            "precision": precision,
                            "confidence": 0.8
                        }
                except Exception as e:
                    logger.warning(f"Date parsing error for '{text}': {e}")
                    continue
        
        # Fallback to dateutil parser
        try:
            parsed = dateutil_parser.parse(text, fuzzy=True, default=self.reference_time)
            return {
                "raw": text,
                "parsed": parsed.strftime("%Y-%m-%d"),
                "precision": DatePrecision.DAY,
                "confidence": 0.6
            }
        except Exception:
            logger.debug(f"Could not parse date: '{text}'")
            return {
                "raw": text,
                "parsed": None,
                "precision": None,
                "confidence": 0.0
            }
    
    def _parse_weekday(self, match, text: str) -> Tuple[datetime, str]:
        """Parse weekday references like 'next Saturday'"""
        groups = match.groups()
        modifier = groups[0] if len(groups) > 1 else None
        weekday = groups[-1]
        
        weekdays = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        
        target_weekday = weekdays[weekday]
        current_weekday = self.reference_time.weekday()
        
        if modifier == "next" or (not modifier and target_weekday <= current_weekday):
            # Next occurrence of this weekday
            days_ahead = target_weekday - current_weekday
            if days_ahead <= 0:  # Target day is today or has passed
                days_ahead += 7
        else:
            # This week's occurrence
            days_ahead = target_weekday - current_weekday
            if days_ahead < 0:  # Already passed this week
                days_ahead += 7
        
        target_date = self.reference_time + timedelta(days=days_ahead)
        return target_date.replace(hour=0, minute=0, second=0, microsecond=0), DatePrecision.DAY
    
    def _parse_relative_day(self, match, text: str) -> Tuple[datetime, str]:
        """Parse relative day references like 'today', 'tomorrow'"""
        word = match.group(1)
        
        if word == "today":
            target_date = self.reference_time
        elif word == "tomorrow":
            target_date = self.reference_time + timedelta(days=1)
        elif word == "tonight":
            target_date = self.reference_time.replace(hour=20, minute=0)
            return target_date, DatePrecision.EXACT
        else:
            raise ValueError(f"Unknown relative day: {word}")
        
        return target_date.replace(hour=0, minute=0, second=0, microsecond=0), DatePrecision.DAY
    
    def _parse_relative_time(self, match, text: str) -> Tuple[datetime, str]:
        """Parse relative time expressions like 'in 2 days'"""
        groups = match.groups()
        
        if len(groups) >= 2:
            amount = int(groups[0])
            unit = groups[1].rstrip('s')  # Remove plural 's'
        else:
            return None, None
        
        if unit in ['day', 'days']:
            target_date = self.reference_time + timedelta(days=amount)
            return target_date.replace(hour=0, minute=0, second=0, microsecond=0), DatePrecision.DAY
        elif unit in ['week', 'weeks']:
            target_date = self.reference_time + timedelta(weeks=amount)
            return target_date.replace(hour=0, minute=0, second=0, microsecond=0), DatePrecision.WEEK
        elif unit in ['month', 'months']:
            # Approximate month calculation
            target_date = self.reference_time + timedelta(days=amount * 30)
            return target_date.replace(hour=0, minute=0, second=0, microsecond=0), DatePrecision.MONTH
        elif unit in ['hour', 'hours']:
            target_date = self.reference_time + timedelta(hours=amount)
            return target_date, DatePrecision.EXACT
        elif unit in ['minute', 'minutes']:
            target_date = self.reference_time + timedelta(minutes=amount)
            return target_date, DatePrecision.EXACT
        
        return None, None
    
    def _parse_date_format(self, match, text: str) -> Tuple[datetime, str]:
        """Parse date formats like MM/DD/YYYY or DD-MM-YYYY"""
        groups = match.groups()
        month, day, year = int(groups[0]), int(groups[1]), int(groups[2])
        
        # Handle 2-digit years
        if year < 100:
            year += 2000 if year < 50 else 1900
        
        # Assume MM/DD/YYYY format (US standard)
        try:
            target_date = datetime(year, month, day)
            return target_date, DatePrecision.DAY
        except ValueError:
            # Try DD/MM/YYYY format
            try:
                target_date = datetime(year, day, month)
                return target_date, DatePrecision.DAY
            except ValueError:
                return None, None
    
    def _parse_month_day(self, match, text: str) -> Tuple[datetime, str]:
        """Parse formats like '15 Jan' or 'Jan 15'"""
        groups = match.groups()
        day = int(groups[0])
        month_abbr = groups[1]
        
        months = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        
        month = months.get(month_abbr)
        if not month:
            return None, None
        
        # Use current year, or next year if date has passed
        year = self.reference_time.year
        try:
            target_date = datetime(year, month, day)
            if target_date < self.reference_time:
                target_date = datetime(year + 1, month, day)
            return target_date, DatePrecision.DAY
        except ValueError:
            return None, None
    
    def _parse_time(self, match, text: str) -> Tuple[datetime, str]:
        """Parse time expressions like '3:30 PM' or '3 PM'"""
        groups = match.groups()
        hour = int(groups[0])
        minute = int(groups[1]) if groups[1] else 0
        ampm = groups[2] if len(groups) > 2 else None
        
        if ampm:
            if ampm.lower() == 'pm' and hour != 12:
                hour += 12
            elif ampm.lower() == 'am' and hour == 12:
                hour = 0
        
        # Combine with today's date
        target_date = self.reference_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return target_date, DatePrecision.EXACT