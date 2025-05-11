'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'react-router-dom';

/**
 * TransitionOverlay is a component that displays during authentication state transitions.
 * It helps prevent the login form from appearing on top of the dashboard by providing
 * a guaranteed overlay that blocks any UI rendering underneath.
 * 
 * CRITICAL: This component has been enhanced to ensure it blocks any rendering
 * during the transition from login to dashboard, preventing any flash of the login form.
 */
const TransitionOverlay: React.FC = () => {
  // Get auth from the hook with explicit type assertion
  const auth = useAuth() as any;
  const { user } = auth;
  const authState = auth.authState || 'unauthenticated';
  const [visible, setVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();
  
  // Handle transitioning state
  useEffect(() => {
    if (authState === 'transitioning' || authState === 'authenticating') {
      setIsTransitioning(true);
    } else {
      setIsTransitioning(false);
    }
  }, [authState]);
  
  // ENHANCEMENT: Keep track of page navigation to ensure overlay is shown during route changes
  useEffect(() => {
    // When the location changes, set navigating to true
    setIsNavigating(true);
    
    // Reset after a short delay
    const navigationTimeout = setTimeout(() => {
      setIsNavigating(false);
    }, 1000); // 1 second buffer for navigation
    
    return () => clearTimeout(navigationTimeout);
  }, [location.pathname]);
    // Mount the overlay during auth transitions and add extra buffer time
  useEffect(() => {
    // Enhanced logic to catch more transition states
    const shouldShowOverlay = 
      isTransitioning || 
      authState === 'transitioning' || 
      authState === 'authenticating' ||
      isNavigating ||
      // Critical: Show during the login->dashboard transition
      (user && location.pathname === '/login');
    
    if (shouldShowOverlay) {
      setVisible(true);
    } else {
      // Longer delay before hiding (2000ms instead of 500ms)
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 2000); // 2 second buffer after transition completes
      
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning, authState, isNavigating, user, location.pathname]);
  
  // Even if not visible based on state, force visibility during certain conditions
  const forceVisible = user && location.pathname === '/login';
  
  if (!visible && !forceVisible) return null;
    return (
    <div className="fixed inset-0 bg-background flex flex-col justify-center items-center z-[99999]">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <span className="mt-4 text-muted-foreground">
        {authState === 'transitioning' ? 'Transitioning to dashboard...' : 
         authState === 'authenticating' ? 'Authenticating...' : 
         user ? 'Loading your dashboard...' : 'Loading...'}
    </span>
    </div>
  );
};

export default TransitionOverlay;
