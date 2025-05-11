'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * This is a debug utility component to help track authentication state transitions.
 * It logs all auth state changes to the console with timestamps.
 */
export function AuthDebugger() {
  // Get auth from the hook with explicit type assertion
  const auth = useAuth() as any;
  const { user, loading } = auth;
  const authState = auth.authState || 'unauthenticated';
  
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Auth State Changed:`, {
      authState,
      loading,
      user: user ? `User ${user.id}` : 'null'
    });
  }, [user, authState, loading]);
  
  return null; // This is a utility component that doesn't render anything
}

/**
 * Debug function to force an auth state transition.
 * This simulates what would happen during a problematic transition.
 */
export function simulateAuthTransition() {
  console.log('Simulating authentication transition...');
  // Simulate going to login page
  window.location.href = '/login';
  
  // After 2 seconds, simulate successful login and transition to dashboard
  setTimeout(() => {
    // This is what would happen if the auth transition wasn't properly handled
    window.location.href = '/';
    console.log('Simulated transition to dashboard');
  }, 2000);
}
