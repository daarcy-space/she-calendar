from uuid import uuid4
from typing import Dict, Any, Optional

# In-memory "database" for hackathon
# USERS: user_id -> { id, email }
USERS: Dict[str, Dict[str, Any]] = {}

# PROFILES: user_id -> { user_id, last_period_start, cycle_length, prefers_workout_time }
PROFILES: Dict[str, Dict[str, Any]] = {}


def create_user(email: str) -> Dict[str, Any]:
    """
    Create a new user and return the user dict.
    """
    user_id = str(uuid4())
    user = {
        "id": user_id,
        "email": email.lower(),
    }
    USERS[user_id] = user
    return user


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Find a user by email or return None.
    """
    email = email.lower()
    for user in USERS.values():
        if user["email"] == email:
            return user
    return None
