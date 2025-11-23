from datetime import date, datetime, timedelta
from typing import Any, Dict, List  # <-- added List


from .google_auth import build_flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from .agent import run_planner_agent
from .planning_rules import category_target_phases


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
    CalendarStatusResponse,
    AgentPlanWeekResponse,
    AgentSuggestion,
    MoveEventRequest,
    MoveEventResponse,
    CreateEventRequest,
    CreateEventResponse,
    WeeklyQuizInput,
    WeeklyQuizResponse,
)
from .storage import (
    USERS,
    PROFILES,
    create_user,
    get_user_by_email,
    save_profile,
    save_google_tokens,
    load_google_credentials,
    save_weekly_quiz,
)
from .phase_engine import (
    get_cycle_day,
    get_phase,
    get_phase_label,
    get_phase_tips,
)

app = FastAPI(title="she.Calendar API")

REDIRECT_URI = "http://localhost:8000/api/google/oauth2callback"

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

@app.post("/api/profile/weekly-quiz", response_model=WeeklyQuizResponse)
def save_weekly_quiz_endpoint(payload: WeeklyQuizInput) -> WeeklyQuizResponse:
    """
    Save the weekly check-in (stress, energy, symptoms, etc.)
    so the agent can adjust its suggestions.
    """
    user_id = payload.user_id
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    data = save_weekly_quiz(
        user_id=user_id,
        stress=payload.stress,
        concentration=payload.concentration,
        energy=payload.energy,
        workout=payload.workout,
        social=payload.social,
    )

    return WeeklyQuizResponse(
        user_id=user_id,
        stress=data["stress"],
        concentration=data["concentration"],
        energy=data["energy"],
        workout=data["workout"],
        social=data["social"],
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
        raise HTTPException(
            status_code=400, detail="Invalid last_period_start in profile"
        )

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


@app.get("/api/user/{user_id}/calendar-status", response_model=CalendarStatusResponse)
def calendar_status(user_id: str) -> CalendarStatusResponse:
    """
    Check if this user has Google Calendar tokens stored.
    """
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    creds = load_google_credentials(user_id)
    return CalendarStatusResponse(user_id=user_id, connected=bool(creds))


# ---------- PLANNING EVALUATION ----------


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
        raise HTTPException(
            status_code=400, detail="Invalid last_period_start in profile"
        )

    cycle_length = profile.get("cycle_length", 28)
    bleed_days = profile.get("menstruation_phase_duration", 5)

    suggestions = []

    for task in payload.tasks:
        raw = task.start_iso
        if raw.endswith("Z"):
            raw = raw.replace("Z", "+00:00")
        try:
            start_dt = datetime.fromisoformat(raw)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid datetime: {task.start_iso}"
            )

        cycle_day = get_cycle_day(start_dt.date(), last_period_start, cycle_length)
        phase = get_phase(cycle_day, cycle_length, bleed_days)

        target_phases = category_target_phases(task.category)
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
            candidate_cycle_day = get_cycle_day(
                candidate_date, last_period_start, cycle_length
            )
            candidate_phase = get_phase(
                candidate_cycle_day, cycle_length, bleed_days
            )
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


# ---------- GOOGLE OAUTH ----------

@app.get("/api/google/auth-url")
def get_google_auth_url(user_id: str):
    """
    Returns a Google OAuth URL for this user to connect their calendar.
    """
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        flow = build_flow()
        flow.redirect_uri = REDIRECT_URI

        auth_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=user_id,  # we round-trip user_id via `state`
        )

        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"google_auth_url_error: {e}",
        )


@app.get("/api/google/oauth2callback")
def google_oauth_callback(request: Request):
    """
    Handles Google redirect, exchanges the code for tokens and saves them.
    Then redirects back to the frontend with ?connected=1
    """
    full_url = str(request.url)
    state = request.query_params.get("state")
    user_id = state
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    try:
        flow = build_flow()
        flow.redirect_uri = REDIRECT_URI
        flow.fetch_token(authorization_response=full_url)

        creds = flow.credentials
        save_google_tokens(user_id, creds)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"google_callback_error: {e}",
        )

    return RedirectResponse("http://localhost:5173/?connected=1")


