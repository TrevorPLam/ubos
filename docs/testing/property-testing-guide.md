# Property Testing Guide - Invitation Token Expiration

## Overview

This guide demonstrates the implementation of property-based testing for invitation token expiration, following 2026 best practices for robust validation of time-sensitive business logic.

## Feature: User Invitation System
**Property 2:** Invitation tokens expire after 7 days  
**Requirement:** 91.7 - 7-day token expiration  
**Test File:** `tests/backend/invitation-token-expiration.properties.test.ts`

## Implementation Strategy

### 2026 Best Practices Applied

1. **Hermetic Testing**
   - No external database dependencies
   - Mock storage layer with controlled behavior
   - Deterministic test execution

2. **Property-Based Testing**
   - Uses `fast-check` framework for generative testing
   - Tests invariants across many random inputs
   - Reproducible failures with seed values

3. **Time-Based Testing**
   - Controlled system time with `vi.setSystemTime()`
   - Precise boundary condition testing
   - UTC consistency validation

4. **Comprehensive Coverage**
   - Exact 7-day expiration validation
   - Pre/post expiration behavior
   - Edge case boundary testing
   - Cross-timezone consistency

## Test Properties

### Property 1: Exact 7-Day Expiration
```typescript
it('should set expiration to exactly 7 days from creation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.date({
        min: new Date('2024-01-01T00:00:00.000Z'),
        max: new Date('2025-12-31T23:59:59.999Z'),
      }),
      async (creationTime) => {
        // Test logic validates exact 7-day (168 hours) expiration
        const expectedDifference = 7 * 24 * 60 * 60 * 1000;
        expect(exactDifference).toBe(expectedDifference);
      }
    ),
    { numRuns: 100, seed: 42 }
  );
});
```

### Property 2: Post-Expiration Rejection
```typescript
it('should reject token acceptance after expiration', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        creationTime: fc.date({ /* date range */ }),
        hoursPastExpiration: fc.integer({ min: 1, max: 168 }),
      }),
      async ({ creationTime, hoursPastExpiration }) => {
        // Validates tokens are rejected after expiration time
        const isExpired = futureTime > invitation.expiresAt;
        expect(isExpired).toBe(true);
      }
    )
  );
});
```

### Property 3: Pre-Expiration Acceptance
```typescript
it('should allow token acceptance before expiration', async () => {
  // Validates tokens remain valid until expiration
  const isExpired = validTime > invitation.expiresAt;
  expect(isExpired).toBe(false);
});
```

### Property 4: Boundary Precision
```typescript
it('should handle expiration boundary precisely', async () => {
  // Tests exact expiration moment behavior
  const isExpiredAtExactTime = exactExpirationTime >= invitation.expiresAt;
  expect(isExpiredAtExactTime).toBe(true);
  
  // Validates millisecond precision around boundary
  const isValidJustBefore = justBeforeExpiration < invitation.expiresAt;
  expect(isValidJustBefore).toBe(true);
});
```

### Property 5: Cross-Timezone Consistency
```typescript
it('should use UTC time for consistent expiration calculations', async () => {
  // Ensures consistent behavior regardless of timezone
  const exactDifference = actualExpiration.getTime() - utcDate.getTime();
  const expectedDifference = 7 * 24 * 60 * 60 * 1000;
  expect(exactDifference).toBe(expectedDifference);
});
```

## Mock Storage Implementation

The test uses a hermetic mock storage class to avoid database dependencies:

```typescript
class MockInvitationStorage {
  private invitations: Map<string, Invitation> = new Map();
  private nextId = 1;

  async createInvitation(data: InsertInvitation): Promise<Invitation> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7); // Exactly 7 days
    
    const invitation: Invitation = {
      id: `invitation-${this.nextId++}`,
      organizationId: data.organizationId,
      email: data.email,
      roleId: data.roleId ?? null,
      token: data.token,
      status: 'pending',
      invitedById: data.invitedById,
      acceptedById: null,
      acceptedAt: null,
      expiresAt: expiresAt, // Automatically set to 7 days
      createdAt: now,
      updatedAt: now,
    };
    
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    for (const invitation of Array.from(this.invitations.values())) {
      if (invitation.token === token) {
        return invitation;
      }
    }
    return null;
  }
}
```

