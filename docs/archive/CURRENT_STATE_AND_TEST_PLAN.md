# Current State Analysis & Test Plan

**Date**: 2026-02-04  
**Analyst**: Principal Staff Engineer

---

## Current State Report

### Repository Overview
- **Name**: UBOS (Unified Business Ops Suite)
- **Architecture**: Modular monolith with strict domain boundaries
- **Tech Stack**: Node.js/Express + React + TypeScript + Drizzle ORM + PostgreSQL
- **Package Manager**: npm (not pnpm as PLAN.md specifies - discrepancy noted)
- **Build Tools**: Vite (frontend), ESBuild (backend)

### Code Structure
```
ubos/
├── client/           # React SPA (Vite + TypeScript)
├── server/           # Express API (6 files, ~2,000 LOC)
├── shared/           # Shared schema + types (Drizzle ORM)
├── script/           # Build scripts
├── docs/             # Documentation
└── tasks/            # Task tracking
```

### Key Architectural Patterns Identified

#### 1. Multi-Tenant Design
- Every entity has `organizationId` for tenant isolation
- Storage layer enforces org scoping on all CRUD operations
- Cookie-based auth (dev mode) with organization auto-creation

#### 2. Domain Modules (Schema-Based)
- **Identity**: users, organizations, organization_members
- **CRM**: client_companies, contacts, deals
- **Agreements**: proposals, contracts
- **Projects**: engagements, projects, tasks, milestones
- **Financial**: invoices, bills, vendors, payments
- **Communication**: threads, messages
- **Files**: file_objects
- **Audit**: activity_events

#### 3. Data Access Pattern
- Storage layer (`server/storage.ts`) acts as repository pattern
- All DB access through Drizzle ORM (no raw SQL)
- Consistent interface for CRUD with org scoping

#### 4. Type Safety
- Shared TypeScript types between client and server
- Zod schemas for runtime validation
- Drizzle-generated types for DB entities

### Testing State: **ZERO TESTS**

#### No Test Framework Installed
- ❌ No test runner (Jest/Vitest/etc.)
- ❌ No test files (`*.test.ts`, `*.spec.ts`)
- ❌ No test configuration
- ❌ No test scripts in package.json
- ❌ No CI/CD pipeline
- ❌ No test utilities or factories

#### Build/Lint Tooling Present
- ✅ TypeScript strict mode enabled
- ✅ ESLint configured
- ✅ Prettier configured
- ✅ Build scripts (dev, build, start)
- ✅ Type checking (`npm run check`)

### Testing Challenges Identified

#### Backend Testing Needs
1. **Database-dependent code**: Storage layer requires real/mock DB
2. **Multi-tenant isolation**: Critical to test org scoping
3. **Authentication middleware**: Need to mock/stub auth
4. **API routes**: Integration testing with request/response validation

#### Frontend Testing Needs
1. **React Query integration**: Need to mock API calls
2. **Route-based code splitting**: Test lazy-loaded components
3. **Form validation**: Zod schema testing
4. **Theme/auth context**: Context provider mocking

#### Code Testability Assessment
- **Good**: 
  - Clean separation of concerns (storage layer)
  - Type-safe interfaces
  - Minimal dependencies in storage methods
  
- **Needs Improvement**:
  - No dependency injection (DB connection hardcoded)
  - Routes directly instantiate storage (no DI)
  - No test seams in middleware

---

## Test Framework Selection: **Vitest**

### Justification (3 Bullets as Required)

1. **Native ESM + TypeScript Support**: Vitest works seamlessly with the existing Vite-based build system and supports ESM modules natively, eliminating the complex Jest ESM configuration overhead. The repo already uses `"type": "module"` and Vite, making Vitest the natural choice.

2. **Unified Tooling**: Uses the same Vite config transformation pipeline for both frontend and backend tests, reducing configuration complexity and ensuring consistent module resolution (especially for path aliases like `@/` and `@shared/*`). This aligns with the monorepo structure.

3. **Performance & DX**: Vitest provides instant HMR-like test re-runs, better watch mode, and faster startup times compared to Jest. Its API is Jest-compatible, minimizing learning curve while offering superior performance for TypeScript-heavy codebases.

### Alternative Considered: Jest
- **Rejected because**: Requires additional configuration for ESM + TypeScript, slower for large codebases, separate build pipeline from Vite, more complex setup for path aliases.

---

## Prioritized Test Plan

### Priority 1: Foundation (P0 - Critical Path)
**Goal**: Establish test infrastructure and validate core business logic

1. **Test Infrastructure Setup**
   - Install Vitest + testing utilities (@vitest/ui, @testing-library/react)
   - Create vitest.config.ts (backend/shared tests)
   - Create vitest.config.client.ts (frontend tests)
   - Set up test utilities (factories, mocks, helpers)

2. **Storage Layer Unit Tests** (Highest ROI)
   - Multi-tenant scoping validation (critical security concern)
   - CRUD operations for each entity type
   - Edge cases (non-existent org, missing data)
   - Test with in-memory SQLite or mock DB

