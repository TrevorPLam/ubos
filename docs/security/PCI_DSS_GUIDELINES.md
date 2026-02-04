---
title: "PCI-DSS Compliance Guidelines"
version: "1.0.0"
last_updated: "2026-02-04"
framework: "PCI-DSS v4.0"
status: "active"
owner: "Security & Compliance Team"
classification: "internal"
---

# PCI-DSS Compliance Guidelines

## Overview

This document outlines UBOS's approach to PCI-DSS (Payment Card Industry Data Security Standard) compliance. While UBOS is not a payment processor, these guidelines ensure best practices for handling payment-related data if financial features are added.

## Scope

### Current Status
UBOS currently does NOT:
- Store credit card numbers (PAN)
- Process payment card transactions directly
- Store CVV/CVC codes
- Store full magnetic stripe data

### Future Considerations
If payment features are added, UBOS will:
- Use PCI-DSS compliant payment gateway (Stripe, PayPal, etc.)
- Implement tokenization for payment methods
- Minimize payment data in scope
- Follow SAQ-A or SAQ-A-EP compliance path

## PCI-DSS Requirements

### Requirement 1: Install and Maintain Network Security Controls

**1.1 - Network Security Controls**
```typescript
// Firewall configuration in production environment
// Only port 443 (HTTPS) and 5000 (app) exposed
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen({
  port,
  host: "0.0.0.0",
  ...(process.platform === "win32" ? {} : { reusePort: true }),
});
```

**Implementation:**
- Firewall rules restrict unnecessary ports
- Network segmentation between environments
- DMZ for public-facing services
- Internal network protected from direct internet access

**1.2 - Configuration Standards**
- Default passwords changed on all systems
- Unnecessary services disabled
- Security configuration documented
- Regular configuration reviews

**1.3 - Network Diagram**
```
Internet
    ↓
[Load Balancer/CDN]
    ↓
[Application Server] ← TLS 1.2+
    ↓
[Database Server] ← Encrypted Connection
    ↓
[Backup Storage] ← Encrypted
```

### Requirement 2: Apply Secure Configurations

**2.1 - System Hardening**
```typescript
// Environment-specific configuration
if (process.env.NODE_ENV === "production") {
  // Production-specific security settings
  serveStatic(app);
  
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: true,
    hsts: true,
    noSniff: true,
    frameguard: { action: 'deny' }
  }));
}
```

**Implementation:**
- Remove development tools in production
- Disable unnecessary features
- Strong security defaults
- Regular security patching

**2.2 - Vendor Defaults**
- Default credentials changed
- Sample applications removed
- Unnecessary accounts disabled
- Security parameters configured

**2.3 - Wireless Security**
- WPA2/WPA3 encryption required
- Strong wireless passwords
- Separate guest network
- Regular wireless security audits

### Requirement 3: Protect Stored Account Data

**3.1 - Data Retention Policy**
```typescript
/**
 * Financial data retention policy
 * 
 * IMPORTANT: Never store the following:
 * - Full credit card numbers (PAN) unless tokenized
 * - CVV/CVC security codes (prohibited)
 * - Full magnetic stripe data (prohibited)
 * - PIN or PIN blocks (prohibited)
 */

// Example: Store only last 4 digits and token
export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  
  // Only store non-sensitive data
  last4: varchar("last_4", { length: 4 }),
  brand: varchar("brand", { length: 20 }), // Visa, Mastercard, etc.
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  
  // Store token from payment gateway
  paymentToken: text("payment_token").notNull(), // Stripe token
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Implementation:**
- Never store full PAN (use tokenization)
- Never store CVV/CVC codes
- Minimize data retention
- Secure deletion of expired data

**3.2 - Masking**
```typescript
// Display masked card numbers
function maskCardNumber(last4: string): string {
  return `****-****-****-${last4}`;
}

// Log financial transactions without sensitive data
function logTransaction(transaction: Transaction) {
  log(`Transaction ${transaction.id}: ${transaction.amount} ${transaction.currency}`, {
    // Do NOT log: card numbers, CVV, etc.
    transactionId: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    timestamp: transaction.createdAt,
  });
}
```

**3.3 - Data Protection**
- Render PAN unreadable (encryption/tokenization)
- Strong cryptographic keys
- Secure key management
- Regular key rotation

**3.4 - Cryptographic Protection**
```typescript
// Database encryption configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA,
  }
});
```

### Requirement 4: Protect Data in Transit

**4.1 - Strong Cryptography**
```typescript
// TLS configuration for production
const tlsOptions = {
  minVersion: 'TLSv1.2' as const,
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':'),
  honorCipherOrder: true,
};
```

**Implementation:**
- TLS 1.2 or higher required
- Strong cipher suites only
- Valid certificates from trusted CA
- Regular certificate rotation

**4.2 - Secure Protocols**
- HTTPS for all web traffic
- Encrypted database connections
- No unencrypted transmission of cardholder data
- Secure email for sensitive communications

**4.3 - User-Initiated Security**
- Users must initiate sensitive operations
- Confirmation required for financial transactions
- Session timeout for inactive users
- Re-authentication for sensitive actions

### Requirement 5: Protect Systems from Malware

**5.1 - Anti-Malware**
- Anti-malware software on all systems
- Regular signature updates
- Periodic malware scans
- Automatic threat detection

**5.2 - Malware Protection**
- Application-level security scanning
- Dependency vulnerability scanning
```bash
npm audit
npm audit fix
```

**5.3 - Periodic Evaluation**
- Quarterly malware risk assessment
- Review of security controls
- Update protection mechanisms
- Test malware detection

### Requirement 6: Develop and Maintain Secure Systems

**6.1 - Secure Development**
```typescript
/**
 * Secure coding guidelines for financial features
 * 
 * 1. Input Validation: Validate all payment-related inputs
 * 2. Output Encoding: Prevent XSS in financial displays
 * 3. Authentication: Require re-authentication for payments
 * 4. Authorization: Verify user owns payment method
 * 5. Session Management: Short timeouts for payment sessions
 * 6. Error Handling: Don't expose payment system details
 * 7. Logging: Log transactions without sensitive data
 * 8. Encryption: Use TLS for all payment communications
 */

