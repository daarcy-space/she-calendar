import { useState } from "react";

function LevelSelector({ value, onChange }) {
  return (
    <div
      style={{
        marginTop: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const active = value > 0 && level <= value;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              style={{
                width: "2.6rem",
                height: "2.6rem",
                borderRadius: "999px",
                border: active ? "1px solid #a698ee" : "1px solid #e5e7eb",
                backgroundColor: active ? "#a698ee" : "#ffffff",
                color: active ? "#ffffff" : "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: active
                  ? "0 14px 28px rgba(200, 193, 233, 0.55)"
                  : "0 8px 18px rgba(15, 23, 42, 0.10)",
                transition:
                  "background-color 0.15s ease, color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s ease",
              }}
            >
              {level}
            </button>
          );
        })}
      </div>
      <p
        style={{
          fontSize: "0.85rem",
          color: "#9ca3af",
          marginTop: "0.5rem",
        }}
      >
        1 = very low · 5 = very high
      </p>
    </div>
  );
}

function WeeklyQuizPage({ user, onComplete, onBack }) {
  const userId = user?.userId;

  // 0 = not answered yet
  const [stress, setStress] = useState(0);
  const [concentration, setConcentration] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [workout, setWorkout] = useState(0);
  const [social, setSocial] = useState(0);

  const [step, setStep] = useState(1); // 1..5
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const questions = [
    {
      id: 1,
      title: "Stress level last week",
      helper: "How tense, overwhelmed, or on edge did you feel most of the week?",
      value: stress,
      setter: setStress,
    },
    {
      id: 2,
      title: "Concentration / focus",
      helper: "How easy was it to focus on tasks and stay in the flow?",
      value: concentration,
      setter: setConcentration,
    },
    {
      id: 3,
      title: "Overall energy level",
      helper: "Think about your physical and mental energy combined.",
      value: energy,
      setter: setEnergy,
    },
    {
      id: 4,
      title: "Workout productivity",
      helper: "How strong or effective did your workouts or movement feel?",
      value: workout,
      setter: setWorkout,
    },
    {
      id: 5,
      title: "Social battery",
      helper: "How much energy did you have for social plans and people?",
      value: social,
      setter: setSocial,
    },
  ];

  const current = questions[step - 1];

  const handleNext = () => {
    if (current.value === 0) {
      setError("Please choose a level before continuing.");
      return;
    }
    setError(null);
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert("No user found – please log in again.");
      return;
    }

    // last step: make sure all questions have answers
    if ([stress, concentration, energy, workout, social].some((v) => v === 0)) {
      setError("Please answer all questions before saving your check-in.");
      return;
    }

    const payload = {
      user_id: userId,
      stress,
      concentration,
      energy,
      workout,
      social,
    };

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/profile/weekly-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save weekly quiz.");
      }

      await res.json();
      onComplete();
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not save weekly quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="screen-root"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
      }}
    >
      <div
        className="screen-card"
        style={{
          maxWidth: 520,
          width: "100%",
          margin: "3.5rem auto 0 auto",
        }}
      >
        <h2
          className="screen-title"
          style={{ fontSize: "2rem", textAlign: "center" }}
        >
          Weekly check-in
        </h2>
        <p className="screen-subtitle" style={{ textAlign: "center" }}>
          Tell she.Calendar how last week felt – we&apos;ll use this to tune
          next week&apos;s suggestions.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "2rem" }}>
          {/* Step indicator */}
          <p
            className="screen-subtitle"
            style={{
              textAlign: "right",
              fontSize: "0.85rem",
              color: "#9ca3af",
              marginBottom: "0.5rem",
            }}
          >
            Step {step} of 5
          </p>

          {/* Current question */}
          <div
            style={{
              textAlign: "center",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "#111827",
              }}
            >
              {current.title}
            </h3>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#6b7280",
                maxWidth: "28rem",
                margin: "0 auto",
              }}
            >
              {current.helper}
            </p>

            <LevelSelector value={current.value} onChange={current.setter} />
          </div>

          {error && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "0.8rem",
                marginTop: "1rem",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          {/* Navigation buttons */}
          <div
            className="screen-actions"
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={step === 1 || submitting}
            >
              ← Previous
            </button>

            {step < 5 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={submitting}
              >
                Next →
              </button>
            )}

            {step === 5 && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save check-in"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default WeeklyQuizPage;
