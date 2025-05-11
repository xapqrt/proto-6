// src/app/signup/page.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname

const APP_ROUTES = [
  '/dashboard',
  '/materials',
  '/goals',
  '/tasks',
  '/habits',
  '/timer',
  '/flashcards',
  '/notes',
  '/assistant',
];

// DoodleBackground Component (can be moved to a shared components folder if used elsewhere)
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

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, loading: authHookLoading, user } = useAuth(); // Renamed loading to authHookLoading
  const { toast } = useToast();
  const router = useRouter();
  const currentPathname = usePathname(); // Get current pathname

  useEffect(() => {
    // This effect handles redirection if user is already logged in when visiting /signup
    if (user && !authHookLoading) {
      if (currentPathname === '/signup') {
        console.log('SignUpPage: User already authenticated, redirecting to root URL');
        router.replace('/');
      }
    }
  }, [user, authHookLoading, router, currentPathname]);

  useEffect(() => {
    // Prefetch routes when component mounts and user is not logged in
    if (!user && !authHookLoading) {
      APP_ROUTES.forEach(route => {
        router.prefetch(route);
      });
      console.log('SignUpPage: Prefetching application routes.');
    }
  }, [user, authHookLoading, router]);


  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
        toast({ title: "Missing Fields", description: "Please fill in all fields.", variant: "destructive" });
        return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please ensure passwords match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    // signUp function from useAuth already handles redirect on success
    await signUp(email, password);
    // No explicit router.push here.
  };

  // Show a loader specifically for the auth operation itself (signUp)
  if (authHookLoading && !user && (currentPathname === '/login' || currentPathname === '/signup')) {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
         <span className="ml-3 text-muted-foreground">Setting up your account...</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-background">
      <DoodleBackground />
      <Card className="w-full max-w-md glassmorphism z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Join LifeOS and organize your life.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
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
                minLength={6}
                aria-describedby="password-description"
                disabled={authHookLoading}
              />
               <p id="password-description" className="text-xs text-muted-foreground">Use at least 6 characters.</p>
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={authHookLoading}
              />
            </div>
            <Button type="submit" className="w-full hover-glow" disabled={authHookLoading}>
              {authHookLoading ? <Loader2 className="animate-spin mr-2" /> : null}
              {authHookLoading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
