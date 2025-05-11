
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This is the root page of the application.
// It redirects the user to the main dashboard page after login.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard route
    router.replace('/dashboard');
  }, [router]);

  // Show a loading indicator while redirecting
  return (
    <div className="flex justify-center items-center h-screen w-screen bg-background">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Loading LifeOS...</span>
    </div>
  );
}