// Example: Secure payment method validation
export const createPaymentSchema = z.object({
  paymentToken: z.string().min(1), // Token from payment gateway
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  description: z.string().max(500),
  // Never accept: cardNumber, cvv, etc.
});
```

**6.2 - Vulnerability Management**
```json
{
  "scripts": {
    "security-check": "npm audit && npm outdated",
    "dependency-scan": "npm audit --audit-level=moderate",
    "test:security": "npm run test -- --grep security"
  }
}
```

**Implementation:**
- Regular dependency updates
- Automated vulnerability scanning
- Security testing in CI/CD
- Code review with security focus

**6.3 - Patch Management**
- Critical patches within 30 days
- High-risk patches within 90 days
- Regular update schedule
- Emergency patch procedures

**6.4 - Web Application Security**
```typescript
// OWASP Top 10 prevention
const securityMiddleware = [
  // SQL Injection: Prevented by Drizzle ORM parameterized queries
  // XSS: Prevented by React's built-in escaping
  // CSRF: Token validation required
  csrfProtection,
  
  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  
  // Rate limiting to prevent brute force
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  }),
];
```

### Requirement 7: Restrict Access to System Components

**7.1 - Access Control**
```typescript
// Role-based access control for financial operations
export const memberRoleEnum = pgEnum("member_role", [
  "owner",     // Full access including financial
  "admin",     // Administrative access, limited financial
  "member",    // Standard access, view financial
  "viewer"     // Read-only, no financial access
]);

// Permission check for financial operations
function requireFinancialAccess(req: Request, res: Response, next: NextFunction) {
  const userRole = req.user.role;
  
  if (!['owner', 'admin'].includes(userRole)) {
    return res.status(403).json({ 
      message: "Insufficient permissions for financial operations" 
    });
  }
  
  next();
}
```

**7.2 - Least Privilege**
- Default deny access
- Grant minimum necessary privileges
- Regular access reviews
- Automated access revocation

**7.3 - Access Documentation**
- Access control matrix maintained
- Role definitions documented
- Permission changes logged
- Regular access audits

### Requirement 8: Identify Users and Authenticate Access

**8.1 - User Identification**
```typescript
// Unique user identification
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Unique identifier
  email: varchar("email", { length: 255 }).unique().notNull(),
  // ... other fields
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastPasswordChange: timestamp("last_password_change"),
});
```

**8.2 - Authentication Methods**
```typescript
// Strong authentication implementation
const authenticationRules = {
  // Password requirements (when implemented)
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  
  // Session management
  sessionTimeout: 15 * 60 * 1000, // 15 minutes
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  
  // Account lockout
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
};
```

**8.3 - Multi-Factor Authentication (MFA)**
- MFA required for admin access
- MFA recommended for all users
- Multiple MFA options available
- Recovery procedures documented

**8.4 - Password Management**
- Strong password requirements
- Password history enforcement
- Regular password changes
- Secure password reset process

### Requirement 9: Restrict Physical Access

**9.1 - Physical Security**
- Data center access controls
- Visitor logging and escorts
- Video surveillance
- Secure disposal of media

**9.2 - Physical Access Controls**
- Badge/key card access
- Access logs maintained
- Regular access review
- Terminated employee access revoked

**9.3 - Device Security**
- Laptop encryption required
- Screen lock after inactivity
- Device inventory maintained
- Secure disposal procedures

### Requirement 10: Log and Monitor All Access

**10.1 - Audit Logging**
```typescript
/**
 * Audit logging for financial operations
 * 
 * Log the following events:
 * - Payment transactions
 * - Payment method changes
 * - Financial report access
 * - Refund operations
 * - Configuration changes
 */

interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress: string;
  metadata: Record<string, any>;
}

