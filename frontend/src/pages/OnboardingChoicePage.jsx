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
          How do you want to start?
        </h2>
        <p className="screen-subtitle">
          You can take a quick onboarding quiz or upload your Flo export.
        </p>

        <div className="screen-actions">
          <button onClick={onQuiz} className="btn btn-primary">
            Quick onboarding quiz
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
