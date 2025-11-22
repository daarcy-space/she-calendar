from datetime import date, datetime, timedelta
from typing import Any, Dict
from .google_auth import build_flow
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    QuizProfileInput,
    QuizProfileResponse,
    CycleSummaryResponse,
    PhaseTips,
    PlanEvaluateRequest,
    PlanEvaluateResponse,
    TaskPlanSuggestion,
)
from .storage import (
    USERS,
    PROFILES,
    create_user,
    get_user_by_email,
    save_profile,
)
from .phase_engine import (
    get_cycle_day,
    get_phase,
    get_phase_label,
    get_phase_tips,
)

app = FastAPI(title="she.Calendar API")

# --- CORS so frontend (Vite) can talk to backend on localhost ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- AUTH ----------

@app.post("/api/auth/register", response_model=RegisterResponse)
def register(payload: RegisterRequest) -> RegisterResponse:
    """
    Create or return a user by email.
    This is called from the first-time onboarding flow.
    """
    user = create_user(payload.email)
    return RegisterResponse(user_id=user["id"], email=user["email"])


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """
    Login for returning users by email.
    """
    user = get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = PROFILES.get(user["id"])

    last_period_start = None
    cycle_length = None
    workout_pref = None

    if profile:
        lps = profile.get("last_period_start")
        if isinstance(lps, str):
            try:
                last_period_start = date.fromisoformat(lps)
            except ValueError:
                last_period_start = None
        cycle_length = profile.get("cycle_length")
        workout_pref = profile.get("workout_intensity")

    return LoginResponse(
        user_id=user["id"],
        email=user["email"],
        last_period_start=last_period_start,
        cycle_length=cycle_length,
        prefers_workout_time=workout_pref,
    )


# ---------- ONBOARDING QUIZ / PROFILE ----------

@app.post("/api/profile/quiz", response_model=QuizProfileResponse)
def save_quiz_profile(payload: QuizProfileInput) -> QuizProfileResponse:
    """
    Save the initial onboarding quiz answers as the user's cycle profile.
    """
    user_id = payload.user_id

    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    profile = save_profile(
        user_id=user_id,
        last_period_start=payload.last_period_start,
        cycle_length=payload.cycle_length,
        menstruation_phase_duration=payload.menstruation_phase_duration,
        symptoms=payload.symptoms,
        medication=payload.medication,
        workout_intensity=payload.workout_intensity,
    )

    # last_period_start stored as ISO string in db.json
    lps_raw = profile["last_period_start"]
    lps_date = (
        date.fromisoformat(lps_raw)
        if isinstance(lps_raw, str)
        else payload.last_period_start
    )

    return QuizProfileResponse(
        user_id=user_id,
        last_period_start=lps_date,
        cycle_length=profile["cycle_length"],
        menstruation_phase_duration=profile["menstruation_phase_duration"],
        symptoms=profile["symptoms"],
        medication=profile["medication"],
        workout_intensity=profile["workout_intensity"],
    )


# ---------- CYCLE SUMMARY FOR DASHBOARD ----------

