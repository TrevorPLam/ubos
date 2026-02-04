// AI-META-BEGIN
// AI-META: Test file for auth-utils.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for lib/auth-utils.ts authentication utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isUnauthorizedError, redirectToLogin } from '@/lib/auth-utils';

describe('Auth Utils', () => {
  describe('isUnauthorizedError', () => {
    it('should return true for 401 unauthorized errors', () => {
      const error = new Error('401: Unauthorized');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('should return true for 401 errors with additional text', () => {
      const error = new Error('401: Unauthorized - Session expired');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('should return false for other error status codes', () => {
      const error404 = new Error('404: Not Found');
      const error500 = new Error('500: Internal Server Error');
      expect(isUnauthorizedError(error404)).toBe(false);
      expect(isUnauthorizedError(error500)).toBe(false);
    });

    it('should return false for non-HTTP errors', () => {
      const error = new Error('Something went wrong');
      expect(isUnauthorizedError(error)).toBe(false);
    });

    it('should return false for empty error messages', () => {
      const error = new Error('');
      expect(isUnauthorizedError(error)).toBe(false);
    });
  });

  describe('redirectToLogin', () => {
    beforeEach(() => {
      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;
      
      // Mock setTimeout to execute immediately in tests
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should redirect to /api/login', () => {
      redirectToLogin();
      
      // Fast-forward timers
      vi.advanceTimersByTime(500);
      
      expect(window.location.href).toBe('/api/login');
    });

    it('should call toast function when provided', () => {
      const mockToast = vi.fn();
      
      redirectToLogin(mockToast);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Unauthorized',
        description: 'You are logged out. Logging in again...',
        variant: 'destructive',
      });
    });

    it('should redirect after showing toast', () => {
      const mockToast = vi.fn();
      
      redirectToLogin(mockToast);
      
      // Toast should be called immediately
      expect(mockToast).toHaveBeenCalled();
      
      // Redirect should happen after delay
      expect(window.location.href).toBe('');
      vi.advanceTimersByTime(500);
      expect(window.location.href).toBe('/api/login');
    });

    it('should work without toast parameter', () => {
      expect(() => redirectToLogin()).not.toThrow();
      vi.advanceTimersByTime(500);
      expect(window.location.href).toBe('/api/login');
    });
  });
});
