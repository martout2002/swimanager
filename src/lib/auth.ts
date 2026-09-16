import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, type Role } from '@/db/schema';

export const SESSION_COOKIE = 'swm_session';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short. Set it in .env and on Vercel.');
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Which family a parent account sees. Null for staff. */
  parentName: string | null;
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  owner: '/owner',
  instructor: '/instructor',
  parent: '/parent',
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    parentName: payload.parentName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS_SECONDS}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: (payload.role as Role) ?? 'instructor',
      parentName: payload.parentName ? String(payload.parentName) : null,
    };
  } catch {
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorizedError';
  }
}

/** Session, or throw. Pass roles to also gate on role. */
export async function requireSession(...allowed: Role[]): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) throw new UnauthorizedError();
  if (allowed.length && !allowed.includes(session.role)) throw new UnauthorizedError();
  return session;
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}