@app.get("/api/user/{user_id}/cycle-summary", response_model=CycleSummaryResponse)
def get_cycle_summary(user_id: str) -> CycleSummaryResponse:
    """
    Return current cycle day, phase, and short tips for the dashboard.
    """
    if user_id not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = PROFILES[user_id]

    # last_period_start is stored as ISO string in db.json
    lps_raw = profile.get("last_period_start")
    if not lps_raw:
        raise HTTPException(status_code=400, detail="Profile incomplete")

    try:
        last_period_start = (
            date.fromisoformat(lps_raw)
            if isinstance(lps_raw, str)
            else lps_raw
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid last_period_start in profile")

    cycle_length = profile.get("cycle_length", 28)
    bleed_days = profile.get("menstruation_phase_duration", 5)

    today = date.today()
    cycle_day = get_cycle_day(today, last_period_start, cycle_length)
    phase = get_phase(cycle_day, cycle_length, bleed_days)
    phase_label = get_phase_label(phase)
    tips_raw = get_phase_tips(phase)

    tips = PhaseTips(
        headline=tips_raw["headline"],
        do=tips_raw.get("do", []),
        avoid=tips_raw.get("avoid", []),
    )

    return CycleSummaryResponse(
        user_id=user_id,
        today=today,
        cycle_day=cycle_day,
        phase=phase,
        phase_label=phase_label,
        tips=tips,
    )


# ---------- PLANNING EVALUATION ----------

def _category_target_phases(category: str):
    category = category.lower()
    if category in {"social", "dating", "networking"}:
        return ["follicular", "ovulation"]
    if category in {"work", "uni", "study", "deep_work"}:
        return ["follicular", "ovulation", "luteal"]
    if category in {"selfcare", "rest"}:
        return ["menstrual", "luteal"]
    # default: accept all phases
    return ["menstrual", "follicular", "ovulation", "luteal"]


@app.post("/api/plan/evaluate", response_model=PlanEvaluateResponse)
def evaluate_plan(payload: PlanEvaluateRequest) -> PlanEvaluateResponse:
    """
    Given a list of tasks (title, category, day+time), check if the time
    is ideal for the user's cycle phase, and if not suggest a better slot.
    """
    user_id = payload.user_id
    if user_id not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = PROFILES[user_id]

    lps_raw = profile.get("last_period_start")
    if not lps_raw:
        raise HTTPException(status_code=400, detail="Profile incomplete")

    try:
        last_period_start = (
            date.fromisoformat(lps_raw)
            if isinstance(lps_raw, str)
            else lps_raw
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid last_period_start in profile")

    cycle_length = profile.get("cycle_length", 28)
    bleed_days = profile.get("menstruation_phase_duration", 5)

    suggestions = []

    for task in payload.tasks:
        try:
            start_dt = datetime.fromisoformat(task.start_iso)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid datetime: {task.start_iso}")

        cycle_day = get_cycle_day(start_dt.date(), last_period_start, cycle_length)
        phase = get_phase(cycle_day, cycle_length, bleed_days)

        target_phases = _category_target_phases(task.category)
        is_ideal = phase in target_phases

        if is_ideal:
            reason = f"This fits well into your {phase} phase for a {task.category} task."
            suggestions.append(
                TaskPlanSuggestion(
                    title=task.title,
                    category=task.category,
                    original_start_iso=task.start_iso,
                    phase_at_original=phase,
                    is_ideal=True,
                    reason=reason,
                )
            )
            continue

        # look for a better day within a small window around the chosen time
        best_dt = None
        best_phase = None
        for delta_days in range(-3, 8):
            candidate_date = start_dt.date() + timedelta(days=delta_days)
            candidate_cycle_day = get_cycle_day(candidate_date, last_period_start, cycle_length)
            candidate_phase = get_phase(candidate_cycle_day, cycle_length, bleed_days)
            if candidate_phase in target_phases:
                best_dt = datetime.combine(candidate_date, start_dt.time())
                best_phase = candidate_phase
                break

        if best_dt is not None:
            reason = (
                f"{task.category.capitalize()} tasks tend to feel better in your "
                f"{best_phase} phase than in {phase}."
            )
            suggestions.append(
                TaskPlanSuggestion(
                    title=task.title,
                    category=task.category,
                    original_start_iso=task.start_iso,
                    phase_at_original=phase,
                    is_ideal=False,
                    reason=reason,
                    suggested_start_iso=best_dt.isoformat(),
                    suggested_phase=best_phase,
                )
            )
        else:
            reason = (
                f"This isn’t in your ideal phase for {task.category}, "
                "but we didn’t find a clearly better slot in the next week."
            )
            suggestions.append(
                TaskPlanSuggestion(
                    title=task.title,
                    category=task.category,
                    original_start_iso=task.start_iso,
                    phase_at_original=phase,
                    is_ideal=False,
                    reason=reason,
                )
            )

    return PlanEvaluateResponse(user_id=user_id, suggestions=suggestions)


# ---------- DEBUG ENDPOINTS (for you, not for production) ----------

@app.get("/api/debug/users")
def debug_users() -> Dict[str, Any]:
    return USERS


@app.get("/api/debug/profiles")
def debug_profiles() -> Dict[str, Any]:
    return PROFILES


@app.get("/api/google/auth-url")
def get_google_auth_url(user_id: str):
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    redirect_uri = "http://localhost:8000/api/google/oauth2callback"

    try:
        flow = build_flow(redirect_uri)
    except Exception as e:
        # TEMP debug: show actual reason instead of generic 500
        raise HTTPException(status_code=500, detail=f"Flow error: {e}")

    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    auth_url_with_user = auth_url + "&" + urlencode({"user_id": user_id})
    return {"auth_url": auth_url_with_user}
