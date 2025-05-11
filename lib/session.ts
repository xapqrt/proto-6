// Improved session handling module
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_CONFIG, APP_CONFIG } from './config';

const { JWT_SECRET, JWT_COOKIE_NAME, JWT_EXPIRATION_DAYS } = AUTH_CONFIG;
const JWT_EXPIRATION_TIME = `${JWT_EXPIRATION_DAYS}d`; // Session expiration time as string

// Create the secret key for JWT operations
const secret = new TextEncoder().encode(JWT_SECRET);

// Cache for session data to avoid constant verification
const sessionCache = new Map<string, {
  payload: UserJWTPayload,
  timestamp: number
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface UserJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  exp?: number; // Standard JWT expiration claim
}

export async function encrypt(payload: UserJWTPayload): Promise<string> {
  try {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION_TIME)
      .sign(secret);
  } catch (error) {
    console.error('JWT encryption error:', error);
    throw new Error('Failed to create session token');
  }
}

export async function decrypt(token: string): Promise<UserJWTPayload> {
  try {
    // Check cache first
    if (sessionCache.has(token)) {
      const cached = sessionCache.get(token)!;
      // Check if cached entry is still valid
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.payload;
      }
      // Remove expired cache entry
      sessionCache.delete(token);
    }

    // Verify the token
    const { payload } = await jwtVerify(token, secret);
    const userPayload = payload as UserJWTPayload;
    
    // Cache the result
    sessionCache.set(token, {
      payload: userPayload,
      timestamp: Date.now()
    });
    
    return userPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    throw new Error('Invalid or expired session token');
  }
}

// Gets the session data from the cookie without throwing exceptions
export async function getSessionFromCookie(): Promise<UserJWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_COOKIE_NAME)?.value;

    if (!token) return null;
    
    const payload = await decrypt(token);
    return payload;
  } catch (error) {
    // Log error but don't throw to prevent app crashes
    console.error('Session retrieval error:', error);
    return null;
  }
}

// Updates the session cookie with a fresh expiration
export async function updateSessionCookie(request: NextRequest): Promise<NextResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    const newToken = await encrypt(payload);
    
    const response = NextResponse.next();
    
    // Set the new cookie with fresh expiration
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: JWT_EXPIRATION_DAYS * 24 * 60 * 60, // Convert days to seconds
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Session update error:', error);
    return null;
  }
}

// Use this in API routes to get the current user
export async function getCurrentUser() {
  const session = await getSessionFromCookie();
  if (!session?.userId) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function createSession(userId: string, email: string) {
  try {
    const expires = new Date(Date.now() + JWT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt({ userId, email, exp: Math.floor(expires.getTime() / 1000) });

    // Await the cookies() call
    const cookieStore = await cookies();
    cookieStore.set(JWT_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: APP_CONFIG.IS_PRODUCTION, // Use secure cookies in production
      expires: expires,
      sameSite: 'lax',
      path: '/',
    });
    console.log(`Session created for user ${userId}, cookie set.`);
    return true;
  } catch (error) {
    console.error('Failed to create session:', error);
    return false;
  }
}

export async function deleteSession() {
  try {
    // Await the cookies() call
    const cookieStore = await cookies();
    cookieStore.set(JWT_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
    console.log('Session cookie deleted.');
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

