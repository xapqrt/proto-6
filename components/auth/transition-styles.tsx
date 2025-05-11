'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'react-router-dom';

/**
 * TransitionStyles component adds a dynamic style block to the document head
 * that ensures proper z-index and overlay behavior during auth transitions.
 * This component helps prevent any flash of login form during auth transitions.
 */
const TransitionStyles = () => {
  // Get auth from the hook with explicit type assertion
  const auth = useAuth() as any;
  const { user } = auth;
  const authState = auth.authState || 'unauthenticated';
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  
  // Handle transitioning state
  useEffect(() => {
    if (authState === 'transitioning' || authState === 'authenticating') {
      setIsTransitioning(true);
    } else {
      setIsTransitioning(false);
    }
  }, [authState]);

  useEffect(() => {
    // Create a style element if it doesn't exist yet
    let styleEl = document.getElementById('auth-transition-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'auth-transition-styles';
      document.head.appendChild(styleEl);
    }

    // Determine if we're in a critical transition path (login → dashboard)
    const isAuthenticatedAtLogin = user && location.pathname === '/login';
    const isCurrentlyTransitioning = isTransitioning || authState === 'transitioning' || authState === 'authenticating';
    
    // Update the style content based on current auth state
    if (isCurrentlyTransitioning || isAuthenticatedAtLogin) {
      styleEl.textContent = `        /* Global transition styles */
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--background);
          z-index: 999999; /* Ultra-high z-index */
          pointer-events: none; /* Allow clicks to pass through */
          opacity: ${isCurrentlyTransitioning ? '1' : '0.99'};
          transition: opacity 1s ease-in-out;
        }
        
        /* Hide login form during transition */
        form {
          opacity: ${isAuthenticatedAtLogin ? '0 !important' : '1'};
          transition: opacity 0.3s ease;
          z-index: ${isAuthenticatedAtLogin ? '-1 !important' : 'auto'};
          position: ${isAuthenticatedAtLogin ? 'absolute !important' : 'relative'};
          pointer-events: ${isAuthenticatedAtLogin ? 'none !important' : 'auto'};
        }
      `;
    } else {
      // Clear the styles when not transitioning
      styleEl.textContent = '';
    }

    return () => {    // Clean up on unmount
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [isTransitioning, authState, user, location.pathname]);

  return null; // This component doesn't render anything visible
};

export default TransitionStyles;
