import { cookies } from 'next/headers';

export default async function TestPage() {
  const jar = await cookies();
  const session = jar.get('swm_session');
  
  return (
    <div style={{ padding: 20 }}>
      <h1>Cookie Test</h1>
      <pre>{JSON.stringify({
        hasCookie: !!session,
        cookiePreview: session?.value?.substring(0, 30),
        allCookies: jar.getAll().map(c => c.name),
      }, null, 2)}</pre>
      <form action="/test-login" method="POST">
        <input name="email" type="email" defaultValue="owner@swimanager.test" />
        <input name="password" type="password" defaultValue="swim1234" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
