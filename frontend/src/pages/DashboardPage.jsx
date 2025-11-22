function DashboardPage({ user }) {
  return (
    <div className="screen-root">
      <div className="screen-card">
        <h2 className="screen-title" style={{ fontSize: "1.8rem" }}>
          Your cycle-aware calendar
        </h2>
        <p className="screen-subtitle">
          {user?.email
            ? `Signed in as ${user.email}.`
            : "Profile loaded from your cycle data."}
        </p>

        <div className="screen-actions" style={{ marginTop: "2rem" }}>
          <button className="btn btn-primary">
            Connect Google Calendar
          </button>

          <button className="btn btn-secondary">
            Generate this month&apos;s plan
          </button>
        </div>

        <p
          className="screen-subtitle"
          style={{ marginTop: "2rem", fontSize: "0.8rem" }}
        >
          We&apos;ll reorganise flexible events and add workouts at the best
          moments in your cycle, then push everything back into your calendar.
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;
