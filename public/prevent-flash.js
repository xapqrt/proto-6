/**
 * Critical early-loading script to prevent flash of login form on the dashboard page
 * This is injected in the head tag before React loads to ensure immediate DOM control
 */
(function() {
  // ALWAYS apply protection immediately, then decide if we need to keep it later
  console.log('[prevent-flash] Applying immediate flash prevention');
    
  // Add critical classes to body immediately
  document.body.classList.add('auth-transitioning');
  document.body.classList.add('authenticated');
  document.body.classList.add('immediate-block');
  document.body.dataset.authState = 'transitioning';
  
  // Create and inject much more aggressive critical CSS immediately
  const styleEl = document.createElement('style');
  styleEl.id = 'critical-auth-flash-prevention';
  styleEl.textContent = `
    /* Critical Flash Prevention - Immediate DOM control */
    form, .login-form, .card, input[type="email"], input[type="password"], button[type="submit"] {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      position: absolute !important;
      pointer-events: none !important;
      z-index: -99999 !important;
      transform: scale(0) !important;
      height: 0 !important;
      width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
    }
    
    body.immediate-block * {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Only allow critical overlay to show */
    .critical-auth-overlay, #critical-auth-overlay, 
    .critical-auth-overlay *, #critical-auth-overlay * {
      display: flex !important;
      opacity: 1 !important;
      visibility: visible !important;
      position: fixed !important;
      pointer-events: auto !important;
      z-index: 9999999 !important;
    }
    
    /* Apply extreme protection for known login form classes */
    .login-form, 
    .login-card,
    form:has(input[type="password"]),
    form:has(button[type="submit"]),
    .card:has(input[type="password"]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -999 !important;
    }
    
    /* Ensure body is properly styled */
    body {
      overflow: hidden !important;
    }
  `;
  
  // Add to head as early as possible
  document.head.appendChild(styleEl);
  
  // Create a loading overlay to mask any possible flash (even before React mounts)
  const overlay = document.createElement('div');
  overlay.id = 'critical-auth-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--background, #fff);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  `;
  
  // Add a simple loading spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: var(--primary, #000);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;
  
  // Add keyframe animation for spinner
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinnerStyle);
  
  // Add loading text
  const loadingText = document.createElement('p');
  loadingText.textContent = 'Loading dashboard...';
  loadingText.style.cssText = `
    margin-top: 1rem;
    opacity: 0.7;
  `;
  
  // Assemble and add to body
  overlay.appendChild(spinner);
  overlay.appendChild(loadingText);
  document.body.appendChild(overlay);
  
  // NOW check if we should keep the protections based on state
  
  // 1. From sessionStorage (path-based detection)
  const path = window.location.pathname;
  const previousPath = sessionStorage.getItem('previousPath');
  const isNavigatingFromLogin = (path === '/' && previousPath === '/login');
  
  // 2. From localStorage (auth state tracking)
  const authState = localStorage.getItem('auth-state');
  const lastLogin = localStorage.getItem('last-login-time');
  const now = Date.now();
  const loginWindow = 20000; // 20 seconds window for transitions
  
  // Determine if we need to keep protection
  const needsProtection = 
    isNavigatingFromLogin || 
    authState === 'transitioning' || 
    authState === 'authenticated' || 
    (lastLogin && (now - parseInt(lastLogin, 10) < loginWindow));
  
  // If we don't need protection, remove it after a short delay
  if (!needsProtection) {
    setTimeout(() => {
      document.body.classList.remove('auth-transitioning');
      document.body.classList.remove('authenticated');
      document.body.classList.remove('immediate-block');
      document.body.removeAttribute('data-auth-state');
      
      const styleEl = document.getElementById('critical-auth-flash-prevention');
      const overlay = document.getElementById('critical-auth-overlay');
      if (styleEl) styleEl.remove();
      if (overlay) overlay.remove();
    }, 500); // Short delay to ensure React has time to fully handle this
  } else {
    console.log('[prevent-flash] Maintaining flash prevention measures');
    
    // Remove protection after transition window (but retain observer)
    setTimeout(() => {
      console.log('[prevent-flash] Removing critical flash prevention measures');
      const styleEl = document.getElementById('critical-auth-flash-prevention');
      const overlay = document.getElementById('critical-auth-overlay');
      if (styleEl) styleEl.remove();
      if (overlay) overlay.remove();
      // We're not removing the observer to maintain protection during the session
    }, 15000); // Keep for full 15 seconds
  }
  
  // Create a MutationObserver to maintain protection during DOM changes
  const observer = new MutationObserver(function(mutations) {
    // Look for login form insertion attempts
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        // Check for forms or login-related elements
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'FORM' || 
              (node.classList && (
                node.classList.contains('login-form') || 
                node.classList.contains('login-card')
              ))) {
            // Hide any detected login forms immediately
            node.style.display = 'none';
            node.style.opacity = '0';
            node.style.visibility = 'hidden';
            node.style.pointerEvents = 'none';
          }
        });
      }
    });
  });
  
  // Start observing the document body for login form insertion
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true 
  });
  
  // Store current path for next navigation
  sessionStorage.setItem('previousPath', path);
  
  // Listen for auth state changes to update localStorage
  window.addEventListener('auth-state-change', function(e) {
    localStorage.setItem('auth-state', e.detail.state);
    if (e.detail.state === 'authenticated') {
      localStorage.setItem('last-login-time', Date.now().toString());
    }
  });
})();
