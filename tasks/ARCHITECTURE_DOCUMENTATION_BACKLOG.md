# Architecture Documentation Backlog

**Created:** 2026-02-04  
**Status:** Active  
**Owner:** Architecture Team

---

## Overview

Remaining tasks to complete `docs/architecture/` documentation system. The core structure and critical documents are complete; these are supporting documents for depth in specific technical areas.

---

## Build & Configuration (Task #4)

### BUILD_AND_TOOLING.md
**Location:** `docs/architecture/10_current_state/BUILD_AND_TOOLING.md`  
**Purpose:** Document build system, scripts, bundlers, and tooling pipeline  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [script/build.ts](../../script/build.ts), [vite.config.ts](../../vite.config.ts), [package.json](../../package.json)

**Content outline:**
- Build commands (dev vs prod)
- Build pipeline (Vite client + esbuild server)
- Scripts and tasks
- Bundler configuration
- Artifact output directories
- Build optimization strategy

### CONFIGURATION_MODEL.md
**Location:** `docs/architecture/10_current_state/CONFIGURATION_MODEL.md`  
**Purpose:** Document environment variables, config files, feature flags, secrets management  
**Priority:** P1  
**Effort:** 1 hour  
**Evidence:** [package.json](../../package.json), [server/index.ts](../../server/index.ts), README.md

**Content outline:**
- Environment variables (DATABASE_URL, PORT, NODE_ENV, ALLOWED_ORIGINS)
- Configuration files (tsconfig, vite, vitest, eslint, tailwind, postcss)
- Feature flags (if any)
- Secrets management (current vs target)
- Env var validation
- Development vs production differences

### DEPENDENCY_GRAPH.md
**Location:** `docs/architecture/10_current_state/DEPENDENCY_GRAPH.md`  
**Purpose:** Document package dependencies, coupling hotspots, and import relationships  
**Priority:** P2  
**Effort:** 1-2 hours  
**Evidence:** [package.json](../../package.json), codebase inspection

**Content outline:**
- Top-level dependencies by category
- Client-only dependencies
- Server-only dependencies
- Shared dependencies
- Dev dependencies
- Coupling hotspots (high interdependency)
- Dependency version constraints
- Update policy

---

## Cross-Cutting Concerns (Task #5)

### AUTH_AND_SESSION.md
**Location:** `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [server/routes.ts](../../server/routes.ts), [shared/models/auth.ts](../../shared/models/auth.ts), [server/session.ts](../../server/session.ts)

**Content outline:**
- Current auth model (dev-only cookie-based)
- Header-based auth (x-user-id, dev only)
- Multi-tenancy assumptions (organizationId)
- Session storage (in-memory → Redis target)
- CSRF protection
- Production auth requirements (OIDC)
- User/tenant/role/permission schema

### SECURITY_BASELINE.md
**Location:** `docs/architecture/30_cross_cutting/SECURITY_BASELINE.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [server/security.ts](../../server/security.ts), [server/security-utils.ts](../../server/security-utils.ts), [docs/security/](../security/)

**Content outline:**
- Security headers enforced
- Rate limiting configuration
- CORS policy
- Request payload limits
- PII redaction in logs
- CSRF token handling
- Threat model references
- Security assumptions
- Compliance requirements (SOC2, GDPR)

### LOGGING_AND_OBSERVABILITY.md
**Location:** `docs/architecture/30_cross_cutting/LOGGING_AND_OBSERVABILITY.md`  
**Priority:** P2  
**Effort:** 1 hour  
**Evidence:** [server/index.ts](../../server/index.ts), [server/security-utils.ts](../../server/security-utils.ts)

**Content outline:**
- Current logging (console.log + timestamps)
- Log levels
- PII redaction strategy
- Correlation IDs (future)
- Request/response logging
- Error logging
- Metrics (current: none, target: Prometheus)
- Tracing (current: none, target: OpenTelemetry)
- Alerting (future)

