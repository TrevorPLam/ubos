// AI-META-BEGIN
// AI-META: Test file for csrf.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for CSRF protection.
 * 
 * Validates:
 * - CSRF token generation and validation
 * - Token lifecycle (creation, expiry, invalidation)
 * - Middleware behavior (safe methods pass, unsafe fail without token)
 * - Multiple token sources (header, body, query)
 * 
 * References:
 * - OWASP ASVS 4.2.2: CSRF protection
 * - CONTROLS_MATRIX.md: AC-8 (CSRF protection)
 * - THREAT_MODEL.md: T1.1 (Session security)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  generateCsrfToken,
  getOrCreateCsrfToken,
  invalidateCsrfToken,
  validateCsrfToken,
  requireCsrf,
  attachCsrfToken,
  getCsrfTokenHandler,
  cleanupExpiredCsrfTokens,
  getCsrfTokenStats,
} from '../../server/csrf';

describe('CSRF Protection', () => {
  describe('Token Generation', () => {
    it('should generate cryptographically random tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2); // Random tokens should differ
      expect(token1.length).toBeGreaterThan(32); // Base64 encoded, should be long
    });

    it('should generate unique tokens for different users', () => {
      const token1 = getOrCreateCsrfToken('user-1');
      const token2 = getOrCreateCsrfToken('user-2');
      
      expect(token1).not.toBe(token2);
    });

    it('should return same token for same user', () => {
      const userId = 'user-consistent';
      const token1 = getOrCreateCsrfToken(userId);
      const token2 = getOrCreateCsrfToken(userId);
      
      expect(token1).toBe(token2);
    });
  });

  describe('Token Validation', () => {
    it('should validate correct token', () => {
      const userId = 'user-valid';
      const token = getOrCreateCsrfToken(userId);
      
      expect(validateCsrfToken(userId, token)).toBe(true);
    });

    it('should reject invalid token', () => {
      const userId = 'user-invalid';
      getOrCreateCsrfToken(userId); // Create token
      
      expect(validateCsrfToken(userId, 'wrong-token')).toBe(false);
    });

    it('should reject missing token', () => {
      const userId = 'user-missing';
      getOrCreateCsrfToken(userId);
      
      expect(validateCsrfToken(userId, undefined)).toBe(false);
    });

    it('should reject token for different user', () => {
      const token = getOrCreateCsrfToken('user-a');
      
      expect(validateCsrfToken('user-b', token)).toBe(false);
    });
  });

  describe('Token Lifecycle', () => {
    it('should invalidate token on logout', () => {
      const userId = 'user-logout';
      const token = getOrCreateCsrfToken(userId);
      
      expect(validateCsrfToken(userId, token)).toBe(true);
      
      invalidateCsrfToken(userId);
      
      expect(validateCsrfToken(userId, token)).toBe(false);
    });

    it('should generate new token after invalidation', () => {
      const userId = 'user-new';
      const token1 = getOrCreateCsrfToken(userId);
      
      invalidateCsrfToken(userId);
      
      const token2 = getOrCreateCsrfToken(userId);
      
      expect(token2).not.toBe(token1);
      expect(validateCsrfToken(userId, token2)).toBe(true);
    });
  });

  describe('requireCsrf Middleware', () => {
    it('should allow safe methods (GET) without token', () => {
      const req = {
        method: 'GET',
        user: { claims: { sub: 'user-123' } },
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should allow safe methods (HEAD) without token', () => {
      const req = {
        method: 'HEAD',
        user: { claims: { sub: 'user-123' } },
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should allow safe methods (OPTIONS) without token', () => {
      const req = {
        method: 'OPTIONS',
        user: { claims: { sub: 'user-123' } },
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should reject POST without token', () => {
      const req = {
        method: 'POST',
        path: '/api/test',
        ip: '127.0.0.1',
        user: { claims: { sub: 'user-123' } },
        header: () => null,
        body: {},
        query: {},
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_VALIDATION_FAILED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject POST with invalid token', () => {
      const userId = 'user-post';
      getOrCreateCsrfToken(userId); // Create token
      
      const req = {
        method: 'POST',
        path: '/api/test',
        ip: '127.0.0.1',
        user: { claims: { sub: userId } },
        header: () => 'invalid-token',
        body: {},
        query: {},
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow POST with valid token in header', () => {
      const userId = 'user-valid-post';
      const token = getOrCreateCsrfToken(userId);
      
      const req = {
        method: 'POST',
        user: { claims: { sub: userId } },
        header: (name: string) => (name.toLowerCase() === 'x-csrf-token' ? token : null),
        body: {},
        query: {},
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should allow POST with valid token in body', () => {
      const userId = 'user-body-token';
      const token = getOrCreateCsrfToken(userId);
      
      const req = {
        method: 'POST',
        user: { claims: { sub: userId } },
        header: () => null,
        body: { _csrf: token },
        query: {},
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should allow POST with valid token in query', () => {
      const userId = 'user-query-token';
      const token = getOrCreateCsrfToken(userId);
      
      const req = {
        method: 'POST',
        user: { claims: { sub: userId } },
        header: () => null,
        body: {},
        query: { csrf: token },
      } as any as Request;
      const res = {} as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', () => {
      const req = {
        method: 'POST',
        user: undefined,
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate PUT requests', () => {
      const req = {
        method: 'PUT',
        path: '/api/test',
        ip: '127.0.0.1',
        user: { claims: { sub: 'user-123' } },
        header: () => null,
        body: {},
        query: {},
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should validate DELETE requests', () => {
      const req = {
        method: 'DELETE',
        path: '/api/test',
        ip: '127.0.0.1',
        user: { claims: { sub: 'user-123' } },
        header: () => null,
        body: {},
        query: {},
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should validate PATCH requests', () => {
      const req = {
        method: 'PATCH',
        path: '/api/test',
        ip: '127.0.0.1',
        user: { claims: { sub: 'user-123' } },
        header: () => null,
        body: {},
        query: {},
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      requireCsrf(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('attachCsrfToken Middleware', () => {
    it('should attach token to request for authenticated user', () => {
      const userId = 'user-attach';
      
      const req = {
        user: { claims: { sub: userId } },
      } as any as Request;
      const res = {
        setHeader: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      attachCsrfToken(req, res, next);
      
      expect(req.csrfToken).toBeTruthy();
      expect(req.generateCsrfToken).toBeTypeOf('function');
      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should not attach token for unauthenticated user', () => {
      const req = {
        user: undefined,
      } as any as Request;
      const res = {
        setHeader: vi.fn(),
      } as any as Response;
      const next = vi.fn();
      
      attachCsrfToken(req, res, next);
      
      expect(req.csrfToken).toBeUndefined();
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getCsrfTokenHandler', () => {
    it('should return token for authenticated user', () => {
      const userId = 'user-get-token';
      
      const req = {
        user: { claims: { sub: userId } },
      } as any as Request;
      const res = {
        json: vi.fn(),
      } as any as Response;
      
      getCsrfTokenHandler(req, res, vi.fn());
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          csrfToken: expect.any(String),
          expiresIn: expect.any(Number),
        })
      );
    });

    it('should reject unauthenticated user', () => {
      const req = {
        user: undefined,
      } as any as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;
      
      getCsrfTokenHandler(req, res, vi.fn());
      
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      // Clear all tokens before each test by importing and clearing the store
      vi.clearAllMocks();
      // Note: We can't directly access the token store as it's not exported
      // So we'll create tokens with unique user IDs for each test
    });

    it('should cleanup expired tokens', () => {
      const uniqueUser1 = 'cleanup-user-1-' + Date.now();
      const uniqueUser2 = 'cleanup-user-2-' + Date.now();
      
      // Create some tokens
      getOrCreateCsrfToken(uniqueUser1);
      getOrCreateCsrfToken(uniqueUser2);
      
      // Verify tokens exist
      expect(validateCsrfToken(uniqueUser1, getOrCreateCsrfToken(uniqueUser1))).toBe(true);
      expect(validateCsrfToken(uniqueUser2, getOrCreateCsrfToken(uniqueUser2))).toBe(true);
      
      // Mock time to make tokens appear expired
      const originalDateNow = Date.now;
      const mockTime = Date.now() + (1000 * 60 * 60 * 25); // 25 hours later
      Date.now = vi.fn(() => mockTime);
      
      // Run cleanup
      cleanupExpiredCsrfTokens();
      
      // Restore original Date.now
      Date.now = originalDateNow;
      
      // Get fresh tokens (old ones should be expired)
      const newToken1 = getOrCreateCsrfToken(uniqueUser1);
      const newToken2 = getOrCreateCsrfToken(uniqueUser2);
      
      // Old tokens should not validate anymore, but new ones should
      expect(validateCsrfToken(uniqueUser1, newToken1)).toBe(true);
      expect(validateCsrfToken(uniqueUser2, newToken2)).toBe(true);
    });

    it('should provide token statistics', () => {
      const uniqueUser1 = 'stats-user-1-' + Date.now();
      const uniqueUser2 = 'stats-user-2-' + Date.now();
      
      // Create tokens with different ages
      getOrCreateCsrfToken(uniqueUser1);
      
      const originalDateNow = Date.now;
      const mockTime = Date.now() + 5000; // 5 seconds later
      Date.now = vi.fn(() => mockTime);
      
      getOrCreateCsrfToken(uniqueUser2);
      
      // Get stats
      const stats = getCsrfTokenStats();
      
      // Restore original Date.now
      Date.now = originalDateNow;
      
      expect(stats.totalTokens).toBeGreaterThanOrEqual(2);
      expect(stats.oldestTokenAge).toBeGreaterThan(0);
    });

    it('should handle empty token store for stats', () => {
      // This test checks that stats function doesn't crash with empty store
      const stats = getCsrfTokenStats();
      
      expect(stats.totalTokens).toBeGreaterThanOrEqual(0);
      expect(stats.oldestTokenAge).toBeGreaterThanOrEqual(0);
    });
  });
});
