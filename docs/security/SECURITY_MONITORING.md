---
title: Security Monitoring and Logging Guide
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Security Monitoring and Logging Guide

## Table of Contents

- [Overview](#overview)
- [What to Log](#what-to-log)
- [What NOT to Log](#what-not-to-log)
- [Logging Implementation](#logging-implementation)
- [Security Events](#security-events)
- [Audit Trails](#audit-trails)
- [Anomaly Detection](#anomaly-detection)
- [Alert Configuration](#alert-configuration)
- [Log Management](#log-management)
- [SIEM Integration](#siem-integration)
- [Incident Detection](#incident-detection)
- [Response Procedures](#response-procedures)

## Overview

Effective security monitoring requires comprehensive logging, real-time detection, and rapid response capabilities. This guide outlines what to log, how to detect security events, and how to respond to incidents.

### Goals

1. **Visibility**: Know what's happening in the system
2. **Detection**: Identify security incidents quickly
3. **Investigation**: Enable forensic analysis
4. **Compliance**: Meet regulatory requirements
5. **Privacy**: Protect sensitive user data

## What to Log

### Authentication Events

```typescript
// server/routes.ts
export function logAuthEvent(event: {
  type: "login" | "logout" | "login_failed" | "session_expired";
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  reason?: string;
}) {
  console.log(JSON.stringify({
    event: "auth",
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));
}

// Usage
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  const user = await authenticateUser(email, password);
  
  if (!user) {
    logAuthEvent({
      type: "login_failed",
      ip: req.ip,
      userAgent: req.get("user-agent") || "unknown",
      timestamp: new Date(),
      reason: "invalid_credentials",
    });
    
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  logAuthEvent({
    type: "login",
    userId: user.id,
    ip: req.ip,
    userAgent: req.get("user-agent") || "unknown",
    timestamp: new Date(),
  });
  
  res.json({ success: true });
});
```

**Log These Authentication Events:**
- ✅ Successful login
- ✅ Failed login attempts
- ✅ Logout
- ✅ Session creation/destruction
- ✅ Password changes
- ✅ Account lockouts
- ✅ Multi-factor authentication events
- ✅ Permission changes

### Authorization Events

```typescript
export function logAuthorizationEvent(event: {
  type: "access_granted" | "access_denied";
  userId: string;
  resource: string;
  resourceId: string;
  action: string;
  reason?: string;
  ip: string;
  timestamp: Date;
}) {
  console.log(JSON.stringify({
    event: "authorization",
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));
}

// Usage in middleware
function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const member = await storage.getOrganizationMember(orgId, userId);
    
    if (!hasPermission(member.role, permission)) {
      logAuthorizationEvent({
        type: "access_denied",
        userId,
        resource: req.path,
        resourceId: req.params.id || "N/A",
        action: req.method,
        reason: `insufficient_permissions: ${member.role}`,
        ip: req.ip,
        timestamp: new Date(),
      });
      
      return res.status(403).json({ message: "Forbidden" });
    }
    
    logAuthorizationEvent({
      type: "access_granted",
      userId,
      resource: req.path,
      resourceId: req.params.id || "N/A",
      action: req.method,
      ip: req.ip,
      timestamp: new Date(),
    });
    
    next();
  };
}
```

**Log These Authorization Events:**
- ✅ Access granted to sensitive resources
- ✅ Access denied (permission failures)
- ✅ Role/permission changes
- ✅ Privilege escalation attempts
- ✅ Cross-organization access attempts

### Data Access Events

```typescript
export function logDataAccess(event: {
  userId: string;
  orgId: string;
  action: "read" | "create" | "update" | "delete";
  resource: string;
  resourceId: string;
  ip: string;
  timestamp: Date;
  changes?: Record<string, any>;
}) {
  // Don't log the actual data values, just metadata
  const logEntry = {
    event: "data_access",
    userId: event.userId,
    orgId: event.orgId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    ip: event.ip,
    timestamp: event.timestamp.toISOString(),
  };
  
  // For updates, log which fields changed (not values)
  if (event.changes) {
    logEntry.changedFields = Object.keys(event.changes);
  }
  
  console.log(JSON.stringify(logEntry));
}

// Usage
app.delete("/api/clients/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  const clientId = req.params.id;
  
  await storage.deleteClient(orgId, clientId);
  
  logDataAccess({
    userId,
    orgId,
    action: "delete",
    resource: "client",
    resourceId: clientId,
    ip: req.ip,
    timestamp: new Date(),
  });
  
  res.json({ success: true });
});
```

**Log These Data Access Events:**
- ✅ Creation of sensitive records
- ✅ Updates to sensitive records (fields changed, not values)
- ✅ Deletion of records
- ✅ Bulk operations
- ✅ Export operations
- ✅ Access to PII

### System Events

```typescript
export function logSystemEvent(event: {
  type: "startup" | "shutdown" | "error" | "config_change";
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  details?: Record<string, any>;
  timestamp: Date;
}) {
  console.log(JSON.stringify({
    event: "system",
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));
}

// Usage
// server/index.ts
httpServer.listen(port, () => {
  logSystemEvent({
    type: "startup",
    message: `Server started on port ${port}`,
    severity: "info",
    details: {
      port,
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    },
    timestamp: new Date(),
  });
});

process.on("SIGTERM", () => {
  logSystemEvent({
    type: "shutdown",
    message: "Received SIGTERM, shutting down gracefully",
    severity: "info",
    timestamp: new Date(),
  });
});
```

**Log These System Events:**
- ✅ Application start/stop
- ✅ Configuration changes
- ✅ Errors and exceptions
- ✅ Database connection issues
- ✅ External API failures
- ✅ Rate limit violations

### API Events

```typescript
// server/index.ts - Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = randomUUID();
  
  req.requestId = requestId;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (req.path.startsWith("/api")) {
      console.log(JSON.stringify({
        event: "api_request",
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        userId: (req as AuthenticatedRequest).user?.claims.sub,
        timestamp: new Date().toISOString(),
      }));
    }
  });
  
  next();
});
```

**Log These API Events:**
- ✅ Request method, path, status code
- ✅ Response time
- ✅ Client IP address
- ✅ User agent
- ✅ Request ID for correlation
- ✅ Rate limit hits

## What NOT to Log

### Sensitive Data

**❌ NEVER Log:**

```typescript
// ❌ BAD: Logging sensitive data
console.log("User login:", {
  email: user.email,
  password: req.body.password,      // NEVER!
  creditCard: payment.cardNumber,   // NEVER!
  ssn: user.ssn,                    // NEVER!
  apiKey: req.headers.authorization, // NEVER!
});

// ✅ GOOD: Log without sensitive data
console.log("User login:", {
  userId: user.id,
  email: user.email, // Email is OK if needed for debugging
  timestamp: new Date().toISOString(),
});
```

**Never Log These:**
- ❌ Passwords (plaintext or hashed)
- ❌ API keys and tokens
- ❌ Session IDs
- ❌ Credit card numbers
- ❌ Social Security Numbers
- ❌ Private encryption keys
- ❌ OAuth secrets
- ❌ Webhook secrets
- ❌ Security question answers
- ❌ Full authorization headers

### Personal Identifiable Information (PII)

Be cautious with PII. Log only when necessary for security:

```typescript
// Sanitize PII before logging
function sanitizePII(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    "password",
    "ssn",
    "creditCard",
    "cvv",
    "token",
    "secret",
    "apiKey",
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  
  return sanitized;
}

// Usage
console.log("Processing payment:", sanitizePII(paymentData));
```

**Be Careful With:**
- ⚠️ Full names (use user IDs instead)
- ⚠️ Email addresses (hash if possible)
- ⚠️ Phone numbers
- ⚠️ Physical addresses
- ⚠️ Birth dates
- ⚠️ Financial information

## Logging Implementation

### Structured Logging

```typescript
// server/logging.ts
interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  orgId?: string;
  event?: string;
  metadata?: Record<string, any>;
}

export class Logger {
  private serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  private log(entry: Omit<LogEntry, "timestamp">) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
    };
    
    // In production, send to logging service
    if (process.env.NODE_ENV === "production") {
      // Send to CloudWatch, Datadog, etc.
      this.sendToLoggingService(logEntry);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
  
  info(message: string, metadata?: Record<string, any>) {
    this.log({ level: "info", message, metadata });
  }
  
  warn(message: string, metadata?: Record<string, any>) {
    this.log({ level: "warn", message, metadata });
  }
  
  error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log({
      level: "error",
      message,
      metadata: {
        ...metadata,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : undefined,
      },
    });
  }
  
  security(event: string, metadata: Record<string, any>) {
    this.log({
      level: "info",
      message: `Security event: ${event}`,
      event,
      metadata: sanitizePII(metadata),
    });
  }
  
  private sendToLoggingService(entry: LogEntry) {
    // Implementation depends on logging provider
    // Examples: CloudWatch, Datadog, Splunk, ELK
  }
}

// Export singleton
export const logger = new Logger("ubos-api");
```

### Request Context

```typescript
// Add request context to all logs
import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  requestId: string;
  userId?: string;
  orgId?: string;
  ip: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

// Middleware to set context
app.use((req, res, next) => {
  const context: RequestContext = {
    requestId: randomUUID(),
    ip: req.ip,
  };
  
  requestContext.run(context, () => {
    next();
  });
});

// Update context after auth
app.use(requireAuth, async (req, res, next) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  
  const context = requestContext.getStore();
  if (context) {
    context.userId = userId;
    context.orgId = orgId;
  }
  
  next();
});

// Logger automatically includes context
class ContextualLogger extends Logger {
  private getContext() {
    return requestContext.getStore();
  }
  
  info(message: string, metadata?: Record<string, any>) {
    super.info(message, { ...this.getContext(), ...metadata });
  }
  
  // ... other methods
}
```

### Log Levels

```typescript
// Use appropriate log levels
class LogLevel {
  static DEBUG = "debug";   // Detailed debugging info (dev only)
  static INFO = "info";     // Normal operations
  static WARN = "warn";     // Warning conditions
  static ERROR = "error";   // Error conditions
  static CRITICAL = "critical"; // Critical security events
}

// Example usage
logger.debug("Cache hit for user preferences"); // Dev only
logger.info("User logged in successfully");      // Normal operation
logger.warn("Rate limit approaching threshold"); // Warning
logger.error("Database connection failed");      // Error
logger.critical("Multiple failed login attempts detected"); // Security
```

## Security Events

### Critical Security Events

```typescript
// Define critical security events
export enum SecurityEvent {
  // Authentication
  BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
  ACCOUNT_LOCKOUT = "account_lockout",
  SUSPICIOUS_LOGIN = "suspicious_login",
  
  // Authorization
  PRIVILEGE_ESCALATION = "privilege_escalation",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  
  // Data
  MASS_DATA_EXPORT = "mass_data_export",
  BULK_DELETE = "bulk_delete",
  PII_ACCESS = "pii_access",
  
  // System
  CONFIG_CHANGE = "config_change",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
  XSS_ATTEMPT = "xss_attempt",
}

export function logSecurityEvent(
  event: SecurityEvent,
  metadata: Record<string, any>
) {
  logger.security(event, {
    ...metadata,
    severity: getEventSeverity(event),
    timestamp: new Date().toISOString(),
  });
  
  // Alert on critical events
  if (isCriticalEvent(event)) {
    sendSecurityAlert(event, metadata);
  }
}

function getEventSeverity(event: SecurityEvent): "low" | "medium" | "high" | "critical" {
  const criticalEvents = [
    SecurityEvent.PRIVILEGE_ESCALATION,
    SecurityEvent.SQL_INJECTION_ATTEMPT,
  ];
  
  const highEvents = [
    SecurityEvent.BRUTE_FORCE_ATTEMPT,
    SecurityEvent.UNAUTHORIZED_ACCESS,
  ];
  
  if (criticalEvents.includes(event)) return "critical";
  if (highEvents.includes(event)) return "high";
  return "medium";
}
```

### Brute Force Detection

```typescript
// Track failed login attempts
interface LoginAttempt {
  ip: string;
  timestamp: Date;
  userId?: string;
}

const failedAttempts = new Map<string, LoginAttempt[]>();

function trackFailedLogin(ip: string, userId?: string) {
  const attempts = failedAttempts.get(ip) || [];
  attempts.push({ ip, timestamp: new Date(), userId });
  
  // Keep only last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentAttempts = attempts.filter(a => a.timestamp > fifteenMinutesAgo);
  
  failedAttempts.set(ip, recentAttempts);
  
  // Alert on threshold
  if (recentAttempts.length >= 5) {
    logSecurityEvent(SecurityEvent.BRUTE_FORCE_ATTEMPT, {
      ip,
      attemptCount: recentAttempts.length,
      timeWindow: "15m",
    });
    
    // Lock account if targeting specific user
    if (userId) {
      lockAccount(userId, "brute_force_protection");
    }
  }
}

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  const user = await authenticateUser(email, password);
  
  if (!user) {
    trackFailedLogin(req.ip, email);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  // Clear failed attempts on success
  failedAttempts.delete(req.ip);
  
  res.json({ success: true });
});
```

### Suspicious Activity Detection

```typescript
// Detect unusual patterns
interface UserActivity {
  userId: string;
  actions: Array<{
    type: string;
    timestamp: Date;
    ip: string;
  }>;
}

const userActivity = new Map<string, UserActivity>();

function detectSuspiciousActivity(userId: string, action: string, ip: string) {
  const activity = userActivity.get(userId) || { userId, actions: [] };
  
  activity.actions.push({
    type: action,
    timestamp: new Date(),
    ip,
  });
  
  // Check for suspicious patterns
  const recentActions = activity.actions.slice(-10);
  
  // Multiple IPs in short time
  const uniqueIPs = new Set(recentActions.map(a => a.ip));
  if (uniqueIPs.size > 3) {
    logSecurityEvent(SecurityEvent.SUSPICIOUS_LOGIN, {
      userId,
      reason: "multiple_ips",
      ipCount: uniqueIPs.size,
    });
  }
  
  // High volume of requests
  const lastMinute = recentActions.filter(
    a => Date.now() - a.timestamp.getTime() < 60000
  );
  if (lastMinute.length > 20) {
    logSecurityEvent(SecurityEvent.RATE_LIMIT_EXCEEDED, {
      userId,
      requestCount: lastMinute.length,
      timeWindow: "1m",
    });
  }
  
  userActivity.set(userId, activity);
}
```

## Audit Trails

### Requirements

Audit trails must be:
- **Complete**: All relevant actions logged
- **Immutable**: Cannot be altered after creation
- **Searchable**: Easy to query and filter
- **Timestamped**: Accurate timestamps for all events
- **Attributable**: Clear who performed each action

### Implementation

```typescript
// shared/schema.ts
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 50 }).notNull(),
  resourceId: text("resource_id"),
  changes: jsonb("changes"), // Store diff of changes
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("audit_org_idx").on(table.organizationId),
  userIdx: index("audit_user_idx").on(table.userId),
  timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
}));

// server/audit.ts
export async function createAuditLog(entry: {
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ip: string;
  userAgent?: string;
}) {
  const id = randomUUID();
  
  await db.insert(auditLog).values({
    id,
    ...entry,
    timestamp: new Date(),
  });
  
  return id;
}

// Usage in route handlers
app.put("/api/clients/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  const clientId = req.params.id;
  
  const before = await storage.getClient(orgId, clientId);
  const after = await storage.updateClient(orgId, clientId, req.body);
  
  // Create audit log
  await createAuditLog({
    organizationId: orgId,
    userId,
    action: "update",
    resource: "client",
    resourceId: clientId,
    changes: diff(before, after), // Only log changed fields
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  
  res.json(after);
});

// Calculate diff (don't log sensitive values)
function diff(before: any, after: any): Record<string, any> {
  const changes: Record<string, any> = {};
  
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes[key] = {
        from: "[REDACTED]", // Don't log actual values
        to: "[REDACTED]",
        changed: true,
      };
    }
  }
  
  return changes;
}
```

### Querying Audit Logs

```typescript
app.get("/api/audit-log", requireAuth, requirePermission("admin"), async (req, res) => {
  const orgId = await getOrCreateOrg((req as AuthenticatedRequest).user!.claims.sub);
  
  const filters = {
    userId: req.query.userId as string | undefined,
    resource: req.query.resource as string | undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
  };
  
  const conditions = [eq(auditLog.organizationId, orgId)];
  
  if (filters.userId) {
    conditions.push(eq(auditLog.userId, filters.userId));
  }
  
  if (filters.resource) {
    conditions.push(eq(auditLog.resource, filters.resource));
  }
  
  if (filters.startDate) {
    conditions.push(gte(auditLog.timestamp, filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(lte(auditLog.timestamp, filters.endDate));
  }
  
  const logs = await db.query.auditLog.findMany({
    where: and(...conditions),
    orderBy: desc(auditLog.timestamp),
    limit: 100,
  });
  
  res.json(logs);
});
```

## Anomaly Detection

### Rate Limiting Monitoring

```typescript
// Track request rates per user
interface RateMetrics {
  userId: string;
  requests: number;
  window: Date;
}

const rateMetrics = new Map<string, RateMetrics>();

function trackRequestRate(userId: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60000); // 1 minute window
  
  const metrics = rateMetrics.get(userId);
  
  if (!metrics || metrics.window < windowStart) {
    rateMetrics.set(userId, {
      userId,
      requests: 1,
      window: now,
    });
    return;
  }
  
  metrics.requests++;
  
  // Alert on high rate
  if (metrics.requests > 100) {
    logSecurityEvent(SecurityEvent.RATE_LIMIT_EXCEEDED, {
      userId,
      requestCount: metrics.requests,
      window: "1m",
    });
  }
}
```

### Data Access Patterns

```typescript
// Monitor for unusual data access
function monitorDataAccess(event: {
  userId: string;
  action: string;
  resourceCount: number;
}) {
  // Alert on bulk operations
  if (event.resourceCount > 100 && event.action === "read") {
    logSecurityEvent(SecurityEvent.MASS_DATA_EXPORT, {
      userId: event.userId,
      resourceCount: event.resourceCount,
    });
  }
  
  if (event.resourceCount > 50 && event.action === "delete") {
    logSecurityEvent(SecurityEvent.BULK_DELETE, {
      userId: event.userId,
      resourceCount: event.resourceCount,
    });
  }
}

// Usage
app.get("/api/clients/export", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  
  const clients = await storage.getAllClients(orgId);
  
  monitorDataAccess({
    userId,
    action: "read",
    resourceCount: clients.length,
  });
  
  res.json(clients);
});
```

## Alert Configuration

### Alert Rules

```typescript
interface AlertRule {
  name: string;
  condition: (event: SecurityEvent, metadata: any) => boolean;
  severity: "low" | "medium" | "high" | "critical";
  channels: ("email" | "slack" | "pagerduty")[];
}

const alertRules: AlertRule[] = [
  {
    name: "Brute Force Attack",
    condition: (event) => event === SecurityEvent.BRUTE_FORCE_ATTEMPT,
    severity: "high",
    channels: ["email", "slack"],
  },
  {
    name: "Privilege Escalation",
    condition: (event) => event === SecurityEvent.PRIVILEGE_ESCALATION,
    severity: "critical",
    channels: ["email", "slack", "pagerduty"],
  },
  {
    name: "SQL Injection Attempt",
    condition: (event) => event === SecurityEvent.SQL_INJECTION_ATTEMPT,
    severity: "critical",
    channels: ["email", "slack", "pagerduty"],
  },
  {
    name: "Mass Data Export",
    condition: (event, metadata) => 
      event === SecurityEvent.MASS_DATA_EXPORT && 
      metadata.resourceCount > 1000,
    severity: "high",
    channels: ["email", "slack"],
  },
];

async function sendSecurityAlert(
  event: SecurityEvent,
  metadata: Record<string, any>
) {
  for (const rule of alertRules) {
    if (rule.condition(event, metadata)) {
      for (const channel of rule.channels) {
        await sendAlert(channel, {
          title: rule.name,
          severity: rule.severity,
          event,
          metadata,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

async function sendAlert(
  channel: string,
  alert: {
    title: string;
    severity: string;
    event: SecurityEvent;
    metadata: Record<string, any>;
    timestamp: string;
  }
) {
  switch (channel) {
    case "email":
      await sendEmailAlert(alert);
      break;
    case "slack":
      await sendSlackAlert(alert);
      break;
    case "pagerduty":
      await sendPagerDutyAlert(alert);
      break;
  }
}
```

## Log Management

### Retention Policy

```typescript
// Define retention periods
const LOG_RETENTION = {
  security: 365,    // 1 year
  audit: 2555,      // 7 years (compliance)
  api: 90,          // 90 days
  debug: 7,         // 7 days
};

// Cleanup job
async function cleanupOldLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION.audit);
  
  await db.delete(auditLog)
    .where(lt(auditLog.timestamp, cutoffDate));
}

// Run daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
```

### Log Storage

```typescript
// Production: Use dedicated logging service
if (process.env.NODE_ENV === "production") {
  // CloudWatch Logs
  const cloudwatch = new AWS.CloudWatchLogs();
  
  function sendToCloudWatch(entry: LogEntry) {
    cloudwatch.putLogEvents({
      logGroupName: "/aws/ubos/api",
      logStreamName: process.env.LOG_STREAM || "default",
      logEvents: [{
        message: JSON.stringify(entry),
        timestamp: Date.now(),
      }],
    });
  }
}
```

### Log Search

```typescript
// API for searching logs
app.get("/api/logs/search", 
  requireAuth,
  requirePermission("admin"),
  async (req, res) => {
    const {
      query,
      startDate,
      endDate,
      level,
      userId,
    } = req.query;
    
    // Search logs in your logging backend
    const results = await searchLogs({
      query: query as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      level: level as string,
      userId: userId as string,
    });
    
    res.json(results);
  }
);
```

## SIEM Integration

### Sending Logs to SIEM

```typescript
// Example: Splunk integration
import { SplunkLogger } from "splunk-logging";

const splunkLogger = new SplunkLogger({
  token: process.env.SPLUNK_TOKEN,
  url: process.env.SPLUNK_URL,
});

export function sendToSIEM(event: LogEntry) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  
  splunkLogger.send({
    message: event,
    severity: event.level,
    source: "ubos-api",
    sourcetype: "json",
  });
}

// Automatically send security events
export function logSecurityEventWithSIEM(
  event: SecurityEvent,
  metadata: Record<string, any>
) {
  const logEntry = {
    level: "info",
    event,
    metadata: sanitizePII(metadata),
    timestamp: new Date().toISOString(),
  };
  
  sendToSIEM(logEntry);
  logger.security(event, metadata);
}
```

### Common SIEM Queries

```
# Datadog example queries

# Failed login attempts by IP
failed_logins:count by ip
  where event:auth AND type:login_failed
  last 1h

# Privilege escalation attempts
events
  where event:authorization AND type:access_denied 
  AND reason:insufficient_permissions
  
# Suspicious activity patterns
users
  where action_count > 100
  AND time_window < 60s
```

## Incident Detection

### Detection Rules

```typescript
interface DetectionRule {
  name: string;
  description: string;
  detect: (logs: LogEntry[]) => boolean;
  severity: "low" | "medium" | "high" | "critical";
}

const detectionRules: DetectionRule[] = [
  {
    name: "Multiple Failed Logins",
    description: "5+ failed login attempts in 15 minutes",
    detect: (logs) => {
      const failedLogins = logs.filter(
        l => l.event === "auth" && l.metadata?.type === "login_failed"
      );
      return failedLogins.length >= 5;
    },
    severity: "high",
  },
  {
    name: "Cross-Org Access Attempt",
    description: "User attempted to access another organization's data",
    detect: (logs) => {
      return logs.some(
        l => l.event === "authorization" && 
        l.metadata?.reason?.includes("wrong_organization")
      );
    },
    severity: "critical",
  },
];

// Run detection periodically
async function runDetection() {
  const recentLogs = await getRecentLogs(15 * 60 * 1000); // Last 15 minutes
  
  for (const rule of detectionRules) {
    if (rule.detect(recentLogs)) {
      await createIncident({
        title: rule.name,
        description: rule.description,
        severity: rule.severity,
        detectedAt: new Date(),
      });
    }
  }
}

setInterval(runDetection, 5 * 60 * 1000); // Every 5 minutes
```

## Response Procedures

### Incident Response Workflow

```
1. Detection → Alert triggered
2. Triage → Assess severity and impact
3. Containment → Block attacker, disable accounts
4. Investigation → Analyze logs, determine scope
5. Remediation → Fix vulnerability, restore service
6. Post-mortem → Document lessons learned
```

### Automated Response

```typescript
// Automatically respond to certain events
export async function autoRespond(
  event: SecurityEvent,
  metadata: Record<string, any>
) {
  switch (event) {
    case SecurityEvent.BRUTE_FORCE_ATTEMPT:
      // Temporarily block IP
      await blockIP(metadata.ip, "1h");
      break;
      
    case SecurityEvent.ACCOUNT_LOCKOUT:
      // Notify user
      await sendSecurityNotification(metadata.userId, {
        type: "account_locked",
        reason: metadata.reason,
      });
      break;
      
    case SecurityEvent.SQL_INJECTION_ATTEMPT:
      // Block request immediately
      await blockIP(metadata.ip, "24h");
      // Alert security team
      await sendSecurityAlert(event, metadata);
      break;
  }
}
```

### Manual Response Actions

```typescript
// Admin API for incident response
app.post("/api/admin/block-user",
  requireAuth,
  requirePermission("admin"),
  async (req, res) => {
    const { userId, reason } = req.body;
    
    await db.update(users)
      .set({ 
        isBlocked: true,
        blockedReason: reason,
        blockedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    logSecurityEvent(SecurityEvent.ACCOUNT_LOCKOUT, {
      userId,
      reason,
      blockedBy: (req as AuthenticatedRequest).user!.claims.sub,
    });
    
    res.json({ success: true });
  }
);

app.post("/api/admin/block-ip",
  requireAuth,
  requirePermission("admin"),
  async (req, res) => {
    const { ip, duration } = req.body;
    
    await blockIP(ip, duration);
    
    logSecurityEvent("ip_blocked", {
      ip,
      duration,
      blockedBy: (req as AuthenticatedRequest).user!.claims.sub,
    });
    
    res.json({ success: true });
  }
);
```

## Quick Reference

### Security Logging Checklist

- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Data access audited
- [ ] System errors logged
- [ ] Sensitive data NOT logged
- [ ] Structured logging format
- [ ] Log retention policy defined
- [ ] Alerts configured
- [ ] SIEM integration (if applicable)
- [ ] Incident response procedures documented

### Common Log Queries

```typescript
// Find failed login attempts
SELECT * FROM logs
WHERE event = 'auth' 
AND type = 'login_failed'
AND timestamp > NOW() - INTERVAL '1 hour';

// Find access denied events
SELECT userId, COUNT(*) as denials
FROM logs
WHERE event = 'authorization'
AND type = 'access_denied'
GROUP BY userId
HAVING COUNT(*) > 5;

// Find bulk operations
SELECT * FROM audit_log
WHERE action IN ('delete', 'export')
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## Resources

- [APPLICATION_SECURITY.md](./APPLICATION_SECURITY.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [CIS Controls](https://www.cisecurity.org/controls)

---

**Last Updated**: 2026-02-04  
**Next Review**: 2026-05-04  
**Contact**: security-team@example.com
