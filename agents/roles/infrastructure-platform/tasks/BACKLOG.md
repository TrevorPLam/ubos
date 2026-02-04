# Project Backlog

<!--
SYSTEM INSTRUCTIONS â€” BACKLOG.md (agent-enforced)

Purpose: Storage of unscheduled tasks. Agent replenishes TODO.md from here.

Canonical workflow + templates live in: TASKS.md

Global Rules:
1) All tasks MUST follow this header format:
   ### # [id:...][type:...][priority:...][component:...] Title
2) Task blocks MUST be wrapped with:
   ## task_begin
   ## task_end
3) Grouping rules (for deterministic batching):
   - Tasks are grouped using:
     ## group_begin [type:X][priority:Y]
     ## group_end
   - When replenishing TODO.md:
     a) Select ONE group only (single type).
     b) Take up to 5 tasks in listed order.
     c) MOVE tasks to TODO.md (copy then delete from BACKLOG.md).
4) Agent MUST NOT rewrite task content except to:
   - normalize formatting
   - fix obvious tag typos
   - add missing fields if absent
5) Do NOT reorder tasks inside a group.
6) REQUIRED FIELDS (per TASKS.md):
   - **Plan:** Minimum 3 numbered implementation steps
   - **Estimated Effort:** Time estimate (hours/days/weeks)
   - **Relevant Documentation:** Links to /docs/ files with context
   - If a task is missing these, it is incomplete and should not be promoted to TODO.md
-->

## group_begin [type:security][priority:critical]
## ðŸ” Security â€” CRITICAL (Production Blockers)

<!-- Tasks TASK-20260204-001, TASK-20260204-002, TASK-20260204-003 moved to TODO.md on 2026-02-04 -->

## group_end

## group_begin [type:config][priority:critical]
## ðŸ§° Config & Tooling â€” CRITICAL


## group_end

## group_begin [type:infra][priority:high]
## ðŸ³ Infrastructure (Unscheduled) â€” High

## task_begin
### # [id:TASK-20260203-004][type:infra][priority:high][component:server] Implement Stage 0 foundation - Identity module
**Status:** todo  
**Description:** Implement identity domain module with tenant management, users, RBAC, sessions, and OIDC readiness.  
**Acceptance Criteria:**  
- [ ] Identity domain module with separate schema
- [ ] Tenant management with tenant_id everywhere
- [ ] User management with RBAC system
- [ ] Session management and authentication
- [ ] OIDC-ready configuration
- [ ] Database migrations for identity schema
**Relevant Files:** `src/identity/**/*`, identity migrations, auth system
**Relevant Documentation:** `docs/architecture/20_decisions/` â€” Modular monolith architecture, `docs/data/20_entities/User.md` â€” User entity schema, `docs/data/20_entities/Organization.md` â€” Tenant organization schema, `docs/architecture/30_cross_cutting/AUTH_AND_SESSION.md` â€” Authentication architecture, `docs/security/10-controls/authentication.md` â€” Auth requirements
**Plan:**  
1. Create identity domain module structure
2. Design and implement tenant (Organization) schema with migrations
3. Design and implement User schema with RBAC fields
4. Implement OrganizationMember association table
5. Create authentication service with session management
6. Add OIDC configuration scaffolding
7. Implement tenant isolation middleware
8. Write unit tests for auth and RBAC
9. Write integration tests for multi-tenant scenarios
10. Document identity module in docs/architecture/
**Estimated Effort:** 4-6 weeks
## task_end

