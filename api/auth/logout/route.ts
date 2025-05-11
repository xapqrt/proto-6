// DEPRECATED - MOVED TO /app/api/auth/logout/route.ts
// This file is kept for reference but will be deleted in the future

// DO NOT USE THIS FILE - IT WILL BE REMOVED
import { NextResponse } from 'next/server';

export async function POST() {
  console.log("WARNING: Using deprecated API route in /api/auth/logout/route.ts");
  console.log("This route will be removed. Please use /app/api/auth/logout instead");
  
  // Redirect to the correct endpoint
  return NextResponse.redirect(new URL('/api/auth/logout', 'http://localhost:9002'));
}

