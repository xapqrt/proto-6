
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookie, updateSessionCookie } from '@/lib/session'; // Use JWT session logic

const publicRoutes = ['/login', '/signup'];
// API routes that should not be protected by default or have their own auth
const apiAuthRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/session'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow API auth routes to pass through without session checks by middleware
  if (apiAuthRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const session = await getSessionFromCookie(); // Reads and decrypts JWT from cookie

  if (session?.userId && isPublicRoute) {
    // If session exists and trying to access a public route (like login), redirect to dashboard
    console.log(`Middleware: User with session on public route ${pathname}, redirecting to /dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!session?.userId && !isPublicRoute) {
    // If no session and not a public route, redirect to login
    // Avoid redirect loops for API routes that might be called by client before full auth check
    if (pathname.startsWith('/api/')) {
        // For non-auth API routes, if no session, return 401
        // This prevents redirecting API calls to the login page HTML
        console.log(`Middleware: No session for protected API route ${pathname}, returning 401`);
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    console.log(`Middleware: No session for protected route ${pathname}, redirecting to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If session exists and it's not a public route, try to update/refresh the session cookie
  // The updateSessionCookie function will return a response with the updated cookie or undefined
  if (session?.userId && !isPublicRoute) {
    console.log(`Middleware: User with session on protected route ${pathname}, updating cookie.`);
    const response = await updateSessionCookie(request); // updateSessionCookie now returns a response
    // If updateSessionCookie determined the session was invalid and cleared it,
    // it might not return a redirect. We should ensure a redirect to login in that case.
    // However, updateSessionCookie should ideally handle this or getSessionFromCookie would return null above.
    // For now, assume updateSessionCookie returns the correct response to continue or redirect.
    return response;
  }

  // Allow the request to proceed if none of the above conditions are met
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except for static files, _next paths, and specific public assets like favicon.ico
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
