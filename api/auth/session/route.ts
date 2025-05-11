// DEPRECATED - MOVED TO /app/api/auth/session/route.ts
// This file is kept for reference but will be deleted in the future

// DO NOT USE THIS FILE - IT WILL BE REMOVED
import { NextResponse } from 'next/server';

export async function GET() {
  console.log("WARNING: Using deprecated API route in /api/auth/session/route.ts");
  console.log("This route will be removed. Please use /app/api/auth/session instead");
  
  // Redirect to the correct endpoint
  return NextResponse.redirect(new URL('/api/auth/session', 'http://localhost:9002'));
}

