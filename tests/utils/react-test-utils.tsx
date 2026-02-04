// AI-META-BEGIN
// AI-META: Test file for react-test-utils.tsx
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Test utilities for React component testing.
 * 
 * Provides custom render functions that wrap components with necessary providers
 * (Router, Theme, Query Client, etc.) for testing.
 */

import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with test providers.
 * 
 * Usage:
 *   renderWithProviders(<MyComponent />, { initialRoute: '/clients' })
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // Set initial route if needed
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Create a new QueryClient configured for testing.
 * 
 * - Disables retries
 * - Disables caching
 * - Silences console errors
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wait for async operations to complete in tests.
 * Useful after triggering actions that cause async updates.
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock fetch for API testing.
 */
export function mockFetch(response: any, options: { status?: number; ok?: boolean } = {}) {
  const { status = 200, ok = true } = options;
  
  global.fetch = (() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  ) as any;
}

/**
 * Clear all mocks after tests.
 */
export function clearAllMocks() {
  // Mock clearing handled by test framework
}
