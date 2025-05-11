'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'react-router-dom';
import './critical-auth.css';

/**
 * CriticalAuthGuard - A component that adds critical CSS classes to the document body
 * during authentication transitions to prevent login form flashing.
 */
const CriticalAuthGuard: React.FC = () => {
  // Get auth from the hook with explicit type assertion
  const auth = useAuth() as any;
  const { user } = auth;
  const authState = auth.authState || 'unauthenticated';
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitioning_last, setTransitioningLast] = useState(false);
  const [immediateBlock, setImmediateBlock] = useState(true); // Always block initially
  
  // Set transitioning state with "latching" - once true, stays true for a while
  useEffect(() => {
    if (authState === 'transitioning' || authState === 'authenticating') {
      setIsTransitioning(true);
      setTransitioningLast(true);
      
      // Reset after a delay (much longer than the transition itself)
      const timeoutId = setTimeout(() => {
        setTransitioningLast(false);
      }, 15000); // 15 seconds
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsTransitioning(false);
    }
  }, [authState]);
  
  // Initial immediate block that lasts for a few seconds to prevent any flash
  useEffect(() => {
    // Apply immediate blocking on first render
    document.body.classList.add('auth-transitioning');
    document.body.classList.add('immediate-block');
    
    // Keep blocking for a few seconds no matter what
    const timeoutId = setTimeout(() => {
      setImmediateBlock(false);
      document.body.classList.remove('immediate-block');
    }, 5000); // 5 seconds of guaranteed blocking
    
    return () => clearTimeout(timeoutId);
  }, []);
    // Add/remove critical CSS classes on the document body
  useEffect(() => {
    const isLoginPage = location.pathname === '/login';
    const isAuthenticated = !!user;
    const isCurrentlyTransitioning = isTransitioning || transitioning_last || authState === 'transitioning';
    
    // Handle document classes
    if (isAuthenticated) {
      document.body.classList.add('authenticated');
    } else {
      document.body.classList.remove('authenticated');
    }
    
    if (isCurrentlyTransitioning) {
      document.body.classList.add('auth-transitioning');
    } else {
      document.body.classList.remove('auth-transitioning');
    }    
    // Set data attributes for targeting via CSS
    document.body.dataset.authState = authState;
    document.body.dataset.routeTransition = isAuthenticated && isLoginPage ? 'login-to-dashboard' : '';
    
    // Set forceful body class when authenticated user is on login page
    if (isAuthenticated && isLoginPage) {
      document.body.classList.add('auth-redirect');
    } else {
      document.body.classList.remove('auth-redirect');
    }
    
    // Dynamically import critical CSS only when needed (during transitions)
    if (isCurrentlyTransitioning || (isAuthenticated && isLoginPage) || immediateBlock) {
      const linkEl = document.getElementById('critical-auth-css') as HTMLLinkElement || document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = '/globals/critical-auth.css';
      linkEl.id = 'critical-auth-css';
      if (!document.getElementById('critical-auth-css')) {
        document.head.appendChild(linkEl);
      }
    }
    
    // Clean up on unmount
    return () => {
      // We intentionally don't remove classes or CSS link on unmount to ensure transition is fully covered
      // They will be naturally cleaned up on subsequent renders
    };
  }, [user, isTransitioning, transitioning_last, authState, location.pathname, immediateBlock]);
    // During auth transitions or initial blocking, render a critical overlay that will block all other rendering
  if (isTransitioning || transitioning_last || authState === 'transitioning' || (user && location.pathname === '/login') || immediateBlock) {
    return (
      <div className="critical-auth-overlay">
        <div className="critical-auth-spinner" />
        <p className="critical-auth-message">Loading dashboard...</p>
      </div>
    );
  }
    return null;
};

export default CriticalAuthGuard;
