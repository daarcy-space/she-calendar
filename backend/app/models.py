from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---------- AUTH ----------

class RegisterRequest(BaseModel):
    """
    Request body for registering a new user.
    """
    email: EmailStr


class RegisterResponse(BaseModel):
    """
    Response after successful registration.
    """
    user_id: str
    email: EmailStr


class LoginRequest(BaseModel):
    """
    Request body for logging in an existing user.
    """
    email: EmailStr


class LoginResponse(BaseModel):
    """
    Response after successful login.
    Contains whatever profile data we already know about this user.
    """
    user_id: str
    email: EmailStr
    last_period_start: Optional[date] = None
    cycle_length: Optional[int] = None
    prefers_workout_time: Optional[str] = None


# ---------- ONBOARDING QUIZ / PROFILE ----------

class QuizProfileInput(BaseModel):
    """
    Body for saving the onboarding quiz answers (cycle profile)
    for a specific user.
    """
    user_id: str
    last_period_start: date
    cycle_length: int
    prefers_workout_time: Optional[str] = None  # "morning" | "afternoon" | "evening"


class QuizProfileResponse(BaseModel):
    """
    Response after saving / updating the quiz profile.
    """
    user_id: str
    last_period_start: date
    cycle_length: int
    prefers_workout_time: Optional[str] = None
