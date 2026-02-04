# Testing Guide for UBOS

This document provides comprehensive information about the testing infrastructure and patterns used in the UBOS repository.

## Test Framework: Vitest

We use **Vitest** as our test framework for the following reasons:

1. **Native ESM + TypeScript Support**: Seamlessly works with our Vite-based build system
2. **Unified Tooling**: Same transformation pipeline for frontend and backend tests
3. **Performance & DX**: Fast startup, HMR-like test re-runs, excellent watch mode

## Test Structure

```
ubos/
├── client/src/                 # Frontend source code
│   ├── **/*.test.ts(x)         # Frontend unit tests (co-located)
│   ├── hooks/                  # React hooks tests
│   ├── lib/                    # Utility function tests
│   └── components/             # Component tests
├── server/                     # Backend source code
│   └── **/*.test.ts            # Backend unit tests (co-located)
├── shared/                     # Shared code
│   └── **/*.test.ts            # Schema validation tests
└── tests/                      # Test infrastructure
    ├── setup/                  # Test setup files
    ├── utils/                  # Test utilities
    ├── fixtures/               # Test fixtures and factories
    ├── backend/                # Backend integration tests
    ├── frontend/               # Frontend integration tests
    └── integration/            # End-to-end integration tests
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:ui             # Run tests with UI
```

### Backend Tests Only
```bash
npm run test:backend        # Server, shared, and integration tests
```

### Frontend Tests Only
```bash
npm run test:frontend       # Client component and hook tests
```

### With Coverage
```bash
npm run coverage            # Run tests with coverage report
npm run test:ci             # CI mode (includes coverage)
```

## Test Categories

### 1. Schema Validation Tests (`shared/schema.test.ts`)
- **28 tests** covering all entity insert schemas
- Validates Zod schemas for all database entities
- Tests enum validation, required fields, optional fields
- Coverage: Organizations, Clients, Contacts, Deals, Proposals, Contracts, Engagements, Projects, Tasks, Invoices, Bills, Vendors, Threads, Messages

### 2. Utility Function Tests
- **`lib/utils.test.ts`**: Tests for `cn()` function (9 tests)
  - Class name combining and merging
  - Tailwind class conflict resolution
  - Conditional classes
- **`lib/auth-utils.test.ts`**: Authentication utilities (9 tests)
  - Error detection
  - Login redirection logic

### 3. React Hook Tests
- **`hooks/use-mobile.test.tsx`**: Mobile detection hook (7 tests)
  - Breakpoint detection (768px)
  - Resize event handling
  - Cleanup on unmount

### 4. Component Tests
- **`components/status-badge.test.tsx`**: Status badge component (25 tests)
  - All status types (deals, proposals, contracts, projects, tasks, invoices)
  - Priority levels
  - Styling and theming
  - Fallback behavior
- **`components/empty-state.test.tsx`**: Empty state component (8 tests)
  - Icon rendering
  - Action button support
  - Layout classes
- **`components/stat-card.test.tsx`**: Stat card component (18 tests)
  - Value display
  - Trend indicators
  - Icon support
  - Edge cases

### 5. Backend Middleware Tests (`tests/backend/auth-middleware.test.ts`)
- **11 tests** for authentication and authorization
- Tests for `requireAuth` middleware
- Organization resolution
- Multi-tenant scoping

### 6. Backend API Route Tests (`tests/backend/api-routes.test.ts`)
- **15 tests** for API route patterns
- CRUD operations (clients example)
- Error handling (400, 404, 500)
- Response formatting
- Query parameters and pagination

## Test Utilities

### Test Factories (`tests/fixtures/factories.ts`)
Generate consistent test data for all entities:

```typescript
import { factories } from '@/tests/fixtures/factories';

// Create test organization
const org = factories.organization({ name: 'Test Org' });

// Create test client company
const client = factories.clientCompany('org-123', {
  name: 'ACME Corp',
  status: 'active',
});

// Create test deal
const deal = factories.deal('org-123', {
  name: 'Big Deal',
  stage: 'proposal',
  value: '50000.00',
});
```

### Express Mocks (`tests/utils/express-mocks.ts`)
Test Express middleware and routes without a server:

```typescript
import { mockRequest, mockResponse, mockNext } from '@/tests/utils/express-mocks';

const req = mockRequest({
  body: { name: 'Test' },
  params: { id: '123' },
  user: { id: 'user-123' },
  orgId: 'org-123',
});

const res = mockResponse();
const next = mockNext();

// Test your middleware/handler
myMiddleware(req, res, next);

// Assert
expect(next.called).toBe(true);
expect(res.statusCode).toBe(200);
expect(res.body).toEqual({ success: true });
```

### React Test Utilities (`tests/utils/react-test-utils.tsx`)
Render components with necessary providers:

