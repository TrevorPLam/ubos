# Invitation API Documentation

## Overview

The Invitation API provides comprehensive user invitation and onboarding capabilities for the UBOS platform. This API implements 2026 security best practices including rate limiting, secure token generation, and comprehensive audit trails.

**Features:**
- Secure invitation creation with role assignment
- Bulk invitation processing with rate limiting
- Token-based invitation acceptance with strong password requirements
- Invitation resending with token refresh
- Comprehensive security validation and audit logging

**Security Features:**
- 7-day token expiration with automatic cleanup
- Rate limiting (50 pending invitations per organization)
- Strong password enforcement (8+ chars, complexity requirements)
- Organization-scoped invitation isolation
- Complete audit trail for compliance

---

## Base URL

```
https://api.ubos.pro
```

*For development: `http://localhost:3000`*

---

## Authentication

All invitation endpoints require authentication except for invitation acceptance. Use cookie-based authentication:

```http
Cookie: userId=<authenticated-user-id>
```

---

## Endpoints

### 1. Create Invitation

**POST** `/api/invitations`

Creates a new user invitation with role assignment.

#### Request Body

```json
{
  "email": "user@example.com",
  "roleId": "role-id-here"
}
```

#### Response

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

#### Error Responses

- `400 Bad Request` - Invalid email format or role ID
- `401 Unauthorized` - Authentication required
- `409 Conflict` - Pending invitation already exists for email
- `429 Too Many Requests` - Organization rate limit exceeded

#### Example

```bash
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: userId=auth-user-id" \
  -d '{
    "email": "newuser@example.com",
    "roleId": "member-role-id"
  }'
```

---

### 2. Bulk Create Invitations

**POST** `/api/invitations/bulk`

Creates multiple invitations in a single request with rate limiting validation.

#### Request Body

```json
{
  "invitations": [
    {
      "email": "user1@example.com",
      "roleId": "role-id-here"
    },
    {
      "email": "user2@example.com",
      "roleId": "role-id-here"
    }
  ]
}
```

#### Response

```json
{
  "created": 2,
  "failed": 0,
  "invitations": [
    {
      "id": "inv-123456",
      "email": "user1@example.com",
      "roleId": "role-id-here",
      "status": "pending"
    },
    {
      "id": "inv-123457",
      "email": "user2@example.com",
      "roleId": "role-id-here",
      "status": "pending"
    }
  ],
  "errors": []
}
```

#### Rate Limiting

- Maximum 100 invitations per bulk request
- Maximum 50 pending invitations per organization
- Partial failure handling with detailed error reporting

#### Example

```bash
curl -X POST http://localhost:3000/api/invitations/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: userId=auth-user-id" \
  -d '{
    "invitations": [
      {"email": "team1@example.com", "roleId": "member-role-id"},
      {"email": "team2@example.com", "roleId": "admin-role-id"}
    ]
  }'
```

---

### 3. List Invitations

**GET** `/api/invitations`

Retrieves paginated list of invitations for the authenticated user's organization.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (`pending`, `accepted`, `expired`) |
| `limit` | integer | 50 | Maximum results per page (max: 100) |
| `offset` | integer | 0 | Number of results to skip |

#### Response

```json
{
  "invitations": [
    {
      "id": "inv-123456",
      "email": "user@example.com",
      "roleId": "role-id-here",
      "status": "pending",
      "createdAt": "2026-02-13T09:00:00.000Z",
      "expiresAt": "2026-02-20T09:00:00.000Z",
      "updatedAt": "2026-02-13T09:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

#### Security Note

Tokens are never exposed in list responses for security purposes.

#### Example

```bash
curl "http://localhost:3000/api/invitations?status=pending&limit=10" \
  -H "Cookie: userId=auth-user-id"
