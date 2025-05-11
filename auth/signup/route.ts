// src/app/api/auth/signup/route.ts
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User'; // Import Mongoose User model
import { createSession } from '@/lib/session'; 

export async function POST(req: NextRequest) {
  console.log('Signup API: Received POST request');
  try {
    const { email, password } = await req.json();
    console.log('Signup API: Parsed request body - Email:', email);

    if (!email || !password) {
      console.log('Signup API: Email or password missing');
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
        console.log('Signup API: Password too short');
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    console.log('Signup API: Attempting to connect to database via Mongoose...');
    await connectToDatabase(); // Establishes Mongoose connection
    console.log('Signup API: Successfully connected to database via Mongoose.');

    console.log('Signup API: Checking if user already exists with email:', email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('Signup API: User already exists');
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }
    console.log('Signup API: User does not exist, proceeding with creation.');

    console.log('Signup API: Hashing password with bcrypt...');
    const saltRounds = 10; // Standard salt rounds for bcrypt
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Signup API: Password hashed.');

    const newUser = new User({
      email: email.toLowerCase(),
      hashedPassword: hashedPassword,
      // Mongoose handles createdAt and updatedAt automatically if timestamps: true is in schema
    });

    console.log('Signup API: Attempting to save new user document...');
    const savedUser = await newUser.save();
    console.log('Signup API: Mongoose save result (user document):', savedUser);

    if (!savedUser || !savedUser._id) {
        console.error('Signup API: Failed to save user into database. Mongoose save did not return a valid document with _id.');
        return NextResponse.json({ message: 'Failed to create user account due to database error.' }, { status: 500 });
    }
    const userId = savedUser._id.toString();
    console.log('Signup API: User created successfully with ID:', userId);

    console.log('Signup API: Attempting to create session for new user...');
    await createSession(userId, email.toLowerCase());
    console.log('Signup API: Session created successfully.');

    return NextResponse.json({
        message: 'User created successfully!',
        user: { id: userId, email: email.toLowerCase() }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup API: An unexpected error occurred:', error);
    let errorMessage = 'Internal server error during signup.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

