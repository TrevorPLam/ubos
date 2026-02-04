// AI-META-BEGIN
// AI-META: Client module - auth-utils.ts
// OWNERSHIP: client
// ENTRYPOINTS: client code
// DEPENDENCIES: react
// DANGER: Review client logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Authentication utility functions.
 *
 * AI Iteration Notes:
 * - Helper functions for handling auth errors and redirects
 * - Used by components that need to handle 401 errors gracefully
 * - TODO: Consider adding more sophisticated error handling for different auth scenarios
 */

/**
 * Check if an error is an unauthorized (401) error.
 * Used to detect when user needs to re-authenticate.
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Redirect to login with optional toast notification.
 * 
 * @param toast - Optional toast function to show notification before redirect
 * 
 * AI Iteration Notes:
 * - Uses setTimeout to allow toast to show before redirect
 * - Hard redirect ensures clean auth state
 * - TODO: Consider adding return URL parameter for better UX
 */
export function redirectToLogin(
  toast?: (options: { title: string; description: string; variant: string }) => void,
) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  
  // Brief delay to show toast before redirect
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500);
}
