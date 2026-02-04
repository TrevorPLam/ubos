# Current Sprints & Active Tasks

<!--
SYSTEM INSTRUCTIONS â€” TODO.md (agent-enforced)

Purpose: Active work queue. This file MUST contain tasks of a SINGLE batch type.

Canonical workflow + templates live in: TASKS.md

Global Rules:
1) Task blocks MUST be wrapped with:
   ## task_begin
   ## task_end
2) Every task MUST include tags in the title line:
   [id:...][type:...][priority:...][component:...]
3) Batch rules:
   - TODO.md MUST contain only ONE [type:*] at a time.
   - Batch size target: 5 tasks (or fewer if backlog has fewer).
   - Do NOT add tasks manually unless explicitly instructed.
4) Ordering rules:
   - Preserve the order as moved from BACKLOG.md.
   - Do NOT reorder unless explicitly instructed.
5) Completion rules:
   - When Status becomes done, MOVE the entire task block to ARCHIVE.md.
   - Remove it from TODO.md after archiving.
6) Notes discipline:
   - "Notes & Summary" is for execution logs and final summaries.
   - Keep Notes <= 10 lines. Prefer bullets. No long transcripts.
7) REQUIRED FIELDS (per TASKS.md):
   - **Plan:** Detailed implementation steps (agents follow this during execution)
   - **Estimated Effort:** Time estimate for resource planning
   - **Relevant Documentation:** Links to /docs/ files providing context
   - Tasks promoted from BACKLOG.md without these fields should be rejected
-->

## ðŸŽ¯ Current Batch Focus
**Batch Type:** [type:security][priority:critical]  
**Batch Goal:** Address production blockers and compliance risks before Redis deadline (2026-03-04) and establish governance foundation  
**Batch Size Target:** 3 tasks (critical path)

---

## task_begin
### # [id:TASK-20260204-001][type:security][priority:critical][component:server] Implement Redis-backed rate limiting
**Status:** todo  
**Description:** Migrate from in-memory rate limiting to Redis-backed store for multi-instance deployment support. CRITICAL: Risk acceptance expires 2026-03-04 (29 days).  
**Dependencies:** None (unblocks production scaling)  
**Acceptance Criteria:**  
- [ ] Redis connection with pooling configured
- [ ] Rate limits work across multiple instances (tested)
- [ ] Failover to local backup on Redis failure
- [ ] Tests validate distributed limits
- [ ] Performance impact < 5ms per request
- [ ] Documentation updated with Redis setup
**Definition of Done:**  
- [ ] Tests pass (unit + integration + load)
- [ ] Documentation complete
- [ ] Security team review passed
- [ ] Staging deployment successful
**Relevant Files:** `server/security.ts` (lines 119-157), `server/index.ts`, `package.json`, `.env.example`, LIKELY: `server/redis.ts` (to create)

### Relevant Documentation
- `docs/security/10-controls/rate-limiting.md` â€” Rate limiting requirements and configuration
- `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Multi-instance deployment architecture
- `docs/architecture/10_current_state/SECURITY_BASELINE.md` â€” Current security controls
- `docs/security/20-threat-model/VULNERABILITY_MANAGEMENT.md` â€” Risk acceptance tracking

### Dependencies
- None (unblocks production scaling)

### Plan
1. Install redis client (`npm install redis @types/redis`)
2. Create `server/redis.ts` connection module with pooling
3. Install `rate-limit-redis` adapter
4. Update `server/security.ts` rate limiters to use Redis store
5. Add Redis health check to startup validation
6. Add failover logic (fallback to memory store on Redis failure)
7. Write integration tests (multi-instance simulation)
8. Load test (1000+ req/s validation)
9. Update `.env.example` with REDIS_URL
10. Update docs/RUNBOOK.md with Redis setup
11. Remove single-instance restriction in config-validation
**Estimated Effort:** 2-3 weeks
**Notes & Summary:**  
(execution logs go here)
## task_end

---

## task_begin
### # [id:TASK-20260204-002][type:security][priority:critical][component:server] Implement Redis-backed session store
**Status:** todo  
**Description:** Migrate from in-memory session storage to Redis-backed store for multi-instance deployment. CRITICAL: Risk acceptance expires 2026-03-04 (29 days).  
**Dependencies:** TASK-20260204-001 (use same Redis instance)
**Acceptance Criteria:**  
- [ ] Redis session store configured and working
- [ ] Sessions persist across instance restarts
- [ ] Session timeouts enforced (15min idle, 24h absolute)
- [ ] Session rotation works (1h interval)
- [ ] Tests validate distributed session management
- [ ] No session loss on instance failure (graceful degradation)
- [ ] Documentation updated
**Definition of Done:**  
- [ ] Tests pass (unit + integration)
- [ ] Multi-instance test successful
- [ ] Documentation complete
- [ ] Security review passed
**Relevant Files:** `server/session.ts` (lines 65-75), `server/redis.ts`, `package.json`

### Relevant Documentation
- `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` â€” Session management architecture
- `docs/security/10-controls/authentication.md` â€” Authentication and session requirements
- `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Multi-instance deployment requirements

