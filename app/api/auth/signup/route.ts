// src/app/api/auth/signup/route.ts
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { createSession } from '@/lib/session';
// Import AUTH_CONFIG directly
const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "lifeos_dev_fallback_secret_key_replace_in_production",
  JWT_COOKIE_NAME: "lifeos_session_token",
  JWT_EXPIRATION_DAYS: 30,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "fowlstar1@gmail.com",
};

// Enable debug logging
const DEBUG = true;

export async function POST(req: NextRequest) {
  if (DEBUG) console.log('Signup API: Received POST request');
  
  try {
    const { email, password } = await req.json();
    if (DEBUG) console.log(`Signup API: Processing signup for email: ${email}`);

    // Validate input
    if (!email || !password) {
      if (DEBUG) console.log('Signup API: Email or password missing');
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    
    if (password.length < 6) {
      if (DEBUG) console.log('Signup API: Password too short');
      return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Connect to database
    try {
      if (DEBUG) console.log('Signup API: Connecting to database');
      await connectToDatabase();
      if (DEBUG) console.log('Signup API: Database connection successful');
    } catch (dbError) {
      console.error('Signup API: Database connection failed:', dbError);
      return NextResponse.json({ message: 'Database connection error' }, { status: 500 });
    }

    // Check for existing user
    try {
      if (DEBUG) console.log(`Signup API: Checking if user exists: ${email.toLowerCase()}`);
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      if (existingUser) {
        if (DEBUG) console.log('Signup API: User already exists');
        return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
      }
    } catch (userLookupError) {
      console.error('Signup API: Error checking existing user:', userLookupError);
      return NextResponse.json({ message: 'Error checking user existence' }, { status: 500 });
    }

    // Hash password
    let hashedPassword;
    try {
      if (DEBUG) console.log('Signup API: Hashing password');
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
      if (DEBUG) console.log('Signup API: Password hashed successfully');
    } catch (hashError) {
      console.error('Signup API: Password hashing error:', hashError);
      return NextResponse.json({ message: 'Error processing password' }, { status: 500 });
    }

    // Create new user
    let newUser;
    try {
      if (DEBUG) console.log('Signup API: Creating new user document');
      newUser = new User({
        email: email.toLowerCase(),
        hashedPassword,
        isAdmin: email.toLowerCase() === AUTH_CONFIG.ADMIN_EMAIL.toLowerCase()
      });
      
      const savedUser = await newUser.save();
      if (!savedUser || !savedUser._id) {
        console.error('Signup API: Failed to save user - no valid document with _id returned');
        return NextResponse.json({ message: 'Failed to create user account' }, { status: 500 });
      }
      
      const userId = savedUser._id.toString();
      if (DEBUG) console.log(`Signup API: User created with ID: ${userId}`);
      
      // Create session
      try {
        if (DEBUG) console.log(`Signup API: Creating session for user ${userId}`);
        await createSession(userId, email.toLowerCase());
        if (DEBUG) console.log('Signup API: Session created successfully');
        
        return NextResponse.json({
          message: 'User created successfully!',
          user: { id: userId, email: email.toLowerCase() }
        }, { status: 201 });
      } catch (sessionError) {
        console.error('Signup API: Session creation error:', sessionError);
        // User was created but session failed - we should still return success
        // but log the issue and inform the user they may need to log in manually
        return NextResponse.json({
          message: 'Account created but automatic login failed. Please try logging in.',
          user: { id: userId, email: email.toLowerCase() }
        }, { status: 201 });
      }
    } catch (userCreateError) {
      console.error('Signup API: Error creating user:', userCreateError);
      return NextResponse.json({ message: 'Error creating user account' }, { status: 500 });
    }
  } catch (error) {
    console.error('Signup API: Unexpected error:', error);
    return NextResponse.json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

