// src/app/login/page.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // React Router imports
import { Loader2 } from 'lucide-react';
import './login-overlay.css'; // Import the CSS file
import { startGlobalTransition, endGlobalTransition } from '@/lib/auth-transition-controller';

const APP_ROUTES = [
  '/',
  '/materials',
  '/goals',
  '/tasks',
  '/habits',
  '/timer',
  '/flashcards',
  '/notes',
  '/assistant',
];

// DoodleBackground Component
const DoodleBackground = () => (
  <div className="absolute inset-0 overflow-hidden -z-10">
    {/* Squiggle 1 */}
    <svg width="200" height="200" viewBox="0 0 200 200" className="absolute top-1/4 left-1/4 opacity-10 animate-pulse-slow">
      <path d="M 20 100 Q 50 20 80 100 T 140 100 T 200 100" stroke="hsl(var(--primary))" fill="transparent" strokeWidth="3" strokeLinecap="round"/>
    </svg>
    {/* Circles 1 */}
    <svg width="150" height="150" viewBox="0 0 100 100" className="absolute bottom-10 right-5 opacity-5 animate-float">
      <circle cx="30" cy="30" r="10" fill="hsl(var(--accent))" />
      <circle cx="70" cy="70" r="15" fill="hsl(var(--accent)/0.7)" />
      <circle cx="50" cy="90" r="8" fill="hsl(var(--accent)/0.5)" />
    </svg>
     {/* Squiggle 2 - Top Right */}
    <svg width="180" height="180" viewBox="0 0 200 200" className="absolute top-10 right-10 opacity-15 animate-pulse-slower">
      <path d="M 10 10 C 40 100, 100 0, 150 100 S 180 190, 190 190" stroke="hsl(var(--secondary))" fill="transparent" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round"/>
    </svg>
    {/* Dots pattern - Bottom Left */}
    <svg width="100" height="100" viewBox="0 0 100 100" className="absolute bottom-1/3 left-10 opacity-8 animate-float-delay">
      <circle cx="10" cy="10" r="3" fill="hsl(var(--primary)/0.6)" />
      <circle cx="30" cy="25" r="2" fill="hsl(var(--primary)/0.6)" />
      <circle cx="15" cy="40" r="4" fill="hsl(var(--primary)/0.6)" />
      <circle cx="40" cy="50" r="3" fill="hsl(var(--primary)/0.6)" />
    </svg>
     {/* Abstract shape - Center-ish, subtle */}
    <svg width="250" height="250" viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-3 animate-spin-slow">
        <path d="M20,50 Q50,10 80,50 T20,50 Z" fill="hsl(var(--accent)/0.2)" stroke="hsl(var(--accent)/0.4)" strokeWidth="1"/>
    </svg>
    <style jsx>{`
      @keyframes pulse-slow {
        0%, 100% { transform: scale(1); opacity: 0.1; }
        50% { transform: scale(1.05); opacity: 0.15; }
      }
      @keyframes pulse-slower {
        0%, 100% { transform: scale(1); opacity: 0.15; }
        50% { transform: scale(1.03); opacity: 0.2; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      @keyframes float-delay {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(8px); }
      }
      .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
      .animate-pulse-slower { animation: pulse-slower 10s infinite ease-in-out; }
      .animate-float { animation: float 6s infinite ease-in-out; }
      .animate-float-delay { animation: float 7s infinite ease-in-out 0.5s; }
      .animate-spin-slow { animation: spin 20s linear infinite; }
    `}</style>
  </div>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { signIn, loading: authHookLoading, user, transitioning, authState } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location

  // Primary redirect effect - handles immediate and continuous checks
  useEffect(() => {
    let isMounted = true;
    
    // Define the redirection function - simplified to work with auth provider
    const redirectToDashboard = () => {
      if (!isMounted) return;
      
      // Only redirect if we're fully authenticated and not in a transition state
      if (user && authState === 'authenticated' && !isRedirecting && !transitioning) {
        console.log('LoginPage: User fully authenticated, initiating redirect');
        
        // Start global transition before any redirect attempt
        startGlobalTransition();
        
        setIsRedirecting(true);
        
        // Only use React Router navigate - auth provider handles the rest
        setTimeout(() => {
          navigate('/');
          console.log('LoginPage: Redirected using React Router navigation');
        }, 50); // Small delay to ensure transition is active
      }
    };
    
    // Immediate check
    redirectToDashboard();
    
    // Clean up function to avoid memory leaks and prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, navigate, isRedirecting, transitioning, authState]);

  // Prefetch app routes when component loads
  useEffect(() => {
    if (!user && !authHookLoading && !isRedirecting && !transitioning && authState === 'unauthenticated') {
      // Don't actually navigate to all routes - this was causing problems
      // Instead, just log that we would prefetch if needed
      console.log('LoginPage: Application routes would be prefetched here if needed.');
    }
    
    // Register beforeunload event to help with redirection
    const handleBeforeUnload = () => {
      if (user && authState === 'authenticated') {
        sessionStorage.setItem('redirect_after_login', 'true');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, authHookLoading, navigate, isRedirecting, transitioning, authState]);

  // Static early return - show loader for authenticated users, transitioning states or redirecting state
  if (user || isRedirecting || transitioning || authState !== 'unauthenticated') {
    // Ensure global transition is active
    startGlobalTransition();
    
    // Add auth-transitioning class to document body
    useEffect(() => {
      document.body.classList.add('auth-transitioning');
      return () => {
        document.body.classList.remove('auth-transitioning');
      };
    }, []);
    
    return (
      <div className="login-overlay">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <span className="mt-4 text-muted-foreground">
          {authState === 'transitioning' ? 'Transitioning to dashboard...' : 
           authState === 'authenticating' ? 'Authenticating...' : 
           'Already logged in. Redirecting...'}
        </span>
      </div>
    );
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({ title: "Missing Fields", description: "Please enter both email and password.", variant: "destructive" });
        return;
    }
    
    // Start global transition BEFORE the auth operation begins
    startGlobalTransition();
    
    const result = await signIn(email, password);
    
    if (result.success && result.user) {
      console.log("LoginPage: Authentication successful, redirecting...");
      setIsRedirecting(true);
      // The navigation is now handled within the signIn function in useAuth
      // and also by our useEffect hooks above
    } else {
      // If login failed, end the global transition
      endGlobalTransition(0);
    }
  };

  // Show a loader specifically for the auth operation itself (signIn)
  if (authHookLoading && !user && (location.pathname === '/login' || location.pathname === '/signup')) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-screen bg-background z-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <span className="mt-4 text-muted-foreground">Logging In...</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-background">
      <DoodleBackground />
      <Card className="w-full max-w-md glassmorphism z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Welcome Back!</CardTitle>
          <CardDescription>Log in to your LifeOS account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authHookLoading} 
              />
            </div>
            <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authHookLoading}
              />
            </div>
            <Button type="submit" className="w-full hover-glow" disabled={authHookLoading}>
              {authHookLoading ? <Loader2 className="animate-spin mr-2" /> : null}
              {authHookLoading ? 'Logging In...' : 'Log In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Sign Up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
