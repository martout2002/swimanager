import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  console.log('[test-login] Starting login...');
  
  const formData = await request.formData();
  console.log('[test-login] Got form data');
  
  // Skip DB, just create a test token
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  console.log('[test-login] Creating JWT...');
  
  const token = await new SignJWT({ email: 'test@test.com', name: 'Test', role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('test-id')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
  
  console.log('[test-login] Setting cookie...');
  
  const jar = await cookies();
  jar.set('swm_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  
  console.log('[test-login] Cookie set, redirecting...');
  redirect('/test-cookies');
}
