# RBAC API Documentation (2026 Standards)

## Overview

The Role-Based Access Control (RBAC) system provides granular permissions management with multi-tenant organization isolation. This implementation follows 2026 security standards including zero-trust architecture, comprehensive audit logging, and AI-ready analytics.

## Features

### 🔐 Security Standards (2026)
- **Zero Trust Architecture**: Every permission check is validated
- **Organization Isolation**: Multi-tenant data protection at database level
- **Audit Logging**: All permission decisions logged with AI-ready metadata
- **Rate Limiting**: Configurable abuse detection with client fingerprinting
- **Generic Error Messages**: Prevent information leakage
- **Performance Optimization**: Single-query permission checking

### 🤖 AI-Ready Analytics
- **Risk Scoring**: Automated threat assessment
- **Anomaly Detection**: Behavioral pattern analysis
- **Client Fingerprinting**: Bot detection and tracking
- **Comprehensive Metadata**: Rich context for ML models

## API Endpoints

### Roles Management

#### `GET /api/roles`
List all roles for the authenticated user's organization.

**Rate Limit**: 100 requests per 15 minutes

**Permissions Required**: `roles:view`

**Response**:
```json
{
  "data": [
    {
      "id": "role-uuid",
      "organizationId": "org-uuid", 
      "name": "Project Manager",
      "description": "Can manage projects and tasks",
      "isDefault": false,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

#### `POST /api/roles`
Create a new custom role.

**Rate Limit**: 50 requests per 15 minutes (admin endpoints)

**Permissions Required**: `roles:create`

**Request Body**:
```json
{
  "name": "Project Manager",
  "description": "Can manage projects and tasks"
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "new-role-uuid",
    "organizationId": "org-uuid",
    "name": "Project Manager", 
    "description": "Can manage projects and tasks",
    "isDefault": false,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

#### `PUT /api/roles/:id`
Update a role's name, description, or permissions.

**Rate Limit**: 50 requests per 15 minutes (admin endpoints)

**Permissions Required**: `roles:edit`

**Request Body**:
```json
{
  "name": "Senior Project Manager",
  "description": "Can manage projects and oversee team",
  "permissionIds": ["perm-1", "perm-2", "perm-3"]
}
```

**Response**:
```json
{
  "data": {
    "role": { /* updated role */ },
    "permissions": [ /* role permissions */ ]
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

#### `DELETE /api/roles/:id`
Delete a custom role (only if not assigned to users).

**Rate Limit**: 50 requests per 15 minutes (admin endpoints)

**Permissions Required**: `roles:delete`

**Response**: `204 No Content`

### Permissions

#### `GET /api/permissions`
List all available permissions (system-wide).

**Rate Limit**: 100 requests per 15 minutes

**Permissions Required**: `roles:view`

**Response**:
```json
{
  "data": [
    {
      "id": "perm-uuid",
      "featureArea": "projects",
      "permissionType": "view",
      "description": "View projects",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

### User Role Management

#### `POST /api/users/:userId/roles`
Assign a role to a user.

**Rate Limit**: 50 requests per 15 minutes (admin endpoints)

**Permissions Required**: `roles:edit`

**Request Body**:
```json
{
  "roleId": "role-uuid"
}
```

**Response**: `201 Created`

#### `DELETE /api/users/:userId/roles/:roleId`
Remove a role from a user.

**Rate Limit**: 50 requests per 15 minutes (admin endpoints)

**Permissions Required**: `roles:edit`

**Response**: `204 No Content`

## Error Responses

All errors follow 2026 API standards with structured error codes:

```json
{
  "message": "Access denied",
  "code": "PERMISSION_DENIED"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `PERMISSION_DENIED` | 403 | Access denied |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `PROTECTED_ROLE` | 400 | Cannot modify system default roles |
| `ROLE_IN_USE` | 400 | Cannot delete role assigned to users |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Security Features

### Rate Limiting

- **General API**: 100 requests/15min
- **Admin Operations**: 50 requests/15min  
- **Authentication**: 5 requests/15min
- **File Uploads**: 10 requests/hour

Headers included:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Window reset time (ISO 8601)

### Audit Logging

All permission checks are logged with:
- User ID and organization context
- IP address and user agent fingerprint
- Request path and method
- Permission decision and reason
- Performance metrics (duration)
- Risk score and anomaly indicators

### Client Fingerprinting

Advanced bot detection using:
- IP address patterns
- User-Agent analysis
- Request timing patterns
- Header fingerprinting
- Behavioral anomaly detection

## Integration Examples

### JavaScript/TypeScript

```typescript
// Create a new role
const response = await fetch('/api/roles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Content Editor',
    description: 'Can edit and publish content'
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error: ${error.code} - ${error.message}`);
  return;
}

const { data: role } = await response.json();
console.log('Created role:', role);
```

### cURL

```bash
# List roles
curl -X GET "http://localhost:3000/api/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Create role
curl -X POST "http://localhost:3000/api/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Analyst",
    "description": "Can view and export reports"
  }'
```

## Performance Considerations

### Permission Checking
- Single optimized SQL query with EXISTS subquery
- Database indexes on frequently queried columns
- Connection pooling for concurrent requests
- Cached organization context in request

### Rate Limiting
- In-memory storage (Redis recommended for production)
- Sliding window algorithm
- Automatic cleanup of expired records
- Minimal performance overhead (<1ms)

### Audit Logging
- Asynchronous logging to prevent request delays
- Batch inserts for high-volume scenarios
- Configurable log retention policies
- Structured data for analytics pipelines

## Monitoring & Analytics

### Key Metrics
- Permission check latency (p50, p95, p99)
- Rate limit violation frequency
- Risk score distribution
- Anomaly detection alerts
- API error rates by endpoint

### AI Integration Points
- Risk scoring models for threat detection
- Anomaly pattern recognition
- Automated security incident response
- User behavior analytics
- Predictive scaling based on usage patterns

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Verify user has required role
   - Check role has required permission
   - Ensure user belongs to correct organization

2. **Rate Limit Exceeded**
   - Check `X-RateLimit-*` headers
   - Implement exponential backoff
   - Consider API key for higher limits

3. **Validation Errors**
   - Review request body format
   - Check required fields
   - Verify data types and constraints

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=rbac:* npm start
```

This will output detailed permission check information and audit logs.

## Migration Guide

### From Legacy RBAC

1. **Database Schema**: Existing schema is compatible
2. **API Changes**: Update error handling for new response format
3. **Authentication**: Ensure proper token format in headers
4. **Rate Limiting**: Implement retry logic for 429 responses

### Breaking Changes

- Error response format now includes `code` field
- Rate limiting headers added to all responses
- Some error messages are more generic for security

## Support

For issues and questions:
- Check audit logs for permission problems
- Review rate limit headers for throttling issues
- Enable debug mode for detailed troubleshooting
- Contact security team for access control questions
