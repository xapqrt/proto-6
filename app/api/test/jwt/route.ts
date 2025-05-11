// Simple test route to verify JWT session functionality
import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/session';

export async function GET() {
  try {
    console.log('JWT Test: Testing JWT functionality');
    
    // Create a test payload
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    
    // Test encryption
    console.log('JWT Test: Encrypting test payload');
    const token = await encrypt(testPayload);
    console.log('JWT Test: Encryption successful');
    
    // Test decryption
    console.log('JWT Test: Decrypting token');
    const decrypted = await decrypt(token);
    console.log('JWT Test: Decryption successful');
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'JWT functionality working correctly',
      token: token.substring(0, 20) + '...', // Only show beginning of token for security
      decrypted
    });
  } catch (error) {
    console.error('JWT Test: Error testing JWT functionality', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'JWT functionality failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}