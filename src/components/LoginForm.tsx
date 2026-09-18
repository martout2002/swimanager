'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction } from '@/lib/actions';

const DEMO_ACCOUNTS = [
  ['Owner', 'owner@swimanager.test'],
  ['Instructor', 'lincoln@swimanager.test'],
  ['Parent — Aileen', 'aileen@swimanager.test'],
  ['Parent — Fiona', 'fiona@swimanager.test'],
];

function SubmitButton({ asParent }: { asParent: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <button
      className={`btn btn-coral btn-block${pending ? ' pending' : ''}`}
      style={{ marginTop: 16 }}
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <span className="spinner" />
          Signing in…
        </>
      ) : asParent ? (
        'Log in as parent'
      ) : (
        'Log in'
      )}
    </button>
  );
}

export function LoginForm() {
  const [asParent, setAsParent] = useState(false);
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">swiManager</div>
        <p className="login-tagline">
          One shared dataset behind all three views — mark attendance as Instructor, then check
          Owner → Billing or Parent to see it flow through.
        </p>

        <form action={formAction}>
          <input type="hidden" name="asParent" value={asParent ? '1' : '0'} />

          <h2 className="login-mode">{asParent ? 'Parent login' : 'Staff login'}</h2>
          <p className="login-hint">
            {asParent
              ? "Your child's progress, make-up credits and invoices."
              : 'Owner or instructor account.'}
          </p>

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error ? <div className="login-error">{state.error}</div> : null}

          <SubmitButton asParent={asParent} />
        </form>

        <div className="login-switch">
          <button type="button" onClick={() => setAsParent((v) => !v)}>
            {asParent ? 'Back to staff login' : 'Log in as parent'}
          </button>
        </div>

        {/* ponytail: demo credentials on the sign-in page. Delete this block before real families use it. */}
        <details className="login-demo">
          <summary>Demo accounts</summary>
          <table>
            <tbody>
              {DEMO_ACCOUNTS.map(([label, email]) => (
                <tr key={email}>
                  <td>{label}</td>
                  <td>{email}</td>
                </tr>
              ))}
              <tr>
                <td>Password</td>
                <td>swim1234</td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}
