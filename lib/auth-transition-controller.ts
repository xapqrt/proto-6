'use client';

/**
 * Global authentication transition controller - imperative approach
 * This deliberately uses imperative DOM manipulation to ensure the transition overlay
 * is always active during authentication transitions, regardless of React rendering cycles.
 */

// Create a singleton for managing auth transitions
class AuthTransitionController {
  private static instance: AuthTransitionController;
  private overlayElement: HTMLDivElement | null = null;
  private transitionActive: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private observer: MutationObserver | null = null;

  private constructor() {
    // Private constructor for singleton pattern
    this.initializeOverlay();
  }

  public static getInstance(): AuthTransitionController {
    if (!AuthTransitionController.instance) {
      AuthTransitionController.instance = new AuthTransitionController();
    }
    return AuthTransitionController.instance;
  }

  private initializeOverlay(): void {
    // Only create the overlay if it doesn't exist already
    if (typeof document !== 'undefined' && !this.overlayElement) {
      // Create the overlay element
      this.overlayElement = document.createElement('div');
      this.overlayElement.classList.add('global-transition-overlay');
      this.overlayElement.style.display = 'none';
      
      // Add the spinner and message
      this.overlayElement.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <span style="margin-top: 1rem; opacity: 0.7;">Transitioning...</span>
      `;

      // Add a style tag for the animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `;
      document.head.appendChild(style);
      
      // Add the overlay to the document body
      document.body.appendChild(this.overlayElement);

      // Import the CSS (will be handled by bundler)
      this.loadCSS('/globals/auth-transition.css');
    }
  }

  private loadCSS(url: string): void {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  public startTransition(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.transitionActive = true;
    
    if (typeof document !== 'undefined') {
      // Apply global class to document
      document.body.classList.add('global-transition-active');
      
      // Ensure overlay is displayed
      if (this.overlayElement) {
        this.overlayElement.style.display = 'flex';
      } else {
        // If overlay not created yet, reinitialize
        this.initializeOverlay();
        if (this.overlayElement) {
          this.overlayElement.style.display = 'flex';
        }
      }
          // Force any forms to be hidden
      const forms = document.querySelectorAll('form, .login-form, .card, [class*="login"]');
      forms.forEach(form => {
        if (form instanceof HTMLElement) {
          form.style.display = 'none';
          form.style.visibility = 'hidden';
          form.style.opacity = '0';
          form.style.pointerEvents = 'none';
          form.style.position = 'absolute';
          form.style.zIndex = '-99999';
          form.style.transform = 'scale(0)';
          form.style.height = '0';
          form.style.width = '0';
          form.style.overflow = 'hidden';
          form.style.margin = '0';
          form.style.padding = '0';
          form.style.border = '0';

          // Add data attributes for CSS selectors
          form.setAttribute('data-auth-hidden', 'true');
        }
      });
      
      // Dispatch event for the early-loading script
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-state-change', { 
          detail: { state: 'transitioning' }
        }));
      }
      
      // Create a MutationObserver to hide any forms that get added later
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement) {
                  // Check if it's a form or login-related element
                  if (
                    node.tagName === 'FORM' || 
                    node.classList.contains('login-form') ||
                    node.classList.contains('card') ||
                    node.classList.contains('login') ||
                    node.className.includes('login')
                  ) {
                    node.style.display = 'none';
                    node.style.visibility = 'hidden';
                    node.style.opacity = '0';
                    node.style.pointerEvents = 'none';
                    node.setAttribute('data-auth-hidden', 'true');
                  }
                  
                  // Also check children
                  const childForms = node.querySelectorAll('form, .login-form, .card, [class*="login"]');
                  childForms.forEach(childForm => {
                    if (childForm instanceof HTMLElement) {
                      childForm.style.display = 'none';
                      childForm.style.visibility = 'hidden';
                      childForm.style.opacity = '0';
                      childForm.style.pointerEvents = 'none';
                      childForm.setAttribute('data-auth-hidden', 'true');
                    }
                  });
                }
              });
            }
          }
        });
        
        // Start observing the document body
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: false
        });
        
        // Store observer to disconnect later
        this.observer = observer;
      }
      
      // Log for debugging
      console.log('[AuthTransitionController] Transition started');
    }
  }
  public endTransition(delay = 2000): void {
    // End transition after delay to ensure smooth experience
    this.timeoutId = setTimeout(() => {
      this.transitionActive = false;
      
      if (typeof document !== 'undefined') {
        // Remove global class
        document.body.classList.remove('global-transition-active');
        
        // Hide overlay
        if (this.overlayElement) {
          this.overlayElement.style.display = 'none';
        }
        
        // Disconnect observer
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        
        // Dispatch event for the early-loading script
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-state-change', { 
            detail: { state: 'authenticated' }
          }));
        }
        
        // Log for debugging
        console.log('[AuthTransitionController] Transition ended');
      }
    }, delay);
  }

  public isTransitioning(): boolean {
    return this.transitionActive;
  }
}

// Export the singleton instance
export const authTransitionController = typeof window !== 'undefined' 
  ? AuthTransitionController.getInstance() 
  : null;

// Export functions to control transition
export function startGlobalTransition(): void {
  if (authTransitionController) {
    authTransitionController.startTransition();
  }
}

export function endGlobalTransition(delay = 2000): void {
  if (authTransitionController) {
    authTransitionController.endTransition(delay);
  }
}

export function isGlobalTransitioning(): boolean {
  return authTransitionController ? authTransitionController.isTransitioning() : false;
}
