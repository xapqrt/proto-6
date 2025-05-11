// src/hooks/use-auth.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
// Replace Next.js routing with React Router
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from './use-toast';
import { AUTH_CONFIG } from '../lib/config'; // Updated import path
import { startGlobalTransition, endGlobalTransition } from '../lib/auth-transition-controller';

// Use the centralized configuration instead of hardcoding values
const ADMIN_EMAIL = AUTH_CONFIG.ADMIN_EMAIL;

interface SessionUser {
  id: string;
  email: string;
}

// Export the AuthContextType so it can be imported elsewhere
export interface AuthContextType {
  user: SessionUser | null;
  userId: string | null;
  loading: boolean;
  isAdmin: boolean;
  transitioning: boolean; // Add new transitioning state
  authState: 'unauthenticated' | 'authenticating' | 'authenticated' | 'transitioning';
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: SessionUser }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: SessionUser }>;
  signOut: () => Promise<void>;
  getAllUsers?: () => Promise<{ id: string; email: string, createdAt: string }[] | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false); // Add transitioning state
  const [authState, setAuthState] = useState<'unauthenticated' | 'authenticating' | 'authenticated' | 'transitioning'>('unauthenticated');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const checkSession = useCallback(async () => {
    console.log('AuthProvider: Checking session...');
    try {
      setAuthState('authenticating');
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      console.log('AuthProvider: Session check response status:', response.status, 'Data:', data);

      if (response.ok && data.user) {
        console.log('AuthProvider: Session valid, user found:', data.user);
        setUser(data.user);
        setUserId(data.user.id);
        setAuthState('authenticated');
        
        // Handle redirects for authenticated users on public routes
        if (['/login', '/signup'].includes(location.pathname)) {
            console.log('AuthProvider: User on public route, redirecting to root URL');
            
            // Activate global transition blocker
            startGlobalTransition();
            
            setTransitioning(true); // Set transitioning state before navigation
            setAuthState('transitioning');
            
            // Use a longer transition period like in handleApiAuth
            const transitionTime = 15000; // 15 seconds for maximum safety
            
            // Navigate immediately but keep transition state longer
            navigate('/');
            console.log(`AuthProvider: Setting long transition period of ${transitionTime}ms to prevent UI flicker`);
            
            setTimeout(() => {
              console.log('AuthProvider: Transition period complete, resetting transition state');
              setTransitioning(false);
              setAuthState('authenticated');
              
              // End global transition with delay
              endGlobalTransition(2000);
            }, transitionTime);
        }
      } else {
        console.log('AuthProvider: No active session or error during session check.');
        setUser(null);
        setUserId(null);
        setAuthState('unauthenticated');
        
        // Handle redirects for unauthenticated users on protected routes
        if (!['/login', '/signup'].includes(location.pathname) && !location.pathname.startsWith('/api')) {
          console.log('AuthProvider: No authenticated user detected on protected route, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error("AuthProvider: Error checking session:", error);
      setUser(null);
      setUserId(null);
      setAuthState('unauthenticated');
    } finally {
      setLoading(false);
      console.log('AuthProvider: Session check complete, loading set to false.');
    }
  }, [location.pathname, navigate]);

  // Single useEffect to check session on mount and when dependencies change
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Remove other redirect-related useEffects that might cause conflicts

  const isAdmin = useMemo(() => !!user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(), [user]);

  const handleApiAuth = async (endpoint: string, body: any): Promise<{ success: boolean; message: string; user?: SessionUser }> => {
    console.log(`AuthProvider: Attempting API auth at ${endpoint} for email:`, body.email);
    setLoading(true);
    
    // Start global transition IMMEDIATELY - this will imperatively block any UI
    startGlobalTransition();
    
    // Set transitioning to true at the beginning of auth process
    setTransitioning(true);
    setAuthState('authenticating');
    
    let responseText = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`AuthProvider: Failed to parse JSON response from ${endpoint}. Status: ${response.status}. Response text: ${responseText}`);
        toast({ title: "Error", description: "Received an invalid response from the server.", variant: "destructive" });
        setTransitioning(false); // Reset transitioning state on error
        setAuthState('unauthenticated');
        endGlobalTransition(0); // End transition immediately on error
        return { success: false, message: "Invalid server response." };
      }
      
      console.log(`AuthProvider: API response from ${endpoint} - Status: ${response.status}, Data:`, data);

      if (response.ok && data.user) {
        console.log(`AuthProvider: API auth successful for ${endpoint}. User:`, data.user);
        
        // First update the user state
        setUser(data.user);
        setUserId(data.user.id);
        setAuthState('transitioning');
        
        // Show success toast
        toast({ title: data.message || (endpoint.includes('signup') ? "Signup Successful" : "Login Successful") });
        
        // Use a longer transition period to ensure UI consistency
        // Matching the reported 10-second issue window
        const transitionTime = 12000; // 12 seconds (increased from 10)
        
        console.log(`AuthProvider: Setting transition period of ${transitionTime}ms to prevent UI flicker`);
        
        // Slight delay before navigation to ensure transition state is registered properly
        setTimeout(() => {
          navigate('/');
          console.log('AuthProvider: Redirecting to root URL (/) after successful auth');
        }, 50);
        
        // Keep transitioning true during the navigation process
        // This will prevent the login form from appearing on top of the dashboard
        setTimeout(() => {
          console.log('AuthProvider: Transition period complete, resetting transition state');
          setTransitioning(false);
          setAuthState('authenticated');
          // End global transition after state updates are complete
          endGlobalTransition(2000); // End with a 2-second buffer for smooth transition
        }, transitionTime);
        
        return { success: true, message: data.message || "Success", user: data.user };
      } else {
        console.warn(`AuthProvider: API auth failed for ${endpoint}. Message:`, data.message);
        setUser(null);
        setUserId(null);
        setAuthState('unauthenticated');
        toast({ title: data.message || "Authentication Failed", variant: "destructive" });
        
        // Brief delay before resetting transitioning to ensure UI updates properly
        setTimeout(() => {
          setTransitioning(false);
        }, 50);
        
        return { success: false, message: data.message || "An error occurred" };
      }
    } catch (error) {
      console.error(`AuthProvider: Network or unexpected error during API auth at ${endpoint}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Network error or server unavailable.";
      setUser(null);
      setUserId(null);
      setAuthState('unauthenticated');
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setTransitioning(false); // Reset transitioning state on error
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      // Note: We don't reset transitioning here because we want it to remain true
      // during navigation to prevent UI flicker
    }
  };

  const signIn = useCallback(
    (email: string, password: string) => handleApiAuth('/api/auth/login', { email, password }),
    [handleApiAuth]
  );

  const signUp = useCallback(
    (email: string, password: string) => handleApiAuth('/api/auth/signup', { email, password }),
    [handleApiAuth]
  );

  const signOut = useCallback(async () => {
    console.log('AuthProvider: Attempting sign out...');
    setLoading(true);
    setTransitioning(true); // Set transitioning state for sign out
    setAuthState('transitioning');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setUserId(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      
      // Use the same longer transition period for consistency
      const transitionTime = 10000; // 10 seconds to match reported issue window
      
      // Navigate immediately but keep transition state longer
      navigate('/login');
      console.log(`AuthProvider: Redirecting to login, setting transition period of ${transitionTime}ms`);
      
      setTimeout(() => {
        console.log('AuthProvider: Sign out transition period complete');
        setTransitioning(false);
        setAuthState('unauthenticated');
      }, transitionTime);
    } catch (error) {
      console.error("AuthProvider: Sign out error:", error);
      toast({ title: "Sign Out Failed", variant: "destructive" });
      setTransitioning(false); // Reset transitioning on error
      setAuthState('authenticated'); // Stay authenticated on error
    } finally {
      setLoading(false);
      console.log('AuthProvider: Sign out attempt finished, loading set to false.');
      // Note: We don't reset transitioning here to prevent UI flicker
    }
  }, [navigate, toast]);

  const getAllUsers = useCallback(async (): Promise<{ id: string; email: string, createdAt: string }[] | null> => {
    if (!isAdmin) { 
      console.warn("AuthProvider: Attempted to get all users when not admin.");
      return null;
    }
    
    console.log('AuthProvider: Admin attempting to fetch all users...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/admin/users', {
        signal: controller.signal,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log('AuthProvider: Admin get users response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('AuthProvider: Admin get users error data:', errorData);
        throw new Error(errorData.message || `Failed to fetch users: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('AuthProvider: Admin get users success, user count:', data.users?.length);
      return data.users;
    } catch (error) {
      console.error("AuthProvider: Error fetching all users for admin:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not load user data.";
      toast({ title: "Admin Error", description: errorMessage, variant: "destructive" });
      return null;
    }
  }, [isAdmin, toast]);

  const value = useMemo(() => ({
    user,
    userId,
    loading,
    isAdmin,
    transitioning,
    authState,
    signIn,
    signUp,
    signOut,
    getAllUsers: isAdmin ? getAllUsers : undefined, 
  }), [user, userId, loading, isAdmin, transitioning, authState, signIn, signUp, signOut, getAllUsers]);

  // Conditional rendering for various auth states
  if ((loading || transitioning || authState === 'transitioning' || authState === 'authenticating') && 
      !user && 
      !['/login', '/signup'].includes(location.pathname)) {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-background z-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          {authState === 'transitioning' ? 'Transitioning...' : 'Loading LifeOS...'}
        </span>
      </div>
    );
  }

  if ((loading || transitioning || authState === 'transitioning' || authState === 'authenticating') && 
      (location.pathname === '/login' || location.pathname === '/signup')) {
     return (
       <div className="flex justify-center items-center h-screen w-screen bg-background z-50">
         <Loader2 className="w-12 h-12 animate-spin text-primary" />
         <span className="ml-3 text-muted-foreground">Authenticating...</span>
       </div>
     );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
