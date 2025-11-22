import { useState } from "react";

function MonthlyQuizPage({ user, onComplete, onSkip }) {
  const [energy, setEnergy] = useState("mixed");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      user_id: user?.userId,
      last_month_energy: energy,
      notes,
    });
  };

  return (
    <div className="screen-root">
      <div className="screen-card">
        <button type="button" onClick={onSkip} className="btn-ghost">
          Skip for now →
        </button>

        <h2
          className="screen-title"
          style={{ fontSize: "1.6rem", marginTop: "1rem" }}
        >
          Monthly check-in
        </h2>
        <p className="screen-subtitle">
          Two quick questions so your agent keeps learning from your cycle.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="screen-field">
            <label className="screen-label">
              How did your energy feel this cycle?
            </label>
            <select
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className="screen-select"
            >
              <option value="stable">Mostly stable</option>
              <option value="mixed">Up and down</option>
              <option value="low">Mostly low</option>
              <option value="high">Unusually high</option>
            </select>
          </div>

          <div className="screen-field">
            <label className="screen-label">
              Anything that stood out? (symptoms, mood, sleep)
            </label>
            <textarea
              className="screen-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional, but helpful for smarter planning."
            />
          </div>

          <div className="screen-actions" style={{ marginTop: "1.75rem" }}>
            <button className="btn btn-primary" type="submit">
              Save check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MonthlyQuizPage;
