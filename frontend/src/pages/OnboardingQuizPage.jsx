import { useState } from "react";

function OnboardingQuizPage({ onComplete, onBack }) {
  const [step, setStep] = useState(1);

  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [bleedDays, setBleedDays] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [medication, setMedication] = useState("");
  const [activity, setActivity] = useState("medium");

  const symptomOptions = [
    "Cramps",
    "Headache",
    "Back pain",
    "Bloating",
    "Mood swings",
    "Nausea",
    "Tender breasts",
    "Acne",
    "Fatigue",
    "Insomnia",
  ];

  const toggleSymptom = (s) => {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => s - 1);

  const handleFinish = (e) => {
    e.preventDefault();

    if (!lastPeriodStart) {
      alert("Please tell us when your last period started.");
      setStep(1);
      return;
    }

    onComplete({
      last_period_start: lastPeriodStart, // "YYYY-MM-DD"
      menstruation_phase_duration: bleedDays ? Number(bleedDays) : null,
      cycle_length: cycleLength ? Number(cycleLength) : null,
      symptoms,
      medication: medication.trim(),
      workout_intensity: activity,
    });
  };

  const StepLabel = ({ current }) => (
    <p
      className="screen-subtitle"
      style={{ textAlign: "right", fontSize: "0.8rem" }}
    >
      Step {current} of 6
    </p>
  );

  return (
    <div className="screen-root">
      <div className="screen-card">
        <button className="btn-ghost" type="button" onClick={onBack}>
          ← Back
        </button>

        {/* STEP 1: last period start */}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <StepLabel current={1} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              When did your last period start?
            </h2>
            <p className="screen-subtitle">
              This helps she.Calendar calculate which day of your cycle you are
              on today.
            </p>

            <div className="screen-field" style={{ marginTop: "1.75rem" }}>
              <label className="screen-label">Start date</label>
              <input
                type="date"
                className="screen-input"
                value={lastPeriodStart}
                onChange={(e) => setLastPeriodStart(e.target.value)}
                required
              />
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn btn-primary" type="submit">
                Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: menstruation phase duration */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <StepLabel current={2} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              How long does your bleed usually last?
            </h2>
            <p className="screen-subtitle">
              Most periods are between 3 and 7 days. It&apos;s fine to estimate.
            </p>

            <div className="screen-field" style={{ marginTop: "1.75rem" }}>
              <label className="screen-label">Days of bleeding</label>
              <input
                type="number"
                min={1}
                max={10}
                className="screen-input"
                placeholder="For example, 5"
                value={bleedDays}
                onChange={(e) => setBleedDays(e.target.value)}
                required
              />
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-ghost" type="button" onClick={prev}>
                ← Previous
              </button>
              <button className="btn btn-primary" type="submit">
                Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: cycle length */}
        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <StepLabel current={3} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              How long is your full cycle?
            </h2>
            <p className="screen-subtitle">
              The classic number is 28 days, but anything between ~21–35 can be
              normal for adults.
            </p>

            <div className="screen-field" style={{ marginTop: "1.75rem" }}>
              <label className="screen-label">Cycle length in days</label>
              <input
                type="number"
                min={18}
                max={40}
                className="screen-input"
                placeholder="For example, 28"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                required
              />
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-ghost" type="button" onClick={prev}>
                ← Previous
              </button>
              <button className="btn btn-primary" type="submit">
                Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: symptoms */}
        {step === 4 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <StepLabel current={4} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              What do you usually feel during your period?
            </h2>
            <p className="screen-subtitle">
              Pick everything that sounds familiar. You can always change this
              later.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "1.75rem",
              }}
            >
              {symptomOptions.map((s) => {
                const active = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className="chip-btn"
                    style={{
                      padding: "0.5rem 0.9rem",
                      borderRadius: "999px",
                      border: active
                        ? "1px solid #a698ee"
                        : "1px solid #e5e7eb",
                      backgroundColor: active ? "#a698ee" : "#ffffff",
                      color: active ? "#ffffff" : "#111827",
                      fontSize: "0.8rem",
                    }}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-ghost" type="button" onClick={prev}>
                ← Previous
              </button>
              <button className="btn btn-primary" type="submit">
                Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: medication */}
        {step === 5 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <StepLabel current={5} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              Do you usually take anything for your symptoms?
            </h2>
            <p className="screen-subtitle">
              For example: ibuprofen, hormonal contraception, or &quot;nothing
              special&quot;.
            </p>

            <div className="screen-field" style={{ marginTop: "1.75rem" }}>
              <label className="screen-label">Your answer</label>
              <input
                className="screen-input"
                placeholder="Optional — you can keep it short"
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
              />
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-ghost" type="button" onClick={prev}>
                ← Previous
              </button>
              <button className="btn btn-primary" type="submit">
                Next
              </button>
            </div>
          </form>
        )}

        {/* STEP 6: activity slider */}
        {step === 6 && (
          <form onSubmit={handleFinish}>
            <StepLabel current={6} />
            <h2 className="screen-title" style={{ marginTop: "0.5rem" }}>
              How active is your lifestyle right now?
            </h2>
            <p className="screen-subtitle">
              This helps us suggest realistic workout and rest blocks.
            </p>

            <div style={{ marginTop: "2rem" }}>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={activity === "low" ? 0 : activity === "medium" ? 1 : 2}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setActivity(v === 0 ? "low" : v === 1 ? "medium" : "high");
                }}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  marginTop: "0.35rem",
                  color: "#6b7280",
                }}
              >
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                Current selection: <strong>{activity.toUpperCase()}</strong>
              </p>
            </div>

            <div className="screen-actions" style={{ marginTop: "2rem" }}>
              <button className="btn-ghost" type="button" onClick={prev}>
                ← Previous
              </button>
              <button className="btn btn-primary" type="submit">
                Save &amp; go to calendar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default OnboardingQuizPage;
