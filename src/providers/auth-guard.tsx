"use client"

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

// Public paths that don't require authentication
const publicPaths = ['/login', '/signup'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Skip redirect during initial loading
    if (loading) return;
    
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    
    // If there's no user and the path is not public, redirect to login
    if (!user && !isPublicPath) {
      console.log("AuthGuard: No authenticated user detected, redirecting to login page");
      router.replace('/login');
      return;
    }
    
    // If there is a user and the path is public, redirect to dashboard
    if (user && isPublicPath) {
      console.log("AuthGuard: User already authenticated, redirecting to dashboard");
      router.replace('/dashboard');
      return;
    }
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}