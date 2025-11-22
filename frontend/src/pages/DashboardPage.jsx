import { useEffect, useState } from "react";

function DashboardPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [category, setCategory] = useState("work");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [planResult, setPlanResult] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.userId;

  useEffect(() => {
    if (!userId) return;

    const fetchSummary = async () => {
      setLoadingSummary(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:8000/api/user/${userId}/cycle-summary`
        );
        if (!res.ok) {
          throw new Error("Failed to load cycle summary");
        }
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        console.error(e);
        setError("Could not load your cycle info.");
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [userId]);

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !date || !time || !planTitle) return;

    const start_iso = new Date(`${date}T${time}:00`).toISOString();

    const payload = {
      user_id: userId,
      tasks: [
        {
          title: planTitle,
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
        throw new Error("Planning request failed");
      }
      const data = await res.json();
      setPlanResult(data.suggestions[0]); // we sent exactly one task
    } catch (e) {
      console.error(e);
      setError("Could not evaluate this plan.");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="screen-root">
      <div className="screen-card" style={{ textAlign: "left" }}>
        <h2 className="screen-title" style={{ fontSize: "1.8rem", textAlign: "center" }}>
          Your cycle-aware calendar
        </h2>
        <p className="screen-subtitle" style={{ textAlign: "center" }}>
          {user?.email
            ? `Signed in as ${user.email}.`
            : "Profile loaded from your cycle data."}
        </p>

        {/* Cycle summary */}
        <div style={{ marginTop: "1.75rem" }}>
          {loadingSummary && (
            <p className="screen-subtitle">Loading your cycle info…</p>
          )}

          {!loadingSummary && summary && (
            <>
              <p className="screen-subtitle" style={{ fontSize: "0.9rem" }}>
                Today is{" "}
                <strong>
                  day {summary.cycle_day} of your {summary.phase_label.toLowerCase()}
                </strong>
                .
              </p>
              <p
                className="screen-subtitle"
                style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}
              >
                {summary.tips.headline}
              </p>

              <div
                style={{
                  marginTop: "0.9rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.8rem" }}>Lean into</strong>
                  <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
                    {summary.tips.do.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
                {summary.tips.avoid.length > 0 && (
                  <div>
                    <strong style={{ fontSize: "0.8rem" }}>Watch out for</strong>
                    <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
                      {summary.tips.avoid.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Plan something section */}
        <div style={{ marginTop: "2.5rem" }}>
          <h3
            className="screen-title"
            style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}
          >
            Plan something for next week
          </h3>
          <p className="screen-subtitle">
            Tell us what you&apos;re planning and when. We&apos;ll tell you if
            that slot matches your phase.
          </p>

          <form onSubmit={handlePlanSubmit}>
            <div className="screen-field">
              <label className="screen-label">What is it?</label>
              <input
                className="screen-input"
                placeholder="E.g. group study session, friend meetup, job interview"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
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
                <option value="uni">Uni / Study</option>
                <option value="social">Social / Friends</option>
                <option value="selfcare">Self-care / Rest</option>
              </select>
            </div>

            <div
              className="screen-field"
              style={{ display: "flex", gap: "0.75rem" }}
            >
              <div style={{ flex: 1 }}>
                <label className="screen-label">Day</label>
                <input
                  type="date"
                  className="screen-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="screen-label">Start time</label>
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
                {planning ? "Checking your phase…" : "Ask she.Calendar to check"}
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
              }}
            >
              <strong>
                {planResult.is_ideal
                  ? "Great timing."
                  : "We found a better slot."}
              </strong>
              <p style={{ marginTop: "0.35rem" }}>{planResult.reason}</p>
              <p style={{ marginTop: "0.35rem" }}>
                Current plan:{" "}
                <code>{planResult.original_start_iso.slice(0, 16)}</code>{" "}
                ({planResult.phase_at_original} phase)
              </p>
              {!planResult.is_ideal && planResult.suggested_start_iso && (
                <p style={{ marginTop: "0.35rem" }}>
                  Suggested:{" "}
                  <code>{planResult.suggested_start_iso.slice(0, 16)}</code>{" "}
                  ({planResult.suggested_phase} phase)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