### ERROR_HANDLING.md
**Location:** `docs/architecture/30_cross_cutting/ERROR_HANDLING.md`  
**Priority:** P2  
**Effort:** 1 hour  
**Evidence:** [server/routes.ts](../../server/routes.ts), [server/index.ts](../../server/index.ts)

**Content outline:**
- Error boundaries (client vs server)
- HTTP error codes and mapping
- Error response format
- Validation errors (Zod)
- Database errors
- Integration errors
- Retry strategy
- Dead-letter queue (future)
- Error reporting

### PERFORMANCE_AND_LIMITS.md
**Location:** `docs/architecture/30_cross_cutting/PERFORMANCE_AND_LIMITS.md`  
**Priority:** P2  
**Effort:** 1 hour  
**Evidence:** [server/index.ts](../../server/index.ts), [vitest.config.ts](../../vitest.config.ts)

**Content outline:**
- Request timeout limits
- Payload size limits (100kb)
- Rate limiting (1000/15min global, 10/15min auth)
- Connection pooling (Postgres: max 10)
- Memory footprint (unknown)
- Cold start time
- Horizontal scaling bottlenecks
- Performance budgets
- Caching strategy

---

## Interfaces & Integration (Task #6)

### API_SURFACES.md
**Location:** `docs/architecture/40_interfaces/API_SURFACES.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [server/routes.ts](../../server/routes.ts) (50 endpoints)

**Content outline:**
- External API surface (REST endpoints)
- Internal API surface (storage layer)
- API versioning strategy
- Request/response schemas
- Endpoint groups (/api/clients, /api/deals, etc.)
- Authentication per endpoint
- Error responses
- Pagination (if any)
- Rate limiting per endpoint

### INTEGRATIONS.md
**Location:** `docs/architecture/40_interfaces/INTEGRATIONS.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [PLAN.md](../../PLAN.md), [schema.ts](../../shared/schema.ts)

**Content outline:**
- Email integrations (Graph/Gmail, future)
- Ledger integrations (QBO/Xero, future)
- E-sign integrations (DocuSign/etc, future)
- Webhook receivers
- Integration credentials/vault (future)
- Integration health monitoring (future)
- Per-tenant configuration
- OAuth flows

### EVENTS_AND_JOBS.md
**Location:** `docs/architecture/40_interfaces/EVENTS_AND_JOBS.md`  
**Priority:** P0 (target-focused)  
**Effort:** 1-2 hours  
**Evidence:** [PLAN.md](../../PLAN.md), [schema.ts](../../shared/schema.ts)

**Content outline:**
- Event-driven architecture (target)
- Outbox pattern (table + dispatcher)
- Event schema and versioning
- Event handlers and idempotency
- Retry strategy
- Dead-letter queue
- Domain events (client.created, etc.)
- Background jobs (email sync, ledger sync, etc.)
- Job scheduling (future)
- Workflow engine (future)

---

## Deployment (Task #6)

### ENVIRONMENTS.md
**Location:** `docs/architecture/50_deployment/ENVIRONMENTS.md`  
**Priority:** P1  
**Effort:** 1 hour  
**Evidence:** [server/index.ts](../../server/index.ts), [package.json](../../package.json)

**Content outline:**
- Development environment setup
- Staging environment (future)
- Production environment
- Environment-specific configuration
- Database per environment
- Redis per environment (future)
- S3/MinIO per environment (future)
- Secrets management per env
- CI/CD per environment