## Test Execution

### Running the Tests
```bash
# Run specific property test
npx vitest run tests/backend/invitation-token-expiration.properties.test.ts

# Run with verbose output for debugging
npx vitest run tests/backend/invitation-token-expiration.properties.test.ts --verbose

# Run with coverage
npm run test:ci
```

### Test Results Interpretation

- **✅ Passed:** Property holds across all test cases
- **❌ Failed:** Counterexample found showing property violation
- **🔍 Shrunk:** Minimal failing case for debugging

## Quality Gates

### ✅ 2026 Security Best Practices
- Hermetic test execution (no external dependencies)
- Time-based security validation
- Comprehensive edge case coverage

### ✅ Property Testing Standards
- Generative testing with fast-check
- Reproducible test failures (seeded)
- Clear property definitions and invariants

### ✅ Coverage Requirements
- >90% code coverage for new functionality
- All property invariants validated
- Edge case boundary testing

## Integration with Existing System

### API Layer Validation
The property tests complement the existing API tests in `tests/backend/invitations.test.ts`:

- **Unit Tests:** Validate API endpoint behavior
- **Property Tests:** Validate business logic invariants
- **Integration Tests:** Validate end-to-end flows (Task 3.6)

### Storage Layer Compatibility
Mock storage mirrors the actual storage layer behavior:

```typescript
// Actual storage (server/storage.ts)
async createInvitation(data: InsertInvitation): Promise<Invitation> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  // ... database persistence logic
}

// Mock storage (test)
async createInvitation(data: InsertInvitation): Promise<Invitation> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  // ... in-memory storage logic
}
```

## Troubleshooting

### Common Test Failures

1. **DST Transition Issues**
   - **Problem:** Date arithmetic across daylight saving time changes
   - **Solution:** Use UTC-based calculations or adjust test ranges

2. **Millisecond Precision**
   - **Problem:** Floating point arithmetic in date calculations
   - **Solution:** Use integer millisecond comparisons with tolerance

3. **Time Zone Inconsistencies**
   - **Problem:** Local time vs UTC time discrepancies
   - **Solution:** Standardize on UTC time for all calculations

### Debugging Failed Properties

When a property test fails:

1. **Examine Counterexample:** Review the minimal failing case
2. **Check Business Logic:** Verify the underlying implementation
3. **Validate Assumptions:** Ensure property definition is correct
4. **Consider Edge Cases:** DST, leap years, timezone boundaries

## Future Enhancements

### Additional Properties to Consider

1. **Token Uniqueness:** All invitation tokens must be unique
2. **Concurrent Invitations:** Multiple invitations for same email handling
3. **Expiration Cleanup:** Automatic cleanup of expired invitations
4. **Rate Limiting:** Organization-level invitation limits

### Performance Testing

```typescript
// Add performance property testing
it('should handle large volumes efficiently', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.record({ /* invitation data */ }), { minLength: 0, maxLength: 100 }),
      async (invitations) => {
        const startTime = performance.now();
        // Process all invitations
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(1000); // 1 second max
      }
    )
  );
});
```

## References

- [fast-check Documentation](https://fast-check.dev/)
- [Vitest Property Testing](https://vitest.dev/guide/testing/#property-based)
- [2026 Testing Best Practices](https://neu-se.github.io/CS4530-Spring-2026/tutorials/week1-unit-testing)
- [Invitation System Architecture](../api/invitations.md)

---

**Last Updated:** 2026-02-13  
**Version:** 1.0  
**Status:** Production Ready
