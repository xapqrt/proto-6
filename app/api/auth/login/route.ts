// src/app/api/auth/login/route.ts
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb';
import User, { IUser } from '@/models/User'; // Import the IUser interface as well
import { createSession } from '@/lib/session';

// Enable detailed logging for troubleshooting
const DEBUG = true;

export async function POST(req: NextRequest) {
  if (DEBUG) console.log("Login API: Request received at /app/api/auth/login");
  
  try {
    // Parse request body
    const body = await req.json();
    const { email, password } = body;
    
    if (DEBUG) console.log(`Login API: Login attempt for email: ${email}`);

    if (!email || !password) {
      if (DEBUG) console.log("Login API: Missing email or password");
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    try {
      if (DEBUG) console.log("Login API: Connecting to database");
      await connectToDatabase(); 
      if (DEBUG) console.log("Login API: Database connection successful");
    } catch (dbError) {
      console.error("Login API: Database connection failed:", dbError);
      return NextResponse.json({ message: 'Database connection error' }, { status: 500 });
    }

    // Find user
    let user: IUser | null;
    try {
      if (DEBUG) console.log(`Login API: Looking up user: ${email.toLowerCase()}`);
      user = await User.findOne({ email: email.toLowerCase() }).select('+hashedPassword');
      if (DEBUG) console.log(`Login API: User lookup result: ${user ? 'Found' : 'Not found'}`);
    } catch (userError) {
      console.error("Login API: Error during user lookup:", userError);
      return NextResponse.json({ message: 'User lookup error' }, { status: 500 });
    }

    if (!user) {
      if (DEBUG) console.log("Login API: User not found");
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password hash exists
    if (!user.hashedPassword) {
      console.error(`Login API: No password hash for user ${user.email}`);
      return NextResponse.json({ message: 'Authentication error. Please contact support.' }, { status: 500 });
    }

    // Compare password
    let isPasswordValid;
    try {
      if (DEBUG) console.log("Login API: Comparing password");
      isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
      if (DEBUG) console.log(`Login API: Password valid: ${isPasswordValid}`);
    } catch (bcryptError) {
      console.error("Login API: bcrypt comparison error:", bcryptError);
      return NextResponse.json({ message: 'Password verification error' }, { status: 500 });
    }

    if (!isPasswordValid) {
      if (DEBUG) console.log("Login API: Invalid password");
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Create session
    try {
      // Fix: Type assertion for _id property
      const userId = user._id ? user._id.toString() : '';
      if (!userId) {
        console.error("Login API: Missing user ID after successful authentication");
        return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
      }
      
      if (DEBUG) console.log(`Login API: Creating session for user ID: ${userId}`);
      
      await createSession(userId, user.email);
      if (DEBUG) console.log("Login API: Session created successfully");
      
      // Return success response
      return NextResponse.json({ 
        message: 'Login successful!', 
        user: { id: userId, email: user.email } 
      }, { status: 200 });
    } catch (sessionError) {
      console.error("Login API: Session creation error:", sessionError);
      return NextResponse.json({ message: 'Failed to create session' }, { status: 500 });
    }
  } catch (error) {
    console.error("Login API: Unexpected error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
