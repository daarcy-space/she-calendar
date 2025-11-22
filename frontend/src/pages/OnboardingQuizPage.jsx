import { useState } from "react";

function OnboardingQuizPage({ onComplete, onBack }) {
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [workoutPref, setWorkoutPref] = useState("evening");

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      last_period_start: lastPeriodStart,
      cycle_length: Number(cycleLength),
      prefers_workout_time: workoutPref,
    });
  };

  return (
    <div className="screen-root">
      <div className="screen-card">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>

        <h2
          className="screen-title"
          style={{ fontSize: "1.6rem", marginTop: "1rem" }}
        >
          Understand your cycle
        </h2>
        <p className="screen-subtitle">
          A few quick questions so we can align your calendar with your phases.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="screen-field">
            <label className="screen-label">
              First day of your last period
            </label>
            <input
              type="date"
              required
              value={lastPeriodStart}
              onChange={(e) => setLastPeriodStart(e.target.value)}
              className="screen-input"
            />
          </div>

          <div className="screen-field">
            <label className="screen-label">Average cycle length (days)</label>
            <input
              type="number"
              min={21}
              max={35}
              value={cycleLength}
              onChange={(e) => setCycleLength(e.target.value)}
              className="screen-input"
            />
          </div>

          <div className="screen-field">
            <label className="screen-label">
              When do you prefer to work out?
            </label>
            <select
              value={workoutPref}
              onChange={(e) => setWorkoutPref(e.target.value)}
              className="screen-select"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          <div className="screen-actions" style={{ marginTop: "1.75rem" }}>
            <button type="submit" className="btn btn-primary">
              Save & continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OnboardingQuizPage;
