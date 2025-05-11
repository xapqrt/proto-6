// DEPRECATED - MOVED TO /app/api/auth/signup/route.ts
// This file is kept for reference but will be deleted in the future

// DO NOT USE THIS FILE - IT WILL BE REMOVED
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log("WARNING: Using deprecated API route in /api/auth/signup/route.ts");
  console.log("This route will be removed. Please use /app/api/auth/signup instead");
  
  // Redirect to the correct endpoint
  return NextResponse.redirect(new URL('/api/auth/signup', 'http://localhost:9002'));
}

