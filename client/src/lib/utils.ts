// AI-META-BEGIN
// AI-META: Client module - utils.ts
// OWNERSHIP: client
// ENTRYPOINTS: client code
// DEPENDENCIES: react
// DANGER: Review client logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Utility functions for the UBOS client.
 *
 * AI Iteration Notes:
 * - `cn()` function combines clsx and tailwind-merge for conditional styling
 * - Essential for shadcn/ui component styling patterns
 * - Use this instead of direct className concatenation for better maintainability
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with tailwind-merge.
 * This resolves conflicting Tailwind classes by keeping the last one.
 * 
 * @example cn("px-2 py-1", "py-2") // Returns "px-2 py-2"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
