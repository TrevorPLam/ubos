# Security Standards

## Purpose

Non-negotiable security requirements that protect user data, prevent attacks, and ensure compliance. These standards are enforced through automated scanning, code review, and regular security audits.

## Content Security Policy (CSP)

### CSP Baseline Configuration
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://trusted-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### CSP Enforcement Rules
**Development**: Report-Only mode with detailed logging
**Staging**: Report-Only + internal monitoring
**Production**: Full enforcement with violation reporting

**Allowed Sources**:
- **Scripts**: Self, trusted CDN, analytics
- **Styles**: Self, Google Fonts, inline critical CSS
- **Images**: Self, data URIs, trusted image CDNs
- **Fonts**: Self, Google Fonts
- **APIs**: Self, production API endpoints
- **Frames**: None (prevent clickjacking)

### CSP Violation Monitoring
**Reporting Endpoint**: `/api/csp-violations`
**Alert Threshold**: 10 violations per hour
**Response Time**: < 200ms for violation reports
**Retention**: 90 days for security analysis

## Input Validation Requirements

### Validation Framework
**Primary Tool**: Zod schemas for all input validation
**Secondary**: Custom sanitization for specific use cases
**Fallback**: Server-side validation as last resort

### Validation Rules by Input Type
**Email Addresses**:
- RFC 5322 compliant validation
- MX record verification for business emails
- Disposable email detection
- Maximum length: 254 characters

**Passwords**:
- Minimum 8 characters
- Complexity: uppercase, lowercase, numbers, symbols
- No common passwords (check against breach lists)
- Hash with Argon2id (memory: 19456, time: 2, parallelism: 1)

**User Names**:
- Alphanumeric with limited special characters
- 3-50 characters length
- No profanity or reserved words
- Unicode support for international names

**File Uploads**:
- Whitelist allowed extensions
- Maximum file size: 5MB for images, 10MB for documents
- MIME type verification
- Virus scanning for all uploads
- Sanitize filenames to prevent path traversal

### Sanitization Standards
**HTML Content**: DOMPurify with strict configuration
**SQL Queries**: Parameterized queries only
**URL Parameters**: URL encoding validation
**JSON Data**: Schema validation before parsing
**Headers**: Whitelist allowed headers only

## XSS Prevention Rules

### Output Encoding
**HTML Context**: HTML entity encoding
**JavaScript Context**: JavaScript entity encoding
**CSS Context**: CSS entity encoding
**URL Context**: URL encoding
**Attribute Context**: Attribute encoding

### Content Security
**No Inline Scripts**: All JavaScript in external files
**No Eval Functions**: Prohibit eval(), setTimeout(), setInterval() with strings
**No Dynamic Code**: Prohibit new Function() constructor
**Safe DOM APIs**: Use textContent instead of innerHTML
**Template Literals**: Sanitize before template insertion

### Framework-Specific Rules
**React**: Automatic XSS protection with JSX
**Vue.js**: Automatic XSS protection with templates
**Angular**: Automatic XSS protection with templates
**Vanilla JS**: Manual sanitization required

### XSS Testing Requirements
**Automated Scanning**: OWASP ZAP integration
**Manual Testing**: Quarterly penetration testing
**Code Review**: Security-focused review for all user input handling
**Dependency Scanning**: Weekly vulnerability scans

## CSRF Policy

### CSRF Protection Implementation
**SameSite Cookies**: Strict for authenticated sessions
**CSRF Tokens**: Required for all state-changing requests
**Origin Validation**: Verify Origin and Referer headers
**Double Submit Cookie**: Additional protection layer

### Token Requirements
**Token Generation**: Cryptographically secure random strings
**Token Length**: Minimum 32 characters
**Token Expiration**: 1 hour for sensitive operations
**Token Storage**: HttpOnly, Secure cookies

### Exempt Endpoints
**GET Requests**: Read-only operations (no CSRF protection needed)
**Public APIs**: No authentication required
**Webhook Endpoints**: Signature-based verification

## Error Message Exposure Rules

