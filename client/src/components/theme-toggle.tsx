// AI-META-BEGIN
// AI-META: React component - theme-toggle.tsx
// OWNERSHIP: client/components
// ENTRYPOINTS: various pages/components
// DEPENDENCIES: react, ui
// DANGER: Review state management
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Theme toggle button component.
 *
 * AI Iteration Notes:
 * - Simple toggle between light and dark modes
 * - Uses animated icons for smooth transitions
 * - Ignores "system" theme for manual control
 * - TODO: Add support for three-way toggle (light/dark/system)
 */

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      data-testid="button-theme-toggle"
      title="Toggle theme"
    >
      {/* Sun icon - visible in dark mode, hidden in light mode */}
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      
      {/* Moon icon - hidden in dark mode, visible in light mode */}
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      
      {/* Screen reader only text for accessibility */}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
