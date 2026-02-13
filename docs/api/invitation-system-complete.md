# Invitation System - Complete Implementation Guide

## Overview

The UBOS invitation system provides a secure, scalable way to onboard new users through email invitations. This document covers the complete implementation including API endpoints, frontend onboarding flow, and comprehensive testing.

## Features Implemented

### ✅ Core Functionality
- **Invitation Creation** - Send single or bulk invitations with role assignment
- **Email Integration** - Template-based email delivery with multiple providers
- **Token Security** - Cryptographically secure UUID tokens with 7-day expiration
- **User Onboarding** - Complete signup flow with password requirements
- **Rate Limiting** - 50 pending invitations per organization
- **Multi-tenant Isolation** - Organization-scoped invitation management

### ✅ Security Features
- **Strong Password Enforcement** - 8+ chars with complexity requirements
- **Token Expiration** - Automatic 7-day expiration with precise boundary handling
- **Permission Controls** - RBAC integration for invitation management
- **Audit Trail** - Complete activity logging for compliance
- **Input Validation** - Multi-level validation with Zod schemas

### ✅ User Experience
- **Modern Onboarding UI** - Responsive design with progress indicators
- **Real-time Validation** - Password strength indicators and form validation
- **Error Handling** - User-friendly error messages and recovery options
- **Mobile Responsive** - Works across all device sizes

## Architecture

### Backend Components

#### API Endpoints
```
POST /api/invitations              - Create single invitation
POST /api/invitations/bulk         - Bulk invitation processing
GET  /api/invitations              - List pending invitations
POST /api/invitations/:token/accept - Accept invitation
POST /api/invitations/:id/resend   - Resend invitation
```

#### Storage Layer
- `invitations` table with organization isolation
- Token-based lookup with expiration handling
- Status tracking (pending, accepted, expired)
- Relationship management with users and roles

#### Email Service
- Multi-provider support (Mailtrap dev, AWS SES prod)
- Template-based rendering with Pug
- Environment-based configuration
- Client-compatible email design

### Frontend Components

#### Onboarding Page (`/onboarding`)
- Token extraction from URL parameters
- Multi-step form with validation
- Password strength indicators
- Progress tracking and error handling

#### Authentication Flow
- Public route for invitation acceptance
- Automatic redirect after successful signup
- Integration with existing auth system

## Implementation Details

### Token Generation and Expiration

```typescript
// Secure UUID token generation
const token = randomUUID();

// Precise 7-day expiration using UTC arithmetic
const now = new Date();
const expiresAtTimestamp = now.getTime() + (7 * 24 * 60 * 60 * 1000);
const expiresAt = new Date(expiresAtTimestamp);
```

### Password Validation

```typescript
const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /\d/, text: "One number" },
  { regex: /[@$!%*?&]/, text: "One special character (@$!%*?&)" },
];
```

### Rate Limiting

```typescript
// Organization-level rate limiting
const stats = await storage.getInvitationStats(orgId);
if (stats.pending + validatedData.invitations.length > 50) {
  return res.status(429).json({ 
    error: "Rate limit exceeded",
    message: "Cannot have more than 50 pending invitations per organization"
  });
}
```

## Testing Strategy

### Property-Based Tests
- **Token Expiration** - Validates exact 7-day expiration across timezones
- **Boundary Conditions** - Tests expiration edge cases precisely
- **Consistency** - Ensures behavior across different creation times

### Integration Tests
- **Complete Flow** - End-to-end invitation creation and acceptance
- **Error Scenarios** - Invalid tokens, expired invitations, duplicates
- **Bulk Operations** - Performance and reliability testing
- **Security** - Permission enforcement and data isolation

### Basic Tests
- **API Structure** - Endpoint validation and schema compliance
- **Data Validation** - Email formats, password requirements
- **Performance** - Bulk operation efficiency and pagination

## Usage Examples

### Create Single Invitation

```bash
curl -X POST http://localhost:5000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=..." \
  -d '{
    "email": "newuser@example.com",
    "roleId": "role-uuid"
  }'
```

### Bulk Invitations

```bash
curl -X POST http://localhost:5000/api/invitations/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=..." \
  -d '{
    "invitations": [
      {"email": "user1@example.com", "roleId": "role-uuid"},
      {"email": "user2@example.com", "roleId": "role-uuid"}
    ]
  }'
```

### Accept Invitation

```bash
curl -X POST http://localhost:5000/api/invitations/{token}/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invitation-uuid",
    "name": "John Doe",
    "password": "SecurePass123!"
  }'
```

## Frontend Integration

### Invitation Link Format
```
https://your-app.com/onboarding?token={invitation-uuid}
```

### Onboarding Flow
1. Token validation and invitation details display
2. User information collection (name, password)
3. Account creation and role assignment
4. Automatic redirect to dashboard

### React Component Usage
```typescript
// The onboarding page is automatically routed
// No additional integration needed - just link to /onboarding?token=...
```

## Configuration

### Environment Variables
```env
# Email Service Configuration
EMAIL_SERVICE_PROVIDER=mailtrap  # or 'ses'
EMAIL_FROM_EMAIL=noreply@yourapp.com
EMAIL_FROM_NAME=UBOS Platform

# AWS SES (if using SES)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### Database Schema
```sql
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role_id TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  invited_by_id TEXT NOT NULL,
  accepted_by_id TEXT,
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### Token Security
- UUID v4 tokens provide 128 bits of entropy
- Tokens are not exposed in list responses
- Automatic expiration prevents indefinite access

### Rate Limiting
- Organization-scoped limits prevent abuse
- Bulk operations capped at 100 invitations
- Pending invitation limits prevent spam

### Data Isolation
- Multi-tenant database design
- Organization ID required for all operations
- Cross-organization data access prevented

## Performance Optimization

### Database Indexing
```sql
CREATE INDEX idx_invitations_org_token ON invitations(organization_id, token);
CREATE INDEX idx_invitations_org_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_email ON invitations(email);
```

### Bulk Operations
- Transaction-based processing for consistency
- Parallel email sending for performance
- Efficient pagination for large lists

### Caching Strategy
- Invitation tokens cached for quick lookup
- Role information cached for assignment
- Email templates cached for rendering

## Monitoring and Analytics

### Key Metrics
- Invitation creation rate
- Acceptance conversion rate
- Time to acceptance
- Error rates by type

### Audit Events
- Invitation created (who, when, email)
- Invitation accepted (when, by whom)
- Invitation expired (when, auto-cleanup)
- Rate limit hits (organization, frequency)

## Troubleshooting

### Common Issues

**Invitation not found**
- Verify token is correct and not truncated
- Check if invitation has expired
- Confirm organization context

**Email not sending**
- Verify email service configuration
- Check SMTP credentials and connectivity
- Review email template syntax

**Permission denied**
- Verify user has invitation creation permissions
- Check role assignments in organization
- Confirm authentication state

### Debug Mode
```env
NODE_ENV=development
DEBUG=ubos:email,ubos:invitations
```

## Future Enhancements

### Planned Features
- [ ] Invitation templates customization
- [ ] Advanced scheduling options
- [ ] Invitation analytics dashboard
- [ ] Custom invitation workflows
- [ ] Integration with external HR systems

### Scalability Improvements
- [ ] Distributed email sending
- [ ] Invitation queue processing
- [ ] Advanced rate limiting algorithms
- [ ] Real-time invitation tracking

## Support

For questions or issues with the invitation system:

1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Consult the API documentation
4. Check the application logs for detailed error information

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0  
**Requirements:** 91.1, 91.3, 91.4, 91.7 ✅
