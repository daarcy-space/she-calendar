function DashboardPage({ user }) {
  return (
    <div>
      <h2>Dashboard</h2>
      <p>
        {user?.email
          ? `Signed in as ${user.email}`
          : "Profile loaded from cycle data."}
      </p>
      <p>Next step: connect Google Calendar & generate your plan.</p>
    </div>
  );
}

export default DashboardPage;