function auditLog(entry: AuditLog) {
  // Log without sensitive data
  log(`Audit: ${entry.action} on ${entry.resource}`, {
    timestamp: entry.timestamp,
    userId: entry.userId,
    action: entry.action,
    result: entry.result,
    ip: entry.ipAddress,
    // Do NOT log: payment details, card numbers, etc.
  });
}
```

**10.2 - Log Review**
- Daily log review for critical systems
- Weekly comprehensive review
- Automated alerting for anomalies
- Log retention for 1 year minimum

**10.3 - Log Protection**
- Logs tamper-evident
- Centralized log storage
- Access to logs restricted
- Regular backup of logs

**10.4 - Time Synchronization**
- NTP time synchronization
- Consistent time across systems
- Timezone documentation
- Time drift monitoring

### Requirement 11: Test Security Systems Regularly

**11.1 - Vulnerability Scanning**
```bash
# Regular vulnerability scans
npm audit
npm outdated
snyk test  # If using Snyk

# Static code analysis
npm run lint
npm run check
```

**11.2 - Penetration Testing**
- Annual external penetration test
- Quarterly internal vulnerability assessment
- Testing after significant changes
- Remediation of findings tracked

**11.3 - Intrusion Detection**
- IDS/IPS systems deployed
- File integrity monitoring
- Anomaly detection
- Real-time alerting

**11.4 - Network Monitoring**
- Network traffic analysis
- Unusual activity detection
- Regular security tool updates
- Alert investigation procedures

### Requirement 12: Support Information Security

**12.1 - Security Policy**
- Comprehensive security policy documented
- Annual policy review
- Policy communicated to all staff
- Acknowledgment of policy required

**12.2 - Risk Assessment**
- Annual risk assessment
- Quarterly risk review
- Risk treatment plans
- Residual risk acceptance

**12.3 - Security Awareness**
- Security training for all staff
- Annual refresher training
- Role-specific training
- Testing of security knowledge

**12.4 - Service Provider Management**
- Third-party risk assessment
- PCI-DSS compliance verification
- Contracts include security requirements
- Regular vendor audits

**12.5 - Incident Response**
- Documented in [Incident Response Plan](./INCIDENT_RESPONSE.md)
- 24/7 incident response capability
- Incident classification
- Post-incident review

## Implementation Guidelines

### For Payment Integration

**When integrating payment processing:**

1. **Use Tokenization**
```typescript
// Example: Stripe integration (recommended approach)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount: number, currency: string) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    // Payment details handled by Stripe, not stored in UBOS
  });
  
  return paymentIntent.client_secret;
}
```

2. **Minimize Scope**
- Use hosted payment pages (Stripe Checkout, PayPal)
- Never transmit full card data through UBOS
- Store only tokens and last 4 digits
- Redirect to payment gateway for card entry

3. **Compliance Path**
- SAQ-A: Fully outsourced payment processing
- SAQ-A-EP: E-commerce with redirect
- Avoid SAQ-D: Reduces compliance burden significantly

### Testing Requirements

```typescript
// Security tests for payment features
describe('Payment Security', () => {
  it('should never log full card numbers', () => {
    const transaction = createTransaction(testPaymentToken);
    const logs = getRecentLogs();
    
    logs.forEach(log => {
      expect(log).not.toMatch(/\d{13,19}/); // No full card numbers
      expect(log).not.toMatch(/\d{3,4}$/); // No CVV codes
    });
  });
  
  it('should require authentication for payment operations', async () => {
    const req = mockRequest({ /* no auth */ });
    const res = mockResponse();
    
    await processPayment(req, res);
    
    expect(res.statusCode).toBe(401);
  });
  
  it('should enforce organization scoping for payment methods', async () => {
    const orgA = 'org-123';
    const orgB = 'org-456';
    
    const paymentMethod = await createPaymentMethod(orgA, testData);
    const result = await getPaymentMethods(orgB);
    
    expect(result).not.toContainEqual(paymentMethod);
  });
});
```

## Compliance Status

### Current Implementation
- ✅ No cardholder data stored
- ✅ TLS for all communications
- ✅ Input validation framework
- ✅ Access control system
- ✅ Audit logging infrastructure
- ✅ Security testing framework

### Required for Payment Features
- 📋 Payment gateway integration (Stripe/PayPal)
- 📋 Tokenization implementation
- 📋 Enhanced authentication for payments
- 📋 Financial transaction logging
- 📋 PCI-DSS SAQ completion
- 📋 Quarterly vulnerability scans
- 📋 Annual penetration testing

## References

- [PCI Security Standards Council](https://www.pcisecuritystandards.org/)
- [PCI-DSS v4.0 Documentation](https://www.pcisecuritystandards.org/document_library/)
- [Stripe PCI Compliance](https://stripe.com/docs/security/guide#validating-pci-compliance)
- [OWASP Payment Security](https://owasp.org/www-community/vulnerabilities/)

## Review and Maintenance

**Review Schedule:**
- Monthly: Log review and security monitoring
- Quarterly: Vulnerability assessment
- Annually: Full PCI assessment (if processing payments)

**Next Review Date**: 2026-05-04  
**Document Owner**: Security & Compliance Team

---

**Note**: This document provides guidelines for PCI-DSS compliance. Actual PCI-DSS compliance requires formal assessment and certification by a Qualified Security Assessor (QSA).
