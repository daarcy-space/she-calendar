import json
import os
from uuid import uuid4
from typing import Dict, Any, Optional
from google.oauth2.credentials import Credentials

DATA_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(DATA_DIR, "db.json")

# in-memory mirrors
USERS: Dict[str, Dict[str, Any]] = {}
PROFILES: Dict[str, Dict[str, Any]] = {}
TOKENS: Dict[str, Dict[str, Any]] = {}


def _load_db() -> None:
    """Load USERS and PROFILES from db.json if it exists."""
    global USERS, PROFILES
    if not os.path.exists(DB_PATH):
        USERS = {}
        PROFILES = {}
        return

    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        USERS = {}
        PROFILES = {}
        return

    USERS = data.get("users", {})
    PROFILES = data.get("profiles", {})
    TOKENS = data.get("tokens", {}) 


def _save_db() -> None:
    """Persist USERS and PROFILES to db.json."""
    data = {
        "users": USERS,
        "profiles": PROFILES,
        "tokens": TOKENS,
    }
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# load once at import
_load_db()


def create_user(email: str) -> Dict[str, Any]:
    """
    Create a new user (or return existing if same email).
    Email is the only identifier for now.
    """
    existing = get_user_by_email(email)
    if existing:
        return existing

    user_id = str(uuid4())
    user = {
        "id": user_id,
        "email": email.lower(),
    }
    USERS[user_id] = user
    _save_db()
    return user


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    email = email.lower()
    for user in USERS.values():
        if user["email"] == email:
            return user
    return None


def save_profile(
    user_id: str,
    *,
    last_period_start,
    cycle_length: int,
    menstruation_phase_duration: int,
    symptoms,
    medication: str,
    workout_intensity: str,
) -> Dict[str, Any]:
    profile = {
        "user_id": user_id,
        "last_period_start": str(last_period_start),  # ISO string
        "cycle_length": cycle_length,
        "menstruation_phase_duration": menstruation_phase_duration,
        "symptoms": symptoms or [],
        "medication": medication,
        "workout_intensity": workout_intensity,
    }
    PROFILES[user_id] = profile
    _save_db()
    return profile

def save_google_tokens(user_id: str, creds: Credentials) -> None:
    """
    Store Google OAuth tokens for this user in db.json.
    Called from the /api/google/oauth2callback handler.
    """
    # creds.to_json() -> JSON string; parse it so we store a dict
    TOKENS[user_id] = json.loads(creds.to_json())
    _save_db()


def load_google_credentials(user_id: str) -> Optional[Credentials]:
    """
    Load Google OAuth tokens for this user from db.json and build Credentials.
    Used when calling the Google Calendar API.
    """
    token_info = TOKENS.get(user_id)
    if not token_info:
        return None
    return Credentials.from_authorized_user_info(token_info)


