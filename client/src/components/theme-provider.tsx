/**
 * Theme provider for dark/light mode support.
 *
 * AI Iteration Notes:
 * - Supports "dark", "light", and "system" themes
 * - Persists theme choice in localStorage
 * - Automatically applies system preference when "system" is selected
 * - Uses CSS classes for theme switching (compatible with TailwindCSS)
 */

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Theme provider component that manages dark/light mode.
 * 
 * @param children - React components to wrap
 * @param defaultTheme - Default theme if none stored
 * @param storageKey - localStorage key for persistence
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ubos-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize theme from localStorage or use default
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Use system preference
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    // Apply explicit theme choice
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      // Persist theme choice
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * Throws error if used outside ThemeProvider.
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
