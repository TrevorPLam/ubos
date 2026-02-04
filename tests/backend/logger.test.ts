/**
 * Tests for centralized logger with PII redaction.
 * 
 * Validates:
 * - PII redaction is enforced in all log messages
 * - PII redaction cannot be disabled in production
 * - Structured logging format works correctly
 * - Log levels are respected
 * 
 * Standards: OWASP Logging Cheat Sheet, GDPR Art 32, HIPAA 164.312(b)
 * Control: DP-3 (Sensitive data in logs)
 * Evidence: server/logger.ts enforces PII redaction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger, configureLogger, LogLevel } from "../../server/logger";

describe("Centralized Logger with PII Redaction", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    // Reset logger to default config
    configureLogger({
      minLevel: LogLevel.DEBUG,
      format: "text",
      redactPII: true,
    });
    
    // Clear spy calls from configuration
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  describe("PII Redaction", () => {
    it("should redact credit card numbers from log messages", () => {
      logger.info("User entered card 4532-1234-5678-9010");
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("4532-1234-5678-9010");
    });
    
    it("should redact SSN from log messages", () => {
      logger.info("SSN: 123-45-6789 found in record");
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("123-45-6789");
    });
    
    it("should redact passwords from log messages", () => {
      logger.info('User login with password="secret123"');
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("secret123");
    });
    
    it("should redact API keys from log messages", () => {
      logger.info("api_key=sk_test_1234567890abcdefghij");
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("sk_test_1234567890abcdefghij");
    });
    
    it("should redact JWT tokens from log messages", () => {
      logger.info("Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ");
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });
    
    it("should redact database URLs from log messages", () => {
      logger.info("Database: postgres://user:password@localhost:5432/db");
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("postgres://user:password@");
    });
    
    it("should redact PII from context objects", () => {
      logger.info("User login attempt", {
        source: "AUTH",
        password: "secret123",
        apiKey: "sk_test_1234567890",
      });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("secret123");
      expect(logOutput).not.toContain("sk_test_1234567890");
    });
  });
  
  describe("Production Protection", () => {
    it("should prevent disabling PII redaction in production", () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      
      expect(() => {
        configureLogger({ redactPII: false });
      }).toThrow("SECURITY VIOLATION: PII redaction cannot be disabled in production");
      
      // Restore env
      process.env.NODE_ENV = originalEnv;
    });
    
    it("should allow disabling PII redaction in development only", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      
      expect(() => {
        configureLogger({ redactPII: false });
      }).not.toThrow();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe("Log Levels", () => {
    it("should respect minimum log level", () => {
      configureLogger({ minLevel: LogLevel.WARN });
      
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");
      
      // Only warn and error should be logged
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
    
    it("should log all levels when minLevel is DEBUG", () => {
      configureLogger({ minLevel: LogLevel.DEBUG });
      
      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe("Structured Logging", () => {
    it("should output JSON format when configured", () => {
      configureLogger({ format: "json" });
      
      logger.info("Test message", { source: "TEST", userId: "user123" });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("level", "INFO");
      expect(parsed).toHaveProperty("message", "Test message");
      expect(parsed).toHaveProperty("context");
      expect(parsed.context).toHaveProperty("source", "TEST");
      expect(parsed.context).toHaveProperty("userId", "user123");
    });
    
    it("should output text format in development", () => {
      configureLogger({ format: "text" });
      
      logger.info("Test message", { source: "TEST" });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(typeof logOutput).toBe("string");
      expect(logOutput).toContain("[TEST]");
      expect(logOutput).toContain("INFO:");
      expect(logOutput).toContain("Test message");
    });
  });
  
  describe("Context Handling", () => {
    it("should include request context in logs", () => {
      logger.info("API request", {
        source: "EXPRESS",
        method: "POST",
        path: "/api/users",
        statusCode: 200,
        duration: 45,
      });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("EXPRESS");
      expect(logOutput).toContain("API request");
    });
    
    it("should truncate session IDs for security", () => {
      const fullSessionId = "550e8400-e29b-41d4-a716-446655440000";
      
      logger.info("Session created", {
        source: "SESSION",
        sessionId: fullSessionId.slice(0, 8), // Only first 8 chars
      });
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("550e8400");
      expect(logOutput).not.toContain(fullSessionId);
    });
  });
  
  describe("Error Logging", () => {
    it("should log errors with context", () => {
      logger.error("Database connection failed", {
        source: "DB",
        error: "Connection timeout",
      });
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("ERROR:");
      expect(logOutput).toContain("Database connection failed");
    });
    
    it("should not expose sensitive data in error messages", () => {
      logger.error("Login failed for user with password=secret123", {
        source: "AUTH",
      });
      
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("secret123");
    });
  });
});
