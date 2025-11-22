function IntroPage({ onFirstTime, onReturning }) {
  return (
    <div className="screen-root">
      <div className="screen-card">
        <h1 className="screen-title">she.Calendar</h1>
        <p className="screen-subtitle">
          An AI agent that syncs your calendar with your cycle.
        </p>

        <div className="screen-actions">
          <button
            onClick={onFirstTime}
            className="btn btn-primary"
          >
            It&apos;s my first time here
          </button>

          <button
            onClick={onReturning}
            className="btn btn-secondary"
          >
            I already use she.Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntroPage;
