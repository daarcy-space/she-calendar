import { useState, useEffect } from "react";

import IntroPage from "./pages/IntroPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingChoicePage from "./pages/OnboardingChoicePage";
import OnboardingQuizPage from "./pages/OnboardingQuizPage";
import FloUploadPage from "./pages/FloUploadPage";
import LoginPage from "./pages/LoginPage";
import MonthlyQuizPage from "./pages/MonthlyQuizPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [step, setStep] = useState("intro");
  const [user, setUser] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Load user + calendar connection flag after reload / Google redirect
  useEffect(() => {
    const stored = localStorage.getItem("shecalendar_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setCalendarConnected(true);
      setStep("dashboard");
    }
  }, []);

  // Persist user so we still have it after redirect
  useEffect(() => {
    if (user) {
      localStorage.setItem("shecalendar_user", JSON.stringify(user));
    }
  }, [user]);

  // -------- first-time flow --------

  const handleFirstTime = () => {
    setStep("register");
  };

  const handleRegisterSuccess = (userData) => {
    // userData: { userId, email, username }
    setUser(userData);
    setStep("onboarding-choice");
  };

  const handleOnboardingQuizComplete = async (quizData) => {
    // quizData: {
    //   menstruation_phase_duration,
    //   cycle_length,
    //   symptoms,
    //   medication,
    //   workout_intensity,
    //   last_period_start
    // }
    if (!user?.userId) {
      alert("User missing in state");
      return;
    }

    const payload = {
      user_id: user.userId,
      last_period_start: quizData.last_period_start,
      cycle_length: quizData.cycle_length,
      menstruation_phase_duration: quizData.menstruation_phase_duration,
      symptoms: quizData.symptoms,
      medication: quizData.medication,
      workout_intensity: quizData.workout_intensity,
    };

    try {
      const res = await fetch("http://localhost:8000/api/profile/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("quiz save error", err);
        throw new Error(err.detail || "Failed to save profile");
      }

      const data = await res.json();

      setUser((prev) => ({
        ...prev,
        lastPeriodStart: data.last_period_start,
        cycleLength: data.cycle_length,
        menstruationPhaseDuration: data.menstruation_phase_duration,
        workoutIntensity: data.workout_intensity,
      }));

      setCalendarConnected(false);
      setStep("dashboard");
    } catch (e) {
      console.error(e);
      alert("Error saving your cycle info");
    }
  };

  // -------- returning user flow --------

  const handleReturningUser = () => {
    setStep("login");
  };

  const handleLoginSuccess = (userData) => {
    // userData: { userId, email, username?, ... }
    setUser(userData);
    setCalendarConnected(false); // or true later if you persist it
    setStep("dashboard");
  };

  const handleMonthlyQuizComplete = () => {
    setStep("dashboard");
  };

  // -------- Google Calendar connection --------

  const handleConnectCalendar = async () => {
    if (!user?.userId) {
      alert("No user found – please log in again.");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/google/auth-url?user_id=${user.userId}`
      );
      if (!res.ok) {
        throw new Error("Failed to get Google auth URL");
      }
      const data = await res.json();
      if (!data.auth_url) {
        throw new Error("No auth_url in response");
      }

      // navigate to Google
      window.location.href = data.auth_url;
    } catch (e) {
      console.error(e);
      alert("Could not start Google connection");
    }
  };

  // -------- render step machine --------

  return (
    <>
      {step === "intro" && (
        <IntroPage
          onFirstTime={handleFirstTime}
          onReturning={handleReturningUser}
        />
      )}

      {step === "register" && (
        <RegisterPage
          onRegisterSuccess={handleRegisterSuccess}
          onBack={() => setStep("intro")}
        />
      )}

      {step === "onboarding-choice" && (
        <OnboardingChoicePage
          onQuiz={() => setStep("onboarding-quiz")}
          onFloUpload={() => setStep("flo-upload")}
          onBack={() => setStep("register")}
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
          onComplete={() => {
            setCalendarConnected(false);
            setStep("dashboard");
          }}
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

      {step === "dashboard" && (
        <DashboardPage
          user={user}
          calendarConnected={calendarConnected}
          onConnectCalendar={handleConnectCalendar}
        />
      )}
    </>
  );
}

export default App;
