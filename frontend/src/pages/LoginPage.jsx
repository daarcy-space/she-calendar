import { useState } from "react";

function LoginPage({ onLoginSuccess, onBack }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess({ email, profileId: "demo-existing-profile" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" onClick={onBack}>
        ← Back
      </button>
      <h2>Login</h2>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <button type="submit">Continue</button>
    </form>
  );
}

export default LoginPage;
