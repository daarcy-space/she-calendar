import { useState } from "react";

function PlanEventPage({ user, onBack }) {
  const userId = user?.userId;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("work");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);

  const [planResult, setPlanResult] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const formatDateTime = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const handleCheckSlot = async (e) => {
    e.preventDefault();
    if (!userId || !date || !time || !title) {
      setError("Please fill in title, date and time.");
      return;
    }

    const start_iso = new Date(`${date}T${time}:00`).toISOString();

    const payload = {
      user_id: userId,
      tasks: [
        {
          title,
          category,
          start_iso,
          duration_hours: Number(duration) || 1,
        },
      ],
    };

    setPlanning(true);
    setPlanResult(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/plan/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Planning request failed");
      }
      const data = await res.json();
      setPlanResult(data.suggestions[0]);
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not evaluate this plan.");
    } finally {
      setPlanning(false);
    }
  };

  const createEventWithStart = async (startIso) => {
    if (!userId) return;
    setCreating(true);
    setError(null);

    try {
      const start = new Date(startIso);
      const end = new Date(
        start.getTime() + (Number(duration) || 1) * 60 * 60 * 1000
      );
      const payload = {
        user_id: userId,
        title,
        start_iso: start.toISOString(),
        end_iso: end.toISOString(),
        description: `Category: ${category}. Planned via she.Calendar.`,
      };

      const res = await fetch(
        "http://localhost:8000/api/calendar/create-event",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create event.");
      }

      const data = await res.json();
      alert("Event created in your Google Calendar.");
      console.log("Created event:", data);
      onBack(); // go back to dashboard
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not create event.");
    } finally {
      setCreating(false);
    }
  };

  const handleUseOriginal = () => {
    if (!planResult) return;
    createEventWithStart(planResult.original_start_iso);
  };

  const handleUseSuggested = () => {
    if (!planResult || !planResult.suggested_start_iso) return;
    createEventWithStart(planResult.suggested_start_iso);
  };

  return (
    <div className="screen-root">
      <div className="screen-card" style={{ textAlign: "left" }}>
        <h2
          className="screen-title"
          style={{ fontSize: "1.8rem", textAlign: "center" }}
        >
          Plan a new event
        </h2>
        <p className="screen-subtitle" style={{ textAlign: "center" }}>
          Tell she.Calendar what you want to do – it will suggest the best slot
          and add it into your Google Calendar.
        </p>

        <div className="screen-actions" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
          >
            ← Back to dashboard
          </button>
        </div>

        <form onSubmit={handleCheckSlot} style={{ marginTop: "1.5rem" }}>
          <div className="screen-field">
            <label className="screen-label">What is it?</label>
            <input
              className="screen-input"
              placeholder="E.g. exam, deep work block, workout, meetup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="screen-field">
            <label className="screen-label">Category</label>
            <select
              className="screen-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="work">Work / Career</option>
              <option value="uni">University / Study Session</option>
              <option value="social">Social Event / Meeting</option>
              <option value="sport">Fitness / Workout</option>
            </select>
          </div>

          <div
            className="screen-field"
            style={{ display: "flex", gap: "0.75rem" }}
          >
            <div style={{ flex: 1 }}>
              <label className="screen-label">Preferred day</label>
              <input
                type="date"
                className="screen-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="screen-label">Preferred start time</label>
              <input
                type="time"
                className="screen-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="screen-field">
            <label className="screen-label">Duration (hours)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="screen-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="screen-actions" style={{ marginTop: "1.75rem" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={planning}
            >
              {planning
                ? "Checking best slot…"
                : "Ask she.Calendar to check this slot"}
            </button>
          </div>
        </form>

        {error && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "0.8rem",
              marginTop: "0.75rem",
            }}
          >
            {error}
          </p>
        )}

        {planResult && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.1rem",
              borderRadius: "1rem",
              backgroundColor: planResult.is_ideal ? "#ecfdf3" : "#fef3c7",
              fontSize: "0.85rem",
              color: "#374151", // dark grey text for better readability
            }}
          >
            <strong
              style={{
                color: "#111827", // almost-black headline
              }}
            >
              {planResult.is_ideal
                ? "Your chosen time looks great."
                : "We found a better cycle-friendly slot."}
            </strong>

            <p style={{ marginTop: "0.35rem" }}>{planResult.reason}</p>

            <p style={{ marginTop: "0.35rem" }}>
              Your chosen time:{" "}
              <code>{formatDateTime(planResult.original_start_iso)}</code>{" "}
              <span style={{ color: "#6b7280" }}>
                ({planResult.phase_at_original} phase)
              </span>
            </p>

            {!planResult.is_ideal && planResult.suggested_start_iso && (
              <p style={{ marginTop: "0.35rem" }}>
                Suggested time:{" "}
                <code>{formatDateTime(planResult.suggested_start_iso)}</code>{" "}
                <span style={{ color: "#6b7280" }}>
                  ({planResult.suggested_phase} phase)
                </span>
              </p>
            )}

            <div
              className="screen-actions"
              style={{ marginTop: "0.9rem", gap: "0.5rem" }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={creating}
                onClick={handleUseOriginal}
              >
                {creating ? "Creating…" : "Use my original time"}
              </button>

              {!planResult.is_ideal && planResult.suggested_start_iso && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={creating}
                  onClick={handleUseSuggested}
                >
                  {creating ? "Creating…" : "Use suggested time"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanEventPage;