### Dependencies
- TASK-20260204-001 (use same Redis instance)

### Plan
1. Install `connect-redis` session adapter
2. Update `server/session.ts` to use Redis store
3. Configure session serialization (secure cookies)
4. Add session health monitoring
5. Write integration tests (session persistence)
6. Test session rotation across instances
7. Test graceful degradation on Redis failure
8. Update documentation
9. Remove single-instance restriction
**Estimated Effort:** 2-3 weeks
**Notes & Summary:**  
(execution logs go here)
## task_end

---

## task_begin
### # [id:TASK-20260204-003][type:security][priority:critical][component:server] Implement soft deletes for audit trail
**Status:** todo  
**Description:** Add `deleted_at` timestamp column to all org-scoped tables and migrate storage layer to use soft deletes instead of hard deletes. CRITICAL: Hard deletes destroy audit trails and violate GDPR/HIPAA compliance requirements.  
**Dependencies:** None
**Acceptance Criteria:**  
- [ ] Migration adds `deleted_at` to 20+ org-scoped tables
- [ ] All `storage.delete*()` methods renamed to `softDelete*()`
- [ ] All `get*()` queries filter `WHERE deleted_at IS NULL`
- [ ] New `permanentlyDelete*()` methods for GDPR right-to-be-forgotten
- [ ] Optional `restore*()` methods added
- [ ] All API routes updated to use soft delete
- [ ] Tests validate soft delete behavior
- [ ] UI shows "Restore" option where appropriate
**Definition of Done:**  
- [ ] All tests pass (120+ test updates expected)
- [ ] Migration tested with existing data
- [ ] Documentation updated
- [ ] Compliance team review passed
**Relevant Files:** `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`, `tests/backend/*.test.ts`, LIKELY: `shared/migrations/` (new migration file)

### Relevant Documentation
- `docs/data/10_current_state/RETENTION_AND_DELETION.md` â€” Data retention policies and soft delete pattern
- `docs/data/10_current_state/AUDIT_LOGGING_AND_REDACTION.md` â€” Audit trail requirements
- `docs/security/40-compliance/GDPR.md` â€” GDPR right-to-be-forgotten requirements
- `docs/data/20_entities/ENTITY_INDEX.md` â€” All entity schemas requiring soft delete

### Dependencies
- None

### Plan
1. Create migration: add `deleted_at TIMESTAMP` to all org-scoped tables
2. Update Drizzle schema definitions in `shared/schema.ts`
3. Rename all `delete*()` methods to `softDelete*()` in storage.ts
4. Update all WHERE clauses to filter `deleted_at IS NULL`
5. Add `permanentlyDelete*()` methods (GDPR)
6. Add optional `restore*()` methods
7. Update all routes to use softDelete
8. Update tests (expect deleted records, not removed)
9. Add "Restore" UI buttons in frontend
10. Update docs/data/ with soft delete pattern
11. Security review
**Estimated Effort:** 40 hours (1 week)
**Notes & Summary:**  
(execution logs go here)
## task_end

---

## task_begin
### # [id:TASK-20260204-XP01][type:security][priority:high][component:server] Implement Audit Logging System (Cross-Pollination)
**Status:** todo  
**Description:** Add comprehensive audit logging for security compliance (SOC2, HIPAA, PCI-DSS). This is a cross-pollination task from Cloud-Gallery repository containing production-tested implementation.  
**Dependencies:** None
**Acceptance Criteria:**  
- [ ] Audit schema created with all required fields
- [ ] AuditEventType enum covers all operations (AUTH, DATA, SECURITY, SYSTEM)
- [ ] AuditSeverity levels (LOW, MEDIUM, HIGH, CRITICAL)
- [ ] Sensitive fields redacted automatically
- [ ] Database persistence working
- [ ] Express middleware auto-logs requests
- [ ] Tests validate all event types
**Definition of Done:**  
- [ ] All tests pass
- [ ] Manual verification of log entries
- [ ] Compliance team review
**Relevant Files:** `shared/schema.ts`, `server/audit.ts` (create), `server/index.ts`

