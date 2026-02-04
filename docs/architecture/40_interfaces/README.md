# Interfaces & Integration Points

**Purpose**: Document all system boundaries - APIs, events, webhooks, integrations  
**Audience**: Integration developers, API consumers, partner teams  
**Status**: Living documents - updated with each interface change

---

## 📋 Overview

This folder documents how UBOS communicates with the outside world and how internal components communicate with each other. Every integration point, API surface, event schema, and data exchange format is documented here.

**Key Principle**: **Interfaces are contracts**. Once published, they must be versioned and backward-compatible or clearly deprecated.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [API_SURFACES.md](API_SURFACES.md) | REST APIs, GraphQL, WebSockets | 15 min | 🟡 Planned |
| [INTEGRATIONS.md](INTEGRATIONS.md) | External system integrations | 10 min | 🟡 Planned |
| [EVENTS_AND_JOBS.md](EVENTS_AND_JOBS.md) | Domain events, background jobs | 10 min | 🟡 Planned |

---

## 🎯 Interface Types

### 1. **Synchronous APIs** (Request-Response)

**REST APIs** (Richardson Maturity Model Level 2)
- HTTP verbs: GET, POST, PATCH, DELETE
- Resource-oriented URLs: `/api/clients`, `/api/proposals/:id`
- JSON request/response bodies
- Standard HTTP status codes

**Design Principles**:
- ✅ Resource-based URLs (nouns, not verbs)
- ✅ HTTP methods for operations (GET=read, POST=create, PATCH=update, DELETE=delete)
- ✅ Consistent error format
- ✅ Pagination for lists
- ✅ Filtering and sorting via query params

### 2. **Asynchronous Events** (Fire-and-Forget)

**Domain Events** (Event-Driven Architecture)
- Events represent facts: "ProposalAccepted", "ClientCreated"
- Published to event bus (outbox pattern)
- Multiple subscribers can react independently
- No direct coupling between producers and consumers

**Design Principles**:
- ✅ Events are immutable (past tense: "something happened")
- ✅ Events contain all necessary context
- ✅ Events are versioned
- ✅ Consumers are idempotent

### 3. **Background Jobs** (Scheduled Work)

**Job Types**:
- **One-time**: Send email, generate report
- **Recurring**: Daily reconciliation, nightly backups
- **Retry**: With exponential backoff

**Design Principles**:
- ✅ Jobs are idempotent (safe to run multiple times)
- ✅ Jobs have timeouts
- ✅ Jobs emit metrics (duration, success/failure)
- ✅ Failed jobs are logged and alerted

### 4. **Webhooks** (Push Notifications)

**Outgoing Webhooks**: Notify external systems of events
- HTTP POST to customer-configured URL
- Signed payload for verification
- Retry logic with exponential backoff
- Webhook health monitoring

**Incoming Webhooks**: Receive events from external systems
- Authentication via shared secret or OAuth
- Request validation and deduplication
- Async processing via job queue

---

## 🏗️ Enterprise Interface Patterns

### 1. **API Versioning** (Best Practice)

**Strategies**:
- **URL Versioning**: `/api/v1/clients`, `/api/v2/clients`
- **Header Versioning**: `Accept: application/vnd.ubos.v1+json`
- **Backward Compatibility**: Additive changes only (new fields OK, removing fields NOT OK)

**Deprecation Policy**:
1. Announce deprecation (90 days notice)
2. Mark endpoint as deprecated in docs
3. Return `Deprecation` header
4. Provide migration guide
5. Remove after grace period

### 2. **API Gateway Pattern** (Centralized Entry Point)

**Benefits**:
- Authentication/authorization in one place
- Rate limiting enforcement
- Request/response logging
- Metrics collection
- API documentation (Swagger/OpenAPI)

**Implementation**: Express middleware stack
```typescript
app.use(cors());
app.use(rateLimit());
app.use(requireAuth());
app.use(validateRequest());
app.use(logRequest());
app.use('/api', routes);
app.use(handleErrors());
```

### 3. **Circuit Breaker** (Fault Tolerance)

**Problem**: External API is slow/down, cascade failure  
**Solution**: Detect failures, open circuit, fail fast

**States**:
- **Closed**: Normal operation, requests flow through
- **Open**: Too many failures, reject requests immediately
- **Half-Open**: Test if service recovered

```typescript
const breaker = new CircuitBreaker(externalAPI.call, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

### 4. **Integration Adapter Pattern** (Abstraction)

**Problem**: Multiple email providers (Gmail, Outlook), ledgers (QBO, Xero)  
**Solution**: Unified interface, provider-specific adapters

```typescript
interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<void>;
  fetch(after: Date): Promise<Email[]>;
}

