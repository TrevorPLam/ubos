/**
 * Configuration validation and startup checks.
 * 
 * Validates security-critical configuration at application startup.
 * Fails fast if required settings are missing or invalid.
 * 
 * Standards Compliance:
 * - OWASP ASVS 14.1: Build and Deployment
 * - CIS Controls 5.1: Establish Secure Configurations
 * - NIST SP 800-53 CM-2: Baseline Configuration
 * - CONTROLS_MATRIX.md: CS-1, CS-2, CS-3 (Communications security)
 * 
 * Evidence:
 * - Validates all production-required configuration
 * - Fails fast on missing critical settings
 * - Test coverage: tests/backend/config-validation.test.ts
 * 
 * @see docs/security/30-implementation-guides/CONFIGURATION_GUIDE.md
 */

import { DEFAULT_SESSION_CONFIG, type SessionConfig } from "./session";
import { logger } from "./logger";

/**
 * Configuration validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Required environment variables for production.
 */
const REQUIRED_PRODUCTION_ENV = [
  "NODE_ENV",
  "DATABASE_URL",
  "ALLOWED_ORIGINS",
] as const;

/**
 * Recommended environment variables (warnings if missing).
 */
const RECOMMENDED_ENV = [
  "SESSION_SECRET",
  "LOG_LEVEL",
] as const;

/**
 * Validate environment variables.
 * 
 * @returns Validation result
 */
export function validateEnvironmentVariables(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const isProduction = process.env.NODE_ENV === "production";
  
  // Check required production variables
  if (isProduction) {
    for (const envVar of REQUIRED_PRODUCTION_ENV) {
      if (!process.env[envVar]) {
        result.valid = false;
        result.errors.push(
          `CRITICAL: Missing required environment variable: ${envVar}. ` +
          `See docs/security/30-implementation-guides/CONFIGURATION_GUIDE.md`
        );
      }
    }
    
    // Validate ALLOWED_ORIGINS format
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins) {
      const origins = allowedOrigins.split(",").filter(Boolean);
      if (origins.length === 0) {
        result.valid = false;
        result.errors.push(
          "CRITICAL: ALLOWED_ORIGINS is set but empty. Must contain at least one origin."
        );
      }
      
      // Validate each origin is a valid URL
      for (const origin of origins) {
        try {
          new URL(origin);
          if (!origin.startsWith("https://")) {
            result.warnings.push(
              `WARNING: Origin ${origin} does not use HTTPS. This may be insecure.`
            );
          }
        } catch (e) {
          result.valid = false;
          result.errors.push(
            `CRITICAL: Invalid origin in ALLOWED_ORIGINS: ${origin}. Must be a valid URL.`
          );
        }
      }
    }
    
    // Validate DATABASE_URL uses TLS
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      if (!databaseUrl.includes("sslmode=require") && !databaseUrl.includes("ssl=true")) {
        result.warnings.push(
          "WARNING: DATABASE_URL does not appear to use TLS. " +
          "Add sslmode=require for PostgreSQL or ssl=true for MySQL."
        );
      }
    }
  }
  
  // Check recommended variables
  for (const envVar of RECOMMENDED_ENV) {
    if (!process.env[envVar]) {
      result.warnings.push(
        `RECOMMENDED: Set ${envVar} environment variable. Using default.`
      );
    }
  }
  
  return result;
}

/**
 * Validate session configuration.
 * 
 * Ensures session timeouts meet security requirements:
 * - Absolute TTL: Max 24 hours (OWASP ASVS 3.2.1)
 * - Idle timeout: Max 30 minutes for standard apps, 15 min recommended (OWASP ASVS 3.3.2)
 * - Rotation interval: Max 2 hours (NIST SP 800-63B)
 * 
 * @param config - Session configuration to validate
 * @returns Validation result
 */
