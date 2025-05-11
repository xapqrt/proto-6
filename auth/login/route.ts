// src/app/api/auth/login/route.ts
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb';
import User, { IUser } from '@/models/User'; // Import IUser interface
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    await connectToDatabase(); // Establishes Mongoose connection

    // Explicitly select hashedPassword as it has `select: false` in the schema
    const user = await User.findOne({ email: email.toLowerCase() }).select('+hashedPassword') as IUser;

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // This check is crucial: if hashedPassword is not retrieved, user.hashedPassword will be undefined.
    if (!user.hashedPassword) {
        console.error(`Login failed: No hashed password retrieved for user ${user.email}. This might indicate a schema or query issue.`);
        return NextResponse.json({ message: 'Authentication error. Please contact support.' }, { status: 500 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Fix: Make sure _id exists before using it
    if (!user._id) {
      console.error('Login failed: User document missing _id field');
      return NextResponse.json({ message: 'Authentication error. Please contact support.' }, { status: 500 });
    }

    const userId = user._id.toString();
    await createSession(userId, user.email); // Create JWT session

    return NextResponse.json({ 
        message: 'Login successful!', 
        user: { id: userId, email: user.email } 
    }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
