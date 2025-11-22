import { useState } from "react";
import IntroPage from "./pages/IntroPage";
import OnboardingChoicePage from "./pages/OnboardingChoicePage";
import OnboardingQuizPage from "./pages/OnboardingQuizPage";
import FloUploadPage from "./pages/FloUploadPage";
import LoginPage from "./pages/LoginPage";
import MonthlyQuizPage from "./pages/MonthlyQuizPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [step, setStep] = useState("intro");
  const [user, setUser] = useState(null);

  const handleFirstTime = () => setStep("onboarding-choice");
  const handleReturningUser = () => setStep("login");

  const handleOnboardingQuizComplete = (profileData) => {
    console.log("Onboarding quiz data:", profileData);
    setUser({ email: profileData.email || null, profileId: "temp-profile" });
    setStep("dashboard");
  };

  const handleFloUploadComplete = (profileId) => {
    console.log("Flo profile created:", profileId);
    setUser({ email: null, profileId });
    setStep("dashboard");
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setStep("monthly-quiz");
  };

  const handleMonthlyQuizComplete = (quizData) => {
    console.log("Monthly quiz:", quizData);
    setStep("dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div style={{ width: "100%", maxWidth: 48000, padding: 24 }}>
        {step === "intro" && (
          <IntroPage
          onFirstTime={handleFirstTime}
          onReturning={handleReturningUser}
          />
        )}
        {step === "onboarding-choice" && (
          <OnboardingChoicePage
            onQuiz={() => setStep("onboarding-quiz")}
            onFloUpload={() => setStep("flo-upload")}
            onBack={() => setStep("intro")}
          />
        )}
        {step === "onboarding-quiz" && (
          <OnboardingQuizPage
            onComplete={handleOnboardingQuizComplete}
            onBack={() => setStep("onboarding-choice")}
          />
        )}
        {step === "flo-upload" && (
          <FloUploadPage
            onComplete={handleFloUploadComplete}
            onBack={() => setStep("onboarding-choice")}
          />
        )}
        {step === "login" && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setStep("intro")}
          />
        )}
        {step === "monthly-quiz" && (
          <MonthlyQuizPage
            user={user}
            onComplete={handleMonthlyQuizComplete}
            onSkip={() => setStep("dashboard")}
          />
        )}
        {step === "dashboard" && <DashboardPage user={user} />}
      </div>
    </div>
  );
}

export default App;