### Relevant Documentation
- `docs/security/40-compliance/SOC2_COMPLIANCE.md` — Audit logging requirements
- `docs/security/40-compliance/HIPAA.md` — Healthcare audit requirements
- `docs/data/10_current_state/AUDIT_LOGGING_AND_REDACTION.md` — Existing audit patterns

### Dependencies
- None

### Plan

#### Step 1: Add Audit Schema to shared/schema.ts

```typescript
// Audit logging table for SOC2/HIPAA/PCI-DSS compliance
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  eventType: text('event_type').notNull(),
  severity: text('severity').notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  userId: text('user_id'),
  sessionId: text('session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  resource: text('resource'),
  action: text('action'),
  outcome: text('outcome').notNull(), // SUCCESS, FAILURE, ERROR
  details: jsonb('details'),
  errorMessage: text('error_message'),
  requestId: text('request_id'),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
```

#### Step 2: Create server/audit.ts

```typescript
// AI-META-BEGIN
// AI-META: Comprehensive audit logging for security compliance
// OWNERSHIP: server/security
// ENTRYPOINTS: server/routes.ts, server/index.ts
// DEPENDENCIES: crypto (createHash), shared/schema (auditLogs)
// DANGER: Audit logs are compliance-critical; ensure sensitive data is redacted
// CHANGE-SAFETY: Safe to add event types; never remove existing types without migration
// TESTS: server/audit.test.ts
// AI-META-END

import { createHash } from "crypto";
import type { Request, Response } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

/**
 * Audit event types for categorization
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS",
  AUTH_LOGIN_FAILURE = "AUTH_LOGIN_FAILURE",
  AUTH_LOGOUT = "AUTH_LOGOUT",
  AUTH_REGISTER = "AUTH_REGISTER",
  AUTH_TOKEN_REFRESH = "AUTH_TOKEN_REFRESH",
  AUTH_PASSWORD_CHANGE = "AUTH_PASSWORD_CHANGE",
  AUTH_PASSWORD_RESET = "AUTH_PASSWORD_RESET",
  AUTH_MFA_ENABLED = "AUTH_MFA_ENABLED",
  AUTH_MFA_DISABLED = "AUTH_MFA_DISABLED",

  // Data access events
  DATA_READ = "DATA_READ",
  DATA_CREATE = "DATA_CREATE",
  DATA_UPDATE = "DATA_UPDATE",
  DATA_DELETE = "DATA_DELETE",
  DATA_EXPORT = "DATA_EXPORT",
  DATA_IMPORT = "DATA_IMPORT",

  // Security events
  SECURITY_RATE_LIMIT_EXCEEDED = "SECURITY_RATE_LIMIT_EXCEEDED",
  SECURITY_INVALID_TOKEN = "SECURITY_INVALID_TOKEN",
  SECURITY_UNAUTHORIZED_ACCESS = "SECURITY_UNAUTHORIZED_ACCESS",
  SECURITY_FORBIDDEN_ACCESS = "SECURITY_FORBIDDEN_ACCESS",
  SECURITY_CSRF_FAILURE = "SECURITY_CSRF_FAILURE",
  SECURITY_SUSPICIOUS_ACTIVITY = "SECURITY_SUSPICIOUS_ACTIVITY",

  // System events
  SYSTEM_ERROR = "SYSTEM_ERROR",
  SYSTEM_STARTUP = "SYSTEM_STARTUP",
  SYSTEM_SHUTDOWN = "SYSTEM_SHUTDOWN",
  SYSTEM_CONFIG_CHANGE = "SYSTEM_CONFIG_CHANGE",

  // Admin events
  ADMIN_USER_CREATE = "ADMIN_USER_CREATE",
  ADMIN_USER_UPDATE = "ADMIN_USER_UPDATE",
  ADMIN_USER_DELETE = "ADMIN_USER_DELETE",
  ADMIN_ROLE_CHANGE = "ADMIN_ROLE_CHANGE",
}

export enum AuditSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: "SUCCESS" | "FAILURE" | "ERROR";
  details?: Record<string, unknown>;
  errorMessage?: string;
  requestId?: string;
}

/**
 * Sensitive fields to redact from audit logs
 */
const SENSITIVE_FIELDS = [
  "password", "token", "authorization", "cookie",
  "secret", "key", "creditCard", "ssn", "apiKey",
  "accessToken", "refreshToken", "privateKey",
];

/**
 * Sanitize sensitive data from event details
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  if (!details) return details;
  const sanitized = { ...details };

  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = "***REDACTED***";
    }
    for (const key in sanitized) {
      if (key.toLowerCase().includes(field.toLowerCase())) {
        sanitized[key] = "***REDACTED***";
      }
    }
  }
  return sanitized;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Determine severity based on event type
 */
function getSeverity(eventType: AuditEventType): AuditSeverity {
  switch (eventType) {
    case AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED:
    case AuditEventType.SECURITY_CSRF_FAILURE:
    case AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY:
      return AuditSeverity.HIGH;
    case AuditEventType.SECURITY_UNAUTHORIZED_ACCESS:
    case AuditEventType.SECURITY_FORBIDDEN_ACCESS:
    case AuditEventType.SECURITY_INVALID_TOKEN:
    case AuditEventType.SYSTEM_ERROR:
    case AuditEventType.AUTH_LOGIN_FAILURE:
      return AuditSeverity.MEDIUM;
    default:
      return AuditSeverity.LOW;
  }
}

/**
 * Log an audit event to database
 */
export async function logAuditEvent(
  event: Omit<AuditEvent, "id" | "timestamp" | "severity">
): Promise<void> {
  const auditEvent: AuditEvent = {
    id: generateEventId(),
    timestamp: new Date(),
    severity: getSeverity(event.eventType),
    details: event.details ? sanitizeDetails(event.details) : undefined,
    ...event,
  };

  // Log to console for development
  const logLevel = auditEvent.severity === AuditSeverity.HIGH || 
                   auditEvent.severity === AuditSeverity.CRITICAL ? "error" :
                   auditEvent.severity === AuditSeverity.MEDIUM ? "warn" : "log";
  console[logLevel](`[AUDIT] ${auditEvent.timestamp.toISOString()} ${auditEvent.eventType} ${auditEvent.outcome}`, {
    id: auditEvent.id,
    userId: auditEvent.userId,
    resource: auditEvent.resource,
  });

  // Persist to database
  try {
    await db.insert(auditLogs).values({
      id: auditEvent.id,
      timestamp: auditEvent.timestamp,
      eventType: auditEvent.eventType,
      severity: auditEvent.severity,
      userId: auditEvent.userId,
      sessionId: auditEvent.sessionId,
      ipAddress: auditEvent.ipAddress,
      userAgent: auditEvent.userAgent,
      resource: auditEvent.resource,
      action: auditEvent.action,
      outcome: auditEvent.outcome,
      details: auditEvent.details,
      errorMessage: auditEvent.errorMessage,
      requestId: auditEvent.requestId,
    });
  } catch (error) {
    console.error("[AUDIT] Failed to persist audit event:", error);
  }
}

/**
 * Create audit middleware for Express
 */
export function auditMiddleware() {
  return (req: Request, res: Response, next: () => void) => {
    const startTime = Date.now();

    // Log response completion
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const eventType = getEventTypeFromRequest(req, res);

      logAuditEvent({
        eventType,
        userId: (req as any).user?.id || (req as any).session?.userId,
        sessionId: (req as any).sessionID,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        resource: req.path,
        action: req.method,
        outcome: res.statusCode < 400 ? "SUCCESS" : "FAILURE",
        details: { statusCode: res.statusCode, duration: `${duration}ms` },
        requestId: (req as any).requestId,
      });
    });

    next();
  };
}

function getEventTypeFromRequest(req: Request, res: Response): AuditEventType {
  const path = req.path;
  const method = req.method;
  const statusCode = res.statusCode;

  // Auth routes
  if (path.includes("/auth/login") || path.includes("/login")) {
    return statusCode === 200 ? AuditEventType.AUTH_LOGIN_SUCCESS : AuditEventType.AUTH_LOGIN_FAILURE;
  }
  if (path.includes("/auth/logout") || path.includes("/logout")) {
    return AuditEventType.AUTH_LOGOUT;
  }
  if (path.includes("/auth/register") || path.includes("/register")) {
    return AuditEventType.AUTH_REGISTER;
  }

  // Security status codes
  if (statusCode === 401) return AuditEventType.SECURITY_UNAUTHORIZED_ACCESS;
  if (statusCode === 403) return AuditEventType.SECURITY_FORBIDDEN_ACCESS;
  if (statusCode === 429) return AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED;

  // Data operations
  if (method === "GET") return AuditEventType.DATA_READ;
  if (method === "POST") return AuditEventType.DATA_CREATE;
  if (method === "PUT" || method === "PATCH") return AuditEventType.DATA_UPDATE;
  if (method === "DELETE") return AuditEventType.DATA_DELETE;

  return AuditEventType.SYSTEM_ERROR;
}

// Convenience functions
export const logAuthEvent = (eventType: AuditEventType, userId: string, details?: Record<string, unknown>) => {
  logAuditEvent({ eventType, userId, outcome: "SUCCESS", details });
};

export const logSecurityEvent = (eventType: AuditEventType, details: Record<string, unknown>, userId?: string) => {
  logAuditEvent({ eventType, userId, outcome: "FAILURE", details });
};

export const logDataEvent = (eventType: AuditEventType, userId: string, resource: string, details?: Record<string, unknown>) => {
  logAuditEvent({ eventType, userId, resource, outcome: "SUCCESS", details });
};
```

