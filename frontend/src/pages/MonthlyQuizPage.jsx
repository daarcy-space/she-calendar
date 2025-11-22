import { useState } from "react";

function MonthlyQuizPage({ user, onComplete, onSkip }) {
  const [energy, setEnergy] = useState("mixed");

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({ email: user?.email, last_month_energy: energy });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Monthly check-in</h2>
      <p>How was your last cycle?</p>
      <select
        value={energy}
        onChange={(e) => setEnergy(e.target.value)}
      >
        <option value="stable">Mostly stable</option>
        <option value="mixed">Up and down</option>
        <option value="low">Mostly low</option>
        <option value="high">Unusually high</option>
      </select>
      <button type="submit">Save</button>
      <button type="button" onClick={onSkip}>
        Skip
      </button>
    </form>
  );
}

export default MonthlyQuizPage;
