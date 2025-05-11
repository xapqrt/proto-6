// src/lib/session.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server'; // Corrected import for NextResponse

const JWT_SECRET_KEY = process.env.JWT_SECRET;
const JWT_COOKIE_NAME = 'lifeos_session_token';
const JWT_EXPIRATION_TIME = '30d'; // Session expiration time

if (!JWT_SECRET_KEY) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env');
}

const secret = new TextEncoder().encode(JWT_SECRET_KEY);

interface UserJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  // Add other non-sensitive user data you might want in the JWT
  exp?: number; // Standard JWT expiration claim
}

export async function encrypt(payload: UserJWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION_TIME)
    .sign(secret);
}

export async function decrypt(token: string): Promise<UserJWTPayload | null> {
  try {
    const { payload } = await jwtVerify<UserJWTPayload>(token, secret, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function createSession(userId: string, email: string) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const sessionToken = await encrypt({ userId, email, exp: expires.getTime() / 1000 });

  const cookieStore = await cookies();
  cookieStore.set(JWT_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
  console.log(`Session created for user ${userId}, cookie set.`);
}

export async function getSessionFromCookie(): Promise<UserJWTPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(JWT_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return null;
  }
  return await decrypt(sessionCookie);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.set(JWT_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
  console.log('Session cookie deleted.');
}

// This function is used by middleware to update the session cookie's expiration.
export async function updateSessionCookie(request: NextRequest): Promise<NextResponse | undefined> {
  const sessionCookie = request.cookies.get(JWT_COOKIE_NAME)?.value;
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (!sessionCookie) {
    return response; // No session to update
  }

  const parsed = await decrypt(sessionCookie);
  if (parsed?.userId && parsed.email) {
    // Re-encrypt and set the cookie to refresh its expiration time
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const newSessionToken = await encrypt({ userId: parsed.userId, email: parsed.email, exp: expires.getTime() / 1000 });
    
    response.cookies.set(JWT_COOKIE_NAME, newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expires,
      sameSite: 'lax',
      path: '/',
    });
    console.log('Session cookie updated for user', parsed.userId);
  } else {
    // Invalid session, clear it
    response.cookies.set(JWT_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
  }
  return response;
}