#### Step 3: Register middleware in server/index.ts

```typescript
import { auditMiddleware } from './audit';

// Add after session middleware, before routes
app.use(auditMiddleware());
```

#### Step 4: Run database migration

```bash
npm run db:push
```

#### Step 5: Write tests in server/audit.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditEventType, AuditSeverity, logAuditEvent } from './audit';

describe('Audit Logging', () => {
  describe('logAuditEvent', () => {
    it('should log authentication events', async () => {
      await expect(logAuditEvent({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        userId: 'test-user',
        outcome: 'SUCCESS',
      })).resolves.not.toThrow();
    });

    it('should redact sensitive fields', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      await logAuditEvent({
        eventType: AuditEventType.DATA_CREATE,
        userId: 'test-user',
        outcome: 'SUCCESS',
        details: { password: 'secret123', username: 'testuser' },
      });
      
      const loggedDetails = consoleSpy.mock.calls[0];
      expect(JSON.stringify(loggedDetails)).not.toContain('secret123');
    });
  });
});
```

**Estimated Effort:** 8 hours
**Notes & Summary:**  
(execution logs go here)
## task_end

---

## task_begin
### # [id:TASK-20260204-XP02][type:security][priority:high][component:server] Implement AES-256-GCM Encryption Utilities (Cross-Pollination)
**Status:** todo  
**Description:** Add encryption utilities for sensitive data at rest. This is a cross-pollination task from Cloud-Gallery repository with production-tested AES-256-GCM implementation.  
**Dependencies:** None
**Acceptance Criteria:**  
- [ ] AES-256-GCM encryption working
- [ ] Scrypt key derivation implemented
- [ ] Encrypt/decrypt functions tested
- [ ] Metadata encryption helpers available
- [ ] Master key generation function
- [ ] Tests cover all edge cases
**Definition of Done:**  
- [ ] All tests pass
- [ ] Security review approved
- [ ] Documentation updated
**Relevant Files:** `server/encryption.ts` (create), `server/encryption.test.ts` (create)

### Relevant Documentation
- `docs/security/10-controls/encryption.md` — Encryption requirements
- `docs/security/40-compliance/HIPAA.md` — PHI encryption requirements
- `docs/security/40-compliance/PCI_DSS.md` — Payment data encryption requirements

### Dependencies
- None

### Plan

#### Step 1: Create server/encryption.ts

```typescript
// AI-META-BEGIN
// AI-META: Encryption utilities for sensitive data at rest
// OWNERSHIP: server/security
// ENTRYPOINTS: server/storage.ts, server/routes.ts
// DEPENDENCIES: crypto (native Node.js)
// DANGER: Encryption key loss = permanent data loss; key must be stored securely
// CHANGE-SAFETY: Never change encryption parameters without migration plan
// TESTS: server/encryption.test.ts
// AI-META-END

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Encryption configuration - AES-256-GCM
 * 
 * Standards:
 * - NIST SP 800-38D: GCM mode recommendation
 * - OWASP Cryptographic Standards
 */
