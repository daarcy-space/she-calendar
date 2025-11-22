function IntroPage({ onFirstTime, onReturning }) {
  return (
    <div>
      <h1>she.Calendar</h1>
      <p>Sync your calendar with your cycle.</p>
      <button onClick={onFirstTime}>It&apos;s my first time here</button>
      <button onClick={onReturning}>I already use she.Calendar</button>
    </div>
  );
}

export default IntroPage;
