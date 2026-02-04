/**
 * Security utilities for data protection and sanitization.
 * 
 * Implements:
 * - PII redaction for logs (GDPR, HIPAA, SOC2 C1)
 * - Sensitive data masking
 * - Secure error formatting
 * 
 * References:
 * - OWASP Logging Cheat Sheet
 * - SOC2 CC7.1 (System Monitoring)
 * - GDPR Article 32 (Security of Processing)
 * - HIPAA 164.312(b) (Audit Controls)
 * - THREAT_MODEL.md: T4.2 (Sensitive Data in Logs)
 */

/**
 * Patterns for detecting sensitive data that should never be logged.
 * 
 * Based on:
 * - PCI-DSS 3.4 (primary account numbers)
 * - HIPAA identifiers
 * - Common authentication patterns
 * - Personal identifiable information (PII)
 */
const SENSITIVE_PATTERNS = {
  // Payment card numbers (PCI-DSS) - handle both separators
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // Social Security Numbers (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Authentication tokens and secrets
  bearerToken: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  jwt: /eyJ[A-Za-z0-9\-._~+/]+=*/g,
  apiKey: /\b[Aa]pi[_-]?[Kk]ey['"]?\s*[:=]\s*['"]?[A-Za-z0-9\-._~+/]{20,}/g,
  
  // Password patterns
  password: /(['"]?password['"]?\s*[:=]\s*['"])[^'"]+(['"])/gi,
  passwd: /(['"]?passwd['"]?\s*[:=]\s*['"])[^'"]+(['"])/gi,
  pwd: /(['"]?pwd['"]?\s*[:=]\s*['"])[^'"]+(['"])/gi,
  
  // Database connection strings
  dbUrl: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s]+/gi,
  
  // Email addresses (selective - might be needed in some logs)
  // email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (US format)
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // IP addresses (when configured to redact)
  // ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Sensitive field names that should be redacted from objects.
 * 
 * Case-insensitive matching for common field names containing sensitive data.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'cookie',
  'session',
  'sessionid',
  'session_id',
  'credit_card',
  'creditcard',
  'ccnumber',
  'cvv',
  'ssn',
  'social_security',
  'tax_id',
  'taxid',
  'pin',
  'access_token',
  'refresh_token',
  'private_key',
  'privatekey',
  'database_url',
  'db_password',
  'connection_string',
]);

/**
 * Redact sensitive data from a string.
 * 
 * Replaces patterns matching PII, credentials, or payment data with [REDACTED].
 * 
 * @param text - String that may contain sensitive data
 * @returns String with sensitive data redacted
 */
export function redactSensitiveData(text: string): string {
  if (typeof text !== 'string') {
    return text;
  }
  
  let redacted = text;
  
  // Replace credit card numbers
  redacted = redacted.replace(SENSITIVE_PATTERNS.creditCard, (match) => {
    const last4 = match.slice(-4);
    return `****-****-****-${last4}`;
  });
  
  // Replace SSNs
  redacted = redacted.replace(SENSITIVE_PATTERNS.ssn, 'XXX-XX-XXXX');
  
  // Replace bearer tokens
  redacted = redacted.replace(SENSITIVE_PATTERNS.bearerToken, 'Bearer [REDACTED]');
  
  // Replace JWTs
  redacted = redacted.replace(SENSITIVE_PATTERNS.jwt, '[JWT_REDACTED]');
  
  // Replace API keys
  redacted = redacted.replace(SENSITIVE_PATTERNS.apiKey, (match) => {
    const prefix = match.substring(0, match.indexOf('=') + 1);
    return `${prefix}"[REDACTED]"`;
  });
  
  // Replace password values
  redacted = redacted.replace(SENSITIVE_PATTERNS.password, '$1[REDACTED]$2');
  redacted = redacted.replace(SENSITIVE_PATTERNS.passwd, '$1[REDACTED]$2');
  redacted = redacted.replace(SENSITIVE_PATTERNS.pwd, '$1[REDACTED]$2');
  
  // Replace database URLs
  redacted = redacted.replace(SENSITIVE_PATTERNS.dbUrl, (match) => {
    const protocol = match.substring(0, match.indexOf('://') + 3);
    return `${protocol}[REDACTED]@[REDACTED]`;
  });
  
  // Replace phone numbers
  redacted = redacted.replace(SENSITIVE_PATTERNS.phone, 'XXX-XXX-XXXX');
  
  return redacted;
}

/**
 * Redact sensitive fields from an object recursively.
 * 
 * Replaces values of sensitive fields with [REDACTED] while preserving structure.
 * Handles nested objects and arrays.
 * 
 * @param obj - Object that may contain sensitive fields
 * @param maxDepth - Maximum recursion depth (prevents infinite loops)
 * @param seen - Set of already processed objects (prevents circular references)
 * @returns Object with sensitive fields redacted
 */
export function redactSensitiveFields(obj: any, maxDepth: number = 10, seen: WeakSet<any> = new WeakSet()): any {
  if (maxDepth <= 0) {
    return '[MAX_DEPTH_EXCEEDED]';
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitives
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? redactSensitiveData(obj) : obj;
  }
  
  // Detect circular references
  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveFields(item, maxDepth - 1, seen));
  }
  
  // Handle objects
  const redacted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field name is sensitive
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      redacted[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively redact nested objects
    if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveFields(value, maxDepth - 1, seen);
    } else if (typeof value === 'string') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Safe JSON stringification with sensitive data redaction.
 * 
 * Combines JSON serialization with automatic redaction of sensitive fields.
 * Handles circular references gracefully.
 * 
 * @param obj - Object to stringify
 * @param space - Pretty-print spacing (default: none)
 * @returns JSON string with sensitive data redacted
 */
export function safeJSONStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  
  try {
    const redacted = redactSensitiveFields(obj);
    
    return JSON.stringify(redacted, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, space);
  } catch (error) {
    return `[STRINGIFY_ERROR: ${error instanceof Error ? error.message : 'Unknown'}]`;
  }
}