export const ENCRYPTION_CONFIG = {
  ALGORITHM: "aes-256-gcm",
  KEY_LENGTH: 32, // 256 bits
  IV_LENGTH: 12,  // 96 bits for GCM (NIST recommended)
  AUTH_TAG_LENGTH: 16, // 128 bits
  SCRYPT_N: 32768, // CPU/memory cost (2^15)
  SCRYPT_R: 8,     // Block size
  SCRYPT_P: 1,     // Parallelization
} as const;

/**
 * Derive encryption key from password using scrypt
 * 
 * @param password - User/master password
 * @param salt - Cryptographic salt (should be unique per encryption)
 * @returns Derived key buffer
 */
export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(
    password,
    salt,
    ENCRYPTION_CONFIG.KEY_LENGTH,
    {
      N: ENCRYPTION_CONFIG.SCRYPT_N,
      r: ENCRYPTION_CONFIG.SCRYPT_R,
      p: ENCRYPTION_CONFIG.SCRYPT_P,
    }
  )) as Buffer;
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param plaintext - Data to encrypt
 * @param key - 32-byte encryption key
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string, key: Buffer): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  if (key.length !== ENCRYPTION_CONFIG.KEY_LENGTH) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.KEY_LENGTH} bytes`);
  }

  const iv = randomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encryptedData - Object containing encrypted data, IV, and auth tag
 * @param key - 32-byte encryption key
 * @returns Decrypted plaintext
 */
export function decrypt(
  encryptedData: { encrypted: string; iv: string; authTag: string },
  key: Buffer
): string {
  if (key.length !== ENCRYPTION_CONFIG.KEY_LENGTH) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.KEY_LENGTH} bytes`);
  }

  const iv = Buffer.from(encryptedData.iv, "hex");
  const authTag = Buffer.from(encryptedData.authTag, "hex");

  const decipher = createDecipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt sensitive metadata with key derivation
 * 
 * @param metadata - Object to encrypt
 * @param masterKey - Master encryption key (hex string or password)
 * @returns Encrypted package with salt
 */