### DEPLOYMENT_TOPOLOGY.md
**Location:** `docs/architecture/50_deployment/DEPLOYMENT_TOPOLOGY.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Evidence:** [script/build.ts](../../script/build.ts), [server/index.ts](../../server/index.ts)

**Content outline:**
- Current deployment model (single process)
- Target deployment model (horizontal scaling)
- Load balancer topology (future)
- Database connection pooling
- Redis topology (future)
- S3/MinIO topology (future)
- Reverse proxy/trusted proxy setup
- TLS/HTTPS configuration
- DNS setup
- Disaster recovery

### CI_CD.md
**Location:** `docs/architecture/50_deployment/CI_CD.md`  
**Priority:** P2  
**Effort:** 1-2 hours  
**Evidence:** [package.json](../../package.json) (scripts), GitHub workflows (if present)

**Content outline:**
- CI pipeline (test, lint, typecheck)
- Deployment gates
- Build artifacts
- Artifact storage
- Release process
- Rollback procedure
- Post-deployment verification
- Monitoring/alerting on deploy
- GitHub Actions workflows (if present)

---

## Gap Analysis & Roadmap (Task #7)

### MIGRATION_PLAN.md
**Location:** `docs/architecture/60_gaps_and_roadmap/MIGRATION_PLAN.md`  
**Priority:** P1  
**Effort:** 1-2 hours  
**Status:** Partially complete in GAP_ANALYSIS.md, needs standalone version  
**Evidence:** [GAP_ANALYSIS.md](../../docs/architecture/60_gaps_and_roadmap/GAP_ANALYSIS.md)

**Content outline:**
- Phase-by-phase breakdown (Phases 0-4)
- Detailed steps per phase
- Checkpoint validation
- Risk mitigation
- Success criteria per phase
- Timeline estimates
- Dependencies and sequencing
- Rollback strategy
- Resource allocation

### EVIDENCE_MAP.md
**Location:** `docs/architecture/60_gaps_and_roadmap/EVIDENCE_MAP.md`  
**Priority:** P2  
**Effort:** 1-2 hours  
**Evidence:** Cross-reference all docs to code

**Content outline:**
- Index: Architecture doc → code path(s)
- Current state evidence (which files prove what)
- Gap evidence (what code is missing)
- Test evidence (which tests validate architecture)
- CI evidence (which GitHub Actions validate)
- Verification commands per doc section
- Audit trail (how to verify claims in docs)

---

## Progress Summary

| Category | Status | Docs | Effort |
|----------|--------|------|--------|
| **Current State** | ✅ Complete | 3/3 | Done |
| **Target State** | ✅ Complete | 2/2 | Done |
| **Gap Analysis** | ✅ Complete | 1/2 | Done (need MIGRATION_PLAN detail) |
| **Build & Config** | ⏳ Not started | 0/3 | 3-5 hrs |
| **Cross-Cutting** | ⏳ Not started | 0/5 | 5-7 hrs |
| **Interfaces** | ⏳ Not started | 0/3 | 3-5 hrs |
| **Deployment** | ⏳ Not started | 0/3 | 3-5 hrs |
| **Roadmap** | ⏳ Partial | 1/2 | 2-4 hrs |
| **ADRs** | ✅ Started | Template + Index | Done |

**Total remaining effort:** 16-26 hours (~2-3 days focused work)

---

## Next Steps

### Immediate (Next session)
- [ ] Complete BUILD_AND_TOOLING.md
- [ ] Complete CONFIGURATION_MODEL.md
- [ ] Complete AUTH_AND_SESSION.md
- [ ] Complete SECURITY_BASELINE.md

### Follow-up
- [ ] Complete remaining cross-cutting concerns
- [ ] Complete deployment topology docs
- [ ] Create standalone MIGRATION_PLAN.md
- [ ] Create EVIDENCE_MAP.md

### Later
- [ ] Integrate with GitHub wiki (optional)
- [ ] Create architecture diagram tool (optional)
- [ ] Set up automated verification (architecture tests)

---

**Related:**
- [docs/architecture/README.md](../../docs/architecture/README.md) - Main entry point
- [docs/architecture/60_gaps_and_roadmap/GAP_ANALYSIS.md](../../docs/architecture/60_gaps_and_roadmap/GAP_ANALYSIS.md) - Current vs target
- [PLAN.md](../../PLAN.md) - Source of truth for target architecture
