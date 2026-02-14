// AI-META-BEGIN
// AI-META: React hook - use-auth.ts
// OWNERSHIP: client/hooks
// ENTRYPOINTS: various components
// DEPENDENCIES: react
// DANGER: Review hook dependencies
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Authentication hook.
 *
 * Current auth model (see `server/routes.ts`):
 * - Browser session is represented by an HttpOnly cookie.
 * - `/api/auth/user` returns the current user or 401.
 *
 * API contract:
 * - `user` is `null` when unauthenticated.
 * - `isAuthenticated` is a derived boolean (do not treat it as “token is valid forever”).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  // 2026 Best Practice: Environment-based logging to prevent production noise
  if (import.meta.env.DEV) {
    console.log("[useAuth] fetchUser response status:", response.status);
  }

  if (response.status === 401) {
    // Expected path: user has not visited `/api/login` yet or cookie expired/was cleared.
    // 2026 Best Practice: Environment-based logging to prevent production noise
    if (import.meta.env.DEV) {
      console.log("[useAuth] User not authenticated (401)");
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const user = await response.json();
  // 2026 Best Practice: Environment-based logging to prevent production noise
  if (import.meta.env.DEV) {
    console.log("[useAuth] User authenticated:", user);
  }
  return user;
}

async function logout(): Promise<void> {
  // Logout is handled server-side via Set-Cookie; using a hard redirect avoids stale state.
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