export async function encryptMetadata(
  metadata: Record<string, unknown>,
  masterKey: string
): Promise<{
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}> {
  const salt = randomBytes(16);
  const key = await deriveKey(masterKey, salt);
  const plaintext = JSON.stringify(metadata);
  const encrypted = encrypt(plaintext, key);

  return { ...encrypted, salt: salt.toString("hex") };
}

/**
 * Decrypt sensitive metadata
 * 
 * @param encryptedPackage - Encrypted data with salt
 * @param masterKey - Master encryption key
 * @returns Decrypted metadata object
 */
export async function decryptMetadata(
  encryptedPackage: { encrypted: string; iv: string; authTag: string; salt: string },
  masterKey: string
): Promise<Record<string, unknown>> {
  const salt = Buffer.from(encryptedPackage.salt, "hex");
  const key = await deriveKey(masterKey, salt);
  const plaintext = decrypt(encryptedPackage, key);

  return JSON.parse(plaintext);
}

/**
 * Generate a cryptographically secure master key
 * 
 * @returns 64-character hex string (256 bits)
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Check if data appears to be encrypted
 * 
 * @param data - Data to check
 * @returns true if data has encryption structure
 */
export function isEncrypted(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "encrypted" in data &&
    "iv" in data &&
    "authTag" in data
  );
}

/**
 * Securely zero out a buffer (best effort)
 * 
 * @param buffer - Buffer to clear
 */
