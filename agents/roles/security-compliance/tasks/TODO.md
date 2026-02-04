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