```typescript
import { renderWithProviders } from '@/tests/utils/react-test-utils';

const { getByText, queryClient } = renderWithProviders(
  <MyComponent />,
  { initialRoute: '/clients' }
);
```

## Writing New Tests

### 1. Co-locate Tests with Source Code
Place test files next to the code they test:
- Frontend: `client/src/components/my-component.test.tsx`
- Backend: `server/my-service.test.ts`
- Shared: `shared/my-module.test.ts`

### 2. Use Test Factories
Always use factories from `tests/fixtures/factories.ts` for consistent test data:

```typescript
// ✅ Good
const client = factories.clientCompany('org-123');

// ❌ Avoid
const client = { id: 'test-id', name: 'Test', ... };
```

### 3. Follow AAA Pattern
Arrange, Act, Assert:

```typescript
it('should create a new client', () => {
  // Arrange
  const orgId = 'org-123';
  const clientData = factories.clientCompany(orgId);
  
  // Act
  const result = createClient(clientData);
  
  // Assert
  expect(result.id).toBeDefined();
  expect(result.name).toBe(clientData.name);
});
```

### 4. Test Descriptions
Use clear, descriptive test names:

```typescript
// ✅ Good
it('should return 404 when client does not exist', () => {});
it('should filter clients by organization ID', () => {});

// ❌ Avoid
it('works', () => {});
it('test1', () => {});
```

### 5. Component Testing Best Practices
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle button click', async () => {
  const user = userEvent.setup();
  render(<MyButton onClick={mockFn} />);
  
  await user.click(screen.getByRole('button'));
  
  expect(mockFn).toHaveBeenCalled();
});
```

## Coverage Goals

### Current Coverage (as of implementation)
- **Backend**: 54 tests passing
- **Frontend**: 76 tests passing
- **Total**: 130 tests passing

### Target Coverage
- **Storage layer**: 80%+
- **API routes**: 70%+ (all critical paths)
- **Shared utilities**: 80%+
- **Frontend hooks**: 80%+
- **Critical components**: 70%+

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

### CI Workflow Steps
1. Install dependencies
2. Run linter (`npm run lint`)
3. Run type checking (`npm run check`)
4. Run all tests (`npm test`)
5. Generate coverage report
6. Build application

### Workflow File
See `.github/workflows/test.yml` for the full CI configuration.

## Common Testing Patterns

### Testing Multi-Tenant Isolation
```typescript
it('should only return data for the correct organization', () => {
  const req = mockRequest({ orgId: 'org-123' });
  const allData = [
    { id: '1', organizationId: 'org-123', name: 'Item 1' },
    { id: '2', organizationId: 'org-456', name: 'Item 2' },
  ];
  
  const filtered = allData.filter(d => d.organizationId === req.orgId);
  
  expect(filtered).toHaveLength(1);
  expect(filtered[0].id).toBe('1');
});
```

### Testing Enum Validation
```typescript
it('should validate all status values', () => {
  const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
  
  validStatuses.forEach(status => {
    const data = { ...baseData, status };
    expect(() => schema.parse(data)).not.toThrow();
  });
});
```

### Testing Error Handling
```typescript
it('should return 400 for invalid data', () => {
  const req = mockRequest({ body: { invalid: 'data' } });
  const res = mockResponse();
  
  handler(req, res);
  
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBeDefined();
});
```

## Troubleshooting

### Tests Not Running
1. Check that Vitest is installed: `npm list vitest`
2. Verify test file naming: `*.test.ts` or `*.test.tsx`
3. Check Vitest config paths

### Import Errors
1. Verify path aliases in `vitest.config.ts` match `tsconfig.json`
2. Check that `@/` and `@shared/` resolve correctly
3. Use absolute paths for test utils: `../../tests/utils/...`

### Mock Issues
1. Use `vi.fn()` for function mocks
2. Clear mocks between tests with `vi.clearAllMocks()`
3. Check that mocks are applied before imports

### DOM/Browser Errors
1. Verify `environment: 'happy-dom'` in frontend config
2. Check that `@testing-library/jest-dom` is imported in setup
3. Mock `window.matchMedia` and `IntersectionObserver` in setup

## Future Improvements

### Short-term
- [ ] Add database integration tests with test containers
- [ ] Add API integration tests with supertest
- [ ] Increase coverage for storage layer
- [ ] Add E2E tests with Playwright

### Medium-term
- [ ] Set up visual regression testing
- [ ] Add performance benchmarks
- [ ] Implement mutation testing
- [ ] Add contract testing for API

### Long-term
- [ ] Add property-based testing
- [ ] Implement chaos engineering tests
- [ ] Add security scanning in CI
- [ ] Set up automated accessibility testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/guides/testing)

## Questions or Issues?

If you encounter issues with tests or need help writing new tests:
1. Check this documentation
2. Review existing test files for examples
3. Ask in team chat or open an issue