export function secureZero(buffer: Buffer): void {
  buffer.fill(0);
}
```

#### Step 2: Create server/encryption.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  deriveKey,
  encryptMetadata,
  decryptMetadata,
  generateMasterKey,
  isEncrypted,
  ENCRYPTION_CONFIG,
} from './encryption';
import { randomBytes } from 'crypto';

describe('Encryption Utilities', () => {
  const testKey = randomBytes(ENCRYPTION_CONFIG.KEY_LENGTH);
  const testPlaintext = 'Hello, World! 🔐';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encrypt(testPlaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(testPlaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const encrypted1 = encrypt(testPlaintext, testKey);
      const encrypted2 = encrypt(testPlaintext, testKey);
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail with wrong key', () => {
      const encrypted = encrypt(testPlaintext, testKey);
      const wrongKey = randomBytes(ENCRYPTION_CONFIG.KEY_LENGTH);
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const encrypted = encrypt(testPlaintext, testKey);
      encrypted.authTag = randomBytes(16).toString('hex');
      expect(() => decrypt(encrypted, testKey)).toThrow();
    });

    it('should reject invalid key length', () => {
      const shortKey = randomBytes(16);
      expect(() => encrypt(testPlaintext, shortKey)).toThrow();
    });
  });

  describe('deriveKey', () => {
    it('should derive consistent key from password and salt', async () => {
      const password = 'test-password';
      const salt = randomBytes(16);
      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);
      expect(key1.equals(key2)).toBe(true);
    });

    it('should produce different keys for different salts', async () => {
      const password = 'test-password';
      const key1 = await deriveKey(password, randomBytes(16));
      const key2 = await deriveKey(password, randomBytes(16));
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('encryptMetadata/decryptMetadata', () => {
    it('should encrypt and decrypt metadata object', async () => {
      const metadata = { key: 'value', nested: { num: 42 } };
      const masterKey = generateMasterKey();
      const encrypted = await encryptMetadata(metadata, masterKey);
      const decrypted = await decryptMetadata(encrypted, masterKey);
      expect(decrypted).toEqual(metadata);
    });
  });

  describe('generateMasterKey', () => {
    it('should generate 64-character hex string', () => {
      const key = generateMasterKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data structure', () => {
      const encrypted = encrypt(testPlaintext, testKey);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain objects', () => {
      expect(isEncrypted({ foo: 'bar' })).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted('string')).toBe(false);
    });
  });
});
```

#### Step 3: Add ENCRYPTION_KEY to environment

Update `.env.example`:
```bash
# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-64-char-hex-key-here
```

**Estimated Effort:** 4 hours
**Notes & Summary:**  
(execution logs go here)
## task_end

---

## task_begin
### # [id:TASK-20260204-XP03][type:feature][priority:medium][component:server] Implement Presigned URL Pattern for File Uploads (Cross-Pollination)
**Status:** todo  
**Description:** Add presigned URL support for secure file uploads/downloads. This is a cross-pollination task from secure_file (CloudVault) repository. Pattern allows direct client-to-storage uploads without proxying through server.  
**Dependencies:** None
**Acceptance Criteria:**  
- [ ] Presigned URL generation for uploads
- [ ] Presigned URL generation for downloads
- [ ] Time-limited URLs (configurable expiry)
- [ ] URL validation and verification
- [ ] Tests cover URL generation and expiry
**Definition of Done:**  
- [ ] All tests pass
- [ ] Integration with existing storage layer
- [ ] Documentation updated
**Relevant Files:** `server/storage.ts`, `server/routes.ts`

### Relevant Documentation
- `docs/architecture/30_cross_cutting/FILE_STORAGE.md` — File storage patterns
- `docs/api/10_reference/UPLOAD_DOWNLOAD.md` — Upload/download API spec

### Dependencies
- None

### Plan

#### Step 1: Add presigned URL methods to storage interface

