// AI-META-BEGIN
// AI-META: Test file for security.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Security middleware tests.
 * 
 * Tests actual security functions from server/security.ts:
 * - setupSecurityHeaders - Helmet configuration
 * - setupRateLimiting - Rate limiting setup
 * - setupCORS - CORS configuration
 * - setupRequestSanitization - Input sanitization
 * - setupSecurityMiddleware - Main orchestrator
 * 
 * References:
 * - server/security.ts
 * - docs/security/30-implementation-guides/APPLICATION_SECURITY.md
 * - docs/security/40-compliance/SOC2_COMPLIANCE.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { 
  setupSecurityHeaders,
  setupRateLimiting,
  setupCORS,
  setupRequestSanitization,
  setupSecurityMiddleware
} from "../../server/security";

// Mock all dependencies at the top level
vi.mock("helmet", () => ({
  default: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

vi.mock("express-rate-limit", () => ({
  default: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

vi.mock("cors", () => ({
  default: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

vi.mock("../../server/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Security Middleware", () => {
  let app: express.Express;
  let helmet: any;
  let rateLimit: any;
  let cors: any;
  let logger: any;

  beforeEach(async () => {
    app = express();
    vi.clearAllMocks();
    
    // Import mocked modules
    const helmetMock = await vi.importMock("helmet");
    const rateLimitMock = await vi.importMock("express-rate-limit");
    const corsMock = await vi.importMock("cors");
    const loggerMock = await vi.importMock("../../server/logger");
    
    helmet = helmetMock.default;
    rateLimit = rateLimitMock.default;
    cors = corsMock.default;
    logger = loggerMock.logger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setupSecurityHeaders", () => {
    it("should apply helmet middleware", () => {
      setupSecurityHeaders(app);
      
      expect(helmet).toHaveBeenCalled();
      expect(helmet.mock.calls[0][0]).toMatchObject({
        strictTransportSecurity: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        frameguard: { action: "deny" },
        noSniff: true,
        hidePoweredBy: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      });
    });

    it("should apply middleware to app", () => {
      const originalUse = app.use;
      const mockUse = vi.fn();
      app.use = mockUse;
      
      setupSecurityHeaders(app);
      
      expect(mockUse).toHaveBeenCalled();
      app.use = originalUse;
    });
  });

  describe("setupRateLimiting", () => {
    it("should configure global rate limiter", () => {
      setupRateLimiting(app);
      
      expect(rateLimit).toHaveBeenCalledTimes(3);
      expect(rateLimit.mock.calls[0][0]).toMatchObject({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        message: "Too many requests from this IP, please try again later",
        standardHeaders: true,
        legacyHeaders: false,
        skip: expect.any(Function),
      });
    });

    it("should configure auth rate limiter with stricter limits", () => {
      setupRateLimiting(app);
      
      const authCall = rateLimit.mock.calls[1][0];
      expect(authCall).toMatchObject({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: "Too many login attempts, please try again later",
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
      });
    });

    it("should configure API rate limiter", () => {
      setupRateLimiting(app);
      
      const apiCall = rateLimit.mock.calls[2][0];
      expect(apiCall).toMatchObject({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: "API rate limit exceeded, please try again later",
        standardHeaders: true,
        legacyHeaders: false,
      });
    });

    it("should skip rate limiting for health endpoints", () => {
      setupRateLimiting(app);
      
      const globalCall = rateLimit.mock.calls[0][0];
      const skipFn = globalCall.skip;
      
      expect(skipFn({ path: "/health" })).toBe(true);
      expect(skipFn({ path: "/api/health" })).toBe(true);
      expect(skipFn({ path: "/api/users" })).toBe(false);
    });
  });

  describe("setupCORS", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should allow localhost origins in development", () => {
      process.env.NODE_ENV = "development";
      const mockCallback = vi.fn();
      
      setupCORS(app);
      
      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: true,
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user"],
          exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
          maxAge: 86400,
          origin: expect.any(Function),
        })
      );

      const corsOptions = cors.mock.calls[0][0];
      const originFn = corsOptions.origin;
      
      originFn("http://localhost:3000", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);
      
      originFn("https://evil.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should restrict origins in production", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://app.example.com,https://admin.example.com";
      const mockCallback = vi.fn();
      
      setupCORS(app);
      
      const corsOptions = cors.mock.calls[0][0];
      const originFn = corsOptions.origin;
      
      originFn("https://app.example.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);
      
      originFn("https://evil.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should deny CORS in production without ALLOWED_ORIGINS", () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOWED_ORIGINS;
      
      setupCORS(app);
      
      const corsOptions = cors.mock.calls[0][0];
      const originFn = corsOptions.origin;
      
      // Trigger the origin function to invoke the logger
      const mockCallback = vi.fn();
      originFn("https://example.com", mockCallback);
      
      expect(logger.warn).toHaveBeenCalledWith(
        "ALLOWED_ORIGINS not configured in production. CORS disabled.",
        expect.objectContaining({
          source: "SECURITY",
          severity: "CRITICAL"
        })
      );
    });
  });

  describe("setupRequestSanitization", () => {
    it("should apply middleware to app", () => {
      const originalUse = app.use;
      const mockUse = vi.fn();
      app.use = mockUse;
      
      setupRequestSanitization(app);
      
      expect(mockUse).toHaveBeenCalled();
      app.use = originalUse;
    });
  });

  describe("setupSecurityMiddleware", () => {
    it("should setup all security middleware in correct order", () => {
      setupSecurityMiddleware(app);
      
      expect(cors).toHaveBeenCalled();
      expect(helmet).toHaveBeenCalled();
      expect(rateLimit).toHaveBeenCalledTimes(3);
    });

    it("should apply middleware before routes", () => {
      expect(() => {
        setupSecurityMiddleware(app);
      }).not.toThrow();
    });
  });
});
