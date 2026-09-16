import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'swm_session';
const PUBLIC_PREFIXES = ['/login', '/_next', '/favicon', '/icon'];

const VIEW_FOR_ROLE: Record<string, string> = {
  owner: '/owner',
  instructor: '/instructor',
  parent: '/parent',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let role: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      role = typeof payload.role === 'string' ? payload.role : null;
    } catch {
      role = null;
    }
  }

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Each role has exactly one view; anything else lands them back on their own.
  const home = VIEW_FOR_ROLE[role] ?? '/login';
  if (pathname !== home) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
