# Gap Analysis: Current vs Target Architecture

**Purpose:** Identify architectural gaps and prioritize migration work  
**Status:** Active roadmap document  
**Last updated:** 2026-02-04

## Executive Summary

UBOS has **data models** for the target architecture but lacks **architectural boundaries and infrastructure**. The current implementation is a **single-process monolith** with flat table structure. The target is a **modular monolith** with strict domain boundaries, event-driven communication, and workflow orchestration.

**Key gaps:**
1. No domain boundaries (monolithic storage layer)
2. No event-driven architecture (no outbox, no async workers)
3. No workflow engine
4. Dev-only auth (no OIDC integration)
5. No caching/queueing infrastructure (no Redis)
6. No object storage integration (no S3/MinIO)
7. No external integrations (email, ledger, e-sign)

**Effort estimate:** 6-12 months for full modular monolith + integrations

---

## Gap Categories

### P0: Foundational Architecture (Must-have for MVP)

| Gap | Current | Target | Impact | Effort | Evidence |
|-----|---------|--------|--------|--------|----------|
| **Domain boundaries** | Monolithic storage | Schema-per-domain + module isolation | High | 6-8 weeks | [storage.ts](../../../server/storage.ts), [schema.ts](../../../shared/schema.ts) |
| **Outbox pattern** | None | Outbox table + dispatcher worker | High | 2-3 weeks | PLAN.md requires event-driven |
| **Workflow engine** | None | Triggers + actions + orchestration | High | 4-6 weeks | PLAN.md flagship workflows |
| **Multi-schema Postgres** | Single `public` schema | Schema per domain (`identity`, `crm`, etc.) | Medium | 2 weeks | [schema.ts](../../../shared/schema.ts) |

**Total P0 effort:** ~14-19 weeks (~3.5-5 months)

### P1: Production-Ready Infrastructure