3. **Schema Validation Tests**
   - Zod schema validation for all entity types
   - Insert schema edge cases
   - Enum validation

### Priority 2: API Contract Tests (P1 - High Value)
**Goal**: Ensure API contracts are stable

4. **API Route Integration Tests**
   - Authentication endpoints (login, logout, user info)
   - CRM endpoints (clients, contacts, deals)
   - Project endpoints (engagements, projects, tasks)
   - Financial endpoints (invoices, bills)
   - Error handling (401, 403, 404, 500)

5. **Authentication/Authorization Tests**
   - requireAuth middleware behavior
   - Organization resolution
   - User-to-org mapping

### Priority 3: Frontend Core (P1 - High Value)
**Goal**: Test reusable UI logic and critical paths

6. **Custom Hooks Tests**
   - useAuth hook
   - useMobile hook
   - useTheme hook

7. **Utility Function Tests**
   - lib/utils.ts functions
   - Date formatting helpers
   - Form validation helpers

8. **Critical UI Components**
   - DataTable component
   - Form components
   - Status badges

### Priority 4: Integration & Workflows (P2 - Medium Value)
**Goal**: Test user-facing workflows end-to-end

9. **Page Component Tests**
   - Dashboard data aggregation
   - Client CRUD flow
   - Project creation flow

10. **Frontend API Integration**
    - React Query integration
    - Error boundary handling
    - Loading states

### Priority 5: Smoke Tests (P2 - Coverage Baseline)
**Goal**: Minimal tests for every module

11. **Package Smoke Tests**
    - Each page renders without crashing
    - Each API route responds (even if 401)
    - Each storage method is callable

### Priority 6: CI/CD (P2 - DevOps)
**Goal**: Automate testing in pipeline

12. **GitHub Actions Workflow**
    - Run tests on PR
    - Run linting + type checking
    - Generate coverage report
    - Fail PR if tests fail

---

## Implementation Strategy

### Phase 1: Setup (Est: 1-2 hours)
- Install Vitest dependencies
- Create configuration files
- Add test scripts to package.json
- Create test utilities directory

### Phase 2: Backend Core (Est: 3-4 hours)
- Write storage layer tests
- Write schema validation tests
- Create DB test fixtures

### Phase 3: API Layer (Est: 3-4 hours)
- Write API route tests
- Write auth middleware tests
- Mock Express req/res objects

### Phase 4: Frontend Core (Est: 2-3 hours)
- Write hook tests
- Write utility tests
- Write component tests

### Phase 5: Integration (Est: 2-3 hours)
- Write page tests
- Write API integration tests
- Write routing tests

### Phase 6: CI (Est: 1 hour)
- Create GitHub Actions workflow
- Configure coverage reporting
- Add status badges

**Total Estimated Time**: 12-17 hours

---

## Success Criteria

### Minimum Acceptable Coverage
- **Storage layer**: 80%+ coverage
- **API routes**: 70%+ coverage (all critical paths)
- **Shared utilities**: 80%+ coverage
- **Frontend hooks**: 80%+ coverage

### Quality Gates
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Coverage reports generated
- ✅ CI pipeline runs successfully

### Non-Breaking Requirement
- ✅ Existing functionality unchanged
- ✅ Build process unaffected
- ✅ Development workflow intact
- ✅ No production code changes (except minimal seams if needed)

---

## Test Tooling Choices

### Core Testing Stack
- **Test Runner**: Vitest 2.x
- **Assertion Library**: Vitest built-in (expect)
- **React Testing**: @testing-library/react + @testing-library/user-event
- **HTTP Mocking**: msw (Mock Service Worker) for API mocks
- **DB Testing**: In-memory SQLite via better-sqlite3 OR Drizzle mock

### Test Utilities to Create
- **Factories**: Generate test data for all entities
- **Test DB**: Setup/teardown helpers for DB tests
- **Mock Express**: Request/response helpers
- **Mock Auth**: requireAuth middleware mock
- **Test Providers**: React context wrapper for testing

---

## Risks & Mitigations

### Risk 1: Database Testing Complexity
- **Mitigation**: Use in-memory SQLite for fast tests OR create mock storage interface

### Risk 2: Multi-tenant Isolation Bugs
- **Mitigation**: Extensive test coverage on org scoping in storage layer

### Risk 3: Breaking Existing Build
- **Mitigation**: Run `npm run build` after every change; keep test files separate

### Risk 4: Slow Test Execution
- **Mitigation**: Use Vitest's parallel execution; minimize DB setup/teardown

---

## Next Steps

1. ✅ Complete this analysis document
2. ⏳ Install Vitest and dependencies
3. ⏳ Create test configurations
4. ⏳ Set up test utilities
5. ⏳ Begin Priority 1 tests (storage layer)
6. ⏳ Iterate through priorities 2-6
7. ⏳ Set up CI/CD pipeline
8. ⏳ Document test patterns for maintainers