/**
 * Create a safe error object for logging.
 * 
 * Strips stack traces and sensitive information from errors.
 * Safe for production logging.
 * 
 * @param error - Error object or value
 * @param includeStack - Whether to include stack trace (dev only)
 * @returns Safe error object for logging
 */
export function createSafeErrorLog(error: unknown, includeStack: boolean = false): Record<string, any> {
  const safeError: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };
  
  if (error instanceof Error) {
    safeError.name = error.name;
    safeError.message = redactSensitiveData(error.message);
    
    if (includeStack && error.stack) {
      safeError.stack = redactSensitiveData(error.stack);
    }
    
    // Include any additional enumerable properties (but redact them)
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'stack' && key !== 'message' && key !== 'name') {
        safeError[key] = redactSensitiveFields(value);
      }
    }
  } else {
    safeError.message = redactSensitiveData(String(error));
  }
  
  return safeError;
}

/**
 * Mask sensitive string data partially.
 * 
 * Shows first and last N characters, masks middle.
 * Useful for displaying references without exposing full values.
 * 
 * @param value - String to mask
 * @param visibleStart - Characters to show at start (default: 4)
 * @param visibleEnd - Characters to show at end (default: 4)
 * @returns Partially masked string
 */
export function maskString(value: string, visibleStart: number = 4, visibleEnd: number = 4): string {
  if (!value || value.length <= visibleStart + visibleEnd) {
    return '*'.repeat(value.length);
  }
  
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const maskedLength = value.length - visibleStart - visibleEnd;
  
  return `${start}${'*'.repeat(maskedLength)}${end}`;
}

/**
 * Check if a value appears to be sensitive and should be redacted.
 * 
 * Heuristic-based detection for potential PII/secrets.
 * 
 * @param value - Value to check
 * @returns True if value appears sensitive
 */
export function isSensitiveValue(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Check against known patterns
  for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
    // Reset regex lastIndex to ensure consistent matching
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      return true;
    }
  }
  
  // Heuristic: Long alphanumeric strings might be tokens
  if (/^[A-Za-z0-9\-._~+/]{40,}$/.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Sanitize request object for logging.
 * 
 * Creates a safe version of Express request suitable for logs.
 * Removes sensitive headers, cookies, and body fields.
 * 
 * @param req - Express request object
 * @returns Safe request object for logging
 */
export function sanitizeRequestForLog(req: any): Record<string, any> {
  const safe: Record<string, any> = {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };
  
  // Include query params (redacted)
  if (req.query && Object.keys(req.query).length > 0) {
    safe.query = redactSensitiveFields(req.query);
  }
  
  // Include sanitized headers (exclude sensitive ones)
  const safeHeaders: Record<string, any> = {};
  const sensitiveHeaderNames = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  
  for (const [name, value] of Object.entries(req.headers)) {
    if (!sensitiveHeaderNames.includes(name.toLowerCase())) {
      safeHeaders[name] = value;
    } else {
      safeHeaders[name] = '[REDACTED]';
    }
  }
  safe.headers = safeHeaders;
  
  // Include user info if available (but not full session)
  if (req.user) {
    safe.user = {
      id: req.user.claims?.sub || req.user.id,
      // Don't include full user object
    };
  }
  
  // Include org info if available
  if (req.orgId) {
    safe.orgId = req.orgId;
  }
  
  return safe;
}

/**
 * Sanitize response object for logging.
 * 
 * Creates a safe version of response data suitable for logs.
 * Removes sensitive fields from response body.
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @param sizeLimit - Maximum body size to log (bytes)
 * @returns Safe response object for logging
 */
export function sanitizeResponseForLog(
  statusCode: number,
  body: any,
  sizeLimit: number = 1000
): Record<string, any> {
  const safe: Record<string, any> = {
    statusCode,
    timestamp: new Date().toISOString(),
  };
  
  if (body !== undefined && body !== null) {
    const bodyStr = JSON.stringify(body);
    
    // Don't log large responses
    if (bodyStr.length > sizeLimit) {
      safe.body = {
        _meta: `[Response too large: ${bodyStr.length} bytes]`,
        preview: redactSensitiveFields(body).toString().slice(0, 200) + '...',
      };
    } else {
      safe.body = redactSensitiveFields(body);
    }
  }
  
  return safe;
}
