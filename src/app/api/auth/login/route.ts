// DEPRECATED - MOVED TO /app/api/auth/login/route.ts
// This file is kept for reference but will be deleted in the future

// DO NOT USE THIS FILE - IT WILL BE REMOVED
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log("WARNING: Using deprecated API route in src/app/api/auth/login/route.ts");
  console.log("This route will be removed. Please use /app/api/auth/login instead");
  
  // Redirect to the correct endpoint
  return NextResponse.redirect(new URL('/api/auth/login', req.url));
}
