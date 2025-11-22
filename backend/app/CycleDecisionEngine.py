import csv
from datetime import date
from typing import Dict, Any, Optional


class CycleDecisionEngine:
    def __init__(self, csv_path: str, cycle_length: int = 28):
        """
        Initialize the decision engine and load the cycle template CSV into memory.
        """
        self.cycle_length = cycle_length
        self.template_by_day: Dict[int, Dict[str, Any]] = {}
        self._load_cycle_template(csv_path)

    def _load_cycle_template(self, csv_path: str) -> None:
        """
        Load CSV and store rows keyed by Cycle_Day.
        Assumes there is a 'Cycle_Day' column (1..28).
        """
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Adjust column name if needed to match your CSV
                cycle_day = int(row["Cycle_Day"])
                self.template_by_day[cycle_day] = row

        if not self.template_by_day:
            raise ValueError("No rows loaded from CSV. Check file and column names.")

    def _normalize_cycle_day(self, cycle_day: int) -> int:
        """
        Ensure cycle_day is mapped into 1..cycle_length (e.g. 1..28).
        """
        return ((cycle_day - 1) % self.cycle_length) + 1

    def get_cycle_row(self, cycle_day: int) -> Dict[str, Any]:
        """
        Return the template row (hormones + lifestyle info) for a given cycle day.
        """
        normalized_day = self._normalize_cycle_day(cycle_day)
        try:
            return self.template_by_day[normalized_day]
        except KeyError:
            raise KeyError(f"No template data for cycle_day={normalized_day}")

    @staticmethod
    def compute_cycle_day_from_dates(
        last_period_start: date,
        target_date: date,
        cycle_length: int = 28,
    ) -> int:
        """
        Compute cycle day given last period start and a target date.
        """
        days_since_start = (target_date - last_period_start).days
        return ((days_since_start) % cycle_length) + 1

    def decide_workout_intensity(
        self,
        cycle_day: int,
        desired_intensity: str,
    ) -> Dict[str, Any]:
        """
        Core decision function.
        Inputs:
          - cycle_day: integer (1..28)
          - desired_intensity: 'light' | 'moderate' | 'heavy'
        Returns a dict with recommended_intensity, ok_to_do_heavy, explanation, etc.
        """
        row = self.get_cycle_row(cycle_day)

        # Adjust these keys to match your CSV column names exactly
        phase: str = row.get("Cycle_Phase", "")
        # Convert string to int safely
        energy = int(row.get("Energy_Level_1to5", 3))
        rest_need = int(row.get("Rest_Need_1to5", 3))
        symptoms_raw = row.get("Expected_Symptoms", "") or ""
        symptoms = [s.strip() for s in symptoms_raw.split(",")] if symptoms_raw else []

        # 1) Base intensity by phase + cycle day
        if phase == "Menstrual":
            if cycle_day <= 2:
                base = "rest_or_very_light"
            else:
                base = "light"
        elif phase == "Follicular":
            if 6 <= cycle_day <= 10:
                base = "moderate_to_heavy"
            else:  # 11-13
                base = "heavy"
        elif phase == "Ovulatory":
            base = "heavy"
        else:  # Luteal
            if 16 <= cycle_day <= 21:
                base = "moderate"
            else:
                base = "light_or_moderate"

        # 2) Modify based on energy / rest / symptoms
        has_strong_pain = any(
            "strong_cramps" in s or "migraine" in s for s in symptoms
        )

        if energy <= 2 or rest_need >= 4 or has_strong_pain:
            # Override to light/rest
            recommended_intensity = "light"
            ok_heavy = False
            reason = (
                "Your template for this cycle day shows low energy or high need for rest "
                "and/or stronger symptoms. A light workout or gentle movement is recommended."
            )
        else:
            if base in ["heavy", "moderate_to_heavy"]:
                if desired_intensity == "heavy":
                    recommended_intensity = "heavy"
                    ok_heavy = True
                    reason = (
                        f"You are in a high-energy phase ({phase}) with good predicted capacity. "
                        "Heavy training is appropriate today if you feel up for it."
                    )
                else:
                    recommended_intensity = desired_intensity
                    ok_heavy = True
                    reason = (
                        "Your hormones support heavy training, but your chosen intensity is lower, "
                        "which is a safe and good option."
                    )
            elif base == "moderate":
                if desired_intensity == "heavy":
                    recommended_intensity = "moderate"
                    ok_heavy = False
                    reason = (
                        "Hormone and energy patterns suggest a moderate workout is better today. "
                        "Heavy training might be more fatiguing than usual."
                    )
                else:
                    recommended_intensity = desired_intensity
                    ok_heavy = True
                    reason = (
                        f"A {desired_intensity} workout fits your current luteal phase and "
                        "predicted energy level."
                    )
            else:  # base light_or_moderate or rest_or_very_light
                if desired_intensity == "heavy":
                    recommended_intensity = "light"
                    ok_heavy = False
                    reason = (
                        "This day is closer to PMS/menstrual conditions or shows higher rest need. "
                        "Heavy workouts are not recommended; choose light activity or rest instead."
                    )
                else:
                    recommended_intensity = "light"
                    ok_heavy = False
                    reason = (
                        "Light activity is recommended today to support recovery and hormone balance."
                    )

        return {
            "cycle_day": self._normalize_cycle_day(cycle_day),
            "cycle_phase": phase,
            "desired_intensity": desired_intensity,
            "base_intensity_pattern": base,
            "recommended_intensity": recommended_intensity,
            "ok_to_do_heavy": ok_heavy,
            "energy_level": energy,
            "rest_need": rest_need,
            "symptoms": symptoms,
            "reason": reason,
        }

    def decide_workout_from_date(
        self,
        last_period_start: date,
        target_date: date,
        desired_intensity: str,
        cycle_length: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Convenience method: you pass dates instead of cycle_day.
        """
        effective_len = cycle_length if cycle_length is not None else self.cycle_length
        cycle_day = self.compute_cycle_day_from_dates(
            last_period_start, target_date, effective_len
        )
        return self.decide_workout_intensity(cycle_day, desired_intensity)