import { useState } from "react";

function OnboardingQuizPage({ onComplete, onBack }) {
  const [email, setEmail] = useState("");
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [cycleLength, setCycleLength] = useState(28);

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      email,
      last_period_start: lastPeriodStart,
      cycle_length: Number(cycleLength),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" onClick={onBack}>
        ← Back
      </button>
      <h2>Onboarding quiz</h2>

      <div>
        <label>Email: </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label>First day of last period: </label>
        <input
          type="date"
          required
          value={lastPeriodStart}
          onChange={(e) => setLastPeriodStart(e.target.value)}
        />
      </div>

      <div>
        <label>Average cycle length (days): </label>
        <input
          type="number"
          value={cycleLength}
          onChange={(e) => setCycleLength(e.target.value)}
        />
      </div>

      <button type="submit">Continue</button>
    </form>
  );
}

export default OnboardingQuizPage;
