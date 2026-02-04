// AI-META-BEGIN
// AI-META: Test file for config-validation.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for configuration validation.
 * 
 * Validates:
 * - Required environment variables are checked
 * - Session timeout limits are enforced (OWASP ASVS 3.2.1, 3.3.2)
 * - Proxy configuration is validated in production
 * - Redis requirement is enforced for multi-instance deployments
 * - Startup validation fails fast on critical misconfigurations
 * 
 * Standards: OWASP ASVS 14.1, CIS Controls 5.1, NIST CM-2
 * Controls: AC-3 (Session timeout), CS-1 (Proxy config)
 * Evidence: server/config-validation.ts enforces requirements
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateEnvironmentVariables,
  validateSessionConfig,
  validateProxyConfig,
  validateRateLimitConfig,
  validateSessionStoreConfig,
  validateConfiguration,
  type ValidationResult,
} from "../../server/config-validation";
import type { SessionConfig } from "../../server/session";

describe("Configuration Validation", () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    originalEnv = { ...process.env };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe("Environment Variables Validation", () => {
    it("should pass validation with all required production env vars", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://user:pass@localhost/db?sslmode=require";
      process.env.ALLOWED_ORIGINS = "https://example.com";
      
      const result = validateEnvironmentVariables();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it("should fail validation when NODE_ENV is production but DATABASE_URL missing", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://example.com";
      delete process.env.DATABASE_URL;
      
      const result = validateEnvironmentVariables();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("DATABASE_URL"))).toBe(true);
    });
    
    it("should fail validation when ALLOWED_ORIGINS is empty in production", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://localhost/db";
      process.env.ALLOWED_ORIGINS = "";
      
      const result = validateEnvironmentVariables();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("ALLOWED_ORIGINS"))).toBe(true);
    });
    
    it("should warn when ALLOWED_ORIGINS contains non-HTTPS URLs", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://localhost/db";
      process.env.ALLOWED_ORIGINS = "http://example.com";
      
      const result = validateEnvironmentVariables();
      
      expect(result.warnings.some(w => w.includes("HTTPS"))).toBe(true);
    });
    
    it("should warn when DATABASE_URL does not use TLS", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://user:pass@localhost/db";
      process.env.ALLOWED_ORIGINS = "https://example.com";
      
      const result = validateEnvironmentVariables();
      
      expect(result.warnings.some(w => w.includes("TLS") || w.includes("ssl"))).toBe(true);
    });
    
    it("should allow missing ALLOWED_ORIGINS in development", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ALLOWED_ORIGINS;
      
      const result = validateEnvironmentVariables();
      
      // Should pass but may have warnings
      expect(result.valid).toBe(true);
    });
  });
  
  describe("Session Configuration Validation", () => {
    it("should pass validation with OWASP-compliant session config", () => {
      const config: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000, // 24 hours
        idleTimeout: 15 * 60 * 1000, // 15 minutes
        rotationInterval: 60 * 60 * 1000, // 1 hour
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it("should fail when absoluteTTL exceeds 24 hours (OWASP ASVS 3.2.1)", () => {
      const config: SessionConfig = {
        absoluteTTL: 48 * 60 * 60 * 1000, // 48 hours - TOO LONG
        idleTimeout: 15 * 60 * 1000,
        rotationInterval: 60 * 60 * 1000,
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("absoluteTTL") && e.includes("OWASP ASVS 3.2.1"))).toBe(true);
    });
    
    it("should fail when idleTimeout exceeds 30 minutes (OWASP ASVS 3.3.2)", () => {
      const config: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000,
        idleTimeout: 45 * 60 * 1000, // 45 minutes - TOO LONG
        rotationInterval: 60 * 60 * 1000,
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("idleTimeout") && e.includes("OWASP ASVS 3.3.2"))).toBe(true);
    });
    
    it("should warn when idleTimeout exceeds 15 minutes (recommended)", () => {
      const config: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000,
        idleTimeout: 20 * 60 * 1000, // 20 minutes - acceptable but not recommended
        rotationInterval: 60 * 60 * 1000,
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.valid).toBe(true); // Still passes
      expect(result.warnings.some(w => w.includes("idleTimeout") && w.includes("15 minutes"))).toBe(true);
    });
    
    it("should fail when secure flag is false in production", () => {
      process.env.NODE_ENV = "production";
      
      const config: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000,
        idleTimeout: 15 * 60 * 1000,
        rotationInterval: 60 * 60 * 1000,
        cookieName: "session",
        secure: false, // INSECURE IN PRODUCTION
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("secure") && e.includes("production"))).toBe(true);
    });
    
    it("should warn when rotationInterval exceeds 2 hours", () => {
      const config: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000,
        idleTimeout: 15 * 60 * 1000,
        rotationInterval: 3 * 60 * 60 * 1000, // 3 hours - too long
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateSessionConfig(config);
      
      expect(result.warnings.some(w => w.includes("rotationInterval") && w.includes("2 hours"))).toBe(true);
    });
  });
  
  describe("Proxy Configuration Validation", () => {
    it("should fail when TRUST_PROXY not set in production", () => {
      process.env.NODE_ENV = "production";
      delete process.env.TRUST_PROXY;
      
      const result = validateProxyConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("TRUST_PROXY"))).toBe(true);
    });
    
    it("should pass when TRUST_PROXY is set in production", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUST_PROXY = "1";
      
      const result = validateProxyConfig();
      
      expect(result.valid).toBe(true);
    });
    
    it("should warn when TRUST_PROXY=true (trusts all proxies)", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUST_PROXY = "true";
      
      const result = validateProxyConfig();
      
      expect(result.warnings.some(w => w.includes("trusts ALL proxies"))).toBe(true);
    });
    
    it("should allow missing TRUST_PROXY in development", () => {
      process.env.NODE_ENV = "development";
      delete process.env.TRUST_PROXY;
      
      const result = validateProxyConfig();
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe("Rate Limiting Configuration Validation", () => {
    it("should fail when multi-instance without Redis", () => {
      process.env.NODE_ENV = "production";
      process.env.INSTANCE_COUNT = "3";
      delete process.env.REDIS_URL;
      
      const result = validateRateLimitConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Redis") && e.includes("rate limiting"))).toBe(true);
    });
    
    it("should pass when single-instance without Redis", () => {
      process.env.NODE_ENV = "production";
      process.env.INSTANCE_COUNT = "1";
      delete process.env.REDIS_URL;
      
      const result = validateRateLimitConfig();
      
      expect(result.valid).toBe(true);
      // Should have warning about risk acceptance
      expect(result.warnings.some(w => w.includes("in-memory"))).toBe(true);
    });
    
    it("should pass when multi-instance with Redis", () => {
      process.env.NODE_ENV = "production";
      process.env.INSTANCE_COUNT = "3";
      process.env.REDIS_URL = "redis://localhost:6379";
      
      const result = validateRateLimitConfig();
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe("Session Store Configuration Validation", () => {
    it("should fail when multi-instance without Redis", () => {
      process.env.NODE_ENV = "production";
      process.env.INSTANCE_COUNT = "3";
      delete process.env.REDIS_URL;
      
      const result = validateSessionStoreConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Redis") && e.includes("session storage"))).toBe(true);
    });
    
    it("should warn about risk acceptance for single-instance", () => {
      process.env.NODE_ENV = "production";
      process.env.INSTANCE_COUNT = "1";
      delete process.env.REDIS_URL;
      
      const result = validateSessionStoreConfig();
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes("RISK ACCEPTANCE") && w.includes("2026-03-04"))).toBe(true);
    });
  });
  
  describe("Complete Configuration Validation", () => {
    it("should validate all checks and combine results", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://localhost/db?sslmode=require";
      process.env.ALLOWED_ORIGINS = "https://example.com";
      process.env.TRUST_PROXY = "1";
      process.env.INSTANCE_COUNT = "1";
      
      const sessionConfig: SessionConfig = {
        absoluteTTL: 24 * 60 * 60 * 1000,
        idleTimeout: 15 * 60 * 1000,
        rotationInterval: 60 * 60 * 1000,
        cookieName: "session",
        secure: true,
        sameSite: "lax",
      };
      
      const result = validateConfiguration(sessionConfig);
      
      expect(result.valid).toBe(true);
    });
    
    it("should fail fast when critical configuration is missing", () => {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      delete process.env.TRUST_PROXY;
      
      const result = validateConfiguration();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
