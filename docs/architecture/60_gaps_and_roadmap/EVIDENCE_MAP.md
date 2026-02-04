---
title: "Architecture Evidence Map"
last_updated: "2026-02-04"
status: "active"
owner: "Architecture Team"
classification: "internal"
---

# Architecture Evidence Map

**Purpose**: Trace architecture documentation to code implementation  
**Status**: ACTIVE  
**Last Updated**: 2026-02-04

---

## Documentation → Code Mapping

### Architecture Documentation

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Repo Structure** | [docs/architecture/10_current_state/REPO_MAP.md](/docs/architecture/10_current_state/REPO_MAP.md) | Root folder structure |
| **Runtime Components** | [docs/architecture/10_current_state/RUNTIME_COMPONENTS.md](/docs/architecture/10_current_state/RUNTIME_COMPONENTS.md) | [server/index.ts](/server/index.ts), [client/src/main.tsx](/client/src/main.tsx) |
| **Build System** | [docs/architecture/10_current_state/BUILD_AND_TOOLING.md](/docs/architecture/10_current_state/BUILD_AND_TOOLING.md) | [vite.config.ts](/vite.config.ts), [package.json](/package.json) |
| **Configuration** | [docs/architecture/10_current_state/CONFIGURATION_MODEL.md](/docs/architecture/10_current_state/CONFIGURATION_MODEL.md) | [server/config-validation.ts](/server/config-validation.ts) |

### Cross-Cutting Concerns

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Authentication** | [docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md](/docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md) | [server/session.ts](/server/session.ts), [server/routes.ts](/server/routes.ts) |
| **Security** | [docs/architecture/30_cross_cutting/SECURITY_BASELINE.md](/docs/architecture/30_cross_cutting/SECURITY_BASELINE.md) | [server/security.ts](/server/security.ts), [server/csrf.ts](/server/csrf.ts) |
| **Logging** | [docs/architecture/30_cross_cutting/LOGGING_AND_OBSERVABILITY.md](/docs/architecture/30_cross_cutting/LOGGING_AND_OBSERVABILITY.md) | [server/logger.ts](/server/logger.ts), [server/security-utils.ts](/server/security-utils.ts) |

### API & Interfaces

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **API Routes** | [docs/architecture/40_interfaces/API_SURFACES.md](/docs/architecture/40_interfaces/API_SURFACES.md) | [server/routes.ts](/server/routes.ts) |
| **API Documentation** | [docs/api/README.md](/docs/api/README.md) | Domain-specific docs in [docs/api/](/docs/api/) |

### Data Layer

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Data Model** | [docs/data/README.md](/docs/data/README.md) | [shared/schema.ts](/shared/schema.ts) |
| **Entity Definitions** | [docs/data/20_entities/ENTITY_INDEX.md](/docs/data/20_entities/ENTITY_INDEX.md) | [shared/schema.ts](/shared/schema.ts) |
| **Data Access** | [docs/data/10_current_state/DATA_SOURCES.md](/docs/data/10_current_state/DATA_SOURCES.md) | [server/storage.ts](/server/storage.ts) |
| **Tenancy** | [docs/data/10_current_state/TENANCY_AND_ACCESS.md](/docs/data/10_current_state/TENANCY_AND_ACCESS.md) | [server/storage.ts](/server/storage.ts) |

### Security

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Security Controls** | [docs/security/10-controls/CONTROLS_MATRIX.md](/docs/security/10-controls/CONTROLS_MATRIX.md) | Various security implementation files |
| **Threat Model** | [docs/security/20-threat-model/THREAT_MODEL.md](/docs/security/20-threat-model/THREAT_MODEL.md) | Security controls and mitigations |
| **Application Security** | [docs/security/30-implementation-guides/APPLICATION_SECURITY.md](/docs/security/30-implementation-guides/APPLICATION_SECURITY.md) | [server/security.ts](/server/security.ts), [server/security-utils.ts](/server/security-utils.ts) |

### Testing

| Doc Section | Code Location(s) | Evidence |
|------------|------------------|----------|
| **Test Guide** | [docs/tests/README.md](/docs/tests/README.md) | [tests/](/tests/) |
| **Test Configuration** | [vitest.config.ts](/vitest.config.ts) | [vitest.config.client.ts](/vitest.config.client.ts) |
| **Backend Tests** | [tests/backend/](/tests/backend/) | API, auth, security, multi-tenant tests |
| **Test Setup** | [tests/setup/](/tests/setup/) | Backend and frontend test setup |

---

## Code → Documentation Mapping

### Server Code

| Code File | Documented In |
|-----------|---------------|
| [server/index.ts](/server/index.ts) | Runtime Components, Logging |
| [server/routes.ts](/server/routes.ts) | API Surfaces, Auth & Session, API docs |
| [server/storage.ts](/server/storage.ts) | Data Sources, Tenancy, Data Model |
| [server/db.ts](/server/db.ts) | Data Sources, Configuration |
| [server/security.ts](/server/security.ts) | Security Baseline, Application Security |
| [server/csrf.ts](/server/csrf.ts) | Security Controls |
| [server/session.ts](/server/session.ts) | Auth & Session |
| [server/logger.ts](/server/logger.ts) | Logging & Observability |
| [server/security-utils.ts](/server/security-utils.ts) | Logging, Data Protection |

### Shared Code

| Code File | Documented In |
|-----------|---------------|
| [shared/schema.ts](/shared/schema.ts) | Data Model, Entity Index, Current State |
| [shared/models/auth.ts](/shared/models/auth.ts) | Auth & Session |

### Client Code

| Code Folder | Documented In |
|-------------|---------------|
| [client/src/](/client/src/) | Client Analysis (archive) |
| [client/src/main.tsx](/client/src/main.tsx) | Runtime Components |

### Tests

| Test File | Documents |
|-----------|-----------|
| [tests/backend/api-routes.test.ts](/tests/backend/api-routes.test.ts) | API correctness |
| [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) | Auth enforcement |
| [tests/backend/multi-tenant-isolation.test.ts](/tests/backend/multi-tenant-isolation.test.ts) | Tenancy isolation |
| [tests/backend/security.test.ts](/tests/backend/security.test.ts) | Security controls |
| [tests/backend/csrf.test.ts](/tests/backend/csrf.test.ts) | CSRF protection |

---

## Verification Commands

To verify documentation matches code:

```bash
# Run all tests
npm test

# Type check
npm run check

# Run backend tests
npm run test:backend

# Run security tests
npm run test:backend -- security

# Build application
npm run build
```

---

**Last Verified**: 2026-02-04  
**Verification**: Code-to-doc mapping validated via test execution and code review
