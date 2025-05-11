// Simple login test API
import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    console.log('Test Login API: Request received');
    
    let body;
    try {
      body = await req.json();
      console.log('Test Login API: Request body parsed successfully', body);
    } catch (parseError) {
      console.error('Test Login API: Failed to parse request body', parseError);
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    
    const { email, password } = body;
    console.log(`Test Login API: Received login attempt for ${email}`);

    // Hardcoded test authentication for debugging
    if (email === 'test@example.com' && password === 'password123') {
      try {
        // Set a simple test cookie - properly await cookies()
        const cookieStore = await cookies();
        cookieStore.set('test_session', 'test-user-id', {
          httpOnly: true,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          path: '/',
        });
        
        console.log('Test Login API: Test cookie set successfully');
        
        return NextResponse.json({ 
          message: 'Test login successful!', 
          user: { id: 'test-user-id', email }
        }, { status: 200 });
      } catch (cookieError) {
        console.error('Test Login API: Error setting cookie', cookieError);
        return NextResponse.json({ message: 'Cookie error' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    
  } catch (error) {
    console.error('Test Login API: Unexpected error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}