class GmailAdapter implements EmailProvider { /* ... */ }
class OutlookAdapter implements EmailProvider { /* ... */ }
```

**Benefits**:
- Swap providers without changing business logic
- Test with mock provider
- Per-tenant provider configuration

---

## 💡 Unique Differentiators

### 1. **Contract-First API Development**

**Traditional**: Code first, document later  
**Our Approach**: OpenAPI spec first, generate code

**Workflow**:
1. Design API in OpenAPI (YAML)
2. Review API design with stakeholders
3. Generate TypeScript types from OpenAPI
4. Implement handlers matching types
5. Generate API documentation automatically
6. CI validates implementation matches spec

**Benefits**:
- API design discussions happen early
- Frontend can mock API before backend exists
- Contract violations caught in CI
- Documentation always accurate

### 2. **Per-Tenant Integration Configuration**

**Unlike traditional monolithic integrations**:
- Each organization connects their own accounts
- Integration credentials stored per-tenant
- Integration health tracked per-tenant
- Failed integrations don't affect other tenants

**Example**:
```typescript
// Organization A uses Gmail
const orgA = { emailProvider: 'gmail', credentials: {/*...*/} };

// Organization B uses Outlook
const orgB = { emailProvider: 'outlook', credentials: {/*...*/} };
```

### 3. **Integration Health Dashboard**

**Real-time monitoring of all integrations**:
```typescript
{
  organizationId: 123,
  integrations: [
    { name: 'gmail', status: 'healthy', lastSync: '2026-02-04T10:00:00Z' },
    { name: 'quickbooks', status: 'error', lastError: 'Invalid token', errorCount: 3 }
  ]
}
```

**Proactive alerts**:
- Email to customer when integration fails
- Slack notification to support team
- Automatic retry with exponential backoff
- Integration health SLA tracking

### 4. **Idempotency Keys** (Prevent Duplicate Requests)

**Problem**: Network timeout, client retries, creates duplicate records

**Solution**: Client provides idempotency key
```http
POST /api/payments
Idempotency-Key: 123e4567-e89b-12d3-a456-426614174000

{
  "amount": 100.00,
  "currency": "USD"
}
```

**Server behavior**:
- First request: Process normally, store result
- Duplicate request with same key: Return stored result (no reprocessing)
- Different data with same key: Return error

### 5. **Webhook Verification** (Security)

**Outgoing Webhooks**: Sign payload with HMAC
```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers['X-UBOS-Signature'] = signature;
```

**Incoming Webhooks**: Verify signature
```typescript
const expectedSignature = req.headers['x-webhook-signature'];
const computedSignature = computeHMAC(req.body, webhookSecret);

if (!crypto.timingSafeEqual(expectedSignature, computedSignature)) {
  throw new Error('Invalid signature');
}
```

---

## 🔍 How to Use This Documentation

### Scenario 1: Integrating with UBOS (External Developer)

1. **Read**: [API_SURFACES.md](API_SURFACES.md) - Understand available APIs
2. **Authenticate**: Get API key from UBOS dashboard
3. **Try**: Use Postman collection or curl examples
4. **Subscribe**: Configure webhooks for events
5. **Test**: Use sandbox environment before production
6. **Monitor**: Check integration health dashboard

### Scenario 2: Adding New API Endpoint (Internal Developer)

1. **Design**: Create/update OpenAPI spec
2. **Review**: Get approval on API design
3. **Implement**: Write handler + validation
4. **Test**: Unit tests + integration tests
5. **Document**: Add examples to API docs
6. **Deploy**: Roll out with version number
7. **Announce**: Update changelog, notify API consumers

### Scenario 3: Integrating External Service (Internal Developer)

1. **Design**: Define adapter interface
2. **Implement**: Create adapter for specific provider
3. **Test**: Mock adapter for unit tests, real adapter for integration tests
4. **Configure**: Per-tenant configuration in database
5. **Monitor**: Add health checks and alerts
6. **Document**: Update [INTEGRATIONS.md](INTEGRATIONS.md)

---

## 📊 API Metrics

### Health Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **API Uptime** | > 99.9% | TBD | 🟡 |
| **Average Latency (p95)** | < 200ms | TBD | 🟡 |
| **Error Rate** | < 0.1% | TBD | 🟡 |
| **Rate Limit Hits** | < 1% requests | TBD | 🟡 |

### Integration Metrics (Per Tenant)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Sync Success Rate** | > 99% | < 95% |
| **Sync Latency** | < 5 seconds | > 30 seconds |
| **Failed Sync Count** | 0 | > 3 in 1 hour |
| **Last Successful Sync** | < 1 hour ago | > 24 hours ago |

---

## 🔗 Related Documentation

- **Parent**: [docs/architecture/README.md](../README.md)
- **API Implementation**: [docs/api/](../../api/)
- **Data Schemas**: [docs/data/20_entities/](../../data/20_entities/)
- **Security**: [docs/security/30-implementation-guides/](../../security/30-implementation-guides/)

---

**Quick Navigation**: [Back to Architecture](../README.md) | [API Docs](../../api/README.md) | [Data Docs](../../data/README.md)
