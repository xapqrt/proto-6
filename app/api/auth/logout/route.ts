// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  try {
    console.log('Logout API: Attempting to delete session');
    await deleteSession();
    
    // The deleteSession() function returns void, not a boolean, so we shouldn't check it
    console.log('Logout API: Session successfully deleted');
    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

