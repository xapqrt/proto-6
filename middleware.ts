// Standardized middleware for authentication and route protection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookie, updateSessionCookie } from '@/lib/session';

// Define routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/signup',
  '/api/auth/login', 
  '/api/auth/signup', 
  '/api/auth/session',
  '/api/auth/logout',
  '/api/test/',  // Test routes for diagnostics
  '/_next',      // Next.js assets
  '/favicon.ico',
  '/static'
];

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for all static assets and public routes first (faster check)
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('/static/') || 
    pathname.endsWith('.ico') ||
    PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }
  
  // Check for valid session
  const session = await getSessionFromCookie();
  
  // If user is authenticated and trying to access login/signup, redirect to home
  if (session?.userId && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If no session and not a public route, redirect to login
  if (!session?.userId) {
    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ 
        message: 'Authentication required', 
        redirectTo: '/login'
      }, { 
        status: 401 
      });
    }
    
    // For all other routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only update cookie if it's close to expiration (1 day) to reduce overhead
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;
  if (session.exp && (session.exp - now < oneDay)) {
    const response = await updateSessionCookie(request);
    const endTime = Date.now();
    if (endTime - startTime > 200) {
      console.log(`Middleware execution time for ${pathname}: ${endTime - startTime}ms (with cookie update)`);
    }
    return response || NextResponse.next();
  }

  const endTime = Date.now();
  if (endTime - startTime > 200) {
    console.log(`Middleware execution time for ${pathname}: ${endTime - startTime}ms`);
  }
  return NextResponse.next();
}

// Configure the middleware to match only the routes we want to protect
export const config = {
  matcher: [
    // Match all routes except static files, Next.js internals, and specific public assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