export function validateSessionConfig(config: SessionConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const isProduction = process.env.NODE_ENV === "production";
  
  // OWASP ASVS 3.2.1: Absolute session timeout
  const maxAbsoluteTTL = 24 * 60 * 60 * 1000; // 24 hours
  if (config.absoluteTTL > maxAbsoluteTTL) {
    result.valid = false;
    result.errors.push(
      `CRITICAL: Session absoluteTTL (${config.absoluteTTL}ms) exceeds maximum ` +
      `${maxAbsoluteTTL}ms (24 hours). See OWASP ASVS 3.2.1.`
    );
  }
  
  // OWASP ASVS 3.3.2: Idle timeout
  const maxIdleTimeout = 30 * 60 * 1000; // 30 minutes (absolute max)
  const recommendedIdleTimeout = 15 * 60 * 1000; // 15 minutes (recommended)
  
  if (config.idleTimeout > maxIdleTimeout) {
    result.valid = false;
    result.errors.push(
      `CRITICAL: Session idleTimeout (${config.idleTimeout}ms) exceeds maximum ` +
      `${maxIdleTimeout}ms (30 minutes). See OWASP ASVS 3.3.2.`
    );
  } else if (config.idleTimeout > recommendedIdleTimeout) {
    result.warnings.push(
      `WARNING: Session idleTimeout (${config.idleTimeout}ms) exceeds recommended ` +
      `${recommendedIdleTimeout}ms (15 minutes). Consider reducing for better security.`
    );
  }
  
  // Session rotation interval
  const maxRotationInterval = 2 * 60 * 60 * 1000; // 2 hours
  if (config.rotationInterval > maxRotationInterval) {
    result.warnings.push(
      `WARNING: Session rotationInterval (${config.rotationInterval}ms) exceeds recommended ` +
      `${maxRotationInterval}ms (2 hours). See NIST SP 800-63B.`
    );
  }
  
  // Production-specific checks
  if (isProduction) {
    if (!config.secure) {
      result.valid = false;
      result.errors.push(
        "CRITICAL: Session cookies must use 'secure' flag in production. " +
        "Set sessionConfig.secure = true."
      );
    }
    
    if (config.sameSite !== "strict" && config.sameSite !== "lax") {
      result.warnings.push(
        `WARNING: Session cookies use sameSite='${config.sameSite}'. ` +
        `Consider 'strict' or 'lax' for better CSRF protection.`
      );
    }
  }
  
  return result;
}

/**
 * Validate proxy configuration.
 * 
 * Express must trust the proxy to correctly extract client IP from
 * X-Forwarded-For headers. This is critical for rate limiting and
 * IP-based security controls.
 * 
 * @returns Validation result
 */
export function validateProxyConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const isProduction = process.env.NODE_ENV === "production";
  const trustProxy = process.env.TRUST_PROXY;
  
  if (isProduction) {
    if (!trustProxy) {
      result.valid = false;
      result.errors.push(
        "CRITICAL: TRUST_PROXY not configured in production. " +
        "Express cannot extract client IP from X-Forwarded-For. " +
        "Set TRUST_PROXY=true or specify proxy hop count. " +
        "See docs/security/30-implementation-guides/DEPLOYMENT_SECURITY.md"
      );
    } else {
      // Validate trust proxy value
      if (trustProxy === "true" || trustProxy === "1") {
        result.warnings.push(
          "WARNING: TRUST_PROXY=true trusts ALL proxies. " +
          "Consider specifying exact hop count (e.g., TRUST_PROXY=1) for better security."
        );
      }
    }
  }
  
  return result;
}

/**
 * Validate rate limiting configuration.
 * 
 * In production, rate limiting must use a shared store (e.g., Redis)
 * across multiple instances. In-memory rate limiting only works for
 * single-instance deployments.
 * 
 * @returns Validation result
 */
