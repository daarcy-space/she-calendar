function OnboardingChoicePage({ onQuiz, onFloUpload, onBack }) {
  return (
    <div>
      <button onClick={onBack}>← Back</button>
      <h2>Welcome to she.Calendar</h2>
      <p>How do you want to start?</p>
      <button onClick={onQuiz}>Quick onboarding quiz</button>
      <button onClick={onFloUpload}>Upload Flo export</button>
    </div>
  );
}

export default OnboardingChoicePage;