| Gap | Current | Target | Impact | Effort | Evidence |
|-----|---------|--------|--------|--------|----------|
| **RBAC enforcement** | Schema exists, not enforced | Middleware + service-level checks | High | 2-3 weeks | [auth.ts](../../../shared/models/auth.ts), [routes.ts](../../../server/routes.ts) |
| **Redis caching** | None | Sessions + rate limiting + hot data | High | 1-2 weeks | [session.ts](../../../server/session.ts) |
| **Object storage** | None | S3/MinIO for files + presigned URLs | High | 2-3 weeks | [schema.ts](../../../shared/schema.ts) `fileObjects` table |
| **Postgres RLS** | App-level filtering | Row-Level Security policies | Medium | 1-2 weeks | [storage.ts](../../../server/storage.ts) enforces org filtering |
| **Audit log coverage** | Partial (`activity_events`) | All mutations logged | Medium | 1-2 weeks | [schema.ts](../../../shared/schema.ts#L681-L707) |
| **Structured logging** | `console.log` | JSON logs + correlation IDs | Medium | 1 week | [index.ts](../../../server/index.ts#L68-L131) |
| **Health endpoints** | None | `/health`, `/ready` for K8s probes | Low | 1 week | [index.ts](../../../server/index.ts) |

**Total P1 effort:** ~9-14 weeks (~2-3.5 months)

### P2: External Integrations & Advanced Features

| Gap | Current | Target | Impact | Effort | Evidence |
|-----|---------|--------|--------|--------|----------|
| **Email sync** | None | OAuth + background jobs (Graph/Gmail) | Medium | 3-4 weeks | PLAN.md requirement |
| **Ledger integration** | None | QBO/Xero stubs + sync jobs | Medium | 3-4 weeks | PLAN.md requirement |
| **E-sign integration** | None | DocuSign/etc + webhooks | Medium | 2-3 weeks | PLAN.md requirement |
| **Global search** | None | Postgres baseline → OpenSearch | Medium | 2-3 weeks | PLAN.md requirement |
| **Metrics/tracing** | None | Prometheus + OpenTelemetry | Low | 2-3 weeks | Observability |
| **Graceful shutdown** | None | SIGTERM handler + drain | Low | 1 week | [index.ts](../../../server/index.ts) |

**Total P2 effort:** ~13-18 weeks (~3-4.5 months)

---

## Detailed Gap Analysis

## 1. Domain Boundaries (P0)

### Current State
- **Single storage layer:** [server/storage.ts](../../../server/storage.ts) (monolithic)
- **Flat schema:** All tables in `public` schema
- **Cross-domain reads:** Allowed (no enforcement)
- **No module isolation:** Any code can import any module

**Evidence:**
```typescript
// server/storage.ts (example)
export const storage = {
  getClientCompanies(orgId) { /* ... */ },
  getDeals(orgId) { /* ... */ },
  getProjects(orgId) { /* ... */ },
  // All mixed together, no boundaries
};
```

### Target State (per PLAN.md)
- **Modular structure:** `server/domains/{identity,crm,projects,...}/`
- **Schema-per-domain:** `identity.*`, `crm.*`, `projects.*`, etc.
- **Event-driven communication:** Domains emit events, no direct calls
- **Workflow orchestration:** Only workflow engine can call multiple domains

**Required changes:**
1. Split `server/storage.ts` into domain modules:
   ```
   server/
     domains/
       identity/
         identity.service.ts      # Business logic
         identity.repository.ts   # Data access
         identity.events.ts       # Event definitions
         identity.routes.ts       # API endpoints
       crm/
         crm.service.ts
         crm.repository.ts
         crm.events.ts
         crm.routes.ts
       # ... repeat for all domains
   ```
2. Create Postgres schemas:
   ```sql
   CREATE SCHEMA identity;
   CREATE SCHEMA crm;
   CREATE SCHEMA projects;
   -- ... etc.
   ```
3. Migrate tables to domain schemas:
   ```sql
   ALTER TABLE organizations SET SCHEMA identity;
   ALTER TABLE client_companies SET SCHEMA crm;
   ALTER TABLE projects SET SCHEMA projects;
   ```
4. Enforce boundaries via linting/architecture tests:
   ```typescript
   // Architecture test (example)
   it('CRM domain should not import from Projects domain', () => {
     const crmFiles = glob.sync('server/domains/crm/**/*.ts');
     crmFiles.forEach(file => {
       const content = fs.readFileSync(file, 'utf8');
       expect(content).not.toContain('from "../projects');
     });
   });
   ```

**Effort:** 6-8 weeks (refactoring + testing)

### 2. Outbox Pattern (P0)

### Current State
- ❌ No outbox table
- ❌ No event dispatcher
- ❌ No event handlers
- ❌ No async job infrastructure

**Evidence:** Grep for `outbox` in codebase → 0 matches

### Target State (per PLAN.md)
1. **Outbox table:**
   ```sql
   CREATE TABLE shared.outbox (
     id UUID PRIMARY KEY,
     tenant_id VARCHAR NOT NULL,
     event_type VARCHAR NOT NULL,
     version INT NOT NULL,
     payload JSONB NOT NULL,
     metadata JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     processed_at TIMESTAMPTZ,
     retry_count INT DEFAULT 0,
     last_error TEXT
   );
   CREATE INDEX idx_outbox_unprocessed ON outbox (created_at)
     WHERE processed_at IS NULL;
   ```
2. **Event dispatcher (background worker):**
   ```typescript
   // server/workers/outbox-dispatcher.ts
   async function pollOutbox() {
     const events = await db.query.outbox.findMany({
       where: isNull(outbox.processedAt),
       orderBy: asc(outbox.createdAt),
       limit: 100,
     });
     
     for (const event of events) {
       try {
         await deliverEvent(event);
         await markProcessed(event.id);
       } catch (error) {
         await recordError(event.id, error);
       }
     }
   }
   
   setInterval(pollOutbox, 1000); // Poll every 1 second
   ```
3. **Domain services emit events:**
   ```typescript
   // server/domains/crm/crm.service.ts
   async createClient(data: InsertClient, tx: Transaction) {
     const [client] = await tx.insert(clients).values(data).returning();
     
     // Emit event (same transaction)
     await tx.insert(outbox).values({
       event_type: 'client.created',
       version: 1,
       payload: client,
       metadata: { actor_id: userId, timestamp: new Date() },
     });
     
     return client;
   }
   ```

**Effort:** 2-3 weeks (outbox + dispatcher + wire into domains)

### 3. Workflow Engine (P0)

### Current State
- ❌ No workflow table
- ❌ No workflow definitions
- ❌ No workflow runner
- ❌ Flagship workflows hardcoded (if they exist at all)

**Evidence:** Grep for `workflow` in codebase → 0 matches (except PLAN.md)

### Target State (per PLAN.md)
1. **Workflow schema:**
   ```sql
   CREATE SCHEMA workflow;
   
   CREATE TABLE workflow.workflows (
     id UUID PRIMARY KEY,
     name VARCHAR NOT NULL,
     trigger_event_type VARCHAR NOT NULL,
     conditions JSONB,
     actions JSONB NOT NULL,
     retry_policy JSONB,
     enabled BOOLEAN DEFAULT true
   );
   
   CREATE TABLE workflow.runs (
     id UUID PRIMARY KEY,
     workflow_id UUID REFERENCES workflows(id),
     tenant_id VARCHAR NOT NULL,
     trigger_event_id UUID NOT NULL,
     status VARCHAR NOT NULL, -- pending, running, completed, failed
     started_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     error TEXT
   );
   
   CREATE TABLE workflow.run_steps (
     id UUID PRIMARY KEY,
     run_id UUID REFERENCES runs(id),
     action_index INT NOT NULL,
     status VARCHAR NOT NULL,
     result JSONB,
     error TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. **Workflow runner (event subscriber):**
   ```typescript
   // server/domains/workflow/workflow.runner.ts
   async function handleEvent(event: DomainEvent) {
     const workflows = await findMatchingWorkflows(event.event_type);
     
     for (const workflow of workflows) {
       if (evaluateConditions(workflow.conditions, event)) {
         await executeWorkflow(workflow, event);
       }
     }
   }
   
   async function executeWorkflow(workflow: Workflow, trigger: DomainEvent) {
     const run = await createRun(workflow.id, trigger);
     
     for (const [index, action] of workflow.actions.entries()) {
       try {
         const result = await executeAction(action, run, trigger);
         await recordStepSuccess(run.id, index, result);
       } catch (error) {
         await recordStepFailure(run.id, index, error);
         throw error; // Fail whole workflow on first error
       }
     }
     
     await markRunCompleted(run.id);
   }
   ```
3. **Flagship workflows as definitions:**
   ```typescript
   // server/domains/workflow/definitions/appointment-booked.ts
   export const appointmentBookedWorkflow: WorkflowDefinition = {
     name: 'Appointment Booked → Onboarding',
     trigger: { event_type: 'appointment.booked' },
     actions: [
       {
         type: 'create_entity',
         domain: 'crm',
         entity: 'client',
         parameters: { name: '{{ event.payload.client_name }}' },
       },
       {
         type: 'create_entity',
         domain: 'portal',
         entity: 'portal_user',
         parameters: { client_id: '{{ step[0].result.id }}' },
       },
       {
         type: 'create_entity',
         domain: 'files',
         entity: 'folder',
         parameters: {
           client_id: '{{ step[0].result.id }}',
           template: 'onboarding',
         },
       },
       {
         type: 'create_entity',
         domain: 'projects',
         entity: 'project',
         parameters: {
           client_id: '{{ step[0].result.id }}',
           template: 'onboarding_project',
         },
       },
     ],
   };
   ```

**Effort:** 4-6 weeks (schema + runner + flagship workflows + testing)

### 4. RBAC Enforcement (P1)

### Current State
- ✅ Schema exists: [shared/models/auth.ts](../../../shared/models/auth.ts)
- ❌ Not enforced in routes: All authenticated users have full access
- ❌ No resource-level permissions

**Evidence:**
```typescript
// server/routes.ts (current)
app.get("/api/clients", requireAuth, async (req, res) => {
  const userId = getUserIdFromRequest(req)!;
  const orgId = await getOrCreateOrg(userId);
  const clients = await storage.getClientCompanies(orgId);
  res.json(clients); // No role check
});
```

### Target State
```typescript
// server/routes.ts (target)
app.get("/api/clients", 
  requireAuth,
  requirePermission('clients:read'), // New middleware
  async (req, res) => {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    const clients = await storage.getClientCompanies(orgId);
    res.json(clients);
  }
);

// server/middleware/rbac.ts (new)
function requirePermission(permission: string): RequestHandler {
  return async (req, res, next) => {
    const userId = getUserIdFromRequest(req)!;
    const userPermissions = await getUserPermissions(userId);
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

**Effort:** 2-3 weeks (middleware + permission checks + tests)

### 5. Redis Caching (P1)

### Current State
- ❌ No Redis connection
- ❌ Sessions in-memory (lost on restart)
- ❌ Rate limiting in-memory (per-process only)
- ❌ No data caching

**Evidence:**
- [server/session.ts](../../../server/session.ts): In-memory session store
- [server/security.ts](../../../server/security.ts): In-memory rate limiter

### Target State
1. **Redis connection:**
   ```typescript
   // server/redis.ts (new)
   import { createClient } from 'redis';
   
   export const redis = createClient({
     url: process.env.REDIS_URL || 'redis://localhost:6379',
   });
   
   await redis.connect();
   ```
2. **Session storage:**
   ```typescript
   // server/session.ts (updated)
   import RedisStore from 'connect-redis';
   import { redis } from './redis';
   
   const sessionStore = new RedisStore({ client: redis });
   ```
3. **Rate limiting:**
   ```typescript
   // server/security.ts (updated)
   import { RedisStore as RateLimitRedisStore } from 'rate-limit-redis';
   import { redis } from './redis';
   
   const limiter = rateLimit({
     store: new RateLimitRedisStore({ client: redis }),
     windowMs: 15 * 60 * 1000,
     max: 1000,
   });
   ```
4. **Data caching:**
   ```typescript
   // server/domains/crm/crm.service.ts (example)
   async getClientProfile(clientId: string): Promise<ClientProfile> {
     const cached = await redis.get(`client:${clientId}`);
     if (cached) return JSON.parse(cached);
     
     const profile = await buildClientProfile(clientId);
     await redis.setEx(`client:${clientId}`, 300, JSON.stringify(profile));
     return profile;
   }
   ```

**Effort:** 1-2 weeks (Redis setup + migrate sessions/rate limiting + add caching)

### 6. Object Storage (P1)

### Current State
- ❌ No S3/MinIO integration
- ❌ `fileObjects` table exists but no blob storage
- ❌ No presigned URL generation

**Evidence:**
- [shared/schema.ts](../../../shared/schema.ts#L471-L496): `fileObjects` table
- [server/routes.ts](../../../server/routes.ts): No file upload endpoints yet

### Target State
1. **S3/MinIO client:**
   ```typescript
   // server/storage/s3.ts (new)
   import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
   
   const s3 = new S3Client({
     endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
     region: process.env.S3_REGION || 'us-east-1',
     credentials: {
       accessKeyId: process.env.S3_ACCESS_KEY!,
       secretAccessKey: process.env.S3_SECRET_KEY!,
     },
     forcePathStyle: true, // MinIO requires path-style
   });
   
   export async function uploadFile(bucket: string, key: string, body: Buffer) {
     await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
   }
   
   export async function getPresignedUrl(bucket: string, key: string) {
     const command = new GetObjectCommand({ Bucket: bucket, Key: key });
     return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
   }
   ```
2. **File upload endpoint:**
   ```typescript
   // server/routes.ts (add)
   import multer from 'multer';
   import { uploadFile, getPresignedUrl } from './storage/s3';
   
   const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
   
   app.post("/api/files", requireAuth, upload.single('file'), async (req, res) => {
     const userId = getUserIdFromRequest(req)!;
     const orgId = await getOrCreateOrg(userId);
     const file = req.file!;
     
     const key = `${orgId}/${randomUUID()}-${file.originalname}`;
     await uploadFile('ubos-files', key, file.buffer);
     
     const fileObject = await storage.createFileObject({
       organizationId: orgId,
       uploadedById: userId,
       name: file.originalname,
       originalName: file.originalname,
       mimeType: file.mimetype,
       size: file.size,
       path: key,
     });
     
     res.json(fileObject);
   });
   
   app.get("/api/files/:id/url", requireAuth, async (req, res) => {
     const userId = getUserIdFromRequest(req)!;
     const orgId = await getOrCreateOrg(userId);
     const fileObject = await storage.getFileObject(req.params.id, orgId);
     
     if (!fileObject) return res.status(404).json({ error: 'File not found' });
     
     const url = await getPresignedUrl('ubos-files', fileObject.path);
     res.json({ url });
   });
   ```

**Effort:** 2-3 weeks (S3 client + upload/download + presigned URLs + tests)

---

## Migration Priorities

### Phase 0: Foundation (Weeks 1-8)
**Goal:** Modular domain structure + event-driven base

- [ ] Week 1-2: Create domain folder structure (`server/domains/`)
- [ ] Week 3-4: Migrate storage layer to domain repositories
- [ ] Week 5-6: Implement outbox pattern + dispatcher
- [ ] Week 7-8: Multi-schema Postgres migration
- [ ] **Checkpoint:** Run existing tests, verify no regressions

### Phase 1: Orchestration (Weeks 9-14)
**Goal:** Workflow engine + flagship workflows

- [ ] Week 9-10: Implement workflow schema + runner
- [ ] Week 11-12: Implement flagship workflows (5 workflows from PLAN.md)
- [ ] Week 13-14: Event subscriptions + workflow testing
- [ ] **Checkpoint:** Demonstrate end-to-end workflow execution

### Phase 2: Production Hardening (Weeks 15-22)
**Goal:** RBAC, caching, storage, audit

- [ ] Week 15-16: RBAC enforcement in routes
- [ ] Week 17-18: Redis integration (sessions + rate limiting + caching)
- [ ] Week 19-20: S3/MinIO integration + file uploads
- [ ] Week 21: Audit log coverage (all mutations)
- [ ] Week 22: Structured logging + correlation IDs
- [ ] **Checkpoint:** Security audit, load testing

### Phase 3: Integrations (Weeks 23-36)
**Goal:** External integrations (email, ledger, e-sign)

- [ ] Week 23-26: Email sync (OAuth + background jobs)
- [ ] Week 27-30: Ledger integration (QBO/Xero stubs + sync)
- [ ] Week 31-33: E-sign integration (DocuSign/etc + webhooks)
- [ ] Week 34-36: Global search (Postgres baseline)
- [ ] **Checkpoint:** Integration health dashboard

### Phase 4: Observability & Scale (Weeks 37-40)
**Goal:** Metrics, tracing, graceful shutdown

- [ ] Week 37-38: Prometheus metrics + `/metrics` endpoint
- [ ] Week 39: OpenTelemetry tracing
- [ ] Week 40: Graceful shutdown + health endpoints
- [ ] **Checkpoint:** Production readiness review

**Total timeline:** 40 weeks (~10 months)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Breaking existing features** | High | High | Comprehensive test coverage + feature flags |
| **Database migration downtime** | Medium | High | Blue-green schema migration + backward compatibility |
| **Performance regression** | Medium | Medium | Load testing at each checkpoint |
| **Scope creep** | High | Medium | Strict adherence to P0/P1/P2 priorities |
| **Integration complexity** | Medium | Medium | Start with stubs, iterate based on user feedback |

---

## Success Criteria

### Phase 0 (Foundation)
- [ ] All existing API endpoints work with modular domain structure
- [ ] All existing tests pass
- [ ] Outbox dispatcher delivers events reliably
- [ ] No cross-domain imports detected by architecture tests

### Phase 1 (Orchestration)
- [ ] 5 flagship workflows execute end-to-end
- [ ] Workflow runs are idempotent (can be replayed)
- [ ] Dead-letter queue captures failed events

### Phase 2 (Production Hardening)
- [ ] RBAC enforced on all sensitive endpoints
- [ ] Sessions survive server restart (Redis)
- [ ] Files upload to S3/MinIO and generate presigned URLs
- [ ] All mutations logged to activity timeline

### Phase 3 (Integrations)
- [ ] Email sync creates threads/messages
- [ ] Invoices sync to QuickBooks/Xero
- [ ] Contracts trigger e-signature flows
- [ ] Global search returns cross-domain results

### Phase 4 (Observability & Scale)
- [ ] Prometheus metrics exported
- [ ] Distributed tracing enabled
- [ ] Graceful shutdown drains requests
- [ ] Application scales horizontally

---

**Navigation:**
- [CURRENT_ARCHITECTURE_OVERVIEW.md](../10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md): Current state
- [TARGET_ARCHITECTURE.md](../00_plan_intent/TARGET_ARCHITECTURE.md): Target state
- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md): Detailed migration steps
- [EVIDENCE_MAP.md](./EVIDENCE_MAP.md): Code references for each gap

**Last verified by:** Manual code inspection + PLAN.md review
