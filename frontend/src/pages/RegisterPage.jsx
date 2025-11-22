import { useState } from "react";

function RegisterPage({ onRegisterSuccess, onBack }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }), // backend only needs email for now
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed");
      }

      const data = await res.json();
      onRegisterSuccess({
        userId: data.user_id,
        email: data.email,
        username: username.trim(),
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-root">
      <div className="screen-card">
        <button className="btn-ghost" type="button" onClick={onBack}>
          ← Back
        </button>

        <h2
          className="screen-title"
          style={{ fontSize: "1.6rem", marginTop: "1rem" }}
        >
          Create your account
        </h2>
        <p className="screen-subtitle">
          We&apos;ll use this to link your cycle, calendar and personalised tips.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="screen-field">
            <label className="screen-label">Name</label>
            <input
              className="screen-input"
              placeholder="What should we call you?"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="screen-field">
            <label className="screen-label">Email</label>
            <input
              type="email"
              className="screen-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              {loading ? "Creating account…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