```

---

### 4. Accept Invitation

**POST** `/api/invitations/:token/accept`

Accepts an invitation and creates a new user account. This endpoint does not require authentication.

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | The invitation token from the email |

#### Request Body

```json
{
  "token": "invitation-token-here",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

#### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

#### Response

```json
{
  "message": "Invitation accepted successfully",
  "user": {
    "id": "user-123456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com"
  }
}
```

#### Error Responses

- `400 Bad Request` - Invalid password or name format
- `404 Not Found` - Invalid or non-existent invitation token
- `410 Gone` - Invitation expired or already accepted

#### Example

```bash
curl -X POST http://localhost:3000/api/invitations/abc123token/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123token",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

---

### 5. Resend Invitation

**POST** `/api/invitations/:id/resend`

Resends an existing invitation with a new token and extended expiration.

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The invitation ID |

#### Response

```json
{
  "message": "Invitation resent successfully",
  "invitation": {
    "id": "inv-123456",
    "email": "user@example.com",
    "expiresAt": "2026-02-27T09:00:00.000Z",
    "updatedAt": "2026-02-13T09:00:00.000Z"
  }
}
```

#### Error Responses

- `400 Bad Request` - Invitation cannot be resent (not pending)
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Invitation not found

#### Example

```bash
curl -X POST http://localhost:3000/api/invitations/inv-123456/resend \
  -H "Cookie: userId=auth-user-id"
```

---

## Security Considerations

### Token Security

- **Generation**: Cryptographically secure UUID v4 tokens
- **Expiration**: 7-day automatic expiration
- **Uniqueness**: Database-enforced unique constraints
- **Rotation**: New tokens generated on resend operations

### Rate Limiting

- **Organization Level**: Maximum 50 pending invitations
- **Request Level**: Maximum 100 invitations per bulk request
- **Enforcement**: Applied before database operations

### Data Validation

- **Email Format**: RFC 5322 compliant email validation
- **Password Strength**: Enforced complexity requirements
- **Input Sanitization**: All inputs validated via Zod schemas

### Audit Trail

All invitation operations create comprehensive audit logs:

```json
{
  "eventType": "invitation.created",
  "actorId": "user-123",
  "entityType": "invitation",
  "entityId": "inv-456",
  "metadata": {
    "email": "user@example.com",
    "roleId": "role-123",
    "organizationId": "org-789"
  },
  "timestamp": "2026-02-13T09:00:00.000Z"
}
```

---

## Error Handling

### Standard Error Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description | Example Scenarios |
|------|-------------|-------------------|
| `200` | Success | Invitation accepted, list retrieved |
| `201` | Created | New invitation created |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Missing or invalid authentication |
| `404` | Not Found | Invitation not found |
| `409` | Conflict | Duplicate invitation |
| `410` | Gone | Invitation expired |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Error | Server error |

---

## Integration Examples

### JavaScript/TypeScript

```typescript
interface InvitationRequest {
  email: string;
  roleId: string;
}

interface InvitationResponse {
  id: string;
  email: string;
  roleId: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

async function createInvitation(data: InvitationRequest): Promise<InvitationResponse> {
  const response = await fetch('/api/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `userId=${getUserId()}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

### Python

```python
import requests
from typing import List, Dict

def create_bulk_invitations(invitations: List[Dict[str, str]]) -> Dict:
    """Create multiple invitations with rate limiting protection."""
    response = requests.post(
        'http://localhost:3000/api/invitations/bulk',
        json={'invitations': invitations},
        headers={'Cookie': f'userId={get_user_id()}'}
    )
    
    response.raise_for_status()
    return response.json()

def accept_invitation(token: str, password: str, name: str) -> Dict:
    """Accept an invitation and create user account."""
    response = requests.post(
        f'http://localhost:3000/api/invitations/{token}/accept',
        json={
            'token': token,
            'password': password,
            'name': name
        }
    )
    
    response.raise_for_status()
    return response.json()
```

---

## Monitoring & Observability

### Key Metrics

- **Invitation Creation Rate**: New invitations per hour
- **Acceptance Rate**: Percentage of invitations accepted
- **Expiration Rate**: Percentage of invitations expired
- **Error Rate**: Failed invitation operations
- **Rate Limit Hits**: Organizations hitting limits

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health/invitations
```

Returns invitation system health status including database connectivity and queue status.

---

## Version History

### v1.0.0 (2026-02-13)
- Initial release with core invitation functionality
- Rate limiting and security features
- Bulk invitation processing
- Comprehensive audit logging

### Future Enhancements
- **v1.1.0**: Email template customization
- **v1.2.0**: Invitation scheduling
- **v1.3.0**: Multi-language support
- **v2.0.0**: Advanced analytics and reporting

---

## Support

For technical support or questions about the Invitation API:

- **Documentation**: https://docs.ubos.pro/invitations
- **API Status**: https://status.ubos.pro
- **Support Email**: api-support@ubos.pro
- **Developer Community**: https://community.ubos.pro

---

*Last Updated: February 13, 2026*
*API Version: 1.0.0*
*Compatibility: Node.js 18+, TypeScript 5.6+*
