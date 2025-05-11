// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return NextResponse.json({ user: null, message: 'No active session' }, { status: 200 });
    }

    // Optionally, you could re-verify against DB here if needed, but JWT verification should suffice
    return NextResponse.json({ user: { id: session.userId, email: session.email }, message: 'Session active' }, { status: 200 });

  } catch (error) {
    console.error('Session check API error:', error);
    return NextResponse.json({ user: null, message: 'Internal server error while checking session' }, { status: 500 });
  }
}

