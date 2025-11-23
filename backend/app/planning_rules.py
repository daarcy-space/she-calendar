# backend/app/planning_rules.py

def category_target_phases(category: str):
    """
    Map a task category to the menstrual phases where it usually fits best.
    """
    category = category.lower()
    if category in {"social", "dating", "networking"}:
        return ["follicular", "ovulation"]
    if category in {"work", "uni", "study", "deep_work"}:
        return ["follicular", "ovulation", "luteal"]
    if category in {"sport", "workout", "exercise"}:
        return ["follicular", "ovulation"]
    if category in {"rest"}:
        return ["menstrual", "luteal"]
    # default: accept all phases
    return ["menstrual", "follicular", "ovulation", "luteal"]
