// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User'; // Import Mongoose User model
import { getSessionFromCookie } from '@/lib/session';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fowlstar1@gmail.com';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase(); // Establishes Mongoose connection
    
    // Fetch users using Mongoose model, excluding sensitive fields like hashedPassword
    // Mongoose by default doesn't select fields with `select: false` in schema (like hashedPassword)
    const usersFromDB = await User.find({}).select('-hashedPassword').lean(); // .lean() for plain JS objects
    
    const sanitizedUsers = usersFromDB.map(user => ({
        id: user._id.toString(),
        email: user.email,
        createdAt: user.createdAt.toISOString(), // Ensure dates are ISO strings
        // Add any other non-sensitive fields you want to expose
    }));

    return NextResponse.json({ users: sanitizedUsers }, { status: 200 });

  } catch (error) {
    console.error('Admin Users API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
