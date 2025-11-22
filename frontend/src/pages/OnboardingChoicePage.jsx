function OnboardingChoicePage({ onQuiz, onFloUpload, onBack }) {
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
          How do you want to set up she.Calendar?
        </h2>
        <p className="screen-subtitle">
          You can either answer a quick quiz or upload your Flo export. Both
          give your agent the information it needs to start planning.
        </p>

        <div className="screen-actions" style={{ marginTop: "2rem" }}>
          <button onClick={onQuiz} className="btn btn-primary">
            Take the onboarding quiz
          </button>

          <button onClick={onFloUpload} className="btn btn-secondary">
            Upload my Flo data
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingChoicePage;
