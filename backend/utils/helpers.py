from datetime import datetime
from typing import Optional

def parse_iso_datetime(date_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO format datetime string safely."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str)
    except Exception:
        return None