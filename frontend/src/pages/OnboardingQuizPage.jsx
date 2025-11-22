import { useState } from "react";

function OnboardingQuizPage({ onComplete, onBack }) {
  const [step, setStep] = useState(0);

  const [bleedDays, setBleedDays] = useState("");            // int
  const [cycleLength, setCycleLength] = useState("");        // int
  const [symptoms, setSymptoms] = useState([]);              // string[]
  const [medication, setMedication] = useState("");          // string
  const [activity, setActivity] = useState("medium");        // "low" | "medium" | "high"

  const symptomOptions = [
    "Cramps",
    "Headache",
    "Back pain",
    "Bloating",
    "Fatigue",
    "Mood swings",
    "Breast tenderness",
    "Nausea",
  ];

  const activityOptions = [
    { value: "low", label: "Low – gentle walks / yoga most days" },
    { value: "medium", label: "Medium – 2–3 workouts per week" },
    { value: "high", label: "High – training or sports 4+ days/wk" },
  ];

  const totalSteps = 5;

  const toggleSymptom = (symptom) => {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step === 0) {
      onBack();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleFinish = (e) => {
    e.preventDefault();

    const payload = {
      menstruation_phase_duration: bleedDays ? Number(bleedDays) : null,
      cycle_length: cycleLength ? Number(cycleLength) : null,
      symptoms,                         // array of strings
      medication: medication.trim(),    // string
      workout_intensity: activity,      // "low" | "medium" | "high"
    };

    onComplete(payload);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="screen-title" style={{ fontSize: "1.6rem" }}>
              Let&apos;s get to know your cycle
            </h2>
            <p className="screen-subtitle">
              We&apos;ll use this once to build your base pattern. You can
              always update it later.
            </p>

            <div className="screen-field" style={{ marginTop: "2rem" }}>
              <label className="screen-label">
                How many days does your bleeding usually last?
              </label>
              <input
                type="number"
                min={3}
                max={7}
                placeholder="For most people it’s 3–7 days"
                className="screen-input"
                value={bleedDays}
                onChange={(e) => setBleedDays(e.target.value)}
              />
              <p className="screen-subtitle" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                This helps us understand how long your menstrual phase should be
                treated as low-energy.
              </p>
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h2 className="screen-title" style={{ fontSize: "1.6rem" }}>
              How long is your whole cycle?
            </h2>
            <p className="screen-subtitle">
              From day 1 of one period to day 1 of the next.
            </p>

            <div className="screen-field" style={{ marginTop: "2rem" }}>
              <label className="screen-label">
                Typical cycle length (in days)
              </label>
              <input
                type="number"
                min={21}
                max={40}
                placeholder="Around 28 days for many, but your normal is what matters."
                className="screen-input"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
              />
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="screen-title" style={{ fontSize: "1.6rem" }}>
              How does your period usually feel?
            </h2>
            <p className="screen-subtitle">
              Pick the symptoms that show up most cycles. You can choose more
              than one.
            </p>

            <div className="quiz-options">
              {symptomOptions.map((s) => {
                const selected = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={
                      "quiz-chip" + (selected ? " quiz-chip-selected" : "")
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="screen-title" style={{ fontSize: "1.6rem" }}>
              Do you usually take anything to help?
            </h2>
            <p className="screen-subtitle">
              Painkillers, birth control, herbal remedies… whatever you feel
              comfortable sharing.
            </p>

            <div className="screen-field" style={{ marginTop: "2rem" }}>
              <label className="screen-label">
                Medication or support during your period
              </label>
              <textarea
                className="screen-textarea"
                placeholder="E.g. ibuprofen on day 1, heating pad, hormonal birth control, etc."
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
              />
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="screen-title" style={{ fontSize: "1.6rem" }}>
              What&apos;s your current activity level?
            </h2>
            <p className="screen-subtitle">
              This helps us suggest realistic workouts for each phase.
            </p>

            <div className="quiz-options" style={{ marginTop: "1.5rem" }}>
              {activityOptions.map((opt) => {
                const selected = activity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActivity(opt.value)}
                    className={
                      "quiz-chip quiz-chip-full" +
                      (selected ? " quiz-chip-selected" : "")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const isNextDisabled =
    (step === 0 && !bleedDays) ||
    (step === 1 && !cycleLength);

  return (
    <div className="screen-root">
      <form
        className="screen-card quiz-card"
        onSubmit={step === totalSteps - 1 ? handleFinish : (e) => e.preventDefault()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1rem",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            className="btn-ghost"
          >
            {step === 0 ? "← Back" : "← Previous"}
          </button>
          <span>
            Step {step + 1} of {totalSteps}
          </span>
        </div>

        {renderStep()}

        <div className="screen-actions" style={{ marginTop: "2rem" }}>
          {step < totalSteps - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={isNextDisabled}
            >
              Next
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              Finish setup
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default OnboardingQuizPage;
