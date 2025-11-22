from fastapi import FastAPI, HTTPException
from .models import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    QuizProfileInput,
    QuizProfileResponse,
)
from .storage import USERS, PROFILES, create_user, get_user_by_email

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
