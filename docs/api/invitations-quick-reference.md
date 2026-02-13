# Invitation API Quick Reference

## Essential Endpoints

### Create Single Invitation
```bash
POST /api/invitations
Content-Type: application/json
Cookie: userId=<auth-user-id>

{
  "email": "user@example.com",
  "roleId": "role-id-here"
}
```

### Create Bulk Invitations
```bash
POST /api/invitations/bulk
Content-Type: application/json
Cookie: userId=<auth-user-id>

{
  "invitations": [
    {"email": "user1@example.com", "roleId": "role-id"},
    {"email": "user2@example.com", "roleId": "role-id"}
  ]
}
```

### Accept Invitation (No Auth Required)
```bash
POST /api/invitations/<token>/accept
Content-Type: application/json

{
  "token": "<token-from-url>",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

### List Invitations
```bash
GET /api/invitations?status=pending&limit=20
Cookie: userId=<auth-user-id>
```

### Resend Invitation
```bash
POST /api/invitations/<invitation-id>/resend
Cookie: userId=<auth-user-id>
```

---

## Common Response Patterns

### Success (201 Created)
```json
{
  "id": "inv-123456",
  "email": "user@example.com",
  "roleId": "role-id-here",
  "status": "pending",
  "expiresAt": "2026-02-20T09:00:00.000Z",
  "createdAt": "2026-02-13T09:00:00.000Z"
}
```

### Bulk Success (201 Created)
```json
{
  "created": 2,
  "failed": 0,
  "invitations": [...],
  "errors": []
}
```

### Error (400 Bad Request)
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Rate Limits

- **50 pending invitations** per organization
- **100 invitations** per bulk request
- **7 days** token expiration
- **1 request/second** per user (implied)

---

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number
- At least 1 special character (@$!%*?&)

---

## Security Notes

- Tokens are **never** exposed in list responses
- All operations are **organization-scoped**
- **7-day expiration** on all tokens
- **Audit logging** on all operations
- **Rate limiting** enforced at multiple levels

---

## Integration Checklist

### Before Implementation
- [ ] Verify user has `users.create` permission
- [ ] Check organization invitation limits
- [ ] Validate role exists in organization
- [ ] Verify email format and uniqueness

### After Implementation
- [ ] Send invitation email (Task 3.3)
- [ ] Log activity event for audit
- [ ] Update organization metrics
- [ ] Handle rate limit exceeded scenarios

### Error Handling
- [ ] 409 for duplicate invitations
- [ ] 429 for rate limits
- [ ] 400 for validation errors
- [ ] 401 for missing authentication
- [ ] 410 for expired invitations

---

## Testing Examples

### Create Invitation Test
```typescript
const response = await request(app)
  .post('/api/invitations')
  .set('Cookie', 'userId=test-user')
  .send({
    email: 'test@example.com',
    roleId: 'member-role-id'
  });

expect(response.status).toBe(201);
expect(response.body.email).toBe('test@example.com');
```

### Accept Invitation Test
```typescript
const response = await request(app)
  .post('/api/invitations/token-123/accept')
  .send({
    token: 'token-123',
    password: 'SecurePass123!',
    name: 'Test User'
  });

expect(response.status).toBe(200);
expect(response.body.user.email).toBe('test@example.com');
```

---

## Troubleshooting

### Common Issues

**"Invitation already exists"**
- Check for pending invitations with same email
- Use resend endpoint instead of creating new one

**"Rate limit exceeded"**
- Check current pending invitation count
- Wait for existing invitations to expire/accept
- Clean up old expired invitations

**"Invalid role"**
- Verify role ID exists in organization
- Check user has permission to assign this role
- Ensure role is not organization-scoped incorrectly

**"Invitation expired"**
- Tokens expire after 7 days
- Use resend endpoint to generate new token
- Check system clock synchronization

### Debug Commands

```bash
# Check pending invitations count
curl -H "Cookie: userId=<user>" \
  "http://localhost:3000/api/invitations?status=pending"

# Test invitation creation
curl -X POST -H "Content-Type: application/json" \
  -H "Cookie: userId=<user>" \
  -d '{"email":"test@example.com","roleId":"role-id"}' \
  http://localhost:3000/api/invitations

# Check invitation details (replace with actual ID)
curl -H "Cookie: userId=<user>" \
  "http://localhost:3000/api/invitations/<invitation-id>"
```

---

## Migration Notes

### From Legacy System
- Old invitation tokens are **not** compatible
- Email templates need updating for new flow
- Rate limits may affect existing bulk processes
- Password requirements are now enforced

### Database Changes
- Added `invitations` table with organization scoping
- New indexes for performance and uniqueness
- Audit logging via `activityEvents` table
- Token format changed to UUID v4

---

*Last Updated: 2026-02-13*  
*Version: 1.0.0*
