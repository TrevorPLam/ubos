// AI-META-BEGIN
// AI-META: Centralized logging with PII redaction
// OWNERSHIP: server/observability
// ENTRYPOINTS: All server modules
// DEPENDENCIES: winston
// DANGER: PII leakage if redaction bypassed
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: tests/backend/logger.test.ts
// AI-META-END

/**
 * Centralized logging with mandatory PII redaction.
 * 
 * This logger replaces all direct console.log/warn/error usage to ensure
 * sensitive data is never written to logs.
 * 
 * Standards Compliance:
 * - OWASP Logging Cheat Sheet
 * - SOC2 CC7.1 (System Monitoring)
 * - GDPR Article 32 (Security of Processing)
 * - HIPAA 164.312(b) (Audit Controls)
 * - CONTROLS_MATRIX.md: DP-3 (Sensitive data in logs)
 * - THREAT_MODEL.md: T4.2 (Sensitive Data in Logs)
 * 
 * Evidence:
 * - All server-side logging routes through this module
 * - PII redaction enforced via security-utils.ts
 * - Test coverage: tests/backend/logger.test.ts
 * 
 * Production Migration Path:
 * - Phase 1: Replace console.* with logger.* (this file)
 * - Phase 2: Add structured logging (JSON format)
 * - Phase 3: Integrate with external SIEM/log aggregation
 * 
 * @see security-utils.ts for redaction implementation
 */

import { redactSensitiveData, redactSensitiveFields } from "./security-utils";

/**
 * Log levels aligned with syslog severity.
 */
export enum LogLevel {
  ERROR = "ERROR",     // Error conditions
  WARN = "WARN",       // Warning conditions
  INFO = "INFO",       // Informational messages
  DEBUG = "DEBUG",     // Debug-level messages
}

/**
 * Log context metadata.
 */
export interface LogContext {
  source?: string;      // Component/module name (e.g., "express", "session", "csrf")
  userId?: string;      // User ID (if authenticated)
  sessionId?: string;   // Session ID (truncated)
  requestId?: string;   // Request correlation ID
  ip?: string;          // Client IP (for audit trail)
  method?: string;      // HTTP method
  path?: string;        // Request path
  statusCode?: number;  // Response status
  duration?: number;    // Request duration (ms)
  [key: string]: any;   // Additional context
}

/**
 * Structured log entry.
 */
interface LogEntry {
  timestamp: string;    // ISO 8601 timestamp
  level: LogLevel;      // Log level
  message: string;      // Log message (PII redacted)
  context?: LogContext; // Additional context
}

/**
 * Logger configuration.
 */
interface LoggerConfig {
  minLevel: LogLevel;   // Minimum log level to output
  format: "text" | "json"; // Output format
  redactPII: boolean;   // Enable PII redaction (MUST be true in production)
}

/**
 * Current logger configuration.
 */
let config: LoggerConfig = {
  minLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  format: process.env.NODE_ENV === "production" ? "json" : "text",
  redactPII: true, // ALWAYS true - PII redaction mandatory
};

/**
 * Log level priority for filtering.
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

/**
 * Configure the logger.
 * 
 * WARNING: redactPII cannot be disabled in production.
 * 
 * @param newConfig - Partial configuration to override
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  // SECURITY: PII redaction cannot be disabled in production
  if (process.env.NODE_ENV === "production" && newConfig.redactPII === false) {
    throw new Error(
      "SECURITY VIOLATION: PII redaction cannot be disabled in production. " +
      "See docs/security/30-implementation-guides/DATA_PROTECTION.md"
    );
  }
  
  config = { ...config, ...newConfig };
  
  // Log configuration change (without exposing config values)
  writeLog(LogLevel.INFO, "Logger configuration updated", { source: "logger" });
}

/**
 * Format timestamp for log output.
 */
function formatTimestamp(): string {
  const now = new Date();
  
  if (config.format === "json") {
    // ISO 8601 for structured logs
    return now.toISOString();
  } else {
    // Human-readable for development
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
}

/**
 * Write a log entry to output.
 * 
 * @param level - Log level
 * @param message - Log message
 * @param context - Optional context metadata
 */
function writeLog(level: LogLevel, message: string, context?: LogContext): void {
  // Filter by minimum log level
  if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[config.minLevel]) {
    return;
  }
  
  // Redact PII from message
  const redactedMessage = config.redactPII ? redactSensitiveData(message) : message;
  
  // Redact PII from context
  let redactedContext: LogContext | undefined = context;
  if (context && config.redactPII) {
    redactedContext = redactSensitiveFields(context);
  }
  
  const timestamp = formatTimestamp();
  
  if (config.format === "json") {
    // Structured JSON logging for production
    const entry: LogEntry = {
      timestamp,
      level,
      message: redactedMessage,
      context: redactedContext,
    };
    console.log(JSON.stringify(entry));
  } else {
    // Human-readable text format for development
    const source = context?.source || "app";
    const contextStr = redactedContext && Object.keys(redactedContext).length > 1
      ? ` :: ${JSON.stringify(redactedContext)}`
      : "";
    
    const output = `${timestamp} [${source}] ${level}: ${redactedMessage}${contextStr}`;
    
    // Route to appropriate console method
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

/**
 * Log an error message.
 * 
 * @param message - Error message
 * @param context - Optional context metadata
 */
export function error(message: string, context?: LogContext): void {
  writeLog(LogLevel.ERROR, message, context);
}

/**
 * Log a warning message.
 * 
 * @param message - Warning message
 * @param context - Optional context metadata
 */
export function warn(message: string, context?: LogContext): void {
  writeLog(LogLevel.WARN, message, context);
}

/**
 * Log an informational message.
 * 
 * @param message - Info message
 * @param context - Optional context metadata
 */
export function info(message: string, context?: LogContext): void {
  writeLog(LogLevel.INFO, message, context);
}

/**
 * Log a debug message.
 * 
 * @param message - Debug message
 * @param context - Optional context metadata
 */
export function debug(message: string, context?: LogContext): void {
  writeLog(LogLevel.DEBUG, message, context);
}

/**
 * Default logger instance.
 */
export const logger = {
  error,
  warn,
  info,
  debug,
  configure: configureLogger,
};

/**
 * Legacy compatibility: simple log function.
 * 
 * @param message - Log message
 * @param source - Component name
 * @deprecated Use logger.info() with context instead
 */
export function log(message: string, source = "app"): void {
  info(message, { source });
}
