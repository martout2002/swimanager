export default function Loading() {
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-brand">swiManager</div>
        <p className="login-tagline" style={{ marginTop: 22 }}>
          <span className="spinner" style={{ width: 20, height: 20, marginRight: 10 }} />
          Loading…
        </p>
      </div>
    </div>
  );
}
