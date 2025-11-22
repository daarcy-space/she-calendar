import { useState } from "react";

function LoginPage({ onLoginSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }

      const data = await res.json();
      // adjust to whatever your backend returns
      onLoginSuccess({
        userId: data.user_id,
        email: data.email,
        lastPeriodStart: data.last_period_start,
        cycleLength: data.cycle_length,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not log in");
    } finally {
      setLoading(false);
    }
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
          Welcome back
        </h2>
        <p className="screen-subtitle">
          Log in and we&apos;ll run a quick check-in so your agent stays
          accurate.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="screen-field">
            <label className="screen-label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="screen-input"
              placeholder="you@example.com"
            />
          </div>

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

          <div className="screen-actions" style={{ marginTop: "1.75rem" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
