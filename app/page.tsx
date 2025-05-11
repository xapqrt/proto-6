'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// This is the root page of the application.
// It redirects the user to the main dashboard page after login.
export default function RootPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the dashboard route using React Router
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  // Show a loading indicator while redirecting
  return (
    <div className="flex justify-center items-center h-screen w-screen bg-background">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Loading LifeOS...</span>
    </div>
  );
}
