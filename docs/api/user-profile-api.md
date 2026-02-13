# User Profile API Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-02-13  
**Requirements:** 92.1, 92.2, 92.3, 92.4, 92.5

## Overview

The User Profile API provides comprehensive user profile management capabilities following 2026 security and privacy best practices. This API enables users to manage their personal information, notification preferences, and security settings while maintaining strict data protection standards.

## Architecture

### Design Principles

- **Privacy by Design**: All endpoints implement GDPR-compliant data handling
- **Security First**: OWASP API Security Top 10 (2026) compliance
- **Multi-tenancy**: Strict organization isolation for all operations
- **Audit Trail**: Complete logging of all profile changes
- **Rate Limiting**: Protection against abuse and enumeration attacks

### Data Model

```typescript
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
  profileImageUrl?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    projectUpdates: boolean;
    taskReminders: boolean;
    invoiceNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### GET /api/users/me

**Purpose**: Retrieve current user's profile information  
**Authentication**: Required  
**Rate Limit**: 100 requests/hour

#### Request
```http
GET /api/users/me
Cookie: user_id=<user_id>
```

#### Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "profileImageUrl": "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000/avatar.jpg",
  "notificationPreferences": {
    "email": true,
    "push": true,
    "sms": false,
    "projectUpdates": true,
    "taskReminders": true,
    "invoiceNotifications": true
  },
  "createdAt": "2026-02-13T12:00:00.000Z",
  "updatedAt": "2026-02-13T12:00:00.000Z"
}
```

#### Error Responses
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User profile not found

---

### PUT /api/users/me

**Purpose**: Update user profile information  
**Authentication**: Required  
**Rate Limit**: 50 requests/hour

#### Request
```http
PUT /api/users/me
Cookie: user_id=<user_id>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "timezone": "America/New_York"
}
```

#### Validation Rules
- `firstName`: 1-100 characters, required if provided
- `lastName`: 1-100 characters, required if provided  
- `email`: Valid email format, unique across system
- `phone`: Valid international phone format
- `timezone`: Valid IANA timezone identifier

#### Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "profileImageUrl": "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000/avatar.jpg",
  "notificationPreferences": {
    "email": true,
    "push": true,
    "sms": false,
    "projectUpdates": true,
    "taskReminders": true,
    "invoiceNotifications": true
  },
  "updatedAt": "2026-02-13T12:30:00.000Z"
}
```

#### Error Responses
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User profile not found
- **409 Conflict**: Email already in use

---

### POST /api/users/me/avatar

**Purpose**: Upload profile photo  
**Authentication**: Required  
**Rate Limit**: 10 requests/hour  
**File Size Limit**: 5MB

#### Request
```http
POST /api/users/me/avatar
Cookie: user_id=<user_id>
Content-Type: multipart/form-data

avatar: <image_file>
```

#### File Requirements
- **Format**: JPEG, PNG, WebP, GIF
- **Size**: Maximum 5MB
- **Dimensions**: Recommended 400x400px

#### Response (200 OK)
```json
{
  "message": "Profile photo uploaded successfully",
  "profileImageUrl": "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000/avatar.jpg"
}
```

#### Error Responses
- **400 Bad Request**: No file uploaded or invalid file type
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User profile not found
- **413 Payload Too Large**: File exceeds size limit

---

### PUT /api/users/me/password

**Purpose**: Change user password  
**Authentication**: Required  
**Rate Limit**: 5 requests/hour

#### Request
```http
PUT /api/users/me/password
Cookie: user_id=<user_id>
Content-Type: application/json

