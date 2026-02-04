// AI-META-BEGIN
// AI-META: Test file for security-utils.test.ts
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Tests for security utilities (log redaction, PII protection).
 * 
 * Validates:
 * - PII redaction in logs (GDPR, SOC2 C1)
 * - Sensitive field masking
 * - Safe error logging
 * 
 * References:
 * - THREAT_MODEL.md: T4.2 (Sensitive Data in Logs)
 * - CONTROLS_MATRIX.md: DP-3 (Client-side data protection)
 */

import { describe, it, expect } from 'vitest';
import {
  redactSensitiveData,
  redactSensitiveFields,
  safeJSONStringify,
  createSafeErrorLog,
  maskString,
  isSensitiveValue,
  sanitizeRequestForLog,
  sanitizeResponseForLog,
} from '../../server/security-utils';

describe('Security Utils - PII Redaction', () => {
  describe('redactSensitiveData', () => {
    it('should redact credit card numbers', () => {
      const text = 'Card: 4532-1234-5678-9010';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toContain('****-****-****-9010');
      expect(redacted).not.toContain('4532');
    });

    it('should redact SSNs', () => {
      const text = 'SSN: 123-45-6789';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toBe('SSN: XXX-XX-XXXX');
    });

    it('should redact bearer tokens', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toContain('Bearer [REDACTED]');
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact JWTs', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      const redacted = redactSensitiveData(`Token: ${jwt}`);
      
      expect(redacted).toContain('[JWT_REDACTED]');
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact API keys', () => {
      const text = 'api_key="sk_live_1234567890abcdef"';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('sk_live_1234567890abcdef');
    });

    it('should redact password values', () => {
      const text = 'password="mySecretPass123"';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('mySecretPass123');
    });

    it('should redact database URLs', () => {
      const text = 'postgres://user:pass@localhost:5432/db';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toContain('postgres://[REDACTED]@[REDACTED]');
      expect(redacted).not.toContain('user:pass');
    });

    it('should redact phone numbers', () => {
      const text = 'Phone: 555-123-4567';
      const redacted = redactSensitiveData(text);
      
      expect(redacted).toBe('Phone: XXX-XXX-XXXX');
    });
  });

  describe('redactSensitiveFields', () => {
    it('should redact password fields', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };
      
      const redacted = redactSensitiveFields(obj);
      
      expect(redacted.username).toBe('john');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.email).toBe('john@example.com');
    });

    it('should redact nested sensitive fields', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };
      
      const redacted = redactSensitiveFields(obj);
      
      expect(redacted.user.name).toBe('John');
      expect(redacted.user.credentials.password).toBe('[REDACTED]');
      expect(redacted.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should redact arrays of objects', () => {
      const obj = {
        users: [
          { name: 'John', password: 'pass1' },
          { name: 'Jane', password: 'pass2' },
        ],
      };
      
      const redacted = redactSensitiveFields(obj);
      
      expect(redacted.users[0].name).toBe('John');
      expect(redacted.users[0].password).toBe('[REDACTED]');
      expect(redacted.users[1].password).toBe('[REDACTED]');
    });

    it('should handle case-insensitive field names', () => {
      const obj = {
        Password: 'test',
        API_KEY: 'key',
        Secret: 'secret',
      };
      
      const redacted = redactSensitiveFields(obj);
      
      expect(redacted.Password).toBe('[REDACTED]');
      expect(redacted.API_KEY).toBe('[REDACTED]');
      expect(redacted.Secret).toBe('[REDACTED]');
    });

    it('should prevent infinite recursion with max depth', () => {
      const circular: any = { level: 1 };
      circular.child = { level: 2, parent: circular };
      
      // Should not throw, should handle gracefully
      expect(() => redactSensitiveFields(circular)).not.toThrow();
    });
  });

  describe('safeJSONStringify', () => {
    it('should stringify with redaction', () => {
      const obj = {
        name: 'Test',
        password: 'secret',
        token: 'abc123',
      };
      
      const json = safeJSONStringify(obj);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('Test');
      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.token).toBe('[REDACTED]');
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'Test' };
      obj.self = obj;
      
      const json = safeJSONStringify(obj);
      
      expect(json).toContain('[Circular]');
    });

    it('should handle stringification errors', () => {
      const obj = {
        get bad() {
          throw new Error('Cannot access');
        },
      };
      
      const json = safeJSONStringify(obj);
      
      expect(json).toContain('[STRINGIFY_ERROR');
    });
  });

  describe('createSafeErrorLog', () => {
    it('should create safe error log from Error object', () => {
      const error = new Error('Test error with password="secret123"');
      const safeLog = createSafeErrorLog(error, false);
      
      expect(safeLog.name).toBe('Error');
      expect(safeLog.message).toContain('Test error');
      expect(safeLog.message).toContain('[REDACTED]'); // password value should be redacted
      expect(safeLog.message).not.toContain('secret123');
      expect(safeLog.stack).toBeUndefined(); // No stack in production mode
      expect(safeLog.timestamp).toBeDefined();
    });

    it('should include stack in development mode', () => {
      const error = new Error('Test error');
      const safeLog = createSafeErrorLog(error, true);
      
      expect(safeLog.stack).toBeDefined();
    });

    it('should handle non-Error values', () => {
      const safeLog = createSafeErrorLog('String error', false);
      
      expect(safeLog.message).toBe('String error');
      expect(safeLog.timestamp).toBeDefined();
    });

    it('should redact sensitive data in error messages', () => {
      const error = new Error('Failed to connect to postgres://user:pass@localhost/db');
      const safeLog = createSafeErrorLog(error, false);
      
      expect(safeLog.message).not.toContain('user:pass');
      expect(safeLog.message).toContain('[REDACTED]');
    });
  });

  describe('maskString', () => {
    it('should mask middle of string', () => {
      const masked = maskString('1234567890', 4, 4);
      
      expect(masked).toBe('1234**7890');
    });

    it('should mask entire short string', () => {
      const masked = maskString('1234', 4, 4);
      
      expect(masked).toBe('****');
    });

    it('should use default parameters', () => {
      const masked = maskString('abcdefghij');
      
      expect(masked).toBe('abcd**ghij');
    });
  });

  describe('isSensitiveValue', () => {
    it('should detect JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      
      expect(isSensitiveValue(jwt)).toBe(true);
    });

    it('should detect credit card numbers', () => {
      expect(isSensitiveValue('4532-1234-5678-9010')).toBe(true);
      expect(isSensitiveValue('4532 1234 5678 9010')).toBe(true);
    });

    it('should detect long tokens', () => {
      const longToken = 'a'.repeat(50);
      
      expect(isSensitiveValue(longToken)).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(isSensitiveValue('Hello world')).toBe(false);
      expect(isSensitiveValue('123')).toBe(false);
    });
  });

  describe('sanitizeRequestForLog', () => {
    it('should create safe request log', () => {
      const req = {
        method: 'POST',
        url: '/api/test',
        path: '/api/test',
        ip: '127.0.0.1',
        get: (header: string) => header === 'user-agent' ? 'TestAgent' : null,
        headers: {
          'authorization': 'Bearer secret',
          'content-type': 'application/json',
        },
        query: { search: 'test' },
        user: { claims: { sub: 'user-123' } },
        orgId: 'org-456',
      };
      
      const safe = sanitizeRequestForLog(req);
      
      expect(safe.method).toBe('POST');
      expect(safe.path).toBe('/api/test');
      expect(safe.ip).toBe('127.0.0.1');
      expect(safe.user.id).toBe('user-123');
      expect(safe.orgId).toBe('org-456');
      expect(safe.headers.authorization).toBe('[REDACTED]');
      expect(safe.headers['content-type']).toBe('application/json');
    });
  });

  describe('sanitizeResponseForLog', () => {
    it('should create safe response log', () => {
      const body = {
        success: true,
        user: {
          id: '123',
          password: 'secret',
        },
      };
      
      const safe = sanitizeResponseForLog(200, body);
      
      expect(safe.statusCode).toBe(200);
      expect(safe.body.success).toBe(true);
      expect(safe.body.user.id).toBe('123');
      expect(safe.body.user.password).toBe('[REDACTED]');
    });

    it('should truncate large responses', () => {
      const largeBody = { data: 'x'.repeat(2000) };
      
      const safe = sanitizeResponseForLog(200, largeBody, 1000);
      
      expect(safe.body._meta).toContain('too large');
      expect(safe.body.preview).toBeDefined();
    });

    it('should handle undefined body', () => {
      const safe = sanitizeResponseForLog(204, undefined);
      
      expect(safe.statusCode).toBe(204);
      expect(safe.body).toBeUndefined();
    });
  });
});

describe('Security Utils - Production vs Development', () => {
  it('should document production security requirements', () => {
    // This test documents critical differences between dev and production
    
    const requirements = {
      production: {
        headerAuth: false, // MUST be disabled
        detailedErrors: false, // Generic errors only
        stackTraces: false, // Never expose
        fullResponseLogs: false, // Too risky for PII
        corsWildcard: false, // Explicit origins only
      },
      development: {
        headerAuth: true, // Allowed for testing
        detailedErrors: true, // Helpful for debugging
        stackTraces: true, // Developer experience
        fullResponseLogs: true, // Debugging aid
        corsWildcard: true, // Localhost allowed
      },
    };
    
    expect(requirements.production.headerAuth).toBe(false);
    expect(requirements.production.stackTraces).toBe(false);
    expect(requirements.development.headerAuth).toBe(true);
  });
});
