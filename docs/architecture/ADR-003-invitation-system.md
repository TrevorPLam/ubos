# ADR-003: Invitation System Architecture

## Status
Accepted

## Date
2026-02-13

## Authors
Development Team

## Context

The UBOS platform requires a secure, scalable user invitation and onboarding system that supports:
- Role-based invitation with automatic assignment
- Bulk invitation processing for team onboarding
- Secure token-based acceptance workflow
- Rate limiting and security controls
- Comprehensive audit trail for compliance

Existing authentication patterns use cookie-based sessions, and the RBAC system provides role management. We need to integrate invitations into this existing architecture while following 2026 security best practices.

## Decision

We will implement a comprehensive invitation system with the following architectural decisions:

### 1. Token-Based Invitation Flow

**Decision**: Use cryptographically secure UUID v4 tokens with 7-day expiration.

**Rationale**:
- UUID v4 provides sufficient entropy for security
- 7-day expiration balances usability with security
- Tokens are stateless and don't require server-side session storage
- Aligns with 2026 JWT security best practices for short-lived tokens

**Implementation**:
```typescript
const token = randomUUID();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);
```

### 2. Organization-Scoped Multi-Tenancy

**Decision**: All invitation operations are scoped to organization ID with strict isolation.

**Rationale**:
- Prevents cross-organization data leakage
- Enables per-organization rate limiting
- Maintains existing multi-tenant patterns
- Supports compliance requirements

**Implementation**:
```typescript
// All storage methods require organizationId
async createInvitation(data: InsertInvitation): Promise<Invitation> {
  return db.insert(invitations).values({
    ...data,
    organizationId: data.organizationId, // Required scoping
  });
}
```

### 3. Rate Limiting Strategy

**Decision**: Implement multi-level rate limiting (organization + request level).

**Rationale**:
- Prevents abuse and spam
- Protects email deliverability
- Follows 2026 API rate limiting best practices
- Provides graceful degradation under load

**Implementation**:
```typescript
// Organization level: 50 pending invitations max
const stats = await storage.getInvitationStats(orgId);
if (stats.pending + newInvitations.length > 50) {
  return res.status(429).json({ error: "Rate limit exceeded" });
}

// Request level: 100 invitations per bulk request
const bulkSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(100),
});
```

### 4. Security-First Password Requirements

**Decision**: Enforce strong password requirements during invitation acceptance.

**Rationale**:
- Prevents weak account security
- Aligns with 2026 security standards
- Reduces support burden from compromised accounts
- Meets compliance requirements

**Implementation**:
```typescript
const passwordSchema = z.string()
  .min(8)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character"
  );
```

### 5. Comprehensive Audit Trail

**Decision**: Log all invitation operations with full context for compliance.

**Rationale**:
- Enables security monitoring
- Supports compliance audits
- Provides debugging capabilities
- Follows observability-by-design principles

**Implementation**:
```typescript
// Automatic audit logging via activity events
await storage.createActivityEvent({
  organizationId,
  entityType: "invitation",
  entityId: invitation.id,
  actorId: userId,
  type: "created",
  description: `Invitation sent to ${invitation.email}`,
  metadata: { email: invitation.email, roleId: invitation.roleId },
});
```

### 6. Graceful Error Handling

**Decision**: Implement detailed error responses with specific error codes.

**Rationale**:
- Improves developer experience
- Enables better client-side error handling
- Supports debugging and troubleshooting
- Follows REST API best practices

**Implementation**:
```typescript
// Specific error types for different scenarios
if (existingInvitation) {
  return res.status(409).json({ 
    error: "Invitation already exists",
    message: "A pending invitation for this email already exists"
  });
}
```

## Consequences

### Positive

1. **Security**: Strong token generation and expiration prevents token reuse attacks
2. **Scalability**: Organization scoping supports horizontal scaling
3. **Usability**: Bulk invitations streamline team onboarding
4. **Compliance**: Audit trail meets regulatory requirements
5. **Performance**: Rate limiting prevents system overload

### Negative

1. **Complexity**: Multi-level rate limiting adds implementation complexity
2. **Storage**: Audit logging increases storage requirements
3. **Maintenance**: Token expiration requires cleanup processes
4. **Testing**: Security features require comprehensive test coverage

### Risks

1. **Token Leakage**: If tokens are exposed, accounts could be compromised
2. **Rate Limit Evasion**: Malicious actors might attempt to bypass limits
3. **Email Deliverability**: Bulk invitations might trigger spam filters
4. **Database Load**: High invitation volumes could impact performance

## Mitigations

### Token Security
- Use HTTPS for all API endpoints
- Implement secure token generation (randomUUID)
- Short expiration windows (7 days)
- Token rotation on resend operations

### Rate Limit Enforcement
- Database-level constraints for pending invitations
- Request-level validation before processing
- Organization-scoped limits prevent cross-org abuse
- Monitoring for suspicious patterns

### Performance Optimization
- Database indexing on token and email fields
- Pagination for list operations
- Async email sending to prevent blocking
- Connection pooling for database operations

## Implementation Status

- [x] Database schema and storage methods
- [x] API endpoints with validation
- [x] Rate limiting implementation
- [x] Security controls and audit logging
- [x] Error handling and response formatting
- [x] Comprehensive documentation
- [ ] Email service integration (Task 3.3)
- [ ] Property tests for security invariants (Task 3.4)

## Future Considerations

### Short-term (Next 3 months)
- Email template customization
- Invitation scheduling and batching
- Advanced analytics and reporting

### Long-term (6-12 months)
- Multi-language invitation support
- Social login integration for acceptance
- Advanced fraud detection

### Scalability
- Redis-based rate limiting for distributed systems
- Event-driven architecture for email processing
- Microservice decomposition for invitation service

## References

1. [JWT Security Best Practices 2026](https://curity.io/resources/learn/jwt-best-practices/)
2. [API Rate Limiting Guide 2026](https://www.levo.ai/resources/blogs/api-rate-limiting-guide-2026/)
3. [OWASP Top 10 2027](https://owasp.org/www-project-top-ten/)
4. [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Review Date**: 2026-02-13  
**Next Review**: 2026-05-13  
**Status**: Active
