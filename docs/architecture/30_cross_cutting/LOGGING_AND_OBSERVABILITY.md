---
title: "Logging and Observability"
last_updated: "2026-02-04"
status: "partial"
owner: "Platform Team"
classification: "internal"
---

# Logging and Observability

**Purpose**: Document logging, monitoring, and observability in UBOS  
**Status**: PARTIAL - basic logging implemented, observability TODO  
**Last Updated**: 2026-02-04

---

## Overview

UBOS implements structured logging with PII redaction. Full observability (metrics, tracing) is planned but not yet implemented.

---

## Logging

### Logging Framework

**Library**: Custom logger using Winston (assumed, verify in code)  
**Configuration**: [server/logger.ts](/server/logger.ts)

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Application errors, exceptions | `logger.error('Failed to process request', { error })` |
| WARN | Warning conditions | `logger.warn('Rate limit approaching', { userId })` |
| INFO | Normal operations | `logger.info('Server started', { port })` |
| DEBUG | Debugging information | `logger.debug('Query executed', { query })` |

### Log Format

**Structured JSON logging** (recommended for production):

```json
{
  "timestamp": "2026-02-04T12:00:00.000Z",
  "level": "info",
  "message": "API request completed",
  "userId": "user-123",
  "organizationId": "org-456",
  "method": "GET",
  "path": "/api/clients",
  "statusCode": 200,
  "duration": 45
}
```

### PII Redaction

**Implementation**: [server/security-utils.ts](/server/security-utils.ts)

Sensitive fields are automatically redacted from logs:
- Passwords
- Session tokens
- Credit card numbers
- SSNs
- Email addresses (configurable)

**Evidence**: [tests/backend/security-utils.test.ts](/tests/backend/security-utils.test.ts)

---

## Request Logging

### API Request Logging

All API requests are logged with:
- Method, path, status code
- Response time
- User ID and organization ID
- Error details (if any)

**Implementation**: Middleware in [server/index.ts](/server/index.ts)

### What is NOT Logged

For security and compliance:
- ❌ Request bodies (may contain PII)
- ❌ Response bodies (may contain sensitive data)
- ❌ Authorization headers
- ❌ Session cookies

---

## Error Handling

### Error Logging

All errors are logged with:
- Error message and stack trace
- Request context (user, org, endpoint)
- Timestamp

**Implementation**: Error middleware in [server/index.ts](/server/index.ts)

See also: [docs/architecture/30_cross_cutting/ERROR_HANDLING.md](/docs/architecture/30_cross_cutting/ERROR_HANDLING.md) (TODO)

---

## Observability (Planned)

### Metrics (TODO)

**Planned metrics**:
- Request count (by endpoint, status code)
- Request duration (p50, p95, p99)
- Error rate
- Database query time
- Active sessions

**Tooling**: Prometheus, StatsD, or similar

### Tracing (TODO)

**Planned implementation**:
- Distributed tracing with OpenTelemetry
- Request ID propagation
- Service-to-service tracing

### Dashboards (TODO)

**Planned dashboards**:
- System health overview
- API performance
- Error rates and types
- User activity
- Database performance

---

## Log Management

### Log Aggregation

**Current**: Console logs (stdout/stderr)  
**Future**: Centralized logging (e.g., CloudWatch, Datadog, ELK stack)

### Log Retention

**TODO**: Define log retention policies
- Application logs: 90 days?
- Audit logs: 1 year?
- Error logs: 6 months?

### Log Analysis

**TODO**: Set up log analysis tools
- Error pattern detection
- Performance anomaly detection
- Security event monitoring

---

## Debugging

### Development Logging

In development, enable verbose logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Production Debugging

**TODO**: Define safe production debugging procedures
- Temporary log level elevation
- Request tracing
- Safe data inspection

---

## Alerting (TODO)

### Planned Alerts

- Error rate spikes
- API latency increases
- Database connection issues
- Security events
- Resource exhaustion

---

## Evidence Links

- **Logger Implementation**: [server/logger.ts](/server/logger.ts)
- **Security Utils**: [server/security-utils.ts](/server/security-utils.ts) (PII redaction)
- **Request Logging**: [server/index.ts](/server/index.ts) (middleware)
- **Security Monitoring**: [docs/security/30-implementation-guides/SECURITY_MONITORING.md](/docs/security/30-implementation-guides/SECURITY_MONITORING.md)

---

**Status**: INCOMPLETE - Needs:
- Metrics implementation
- Distributed tracing
- Log aggregation setup
- Alerting configuration
- Dashboard creation

**Last Verified**: 2026-02-04
