// Simple test route to verify MongoDB connection
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('MongoDB Test: Attempting to connect to database');
    const mongoose = await connectToDatabase();
    console.log('MongoDB Test: Connection successful');
    
    // Return basic database info
    const dbInfo = {
      connected: !!mongoose.connection.readyState,
      dbName: mongoose.connection.db?.databaseName || 'unknown',
      collections: await mongoose.connection.db?.listCollections().toArray() || []
    };
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'MongoDB connection successful',
      database: dbInfo 
    });
  } catch (error) {
    console.error('MongoDB Test: Connection failed', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'MongoDB connection failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}