### Safe Error Messages
**Authentication**: "Invalid credentials" (don't specify username/password)
**Authorization**: "Access denied" (don't reveal resource existence)
**Validation**: "Invalid input" (don't reveal validation rules)
**Database**: "Request failed" (don't reveal database errors)

### Error Logging Requirements
**Detailed Logs**: Full error details in server logs
**Security Events**: Separate security event log
**Log Rotation**: 90 days retention, secure deletion
**Log Access**: Role-based access control

### Public Error Responses
**Generic Messages**: User-friendly error messages
**Error Codes**: Internal error codes for debugging
**Rate Limiting**: Prevent error enumeration attacks
**Consistent Format**: Standardized error response structure

## Logging Requirements

### Security Event Categories
**Authentication**: Login attempts, password changes, MFA events
**Authorization**: Permission changes, role modifications
**Data Access**: Sensitive data access, exports
**System Events**: Configuration changes, admin actions
**Security Incidents**: Attack attempts, policy violations

### Log Format Standards
```json
{
  "timestamp": "2026-02-14T05:18:00.000Z",
  "level": "security",
  "event": "authentication_failure",
  "userId": "user_123",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "resource": "/api/login",
  "details": {
    "reason": "invalid_password",
    "attempts": 3
  },
  "sessionId": "sess_456"
}
```

### Log Retention and Access
**Retention Period**: 90 days for security logs
**Access Control**: Admin-only access to security logs
**Immutable Logs**: Write-once, read-many storage
**Backup Requirements**: Encrypted backups, separate location

## Secrets Policy

### Secret Classification
**High Sensitivity**: Database passwords, API keys, encryption keys
**Medium Sensitivity**: Service credentials, third-party tokens
**Low Sensitivity**: Configuration values, public keys

### Secret Storage Requirements
**Environment Variables**: For deployment secrets only
**Secret Management**: HashiCorp Vault or AWS Secrets Manager
**Encryption**: AES-256 at rest, TLS 1.3 in transit
**Access Logging**: All secret access logged

### Secret Rotation
**API Keys**: Quarterly rotation
**Database Passwords**: Semi-annual rotation
**Encryption Keys**: Annual rotation
**Service Accounts**: Immediate rotation on compromise

### Development Environment
**No Production Secrets**: Separate secrets for each environment
**Mock Services**: Use mock services for development
**Secret Scanning**: Prevent secrets in code repositories
**Documentation**: Secret management procedures documented

## Rate Limiting Requirements

### Rate Limiting Strategy
**User-Based**: Limits per authenticated user
**IP-Based**: Limits per IP address
**Endpoint-Based**: Different limits for different endpoints
**Tiered Limits**: Higher limits for premium users

### Default Rate Limits
**Authentication**: 5 attempts per minute per IP
**API Endpoints**: 100 requests per minute per user
**File Uploads**: 10 uploads per minute per user
**Password Reset**: 3 requests per hour per email
**Contact Forms**: 5 submissions per hour per IP

### Rate Limiting Implementation
**Sliding Window**: More accurate than fixed window
**Distributed Storage**: Redis for multi-server deployments
**Graceful Degradation**: Service remains available during limits
**Clear Headers**: Rate limit information in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642147200
```

## Security Headers

### Required Security Headers
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://trusted-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Header Validation
**Automated Testing**: Security header validation in CI/CD
**Monitoring**: Header validation in production monitoring
**Documentation**: Header purposes and configurations documented
**Review**: Quarterly header review and updates

## Dependency Security

### Vulnerability Scanning
**Tools**: OWASP Dependency Check, Snyk, GitHub Dependabot
**Frequency**: Daily automated scans
**Severity Threshold**: Block deployment for critical/high vulnerabilities
**False Positives**: Manual review for potential false positives

### Dependency Management
**Minimal Dependencies**: Only necessary dependencies
**Regular Updates**: Weekly dependency updates
**Vulnerability Monitoring**: Real-time vulnerability alerts
**License Compliance**: License compatibility checks

### Supply Chain Security
**Signed Packages**: Verify package signatures
**Package Lock**: Use package-lock.json or yarn.lock
**Private Registries**: Use private npm registry for sensitive packages
**Audit Trail**: Track all dependency changes

## Security Testing Requirements

### Automated Security Testing
**Static Analysis**: SAST tools in CI/CD pipeline
**Dynamic Analysis**: DAST tools for staging environment
**Interactive Analysis**: IAST tools for runtime security
**Dependency Scanning**: Vulnerability scanning for dependencies

### Manual Security Testing
**Penetration Testing**: Quarterly external penetration testing
**Code Review**: Security-focused code review for all changes
**Threat Modeling**: Threat modeling for new features
**Security Champions: Designated security experts in development teams

### Security Testing Tools
**OWASP ZAP**: Dynamic application security testing
**Burp Suite**: Web application security testing
**Nessus**: Network vulnerability scanning
**Metasploit**: Penetration testing framework

## Incident Response

### Incident Classification
**Critical**: Data breach, system compromise, service disruption
**High**: Security vulnerability, attempted breach
**Medium**: Policy violation, suspicious activity
**Low**: Minor security issue, configuration error

### Response Procedures
**Detection**: Automated monitoring and alerting
**Containment**: Isolate affected systems
**Eradication**: Remove threat and vulnerabilities
**Recovery**: Restore normal operations
**Lessons Learned**: Post-incident review and improvement

### Communication Protocol
**Internal**: Immediate notification to security team
**Management**: Executive notification within 1 hour
**Legal**: Legal counsel notification for data breaches
**Customers**: Customer notification within 72 hours for data breaches

## Security Compliance Checklist

### Pre-Development
- [ ] Security requirements documented
- [ ] Threat model completed
- [ ] Security tools configured
- [ ] Team security training completed
- [ ] Development environment secured

### During Development
- [ ] Secure coding practices followed
- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] Error handling secure
- [ ] Logging implemented

### Pre-Deployment
- [ ] Security tests passed
- [ ] Vulnerability scan clean
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Secrets management verified

### Post-Deployment
- [ ] Security monitoring active
- [ ] Incident response ready
- [ ] Regular security reviews
- [ ] Compliance audits scheduled
- [ ] Security updates applied
