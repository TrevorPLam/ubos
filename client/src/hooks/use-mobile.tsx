/**
 * Mobile detection hook.
 *
 * AI Iteration Notes:
 * - Uses window.matchMedia for responsive design detection
 * - Returns boolean for mobile breakpoint (768px)
 * - Handles resize events with proper cleanup
 * - TODO: Consider adding tablet breakpoint detection if needed
 */

import * as React from "react";

// Mobile breakpoint: screens smaller than 768px
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize with undefined to avoid hydration mismatch
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Create media query for mobile detection
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handler for media query changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Add event listener for responsive behavior
    mql.addEventListener("change", onChange);
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Cleanup event listener on unmount
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Ensure boolean return (undefined -> false)
  return !!isMobile;
}