## task_begin
### # [id:TASK-20260203-005][type:infra][priority:high][component:server] Implement Stage 0 foundation - Core infrastructure
**Status:** todo  
**Description:** Implement core infrastructure including application shell, database migrations, outbox pattern, timeline, and workflow skeleton.  
**Acceptance Criteria:**  
- [ ] Application shell framework for modular monolith
- [ ] Database migration system with domain schemas
- [ ] Outbox table + dispatcher worker implementation
- [ ] Timeline (activity_event append-only) system
- [ ] Workflow engine skeleton with triggers/conditions/actions
- [ ] Docker compose setup (postgres, redis, minio)
**Relevant Files:** `src/core/**/*`, infrastructure, docker-compose.yml
**Relevant Documentation:** `docs/architecture/20_decisions/` â€” Domain-driven design decisions, `docs/data/10_current_state/DATA_FLOWS.md` â€” Outbox pattern for events, `docs/data/20_entities/ActivityEvent.md` â€” Timeline schema, `docs/architecture/10_current_state/BUILD_AND_TOOLING.md` â€” Build system, `PLAN.md` â€” Overall system architecture
**Plan:**  
1. Create application shell with domain module registration
2. Implement database migration system (Drizzle)
3. Create domain schema structure (identity, core, crm, etc.)
4. Implement outbox table schema
5. Create outbox dispatcher worker
6. Implement timeline (ActivityEvent) append-only table
7. Create workflow engine skeleton (trigger/condition/action DSL)
8. Create docker-compose.yml with postgres, redis, minio
9. Write infrastructure tests
10. Document core patterns in docs/architecture/
**Estimated Effort:** 6-8 weeks
## task_end

## group_end

## group_begin [type:dev][priority:high]
## ðŸš€ Development (Unscheduled) â€” High




## group_end

## group_begin [type:dev][priority:medium]
## ðŸš€ Development (Unscheduled) â€” Medium




## group_end

## group_begin [type:quality][priority:medium]
## âœ… Code Quality (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:high]
## ðŸ” Security â€” HIGH


---


---


---


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security â€” MEDIUM


---


---


---


---


---


---


## group_end

## group_begin [type:quality][priority:high]
## âœ… Code Quality (Unscheduled) â€” High

## group_end

## group_begin [type:ci][priority:high]
## ðŸ§ª CI (Unscheduled) â€” High

## group_end

## group_begin [type:test][priority:high]
## ðŸ§± Testing (Unscheduled) â€” High

## group_end

## group_begin [type:devex][priority:medium]
## ðŸ§­ Developer Experience (Unscheduled) â€” Medium


## group_end

## group_begin [type:security][priority:medium]
## ðŸ” Security & Governance (Unscheduled) â€” Medium


---


## group_end

## group_begin [type:docs][priority:high]
## ðŸ“š Documentation â€” HIGH


---


---


---


---


---


---


---


---


---


---


---


---


---


## group_end

## group_begin [type:docs][priority:medium]
## ðŸ“š Documentation â€” MEDIUM (P1 Remaining)


---


---


## group_end

## group_begin [type:docs][priority:low]
## ðŸ“š Documentation â€” LOW (P2 "Wise Extras")


---


---


---


## group_end

## group_begin [type:ci][priority:medium]
## ðŸ§ª CI (Unscheduled) â€” Medium

## group_end

## group_begin [type:reliability][priority:low]
## ðŸ›¡ï¸ Reliability (Unscheduled) â€” Low


## group_end

## group_begin [type:release][priority:low]
## ðŸ·ï¸ Release Management (Unscheduled) â€” Low


## group_end

## group_begin [type:infra][priority:low]
## ðŸ³ Infrastructure (Unscheduled) â€” Low

## task_begin
### # [id:TASK-20260203-019][type:infra][priority:low][component:dev] Add Docker + compose for local Postgres
**Status:** todo  
**Description:** Provide an optional containerized local environment for consistent onboarding.
**Acceptance Criteria:**  
- [ ] Dockerfile and/or `docker-compose.yml` exist for local dev
- [ ] Compose provisions Postgres with a documented `DATABASE_URL`
- [ ] README includes steps to use containers
**Relevant Files:** `Dockerfile`, `docker-compose.yml`, `README.md`
**Relevant Documentation:** `docs/architecture/50_deployment/DEPLOYMENT.md` â€” Deployment architecture, `docs/architecture/10_current_state/CONFIGURATION_MODEL.md` â€” Environment variables
**Plan:**  
1. Create Dockerfile for application
2. Create docker-compose.yml with postgres, redis, minio
3. Configure DATABASE_URL and other env vars
4. Add volume mounts for development
5. Document Docker setup in README
6. Test local development with Docker
**Estimated Effort:** 2-3 hours
## task_end

## group_end

## group_begin [type:config][priority:low]
## ðŸ§° Config & Tooling (Unscheduled) â€” Low


## group_end

