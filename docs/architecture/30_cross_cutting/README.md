# Cross-Cutting Concerns

**Purpose**: Document system-wide concerns that affect all domains and components  
**Audience**: All engineers - these patterns must be followed everywhere  
**Status**: Living documents - authoritative standards for the system

---

## 📋 Overview

Cross-cutting concerns are aspects of the system that affect multiple modules and cannot be cleanly encapsulated in a single component. These are the "horizontal" concerns that cut across the "vertical" domain boundaries.

**Key Principle**: Consistency matters. These patterns should be implemented the same way everywhere.

---

## 📚 Documents in This Folder

### Core Documents

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [COMMENTING.md](COMMENTING.md) | Code documentation standards for human + AI | 5 min | ✅ Complete |
| [AUTH_AND_SESSION.md](AUTH_AND_SESSION.md) | Authentication & session management | 10 min | 🟡 Planned |
| [SECURITY_BASELINE.md](SECURITY_BASELINE.md) | Security headers, CSP, rate limiting | 10 min | 🟡 Planned |
| [LOGGING_AND_OBSERVABILITY.md](LOGGING_AND_OBSERVABILITY.md) | Logs, metrics, traces, monitoring | 10 min | 🟡 Planned |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | Error propagation, user feedback | 5 min | 🟡 Planned |
| [PERFORMANCE_AND_LIMITS.md](PERFORMANCE_AND_LIMITS.md) | Rate limits, timeouts, resource limits | 5 min | 🟡 Planned |

---

## 🎯 What Are Cross-Cutting Concerns?

### Industry Standard: Aspect-Oriented Programming (AOP)

**Origin**: Gregor Kiczales et al., Xerox PARC, 1990s

**Definition**: Concerns that affect multiple parts of a system and don't fit cleanly into a single module.

**Common Cross-Cutting Concerns**:
1. **Logging**: Recording application events
2. **Security**: Authentication, authorization, encryption
3. **Transaction Management**: ACID properties across operations
4. **Error Handling**: Consistent error propagation and reporting
5. **Caching**: Performance optimization across layers
6. **Monitoring**: Health checks, metrics, alerting
7. **Internationalization**: Multi-language support
8. **Concurrency**: Thread safety, race condition prevention

---

## 🏗️ Enterprise Patterns for Cross-Cutting Concerns

### 1. **Authentication & Authorization** (Industry Standard)

**Standards Applied**:
- **OAuth 2.0 / OpenID Connect**: Industry-standard authentication
- **JWT (JSON Web Tokens)**: Stateless authentication
- **RBAC (Role-Based Access Control)**: Permission model
- **ABAC (Attribute-Based Access Control)**: Fine-grained permissions

**Pattern**: Middleware-based authentication
```typescript
// server/middleware/auth.ts
export function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'] || req.cookies.ubos_user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
}
```

**Best Practices**:
- ✅ Fail secure (deny by default)
- ✅ Centralized authentication logic
- ✅ Token expiration and refresh
- ✅ Secure session storage (HttpOnly cookies)
- ✅ CSRF protection for state-changing operations

### 2. **Logging & Observability** (Three Pillars)

**Standards Applied**:
- **Structured Logging**: JSON format for machine parsing
- **Log Levels**: FATAL, ERROR, WARN, INFO, DEBUG, TRACE
- **Correlation IDs**: Track requests across services
- **OpenTelemetry**: Standardized observability framework

**The Three Pillars**:

**Logs** (What happened):
```typescript
logger.info('User logged in', {
  userId: 123,
  timestamp: new Date().toISOString(),
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

**Metrics** (How much/how often):
```typescript
// RED metrics (Rate, Errors, Duration)
metrics.increment('http.requests', { method: 'GET', path: '/api/clients' });
metrics.timing('http.request.duration', duration, { status: 200 });
metrics.increment('http.errors', { status: 500, path: '/api/clients' });
```

**Traces** (Where time is spent):
```typescript
const span = tracer.startSpan('fetch_client_data');
span.setAttribute('client.id', clientId);
// ... perform operation
span.end();
```

**Best Practices**:
- ✅ Never log PII (Personally Identifiable Information)
- ✅ Include correlation IDs in all logs
- ✅ Use structured logging (JSON)
- ✅ Set appropriate log levels
- ✅ Implement log rotation and retention

### 3. **Error Handling** (Consistent User Experience)

**Pattern**: Centralized error middleware
```typescript
app.use((err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.id
  });
});
```

**Best Practices**:
- ✅ Never expose stack traces to users
- ✅ Log full error details server-side
- ✅ Return user-friendly error messages
- ✅ Include request ID for support tickets
- ✅ Differentiate client errors (4xx) from server errors (5xx)

### 4. **Security Headers** (OWASP Recommendations)

**Standards Applied**:
- **Content Security Policy (CSP)**: Prevent XSS attacks
- **HSTS (HTTP Strict Transport Security)**: Force HTTPS
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### 5. **Rate Limiting** (DoS Protection)

**Pattern**: Token bucket or sliding window
```typescript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

**Best Practices**:
- ✅ Different limits for different endpoints
- ✅ Higher limits for authenticated users
- ✅ Return Retry-After header
- ✅ Monitor rate limit hits

---

## 💡 Unique Differentiators (Novel Approaches)

### 1. **AI-Optimized Commenting Pattern**

Traditional commenting: "What the code does"  
Our commenting: "Why it exists, how to extend it"

