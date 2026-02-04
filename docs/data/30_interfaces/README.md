# Data Interfaces

**Purpose**: Document data exchange formats - API contracts, events, files  
**Audience**: API consumers, integration developers, frontend engineers  
**Status**: Living documents - updated with schema changes

---

## 📋 Overview

This folder documents how data moves in/out of the system: REST APIs, domain events, webhooks, file formats.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [API_CONTRACTS.md](API_CONTRACTS.md) | HTTP endpoints & payload schemas | 15 min | ✅ Complete |
| [EVENTS_AND_WEBHOOKS.md](EVENTS_AND_WEBHOOKS.md) | Event schemas, webhook formats | 10 min | 🟡 Planned |
| [FILES_AND_UPLOADS.md](FILES_AND_UPLOADS.md) | File formats, upload limits | 5 min | 🟡 Planned |

---

## 🎯 Interface Categories

### 1. **REST APIs** (Synchronous)
- JSON request/response
- Standard HTTP verbs (GET, POST, PATCH, DELETE)
- Status codes (200, 201, 400, 404, 500)
- Pagination, filtering, sorting

### 2. **Domain Events** (Asynchronous)
- Published to outbox table
- Workers dispatch to subscribers
- Immutable (past tense: "ClientCreated")
- Versioned schemas

### 3. **Webhooks** (Push Notifications)
- HTTP POST to customer URL
- HMAC-signed payloads
- Retry with exponential backoff
- Delivery guarantees

### 4. **File Uploads** (Binary Data)
- Presigned URLs for direct-to-storage
- Metadata in database
- Virus scanning
- Format validation

---

## 🏗️ API Contract Standards

### Request Format
```typescript
// POST /api/clients
{
  "name": "Acme Corp",
  "industry": "Technology",
  "customFields": { "tier": "enterprise" }
}
```

### Response Format
```typescript
// 201 Created
{
  "id": "uuid",
  "name": "Acme Corp",
  "industry": "Technology",
  "organizationId": "org-uuid",
  "createdAt": "2026-02-04T10:00:00Z",
  "updatedAt": "2026-02-04T10:00:00Z"
}
```

### Error Format
```typescript
// 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Name is required" }
  ],
  "requestId": "req-123"
}
```

---

## 💡 Differentiators

### 1. **Contract-First Development**
- OpenAPI spec defines API
- TypeScript types generated from spec
- CI validates implementation matches contract

### 2. **Versioned Events**
- Event schema version included in payload
- Consumers handle multiple versions
- Backward compatibility guaranteed

### 3. **Idempotent APIs**
- Idempotency-Key header support
- Safe to retry failed requests
- Duplicate prevention

---

## 🔗 Related Documentation

- **Parent**: [docs/data/README.md](../README.md)
- **API Docs**: [docs/api/](../../api/)
- **Entities**: [docs/data/20_entities/](../20_entities/)

---

**Quick Navigation**: [Back to Data Docs](../README.md) | [API Contracts](API_CONTRACTS.md)