{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

#### Password Requirements
- **Length**: Minimum 8 characters
- **Complexity**: Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- **Confirmation**: Must match `confirmPassword`

#### Response (200 OK)
```json
{
  "message": "Password updated successfully"
}
```

#### Error Responses
- **400 Bad Request**: Validation errors or incorrect current password
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User profile not found

---

### PUT /api/users/me/preferences

**Purpose**: Update notification preferences  
**Authentication**: Required  
**Rate Limit**: 25 requests/hour

#### Request
```http
PUT /api/users/me/preferences
Cookie: user_id=<user_id>
Content-Type: application/json

{
  "email": true,
  "push": false,
  "sms": true,
  "projectUpdates": false,
  "taskReminders": true,
  "invoiceNotifications": false
}
```

#### Preference Types
- `email`: Email notifications (boolean)
- `push`: Push notifications (boolean)
- `sms`: SMS notifications (boolean)
- `projectUpdates`: Project-related updates (boolean)
- `taskReminders`: Task reminders (boolean)
- `invoiceNotifications`: Invoice notifications (boolean)

#### Response (200 OK)
```json
{
  "message": "Notification preferences updated successfully",
  "notificationPreferences": {
    "email": true,
    "push": false,
    "sms": true,
    "projectUpdates": false,
    "taskReminders": true,
    "invoiceNotifications": false
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid preference types
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User profile not found

## Security Features

### Authentication & Authorization
- **Cookie-based Authentication**: Secure HTTP-only cookies
- **CSRF Protection**: Built-in CSRF token validation
- **Session Management**: Automatic session expiration
- **Multi-tenant Isolation**: Strict data access controls

### Data Protection
- **PII Redaction**: Sensitive data masked in logs
- **Input Validation**: Comprehensive request sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

### Rate Limiting
- **Profile Requests**: 100/hour
- **Profile Updates**: 50/hour
- **Avatar Uploads**: 10/hour
- **Password Changes**: 5/hour
- **Preference Updates**: 25/hour

## Privacy Compliance

### GDPR Implementation
- **Data Minimization**: Only collect necessary profile data
- **Purpose Limitation**: Clear data usage purposes
- **Consent Management**: Explicit consent for notifications
- **Right to Access**: Full profile data export
- **Right to Rectification**: Easy profile updates
- **Data Portability**: Structured data export

### Data Retention
- **Profile Data**: Retained until account deletion
- **Avatar Images**: Retained for 30 days after deletion
- **Audit Logs**: Retained for 2 years
- **Password History**: Not stored (security best practice)

## Error Handling

### Standard Error Format
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2026-02-13T12:00:00.000Z",
  "requestId": "req_550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Categories
- **Authentication Errors**: 401, 403
- **Validation Errors**: 400
- **Not Found Errors**: 404
- **Conflict Errors**: 409
- **Rate Limit Errors**: 429
- **Server Errors**: 500

## Performance Metrics

### Response Time Targets
- **GET Profile**: <100ms (95th percentile)
- **PUT Profile**: <200ms (95th percentile)
- **POST Avatar**: <500ms (95th percentile)
- **PUT Password**: <150ms (95th percentile)
- **PUT Preferences**: <100ms (95th percentile)

### Throughput Targets
- **Concurrent Users**: 1000+
- **Requests/Second**: 500+
- **File Uploads**: 50/second

## Monitoring & Observability

### Key Metrics
- **Request Rate**: API endpoint usage patterns
- **Error Rate**: Failed request percentage
- **Response Time**: Latency distribution
- **Authentication Failures**: Security events
- **File Upload Success**: Avatar processing metrics

### Logging
- **Request Logs**: All API requests with redacted PII
- **Error Logs**: Detailed error information
- **Audit Logs**: Profile change tracking
- **Security Logs**: Authentication and authorization events

## Integration Examples

### JavaScript/TypeScript
```typescript
// Get user profile
const response = await fetch('/api/users/me', {
  credentials: 'include'
});
const profile = await response.json();

// Update profile
const updateResponse = await fetch('/api/users/me', {
  method: 'PUT',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe'
  })
});

// Upload avatar
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);
const avatarResponse = await fetch('/api/users/me/avatar', {
  method: 'POST',
  credentials: 'include',
  body: formData
});
```

### cURL Examples
```bash
# Get profile
curl -b "user_id=your_user_id" \
  https://api.example.com/api/users/me

# Update profile
curl -b "user_id=your_user_id" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe"}' \
  https://api.example.com/api/users/me

# Upload avatar
curl -b "user_id=your_user_id" \
  -X POST \
  -F "avatar=@profile.jpg" \
  https://api.example.com/api/users/me/avatar
```

## Testing

### Unit Tests
- **Schema Validation**: Input validation testing
- **Business Logic**: Profile update logic
- **Security**: Authentication and authorization
- **Error Handling**: Edge case coverage

### Integration Tests
- **API Endpoints**: Full request/response cycles
- **Database Operations**: Data persistence
- **File Uploads**: Avatar processing
- **Rate Limiting**: Throttling behavior

### Security Tests
- **OWASP Top 10**: API security vulnerabilities
- **Penetration Testing**: Manual security assessment
- **Load Testing**: Performance under stress
- **Privacy Testing**: GDPR compliance validation

## Troubleshooting

### Common Issues

#### Authentication Failures
- **Cause**: Missing or invalid cookie
- **Solution**: Ensure proper authentication flow
- **Check**: Cookie domain and path settings

#### Validation Errors
- **Cause**: Invalid input data
- **Solution**: Review validation rules
- **Check**: Request body format and types

#### File Upload Issues
- **Cause**: Invalid file format or size
- **Solution**: Verify file requirements
- **Check**: MIME type and file size limits

#### Rate Limiting
- **Cause**: Too many requests
- **Solution**: Implement exponential backoff
- **Check**: Rate limit headers in response

### Debug Information
- **Request ID**: Include in support requests
- **Timestamp**: UTC timestamp of request
- **User Agent**: Client application details
- **IP Address**: Client source IP

## Version History

### v1.0.0 (2026-02-13)
- Initial implementation
- All profile management endpoints
- GDPR compliance features
- Security hardening
- Performance optimization

## Support

### Documentation
- **API Reference**: Complete endpoint documentation
- **Developer Guide**: Integration best practices
- **Security Guide**: Implementation security considerations
- **Privacy Guide**: GDPR compliance details

### Contact
- **Technical Support**: support@example.com
- **Security Issues**: security@example.com
- **Privacy Questions**: privacy@example.com

---

**© 2026 UBOS Platform. All rights reserved.**
