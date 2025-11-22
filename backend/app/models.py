from datetime import date
from typing import Optional, List
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
    user_id: str
    last_period_start: date
    cycle_length: int
    menstruation_phase_duration: int
    symptoms: List[str] = []
    medication: str = ""
    workout_intensity: str  # "low" | "medium" | "high"


class QuizProfileResponse(BaseModel):
    user_id: str
    last_period_start: date
    cycle_length: int
    menstruation_phase_duration: int
    symptoms: List[str] = []
    medication: str = ""
    workout_intensity: str


class PhaseTips(BaseModel):
  headline: str
  do: List[str]
  avoid: List[str]


class CycleSummaryResponse(BaseModel):
  user_id: str
  today: date
  cycle_day: int
  phase: str
  phase_label: str
  tips: PhaseTips


class TaskToPlan(BaseModel):
  title: str
  category: str  # "work" | "uni" | "social" | etc.
  start_iso: str  # ISO datetime string
  duration_hours: float


class PlanEvaluateRequest(BaseModel):
  user_id: str
  tasks: List[TaskToPlan]


class TaskPlanSuggestion(BaseModel):
  title: str
  category: str
  original_start_iso: str
  phase_at_original: str
  is_ideal: bool
  reason: str
  suggested_start_iso: Optional[str] = None
  suggested_phase: Optional[str] = None


class PlanEvaluateResponse(BaseModel):
  user_id: str
  suggestions: List[TaskPlanSuggestion]

