from fastapi import FastAPI, HTTPException
from datetime import date, datetime, timedelta
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
from .storage import USERS, PROFILES, create_user, get_user_by_email
from .phase_engine import get_cycle_day, get_phase, get_phase_label, get_phase_tips

app = FastAPI()

@app.post("/api/auth/register", response_model=RegisterResponse)
def register(payload: RegisterRequest):
    # if email already exists, you can either reject or just reuse
    existing = get_user_by_email(payload.email)
    if existing:
        # for now, treat as "already registered"
        return RegisterResponse(user_id=existing["id"], email=existing["email"])

    user = create_user(payload.email)
    return RegisterResponse(user_id=user["id"], email=user["email"])

@app.post("/api/profile/quiz", response_model=QuizProfileResponse)
def save_quiz_profile(payload: QuizProfileInput):
    user_id = payload.user_id

    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    PROFILES[user_id] = {
        "user_id": user_id,
        "last_period_start": payload.last_period_start,
        "cycle_length": payload.cycle_length,
        "prefers_workout_time": payload.prefers_workout_time,
    }

    return QuizProfileResponse(
        user_id=user_id,
        last_period_start=payload.last_period_start,
        cycle_length=payload.cycle_length,
        prefers_workout_time=payload.prefers_workout_time,
    )

@app.get("/api/user/{user_id}/cycle-summary", response_model=CycleSummaryResponse)
def get_cycle_summary(user_id: str):
    if user_id not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = PROFILES[user_id]
    last_period_start = profile["last_period_start"]
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

def _category_target_phases(category: str):
    category = category.lower()
    if category in {"social", "dating", "networking"}:
        return ["follicular", "ovulation"]
    if category in {"work", "uni", "study", "deep_work"}:
        return ["follicular", "ovulation", "luteal"]
    if category in {"selfcare", "rest"}:
        return ["menstrual", "luteal"]
    # default: everything is fine almost anywhere
    return ["menstrual", "follicular", "ovulation", "luteal"]


@app.post("/api/plan/evaluate", response_model=PlanEvaluateResponse)
def evaluate_plan(payload: PlanEvaluateRequest):
    user_id = payload.user_id
    if user_id not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = PROFILES[user_id]
    last_period_start = profile["last_period_start"]
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

        # find a better day within the next 7 days
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
            # no better slot found nearby
            reason = (
                f"This isn&apos;t in your ideal phase for {task.category}, "
                "but we didn&apos;t find a clearly better slot in the next week."
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