export function validateRateLimitConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const isProduction = process.env.NODE_ENV === "production";
  const redisUrl = process.env.REDIS_URL;
  const instanceCount = parseInt(process.env.INSTANCE_COUNT || "1", 10);
  
  if (isProduction && instanceCount > 1 && !redisUrl) {
    result.valid = false;
    result.errors.push(
      "CRITICAL: Multi-instance production deployment requires Redis for rate limiting. " +
      "In-memory rate limiting does not work across instances. " +
      "Set REDIS_URL or reduce INSTANCE_COUNT to 1. " +
      "See docs/security/00-overview/SECURITY_SUMMARY.md#technical-debt"
    );
  }
  
  if (isProduction && !redisUrl) {
    result.warnings.push(
      "WARNING: Using in-memory rate limiting in production. " +
      "This only works for single-instance deployments. " +
      "Migrate to Redis before scaling. " +
      "RISK ACCEPTANCE: Single-instance deployment until 2026-03-04. " +
      "See docs/security/00-overview/SECURITY_SUMMARY.md"
    );
  }
  
  return result;
}

/**
 * Validate session store configuration.
 * 
 * Similar to rate limiting, session storage must use a shared store
 * in multi-instance deployments.
 * 
 * @returns Validation result
 */
export function validateSessionStoreConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  const isProduction = process.env.NODE_ENV === "production";
  const redisUrl = process.env.REDIS_URL;
  const instanceCount = parseInt(process.env.INSTANCE_COUNT || "1", 10);
  
  if (isProduction && instanceCount > 1 && !redisUrl) {
    result.valid = false;
    result.errors.push(
      "CRITICAL: Multi-instance production deployment requires Redis for session storage. " +
      "In-memory sessions do not work across instances. " +
      "Set REDIS_URL or reduce INSTANCE_COUNT to 1. " +
      "See docs/security/00-overview/SECURITY_SUMMARY.md#technical-debt"
    );
  }
  
  if (isProduction && !redisUrl) {
    result.warnings.push(
      "WARNING: Using in-memory session storage in production. " +
      "This only works for single-instance deployments. " +
      "Migrate to Redis before scaling. " +
      "RISK ACCEPTANCE: Single-instance deployment until 2026-03-04. " +
      "See docs/security/00-overview/SECURITY_SUMMARY.md"
    );
  }
  
  return result;
}

/**
 * Run all configuration validations and report results.
 * 
 * This should be called at application startup before starting the server.
 * 
 * @param config - Session configuration to validate
 * @returns Combined validation result
 */
export function validateConfiguration(config: SessionConfig = DEFAULT_SESSION_CONFIG): ValidationResult {
  logger.info("Running configuration validation", { source: "CONFIG" });
  
  const results: ValidationResult[] = [
    validateEnvironmentVariables(),
    validateSessionConfig(config),
    validateProxyConfig(),
    validateRateLimitConfig(),
    validateSessionStoreConfig(),
  ];
  
  // Combine all results
  const combined: ValidationResult = {
    valid: results.every(r => r.valid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
  };
  
  // Log results
  if (combined.errors.length > 0) {
    combined.errors.forEach(error => logger.error(error, { source: "CONFIG" }));
  }
  
  if (combined.warnings.length > 0) {
    combined.warnings.forEach(warning => logger.warn(warning, { source: "CONFIG" }));
  }
  
  if (combined.valid) {
    logger.info("Configuration validation passed", { 
      source: "CONFIG",
      warningCount: combined.warnings.length 
    });
  } else {
    logger.error("Configuration validation FAILED", {
      source: "CONFIG",
      errorCount: combined.errors.length,
      warningCount: combined.warnings.length
    });
  }
  
  return combined;
}

/**
 * Assert configuration is valid or exit process.
 * 
 * Terminates the application if critical configuration is missing.
 * Use this at application startup to fail fast.
 * 
 * @param config - Session configuration to validate
 */
export function assertValidConfiguration(config?: SessionConfig): void {
  const result = validateConfiguration(config);
  
  if (!result.valid) {
    logger.error(
      "FATAL: Configuration validation failed. Application cannot start safely.",
      { source: "CONFIG", errorCount: result.errors.length }
    );
    process.exit(1);
  }
}