```typescript
// In server/storage.ts or server/file-storage.ts

import { randomBytes, createHmac } from "crypto";

/**
 * Configuration for presigned URLs
 */
const PRESIGNED_CONFIG = {
  DEFAULT_EXPIRY: 15 * 60, // 15 minutes in seconds
  MAX_EXPIRY: 7 * 24 * 60 * 60, // 7 days in seconds
  SIGNATURE_ALGORITHM: "sha256",
} as const;

/**
 * Generate a presigned URL for file upload
 * 
 * @param key - Storage key/path for the file
 * @param contentType - Expected MIME type
 * @param expirySeconds - URL validity duration (default: 15 minutes)
 * @returns Presigned upload URL with signature
 */
export function generateUploadUrl(
  key: string,
  contentType: string,
  expirySeconds: number = PRESIGNED_CONFIG.DEFAULT_EXPIRY
): { url: string; expiresAt: Date } {
  const secret = process.env.PRESIGNED_URL_SECRET;
  if (!secret) {
    throw new Error("PRESIGNED_URL_SECRET not configured");
  }

  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);
  
  const dataToSign = `PUT:${key}:${contentType}:${expiresTimestamp}`;
  const signature = createHmac(PRESIGNED_CONFIG.SIGNATURE_ALGORITHM, secret)
    .update(dataToSign)
    .digest("hex");

  const baseUrl = process.env.STORAGE_BASE_URL || "/api/storage";
  const params = new URLSearchParams({
    key,
    contentType,
    expires: expiresTimestamp.toString(),
    signature,
  });

  return {
    url: `${baseUrl}/upload?${params.toString()}`,
    expiresAt,
  };
}

/**
 * Generate a presigned URL for file download
 * 
 * @param key - Storage key/path for the file
 * @param expirySeconds - URL validity duration (default: 15 minutes)
 * @returns Presigned download URL with signature
 */
export function generateDownloadUrl(
  key: string,
  expirySeconds: number = PRESIGNED_CONFIG.DEFAULT_EXPIRY
): { url: string; expiresAt: Date } {
  const secret = process.env.PRESIGNED_URL_SECRET;
  if (!secret) {
    throw new Error("PRESIGNED_URL_SECRET not configured");
  }

  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);
  
  const dataToSign = `GET:${key}:${expiresTimestamp}`;
  const signature = createHmac(PRESIGNED_CONFIG.SIGNATURE_ALGORITHM, secret)
    .update(dataToSign)
    .digest("hex");

  const baseUrl = process.env.STORAGE_BASE_URL || "/api/storage";
  const params = new URLSearchParams({
    key,
    expires: expiresTimestamp.toString(),
    signature,
  });

  return {
    url: `${baseUrl}/download?${params.toString()}`,
    expiresAt,
  };
}

/**
 * Validate a presigned URL signature
 * 
 * @param method - HTTP method (GET, PUT)
 * @param key - Storage key
 * @param contentType - Content type (for uploads)
 * @param expires - Expiry timestamp
 * @param providedSignature - Signature from URL
 * @returns true if valid and not expired
 */
export function validatePresignedUrl(
  method: "GET" | "PUT",
  key: string,
  contentType: string | null,
  expires: string,
  providedSignature: string
): boolean {
  const secret = process.env.PRESIGNED_URL_SECRET;
  if (!secret) return false;

  // Check expiry
  const expiresTimestamp = parseInt(expires, 10);
  if (isNaN(expiresTimestamp) || expiresTimestamp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  // Compute expected signature
  const dataToSign = method === "PUT"
    ? `${method}:${key}:${contentType}:${expiresTimestamp}`
    : `${method}:${key}:${expiresTimestamp}`;
  
  const expectedSignature = createHmac(PRESIGNED_CONFIG.SIGNATURE_ALGORITHM, secret)
    .update(dataToSign)
    .digest("hex");

  // Constant-time comparison
  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate secure share link token
 * 
 * @returns 64-character hex token
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("hex");
}
```

#### Step 2: Add routes for presigned URL handling

```typescript
// In server/routes.ts or server/file-routes.ts

import { generateUploadUrl, generateDownloadUrl, validatePresignedUrl } from './storage';

// Generate presigned upload URL
app.post('/api/files/upload-url', requireAuth, async (req, res) => {
  const { filename, contentType } = req.body;
  
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType required' });
  }
  
  const key = `${req.user.id}/${Date.now()}-${filename}`;
  const result = generateUploadUrl(key, contentType);
  
  res.json(result);
});

// Generate presigned download URL
app.get('/api/files/:id/download-url', requireAuth, async (req, res) => {
  const file = await storage.getFile(req.params.id);
  
  if (!file || file.userId !== req.user.id) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const result = generateDownloadUrl(file.storageKey);
  res.json(result);
});

// Handle presigned upload
app.put('/api/storage/upload', async (req, res) => {
  const { key, contentType, expires, signature } = req.query;
  
  if (!validatePresignedUrl('PUT', key as string, contentType as string, expires as string, signature as string)) {
    return res.status(403).json({ error: 'Invalid or expired URL' });
  }
  
  // Handle file upload...
});
```

#### Step 3: Update environment configuration

Add to `.env.example`:
```bash
# Presigned URL secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PRESIGNED_URL_SECRET=your-64-char-hex-secret-here
STORAGE_BASE_URL=https://your-domain.com/api/storage
```

**Estimated Effort:** 6 hours
**Notes & Summary:**  
(execution logs go here)
## task_end

