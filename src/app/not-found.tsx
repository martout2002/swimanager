import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="kicker">404</div>
        <div className="login-brand">Nothing here</div>
        <p className="login-tagline">That page has moved or never existed.</p>
        <Link className="btn btn-coral btn-block" style={{ marginTop: 18 }} href="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
