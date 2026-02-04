---
title: "Authentication and Session Management"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Authentication and Session Management

**Purpose**: Document authentication and session management in UBOS  
**Status**: ACTIVE - reflects current implementation  
**Last Updated**: 2026-02-04

---

## Overview

UBOS uses session-based authentication with HttpOnly cookies for secure session management.

---

## Authentication Flow

### Development Mode

In development, the system supports header-based authentication for testing:

```http
Headers:
  x-user-id: <user-id>
  x-user: <user-email>
```

**Security Note**: Header-based auth is DISABLED in production.

### Production Mode

Uses session cookies with proper security settings:
- HttpOnly: Yes
- Secure: Yes (HTTPS only)
- SameSite: Lax/Strict

---

## Session Management

### Session Storage

- **Cookie Name**: `ubos_user_id`
- **HttpOnly**: true (not accessible via JavaScript)
- **Signed**: Yes (uses SESSION_SECRET)
- **Max Age**: Configurable session timeout

### Session Lifecycle

1. **Login**: User authenticates → session cookie set
2. **Request**: Cookie sent with each request → user ID extracted
3. **Logout**: Cookie cleared → session invalidated

---

## User Context

### Extracting User ID

See [server/routes.ts](/server/routes.ts) `getUserIdFromRequest()`:

```typescript
function getUserIdFromRequest(req: Request): string | null {
  // In development: check headers first
  if (process.env.NODE_ENV !== 'production') {
    if (req.headers['x-user-id']) {
      return req.headers['x-user-id'] as string;
    }
  }
  
  // Production: check session cookie
  return req.signedCookies?.ubos_user_id || null;
}
```

### Organization Resolution

After user ID is extracted, organization is resolved:

```typescript
function getOrCreateOrg(userId: string): Promise<Organization> {
  // Find user's organization via organizationMembers table
  // Create default org if none exists (dev/demo mode)
}
```

---

## Multi-Tenancy Integration

### Organization Scoping

All authenticated requests are scoped to the user's organization:

1. Extract user ID from session/header
2. Look up user's organization(s)
3. Use organization ID for all data queries

See [docs/data/10_current_state/TENANCY_AND_ACCESS.md](/docs/data/10_current_state/TENANCY_AND_ACCESS.md) for details.

---

## Security Controls

### Session Security

- ✅ HttpOnly cookies (XSS protection)
- ✅ Signed cookies (tampering protection)
- ✅ CSRF protection (see [server/csrf.ts](/server/csrf.ts))
- ✅ Rate limiting on auth endpoints
- ⏳ Session timeout (needs configuration)
- ⏳ Session rotation (future enhancement)

### Production Hardening

Production mode enforces:
- No header-based authentication
- Secure cookies (HTTPS only)
- Strong session secrets
- Rate limiting

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/login` | GET | Initiate login (redirects to OAuth) |
| `/api/logout` | GET | Clear session and logout |
| `/api/auth/user` | GET | Get current authenticated user |

See [docs/api/auth/README.md](/docs/api/auth/README.md) for full API documentation.

---

## Testing

### Test Authentication

Tests use mock authentication via headers:

```typescript
// In tests
const response = await request(app)
  .get('/api/clients')
  .set('x-user-id', testUserId)
  .set('x-user', 'test@example.com');
```

See [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts) for auth tests.

---

## Future Enhancements

### Planned Improvements

- ⏳ OAuth 2.0 / OIDC integration
- ⏳ Multi-factor authentication (MFA)
- ⏳ Session timeout configuration
- ⏳ Session activity tracking
- ⏳ Remember me functionality
- ⏳ Role-based access control (RBAC)

---

## Evidence Links

- **Session Middleware**: [server/session.ts](/server/session.ts)
- **Auth Routes**: [server/routes.ts](/server/routes.ts) (getUserIdFromRequest, requireAuth)
- **CSRF Protection**: [server/csrf.ts](/server/csrf.ts)
- **Auth Tests**: [tests/backend/auth-middleware.test.ts](/tests/backend/auth-middleware.test.ts)
- **Security Controls**: [docs/security/10-controls/CONTROLS_MATRIX.md](/docs/security/10-controls/CONTROLS_MATRIX.md)

---

**Last Verified**: 2026-02-04  
**Verification Command**: `npm run test:backend -- auth-middleware.test.ts`
