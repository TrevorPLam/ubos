---
title: "API Surfaces"
last_updated: "2026-02-04"
status: "stub"
owner: "API Team"
classification: "internal"
---

# API Surfaces

**Purpose**: Document all API interfaces exposed by UBOS  
**Status**: STUB - see [docs/api/README.md](/docs/api/README.md) for complete API documentation  
**Last Updated**: 2026-02-04

---

## Overview

UBOS exposes a REST API for all client interactions.

For complete API documentation, see:
- **API Index**: [docs/api/README.md](/docs/api/README.md)
- **API Routes**: [server/routes.ts](/server/routes.ts)

---

## API Protocols

### REST API

- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Authentication**: Session cookies (HttpOnly)
- **Base URL**: `/api`

---

## API Domains

See [docs/api/README.md](/docs/api/README.md) for complete domain documentation:

- **Auth**: [docs/api/auth/README.md](/docs/api/auth/README.md)
- **CRM**: [docs/api/crm/README.md](/docs/api/crm/README.md)
- **Agreements**: [docs/api/agreements/README.md](/docs/api/agreements/README.md)
- **Projects**: [docs/api/projects/README.md](/docs/api/projects/README.md)
- **Revenue**: [docs/api/revenue/README.md](/docs/api/revenue/README.md)
- **Files**: [docs/api/files/README.md](/docs/api/files/README.md)
- **And more...**

---

## API Standards

### Request/Response Format

**TODO**: Document standard request/response patterns

### Error Responses

See [docs/architecture/30_cross_cutting/ERROR_HANDLING.md](/docs/architecture/30_cross_cutting/ERROR_HANDLING.md)

### Pagination

**TODO**: Document pagination standard

### Versioning

**TODO**: Document API versioning strategy

---

## Evidence Links

- **API Documentation**: [docs/api/README.md](/docs/api/README.md)
- **API Implementation**: [server/routes.ts](/server/routes.ts)
- **API Tests**: [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts)

---

**Status**: STUB - See [docs/api/](/docs/api/) for complete documentation
