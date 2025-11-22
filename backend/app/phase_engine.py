from datetime import date, timedelta
from typing import Dict, List


def get_cycle_day(today: date, last_period_start: date, cycle_length: int) -> int:
    """
    Returns the current cycle day (1..cycle_length).
    """
    if cycle_length <= 0:
        cycle_length = 28

    days_since_start = (today - last_period_start).days
    # allow negative (period in future) to wrap around
    cycle_day = (days_since_start % cycle_length) + 1
    return cycle_day


def get_phase(cycle_day: int, cycle_length: int, bleed_days: int) -> str:
    """
    Map cycle day to a phase slug.
    Simple 4-phase model:
      - menstrual
      - follicular
      - ovulation
      - luteal
    """
    if bleed_days <= 0:
        bleed_days = 5

    # crude model, good enough for hackathon
    ovulation_day = int(cycle_length * 0.5)
    late_follicular_start = bleed_days + 1
    ovulation_window_start = max(ovulation_day - 1, late_follicular_start + 1)
    ovulation_window_end = ovulation_day + 1
    luteal_start = ovulation_window_end + 1

    if cycle_day <= bleed_days:
        return "menstrual"
    if cycle_day <= ovulation_window_start - 1:
        return "follicular"
    if ovulation_window_start <= cycle_day <= ovulation_window_end:
        return "ovulation"
    return "luteal"


def get_phase_label(phase: str) -> str:
    return {
        "menstrual": "Menstrual phase",
        "follicular": "Follicular phase",
        "ovulation": "Ovulation window",
        "luteal": "Luteal phase",
    }.get(phase, "Unknown phase")


def get_phase_tips(phase: str) -> Dict[str, List[str] or str]:
    """
    Returns short, friendly tips for the current phase.
    """
    tips = {
        "menstrual": {
            "headline": "Low-energy, high-care days.",
            "do": [
                "Prioritise rest and low-pressure work.",
                "Block focused time for small, concrete tasks.",
                "Favour gentle movement: walks, stretching, yoga.",
            ],
            "avoid": [
                "Overloading your calendar with back-to-back meetings.",
                "Scheduling heavy workouts or intense social events.",
            ],
        },
        "follicular": {
            "headline": "Brain is sharp, energy is climbing.",
            "do": [
                "Plan deep-work blocks and heavy study sessions.",
                "Start new projects and brainstorming sessions.",
                "Schedule strength or higher-intensity workouts.",
            ],
            "avoid": [
                "Leaving important tasks for much later in the cycle.",
            ],
        },
        "ovulation": {
            "headline": "Peak visibility & social energy.",
            "do": [
                "Schedule presentations, networking, and social plans.",
                "Batch calls and collaborative work.",
                "Use your high energy for ambitious workouts.",
            ],
            "avoid": [
                "Hiding high-stakes tasks in low-energy days instead.",
            ],
        },
        "luteal": {
            "headline": "Energy slowly dips, detail-oriented mode.",
            "do": [
                "Tidy up tasks, documents, and code.",
                "Plan admin, reviews, and low-pressure work.",
                "Prioritise sleep and calmer movement.",
            ],
            "avoid": [
                "Overcommitting to last-minute high-social events.",
                "Scheduling big deadlines right before your period starts.",
            ],
        },
    }
    return tips.get(
        phase,
        {
            "headline": "Tune into how you feel today.",
            "do": ["Notice your energy and adjust where you can."],
            "avoid": [],
        },
    )
