import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from googleapiclient.discovery import build
from openai import OpenAI

from .storage import load_google_credentials, PROFILES
from .phase_engine import get_cycle_day, get_phase
from .planning_rules import category_target_phases

client = OpenAI()  # uses OPENAI_API_KEY from env


def fetch_next_week_events(user_id: str) -> List[Dict[str, Any]]:
    """Fetch events for the next 7 days from the user's primary Google Calendar."""
    creds = load_google_credentials(user_id)
    if not creds:
        raise RuntimeError("Calendar not connected")

    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=7)).isoformat()

    events_result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    items = events_result.get("items", [])
    simplified = []
    for ev in items:
        simplified.append(
            {
                "id": ev.get("id"),
                "summary": ev.get("summary") or "",
                "description": ev.get("description") or "",
                "start": ev.get("start"),
                "end": ev.get("end"),
                "location": ev.get("location") or "",
            }
        )
    return simplified


def _extract_json_from_content(content: str) -> dict:
    """
    Accepts either plain JSON or a ```json ... ``` fenced block
    and returns a parsed dict.
    """
    text = content.strip()

    # If the model wrapped JSON in ```...``` fences, strip them
    if text.startswith("```"):
        lines = text.splitlines()

        # drop first line (``` or ```json)
        if lines:
            lines = lines[1:]

        # drop last line if it's ```
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]

        text = "\n".join(lines).strip()

        # if it still starts with "json" (from ```json), drop that word
        if text.lower().startswith("json"):
            first_newline = text.find("\n")
            if first_newline != -1:
                text = text[first_newline + 1 :].strip()

    # now text should be a pure JSON string
    return json.loads(text)


def _rule_based_suggestions(user_id: str) -> List[Dict[str, Any]]:
    """
    Fallback agent that does not depend on OpenAI.
    Uses your phase engine + category rules and always returns something
    if there are events.
    """
    profile = PROFILES.get(user_id)
    if not profile:
        raise RuntimeError("Profile not found")

    lps_raw = profile.get("last_period_start")
    if not lps_raw:
        raise RuntimeError("Profile incomplete")

    from datetime import date

    last_period_start = date.fromisoformat(lps_raw)
    cycle_length = profile.get("cycle_length", 28)
    bleed_days = profile.get("menstruation_phase_duration", 5)

    events = fetch_next_week_events(user_id)

    if not events:
        return [
            {
                "event_id": "no-events",
                "action": "keep",
                "new_start": None,
                "new_end": None,
                "reason": "You have no events in the next 7 days to reorganise.",
            }
        ]

    suggestions: List[Dict[str, Any]] = []

    for ev in events:
        title = (ev["summary"] or "").lower()

        if any(k in title for k in ["exam", "study", "lecture", "project"]):
            category = "work"
        elif any(k in title for k in ["party", "drinks", "friend", "dinner"]):
            category = "social"
        else:
            category = "work"

        start_info = ev["start"]
        if "dateTime" in start_info:
            start_dt = datetime.fromisoformat(
                start_info["dateTime"].replace("Z", "+00:00")
            )
        else:
            # all-day event: assume 09:00
            start_dt = datetime.fromisoformat(start_info["date"] + "T09:00:00")

        cycle_day = get_cycle_day(start_dt.date(), last_period_start, cycle_length)
        phase = get_phase(cycle_day, cycle_length, bleed_days)

        target_phases = category_target_phases(category)
        is_ideal = phase in target_phases

        if is_ideal:
            title = ev.get("summary") or "(no title)"
            suggestions.append(
                {
                    "event_id": ev["id"],
                    "event_title": title,
                    "action": "keep",
                    "new_start": None,
                    "new_end": None,
                    "reason": f"“{ev['summary']}” fits well in your {phase} phase.",
                }
            )
        else:
            # naive move +2 days
            title = ev.get("summary") or "(no title)"
            new_dt = start_dt + timedelta(days=2)
            suggestions.append(
                {
                    "event_id": ev["id"],
                    "event_title": title,
                    "action": "move",
                    "new_start": new_dt.isoformat(),
                    "new_end": (new_dt + (ev.get("end") and timedelta(hours=1) or timedelta())).isoformat()
                    if "dateTime" in start_info
                    else None,
                    "reason": (
                        f"Move “{title}” out of {phase} phase; "
                        f"a couple of days later fits your cycle better."
                    ),
                }
            )

    return suggestions


def run_planner_agent(user_id: str) -> List[Dict[str, Any]]:
    """
    Use OpenAI to plan the week. If the response is malformed or empty,
    fall back to the rule-based agent.
    """
    events = fetch_next_week_events(user_id)

    # If there are no events at all, just use rule-based message
    if not events:
        return _rule_based_suggestions(user_id)
    
    profile = PROFILES.get(user_id, {})
    weekly_quiz = profile.get("weekly_quiz")

    try:
        system_prompt = (
            "You are she.Calendar, an AI agent that improves a user's weekly "
    "schedule based on their menstrual cycle AND self-reported weekly check-in. "
    "The user payload will include:\n"
    "- 'events': the next 7 days of events from Google Calendar "
    "  (each has id, summary, start, end, etc.)\n"
    "- optionally 'weekly_quiz': {stress, concentration, energy, workout, social, symptoms}\n"
    "Use weekly_quiz to adjust how aggressively you move events.\n"
    "For each suggestion, include:\n"
    "- event_id (string) – the Google Calendar event id\n"
    "- event_title (string) – a short human-readable title from the event\n"
    "- action ('keep' or 'move')\n"
    "- new_start (ISO datetime or null)\n"
    "- new_end (ISO datetime or null)\n"
    "- reason (short explanation)\n"
    "Return ONLY a single valid JSON object, no prose, no markdown, "
    "no triple backticks. The JSON must have a top-level key 'suggestions' "
    "which is a list of these objects."
        )

        payload_for_model = {"events": events}
        if weekly_quiz:
            payload_for_model["weekly_quiz"] = weekly_quiz

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(payload_for_model, default=str),
            },
        ]

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=messages,
        )
        raw = completion.choices[0].message.content or ""

        parsed = _extract_json_from_content(raw)
        suggestions = parsed.get("suggestions", [])

        if not isinstance(suggestions, list) or not suggestions:
            # Model responded but gave nothing useful
            print("Agent returned empty or invalid 'suggestions', falling back.")
            return _rule_based_suggestions(user_id)

        return suggestions

    except Exception as e:
        # Any parsing / API error -> log and fall back
        print("Agent error, falling back to rule-based:", e)
        if raw:
            print("Agent raw content was:\n", raw)
        return _rule_based_suggestions(user_id)