# ---------- AGENT ----------

@app.post("/api/agent/plan-week", response_model=AgentPlanWeekResponse)
def agent_plan_week(user_id: str) -> AgentPlanWeekResponse:
    """
    Ask the AI agent to analyse next week's events for this user.
    """
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        suggestions = run_planner_agent(user_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Basic validation/truncation for safety
    cleaned: List[AgentSuggestion] = []
    for s in suggestions:
        cleaned.append(
            AgentSuggestion(
                event_id=s["event_id"],
                event_title=s.get("event_title", "(no title)"),
                action=s["action"],
                new_start=s.get("new_start"),
                new_end=s.get("new_end"),
                reason=s.get("reason", ""),
            )
        )

    return AgentPlanWeekResponse(user_id=user_id, suggestions=cleaned)

@app.post("/api/calendar/move-event", response_model=MoveEventResponse)
def calendar_move_event(payload: MoveEventRequest) -> MoveEventResponse:
    """
    Move a single Google Calendar event to a new start/end time.
    Used when the user confirms one agent suggestion.
    """
    user_id = payload.user_id
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    creds = load_google_credentials(user_id)
    if not creds:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar is not connected for this user",
        )

    service = build("calendar", "v3", credentials=creds)

    try:
        # fetch the event
        event = (
            service.events()
            .get(calendarId="primary", eventId=payload.event_id)
            .execute()
        )
    except HttpError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Event not found in Google Calendar: {e}",
        )

    # Keep existing timezone if possible
    start_info = event.get("start", {})
    end_info = event.get("end", {})
    tz = (
        start_info.get("timeZone")
        or end_info.get("timeZone")
        or "UTC"
    )

    # Overwrite start/end as timed events
    event["start"] = {
        "dateTime": payload.new_start_iso,
        "timeZone": tz,
    }
    event["end"] = {
        "dateTime": payload.new_end_iso,
        "timeZone": tz,
    }

    # Update on Google Calendar
    try:
        updated = (
            service.events()
            .update(calendarId="primary", eventId=payload.event_id, body=event)
            .execute()
        )
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update event: {e}",
        )

    new_start = updated["start"].get("dateTime") or updated["start"].get("date")
    new_end = updated["end"].get("dateTime") or updated["end"].get("date")

    return MoveEventResponse(
        success=True,
        event_id=payload.event_id,
        new_start_iso=new_start,
        new_end_iso=new_end,
    )


@app.post("/api/calendar/create-event", response_model=CreateEventResponse)
def calendar_create_event(payload: CreateEventRequest) -> CreateEventResponse:
    """
    Create a new Google Calendar event at the chosen time.
    Used after the agent suggests a good slot for a planned event.
    """
    user_id = payload.user_id
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    creds = load_google_credentials(user_id)
    if not creds:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar is not connected for this user",
        )

    service = build("calendar", "v3", credentials=creds)

    # For demo, assume Europe/Berlin, you can change if you want
    tz = "Europe/Berlin"

    event_body = {
        "summary": payload.title,
        "description": payload.description or "Created via she.Calendar",
        "start": {
            "dateTime": payload.start_iso,
            "timeZone": tz,
        },
        "end": {
            "dateTime": payload.end_iso,
            "timeZone": tz,
        },
    }

    try:
        created = (
            service.events()
            .insert(calendarId="primary", body=event_body)
            .execute()
        )
    except HttpError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create event: {e}",
        )

    start = created["start"].get("dateTime") or created["start"].get("date")
    end = created["end"].get("dateTime") or created["end"].get("date")

    return CreateEventResponse(
        success=True,
        event_id=created["id"],
        html_link=created.get("htmlLink"),
        start_iso=start,
        end_iso=end,
    )

