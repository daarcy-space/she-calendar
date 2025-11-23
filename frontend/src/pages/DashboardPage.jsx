import { useEffect, useState } from "react";

function DashboardPage({
  user,
  calendarConnected,
  onConnectCalendar,
  onOpenPlanEvent,
  onOpenWeeklyQuiz,
}) {
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

  // agent-related state
  const [agentSuggestions, setAgentSuggestions] = useState([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState(null);
  const [applyingId, setApplyingId] = useState(null); // which suggestion is being applied

  const userId = user?.userId;

  const CYCLE_LENGTH_UI = 28; // used only for visual progress

  const renderCycleSphere = () => {
    if (!summary) return null;

    const day = summary.cycle_day;
    const progress = Math.max(0, Math.min(1, day / CYCLE_LENGTH_UI));

    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "999px",
          backgroundColor: "rgba(129, 140, 248, 0.08)", // soft pastel purple
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* background circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.25)" // light grey
            strokeWidth="4"
          />
          {/* progress arc */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="#4f46e5" // pastel-ish purple (main brand color)
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 48 48)" // start at top
          />
        </svg>

        <div
          style={{
            position: "relative",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#6b7280",
            }}
          >
            Day
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 600,
              color: "#111827",
              lineHeight: 1.1,
            }}
          >
            {day}
          </div>
        </div>
      </div>
    );
  };

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

  // -------- load cycle summary --------
  useEffect(() => {
    if (!userId || !calendarConnected) return;

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
  }, [userId, calendarConnected]);

  // -------- single-task planner (kept for now, not shown on this page) --------
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
      setPlanResult(data.suggestions[0]); // we only send one task
    } catch (e) {
      console.error(e);
      setError("Could not evaluate this plan.");
    } finally {
      setPlanning(false);
    }
  };

  // -------- agent: ask for week reorg --------
  const handleAskAgent = async () => {
    if (!userId) return;
    setAgentLoading(true);
    setAgentError(null);
    setAgentSuggestions([]);

    try {
      const res = await fetch(
        `http://localhost:8000/api/agent/plan-week?user_id=${userId}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Agent request failed");
      }
      const data = await res.json();
      setAgentSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
      setAgentError(e.message || "Could not ask the agent.");
    } finally {
      setAgentLoading(false);
    }
  };

  // -------- agent: apply single suggestion --------
  const handleApplySingleSuggestion = async (sug) => {
    if (!userId) return;
    if (sug.action !== "move" || !sug.new_start) return;

    // if backend suggestion has no new_end, assume +1h
    let newEnd = sug.new_end;
    if (!newEnd) {
      const start = new Date(sug.new_start);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      newEnd = end.toISOString();
    }

    setApplyingId(sug.event_id);
    try {
      await fetch("http://localhost:8000/api/calendar/move-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          event_id: sug.event_id,
          new_start_iso: sug.new_start,
          new_end_iso: newEnd,
        }),
      });

      // Remove this suggestion from the list after applying
      setAgentSuggestions((prev) =>
        prev.filter(
          (s) =>
            !(
              s.event_id === sug.event_id &&
              s.new_start === sug.new_start &&
              (s.new_end || "") === (sug.new_end || "")
            )
        )
      );
    } catch (e) {
      console.error(e);
      alert("Failed to apply this change.");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="screen-root">
      <div
        className="screen-card"
        style={{ textAlign: "left", position: "relative" }}
      >
        {/* Weekly quiz icon button */}
        <button
          type="button"
          onClick={onOpenWeeklyQuiz}
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            width: "2.2rem",
            height: "2.2rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
            boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✎
        </button>

        <h2
          className="screen-title"
          style={{ fontSize: "1.8rem", textAlign: "center" }}
        >
          Your cycle-aware calendar
        </h2>
        <p className="screen-subtitle" style={{ textAlign: "center" }}>
          {user?.username
            ? `Hi, ${user.username}.`
            : user?.email
            ? `Signed in as ${user.email}.`
            : "Profile loaded from your cycle data."}
        </p>

        {/* STEP 1: connect calendar */}
        {!calendarConnected && (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <p className="screen-subtitle">
              To let she.Calendar actually read and adjust your events, connect
              your Google Calendar.
            </p>
            <div className="screen-actions" style={{ marginTop: "1.5rem" }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onConnectCalendar}
              >
                Connect Google Calendar
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: connected – show everything */}
        {calendarConnected && (
          <>
            {/* Cycle summary */}
            <div style={{ marginTop: "2rem" }}>
              {loadingSummary && (
                <p className="screen-subtitle">Loading your cycle info…</p>
              )}

              {!loadingSummary && summary && (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      alignItems: "center",
                      marginTop: "0.5rem",
                    }}
                  >
                    {renderCycleSphere()}

                    <div>
                      <p
                        className="screen-subtitle"
                        style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}
                      >
                        Today is{" "}
                        <strong>
                          day {summary.cycle_day} of your{" "}
                          {summary.phase_label.toLowerCase()}
                        </strong>
                        .
                      </p>
                      <p
                        className="screen-subtitle"
                        style={{
                          marginTop: "0.15rem",
                          fontSize: "0.9rem",
                          color: "#000000ff",
                        }}
                      >
                        {summary.tips.headline}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "0.9rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      fontSize: "0.8rem",
                      color: "#4b5563",
                    }}
                  >
                    <div>
                      <strong
                        style={{ fontSize: "0.8rem", color: "#a698ee" }}
                      >
                        Lean into
                      </strong>
                      <ul
                        style={{
                          margin: "0.4rem 0 0 1rem",
                          padding: 0,
                          listStyle: "disc",
                        }}
                      >
                        {summary.tips.do.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    {summary.tips.avoid.length > 0 && (
                      <div>
                        <strong
                          style={{ fontSize: "0.8rem", color: "#a698ee" }}
                        >
                          Watch out for
                        </strong>
                        <ul
                          style={{
                            margin: "0.4rem 0 0 1rem",
                            padding: 0,
                            listStyle: "disc",
                          }}
                        >
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

            {/* Agent section */}
            <div style={{ marginTop: "2.5rem" }}>
              <h3
                className="screen-title"
                style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}
              >
                Let{" "}
                <span style={{ color: "#4f46e5" }}>she.Calendar</span> optimise
                your next 7 days
              </h3>

              <p className="screen-subtitle">
                The agent will scan your upcoming events and suggest which ones
                to keep and which ones to move for better phase alignment.
              </p>

              <div className="screen-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={agentLoading}
                  onClick={handleAskAgent}
                >
                  {agentLoading
                    ? "Asking the agent…"
                    : "Ask the agent to reorganise my week"}
                </button>
              </div>

              {agentError && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    marginTop: "0.75rem",
                  }}
                >
                  {agentError}
                </p>
              )}

              {agentSuggestions.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: 600,
                      marginBottom: "0.6rem",
                    }}
                  >
                    Suggested changes to your week
                  </h4>

                  {/* GRID of tiles instead of one long column */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "1rem",
                      marginTop: "0.5rem",
                      alignItems: "stretch",
                    }}
                  >
                    {agentSuggestions.map((sug, idx) => {
                      const isMove = sug.action === "move";
                      const isApplying = applyingId === sug.event_id;

                      return (
                        <div
                          key={sug.event_id + idx}
                          style={{
                            padding: "0.9rem 1.05rem",
                            borderRadius: "1rem",
                            backgroundColor: "#ffffff",
                            boxShadow:
                              "0 12px 32px rgba(15,23,42,0.08)",
                            border: "1px solid #e5e7eb",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem",
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.15rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  color: "#9ca3af",
                                }}
                              >
                                {isMove ? "Move" : "Keep"}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {sug.event_title || "(no title)"}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "999px",
                                border: "1px solid #e5e7eb",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {sug.action}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: "0.8rem",
                              margin: 0,
                              color: "#4b5563",
                            }}
                          >
                            {sug.reason}
                          </p>

                          {isMove && sug.new_start && (
                            <p
                              style={{
                                fontSize: "0.8rem",
                                margin: 0,
                                color: "#111827",
                              }}
                            >
                              New time:{" "}
                              <strong>{formatDateTime(sug.new_start)}</strong>
                              {sug.new_end && (
                                <>
                                  {" "}
                                  →{" "}
                                  <strong>
                                    {formatDateTime(sug.new_end)}
                                  </strong>
                                </>
                              )}
                            </p>
                          )}

                          {isMove && (
                            <div
                              className="screen-actions"
                              style={{ marginTop: "0.45rem" }}
                            >
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isApplying}
                                onClick={() =>
                                  handleApplySingleSuggestion(sug)
                                }
                              >
                                {isApplying
                                  ? "Applying…"
                                  : "Apply this change"}
                              </button>
                            </div>
                          )}

                          {!isMove && (
                            <p
                              style={{
                                fontSize: "0.75rem",
                                margin: 0,
                                color: "#6b7280",
                              }}
                            >
                              This event is already in a good spot – no change
                              needed.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick link to dedicated planning page */}
            <div style={{ marginTop: "2.5rem" }}>
              <h3
                className="screen-title"
                style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}
              >
                Plan a new event with{" "}
                <span style={{ color: "#4f46e5" }}>she.Calendar</span>
              </h3>
              <p className="screen-subtitle">
                Let the agent help you choose the best time for an upcoming task
                and add it directly to your Google Calendar.
              </p>
              <div className="screen-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onOpenPlanEvent}
                >
                  Plan a new event
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
