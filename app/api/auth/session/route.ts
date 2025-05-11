// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    console.log('Session API: Checking session from cookie');
    const session = await getSessionFromCookie();

    if (!session) {
      console.log('Session API: No active session found');
      return NextResponse.json({ 
        user: null, 
        message: 'No active session' 
      }, { status: 200 });
    }

    console.log(`Session API: Active session found for user ${session.userId}`);
    // Return user data from the JWT session - no need to hit the database
    // since the JWT's signature has already been verified
    return NextResponse.json({ 
      user: { 
        id: session.userId, 
        email: session.email 
      }, 
      message: 'Session active' 
    }, { status: 200 });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ 
      user: null, 
      message: 'Internal server error while checking session' 
    }, { status: 500 });
  }
}