**Four-Part Comment Structure**:
```typescript
/**
 * RESPONSIBILITIES:
 * - What this component does
 * - What it explicitly does NOT do
 * 
 * DATA FLOW:
 * - Input → Processing → Output
 * 
 * KEY INVARIANTS:
 * - Assumptions that must always hold
 * - Tenancy constraints
 * - Ordering requirements
 * 
 * AI ITERATION NOTES:
 * - To add a new field: [step-by-step instructions]
 * - To add a new validation: [specific guidance]
 * - Common pitfalls: [what to avoid]
 */
```

**Why This Matters**: AI tools can extend code correctly without breaking invariants.

### 2. **Context-Aware Logging**

Beyond just logging events - log with full context:

```typescript
// Traditional
logger.info('Client created');

// Context-aware
logger.info('Client created', {
  organizationId: req.organizationId,
  userId: req.userId,
  clientId: newClient.id,
  clientName: redact(newClient.name), // PII-aware
  requestId: req.id,
  duration: Date.now() - req.startTime,
  source: 'api',
  action: 'create',
  resource: 'client'
});
```

**Benefits**:
- Full context for debugging
- Enables audit trail queries
- Supports compliance requirements
- Facilitates observability dashboards

### 3. **Defense-in-Depth Security**

Security at every layer, not just one:

**Layer 1: Network** - TLS, firewall, DDoS protection  
**Layer 2: Application** - Authentication, authorization, input validation  
**Layer 3: Data** - Encryption at rest, tenant isolation, PII redaction  
**Layer 4: Monitoring** - Intrusion detection, anomaly detection, audit logs

**Why This Matters**: If one layer fails, others still protect the system.

### 4. **Tenant-Aware Everything**

Multi-tenancy isn't just in the database - it's everywhere:

```typescript
// Cache keys
cache.set(`org:${orgId}:clients:${clientId}`, data);

// Log context
logger.info('Action performed', { organizationId: orgId });

// Metrics
metrics.increment('api.requests', { tenant: orgId });

// Error messages
throw new Error(`Client ${clientId} not found in organization ${orgId}`);
```

**Why This Matters**: Prevents tenant data leakage, enables per-tenant analytics.

### 5. **Graceful Degradation Pattern**

System remains functional even when non-critical services fail:

```typescript
async function fetchWeatherData() {
  try {
    return await externalWeatherAPI.get();
  } catch (error) {
    logger.warn('Weather API unavailable', { error });
    return { temp: null, status: 'unavailable' }; // Degrade gracefully
  }
}
```

**Tier Classification**:
- **Tier 0 (Critical)**: System fails if unavailable (database, auth)
- **Tier 1 (Important)**: Degraded experience (search, notifications)
- **Tier 2 (Nice-to-have)**: Optional features (weather, analytics)

---

## 🔍 How to Apply Cross-Cutting Concerns

### Scenario 1: Adding a New API Endpoint

**Checklist**:
- [ ] Authentication: Add `requireAuth` middleware
- [ ] Authorization: Check user has permission
- [ ] Input Validation: Validate & sanitize all inputs
- [ ] Logging: Log request with context
- [ ] Error Handling: Use standard error middleware
- [ ] Rate Limiting: Apply appropriate rate limit
- [ ] Monitoring: Add metrics for this endpoint
- [ ] Documentation: Update API docs
- [ ] Tests: Include auth, validation, error tests

### Scenario 2: Adding New Background Job

**Checklist**:
- [ ] Logging: Log job start, progress, completion
- [ ] Error Handling: Retry logic with exponential backoff
- [ ] Monitoring: Track job duration, success/failure rate
- [ ] Timeouts: Set maximum execution time
- [ ] Idempotency: Safe to run multiple times
- [ ] Tenant Scoping: Properly scope to organization
- [ ] Alerting: Alert on repeated failures

### Scenario 3: Handling Sensitive Data

**Checklist**:
- [ ] Encryption: Encrypt at rest and in transit
- [ ] Access Control: Strict RBAC enforcement
- [ ] Logging: Never log sensitive values
- [ ] Audit: Log all access to sensitive data
- [ ] Retention: Define and enforce data retention
- [ ] Deletion: Implement secure deletion
- [ ] Compliance: Check GDPR, HIPAA, PCI-DSS requirements

---

## 📊 Cross-Cutting Concerns Checklist

Use this for code reviews:

| Concern | Implementation | Status |
|---------|----------------|--------|
| **Authentication** | All protected routes use middleware | ✅ |
| **Authorization** | Permission checks in place | 🟡 |
| **Input Validation** | All inputs validated | ✅ |
| **Error Handling** | Centralized error middleware | ✅ |
| **Logging** | Structured logs with context | 🟡 |
| **Monitoring** | Metrics on key operations | 🔴 |
| **Security Headers** | All required headers set | ✅ |
| **Rate Limiting** | Applied to public endpoints | ✅ |
| **CSRF Protection** | Enabled for state changes | ✅ |
| **PII Redaction** | No PII in logs | 🟡 |

---

## 🔗 Related Documentation

- **Parent**: [docs/architecture/README.md](../README.md)
- **Security Details**: [docs/security/](../../security/)
- **API Standards**: [docs/api/](../../api/)
- **Implementation**: [docs/architecture/10_current_state/](../10_current_state/)

---

## 📝 Maintenance

**Update Frequency**: When patterns change (quarterly review)  
**Owners**: Technical Lead, Security Engineer, All Engineers (compliance)  
**Review Process**: Changes require review by Tech Lead + Security  

**Last Major Update**: 2026-02-04  
**Next Scheduled Review**: 2026-05-01

---

**Quick Navigation**: [Back to Architecture](../README.md) | [Current State](../10_current_state/README.md) | [Decisions](../20_decisions/README.md)
