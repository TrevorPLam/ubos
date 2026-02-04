---
title: Developer Security Guide
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Developer Security Guide

## Table of Contents

- [Quick Start](#quick-start)
- [Security Checklist](#security-checklist)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Code Review Guidelines](#code-review-guidelines)
- [Testing Security Features](#testing-security-features)
- [Environment Variables](#environment-variables)
- [Secrets Management](#secrets-management)
- [Security Tools](#security-tools)
- [Incident Reporting](#incident-reporting)
- [Quick Reference](#quick-reference)

## Quick Start

### Before Writing Code

1. Read [APPLICATION_SECURITY.md](./APPLICATION_SECURITY.md)
2. Understand the threat model for your feature
3. Review existing security patterns in the codebase
4. Plan security controls before implementation

### Daily Security Habits

```bash
# Run these before committing
npm run lint          # Catch common issues
npm run check         # Type check
npm audit             # Check dependencies
npm test              # Run security tests
```

## Security Checklist

### Pull Request Security Checklist

Use this checklist for every PR:

#### Authentication & Authorization
- [ ] All protected endpoints use `requireAuth` middleware
- [ ] User identity verified before data access
- [ ] Organization ID (`orgId`) resolved and used in queries
- [ ] No hardcoded credentials or API keys
- [ ] Session handling follows security best practices

#### Input Validation
- [ ] All user input validated with Zod schemas
- [ ] Query parameters validated and sanitized
- [ ] File uploads have type and size restrictions
- [ ] URL parameters validated against expected formats
- [ ] No trust in client-provided IDs without verification

#### Data Access
- [ ] Database queries filtered by `organizationId`
- [ ] Using Drizzle ORM parameterized queries (not string concatenation)
- [ ] No raw SQL queries without parameterization
- [ ] Proper error handling for database operations
- [ ] Sensitive data encrypted at rest (if applicable)

#### Output & Responses
- [ ] Error messages don't expose sensitive information
- [ ] Stack traces not returned in production
- [ ] React components properly escape output
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] API responses have consistent structure

#### Security Headers & Configuration
- [ ] CORS properly configured (if modified)
- [ ] Security headers present (CSP, X-Frame-Options, etc.)
- [ ] Cookies use `httpOnly`, `secure`, and `sameSite`
- [ ] Rate limiting on sensitive endpoints (if applicable)
- [ ] Request size limits appropriate

#### Testing
- [ ] Unit tests include security scenarios
- [ ] Test cases for unauthorized access attempts
- [ ] Test cases for invalid input
- [ ] Multi-tenant isolation tested (if applicable)
- [ ] Integration tests pass

#### Dependencies
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] New dependencies reviewed for security
- [ ] Dependencies from trusted sources
- [ ] Lock file (`package-lock.json`) updated

#### Logging & Monitoring
- [ ] Sensitive data not logged (passwords, tokens, PII)
- [ ] Security events logged appropriately
- [ ] Error logging includes context (but not secrets)
- [ ] Log levels appropriate (debug vs production)

#### Documentation
- [ ] Security implications documented in code comments
- [ ] API documentation updated
- [ ] README updated if security setup changed
- [ ] Breaking changes noted

## Common Vulnerabilities

### 1. SQL Injection

**❌ Vulnerable Code:**

```typescript
// NEVER DO THIS - String concatenation
const userId = req.query.userId;
const query = `SELECT * FROM users WHERE id = '${userId}'`;
const result = await db.execute(sql.raw(query));
```

**✅ Secure Code:**

```typescript
// Always use parameterized queries
import { eq } from "drizzle-orm";

const userId = req.query.userId as string;
const result = await db.query.users.findFirst({
  where: eq(users.id, userId),
});
```

### 2. Cross-Site Scripting (XSS)

**❌ Vulnerable Code:**

```typescript
// Dangerous: Directly rendering user input
function UserComment({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
}
```

**✅ Secure Code:**

```typescript
// Safe: React automatically escapes
function UserComment({ comment }: { comment: string }) {
  return <div>{comment}</div>;
}

// If HTML is required, sanitize first
import DOMPurify from "isomorphic-dompurify";

function SafeUserComment({ comment }: { comment: string }) {
  const clean = DOMPurify.sanitize(comment, {
    ALLOWED_TAGS: ["b", "i", "em", "strong"],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### 3. Broken Access Control

**❌ Vulnerable Code:**

```typescript
// Trusts client-provided resource ID without verification
app.get("/api/projects/:id", requireAuth, async (req, res) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, req.params.id),
  });
  res.json(project); // User might access another org's data!
});
```

**✅ Secure Code:**

```typescript
// Always filter by organization
app.get("/api/projects/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.organizationId, orgId),
      eq(projects.id, req.params.id)
    ),
  });
  
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  
  res.json(project);
});
```

### 4. Sensitive Data Exposure

**❌ Vulnerable Code:**

```typescript
// Logging sensitive data
console.log("User login:", {
  email: user.email,
  password: user.password, // NEVER LOG PASSWORDS!
  ssn: user.ssn,
});

// Exposing detailed errors
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Exposes implementation details
  });
});
```

**✅ Secure Code:**

```typescript
// Safe logging
console.log("User login:", {
  email: user.email,
  userId: user.id,
  // Don't log: password, tokens, SSN, credit cards
});

// Generic error responses
app.use((err, req, res, next) => {
  // Log full error server-side
  logError(err, { userId: req.user?.id });
  
  // Return generic message to client
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? "Internal server error" : err.message,
  });
});
```

### 5. Missing Input Validation

**❌ Vulnerable Code:**

```typescript
app.post("/api/clients", requireAuth, async (req, res) => {
  // No validation - trusting client data
  const client = await storage.createClient(orgId, req.body);
  res.json(client);
});
```

**✅ Secure Code:**

```typescript
const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/).optional(),
});

app.post("/api/clients", requireAuth, async (req, res) => {
  const result = createClientSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.errors,
    });
  }
  
  const client = await storage.createClient(orgId, result.data);
  res.json(client);
});
```

### 6. Insecure Direct Object References (IDOR)

**❌ Vulnerable Code:**

```typescript
// Client can modify any task by changing the ID
app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  const task = await storage.updateTask(req.params.id, req.body);
  res.json(task);
});
```

**✅ Secure Code:**

```typescript
app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  
  // Verify task belongs to user's organization
  const existingTask = await storage.getTask(orgId, req.params.id);
  if (!existingTask) {
    return res.status(404).json({ message: "Task not found" });
  }
  
  // Update with orgId constraint
  const task = await storage.updateTask(orgId, req.params.id, req.body);
  res.json(task);
});
```

### 7. Unvalidated Redirects

**❌ Vulnerable Code:**

```typescript
app.get("/redirect", (req, res) => {
  const url = req.query.url as string;
  res.redirect(url); // Dangerous: Could redirect to malicious site
});
```

**✅ Secure Code:**

```typescript
const allowedDomains = ["example.com", "app.example.com"];

app.get("/redirect", (req, res) => {
  const url = req.query.url as string;
  
  try {
    const parsed = new URL(url);
    
    if (!allowedDomains.includes(parsed.hostname)) {
      return res.status(400).json({ message: "Invalid redirect URL" });
    }
    
    res.redirect(url);
  } catch {
    res.status(400).json({ message: "Invalid URL" });
  }
});
```

### 8. Mass Assignment

**❌ Vulnerable Code:**

```typescript
app.post("/api/users", requireAuth, async (req, res) => {
  // User could set any field, including 'isAdmin'
  const user = await db.insert(users).values(req.body).returning();
  res.json(user);
});
```

**✅ Secure Code:**

```typescript
const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  // Explicitly define allowed fields
  // isAdmin is NOT in this schema
});

app.post("/api/users", requireAuth, async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  // Only validated fields are inserted
  const user = await db.insert(users).values({
    ...result.data,
    isAdmin: false, // Set server-side, not from client
  }).returning();
  
  res.json(user);
});
```

## Code Review Guidelines

### Security-Focused Code Review

When reviewing code, pay special attention to:

#### 1. Authentication & Authorization

```typescript
// Check for these patterns:
✅ Middleware: requireAuth on protected routes
✅ User resolution: getUserIdFromRequest()
✅ Org scoping: getOrCreateOrg(userId)
✅ Resource ownership: Verify before modification

// Red flags:
🚩 Direct database access without orgId filter
🚩 Trusting client-provided IDs
🚩 Missing authentication on sensitive endpoints
🚩 Hardcoded credentials
```

#### 2. Input Validation

```typescript
// Look for:
✅ Zod schema validation on all inputs
✅ safeParse() with error handling
✅ Type guards for runtime checks
✅ Sanitization of dangerous inputs (HTML, file names)

// Red flags:
🚩 Direct use of req.body without validation
🚩 Type assertions (as) without runtime checks
🚩 String concatenation in queries
🚩 No file type validation on uploads
```

#### 3. Output Encoding

```typescript
// Check:
✅ React component properly escapes output
✅ DOMPurify used if dangerouslySetInnerHTML needed
✅ Error messages are generic, not exposing internals
✅ API responses follow standard structure

// Red flags:
🚩 dangerouslySetInnerHTML without sanitization
🚩 Raw HTML concatenation
🚩 Detailed error messages in production
🚩 Stack traces sent to client
```

#### 4. Data Access

```typescript
// Verify:
✅ Parameterized queries (Drizzle query builder)
✅ Organization ID always in WHERE clause
✅ Using eq(), and(), like() from drizzle-orm
✅ Proper error handling

// Red flags:
🚩 sql.raw() with string interpolation
🚩 Missing organizationId filter
🚩 Direct SQL string concatenation
🚩 Uncaught promise rejections
```

### Review Checklist Template

```markdown
## Security Review

### Authentication
- [ ] Protected endpoints use requireAuth
- [ ] User identity properly resolved
- [ ] Session handling secure

### Authorization
- [ ] Organization ID checked
- [ ] Resource ownership verified
- [ ] Role permissions enforced (if applicable)

### Input Validation
- [ ] Zod schemas for all inputs
- [ ] Query params validated
- [ ] File uploads restricted

### Data Access
- [ ] Parameterized queries only
- [ ] Organization scoping present
- [ ] No SQL injection vectors

### Output
- [ ] Error messages generic
- [ ] No sensitive data in responses
- [ ] Proper encoding/escaping

### Testing
- [ ] Security test cases included
- [ ] Edge cases covered
- [ ] Integration tests pass

### Dependencies
- [ ] npm audit clean
- [ ] New deps reviewed

**Additional Notes:**
[Add specific concerns or observations]
```

## Testing Security Features

### Unit Testing Auth

```typescript
// tests/backend/auth-middleware.test.ts
import { describe, it, expect } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../utils/express-mocks';

describe('requireAuth middleware', () => {
  it('rejects unauthenticated requests', () => {
    const req = mockRequest({});
    const res = mockResponse();
    const next = mockNext();
    
    requireAuth(req, res, next);
    
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
    expect(next.called).toBe(false);
  });
  
  it('accepts valid authentication', () => {
    const req = mockRequest({
      headers: { 'x-user-id': 'test-user' },
    });
    const res = mockResponse();
    const next = mockNext();
    
    requireAuth(req, res, next);
    
    expect(next.called).toBe(true);
    expect(req.user).toBeDefined();
  });
});
```

### Testing Input Validation

```typescript
describe('Client creation validation', () => {
  it('rejects invalid email', async () => {
    const response = await request(app)
      .post('/api/clients')
      .set('x-user-id', 'test-user')
      .send({ 
        name: 'Test Client',
        email: 'not-an-email',
      })
      .expect(400);
    
    expect(response.body.errors).toContainEqual(
      expect.objectContaining({
        path: 'email',
        message: expect.stringContaining('email'),
      })
    );
  });
  
  it('rejects missing required fields', async () => {
    const response = await request(app)
      .post('/api/clients')
      .set('x-user-id', 'test-user')
      .send({}) // Missing name
      .expect(400);
  });
});
```

### Testing Multi-Tenant Isolation

```typescript
// tests/backend/multi-tenant-isolation.test.ts
describe('Multi-tenant isolation', () => {
  it('prevents cross-organization data access', async () => {
    const user1 = 'user-org1';
    const user2 = 'user-org2';
    
    // Create resource in org1
    const created = await request(app)
      .post('/api/projects')
      .set('x-user-id', user1)
      .send({ name: 'Org1 Project' })
      .expect(201);
    
    // Attempt access from org2
    await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set('x-user-id', user2)
      .expect(404); // Should not find
    
    // Attempt update from org2
    await request(app)
      .put(`/api/projects/${created.body.id}`)
      .set('x-user-id', user2)
      .send({ name: 'Hacked' })
      .expect(404);
    
    // Verify original user can still access
    await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set('x-user-id', user1)
      .expect(200);
  });
});
```

### Testing Error Handling

```typescript
describe('Error handling', () => {
  it('returns generic error for server errors', async () => {
    // Simulate server error
    vi.spyOn(storage, 'getClients').mockRejectedValue(
      new Error('Database connection failed')
    );
    
    const response = await request(app)
      .get('/api/clients')
      .set('x-user-id', 'test-user')
      .expect(500);
    
    // Should not expose internal error
    expect(response.body.message).toBe('Internal server error');
    expect(response.body.stack).toBeUndefined();
  });
});
```

### Security Test Template

```typescript
// Template for security tests
describe('Security: [Feature Name]', () => {
  describe('Authentication', () => {
    it('requires authentication', async () => {
      // Test without auth
    });
  });
  
  describe('Authorization', () => {
    it('enforces organization isolation', async () => {
      // Test cross-org access
    });
    
    it('checks resource ownership', async () => {
      // Test IDOR
    });
  });
  
  describe('Input Validation', () => {
    it('validates required fields', async () => {
      // Test missing fields
    });
    
    it('rejects invalid formats', async () => {
      // Test malformed input
    });
    
    it('enforces size limits', async () => {
      // Test oversized input
    });
  });
  
  describe('Error Handling', () => {
    it('returns generic errors', async () => {
      // Test error responses
    });
  });
});
```

## Environment Variables

### Secure Configuration

```bash
# .env.example - Never commit actual secrets!
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Server
PORT=5000
NODE_ENV=development

# Authentication (when implemented)
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key

# External APIs
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature Flags
ENABLE_ANALYTICS=false
```

### Loading Environment Variables

```typescript
// server/config.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(32).optional(),
});

export const config = envSchema.parse(process.env);
```

### Security Best Practices

```typescript
// ✅ DO: Use environment variables for secrets
const apiKey = process.env.STRIPE_SECRET_KEY;

// ❌ DON'T: Hardcode secrets
const apiKey = "sk_test_abc123...";

// ✅ DO: Validate environment variables at startup
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// ✅ DO: Use different values per environment
const baseUrl = process.env.NODE_ENV === "production"
  ? "https://api.example.com"
  : "http://localhost:5000";
```

## Secrets Management

### What Are Secrets?

Secrets include:
- API keys and tokens
- Database passwords
- JWT signing keys
- OAuth client secrets
- Webhook secrets
- Encryption keys
- Service account credentials

### Local Development

```bash
# .env (local only - NEVER commit)
DATABASE_URL=postgresql://localhost/ubos_dev
STRIPE_SECRET_KEY=sk_test_123...

# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

### Production Secrets

For production, use environment variables or secret management:

```bash
# Example: Using Heroku
heroku config:set DATABASE_URL=postgresql://...

# Example: Using AWS Secrets Manager
aws secretsmanager create-secret \
  --name ubos/database-url \
  --secret-string "postgresql://..."
```

### Rotation

```typescript
// Support key rotation
const verifyToken = (token: string) => {
  const secrets = [
    process.env.JWT_SECRET,      // Current
    process.env.JWT_SECRET_OLD,  // Previous (for rotation)
  ].filter(Boolean);
  
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch {
      continue;
    }
  }
  
  throw new Error("Invalid token");
};
```

### Secrets in CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
```

## Security Tools

### Linting and Type Checking

```bash
# ESLint - Catch common security issues
npm run lint

# TypeScript - Type safety
npm run check

# Prettier - Consistent formatting
npm run format:check
```

### Dependency Scanning

```bash
# npm audit - Check for known vulnerabilities
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Check specific severity
npm audit --audit-level=high
```

### Static Analysis

```bash
# Add to package.json scripts
"scripts": {
  "security:scan": "npm audit && npm run check"
}
```

### IDE Security Extensions

**VS Code Extensions:**
- ESLint
- SonarLint
- GitLens (for code history)
- Better Comments (highlight security TODOs)

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run check",
      "pre-push": "npm audit && npm test"
    }
  }
}
```

## Incident Reporting

### When to Report

Report immediately if you discover:
- Security vulnerability in code
- Exposed credentials or secrets
- Suspicious activity in logs
- Data breach or unauthorized access
- Dependency with critical vulnerability

### How to Report

1. **DO NOT** discuss in public channels (Slack, email)
2. **DO** contact Security Team directly
3. **DO** include reproduction steps
4. **DO** assess severity (Critical/High/Medium/Low)

### Report Template

```
Subject: Security Issue: [Brief Description]

Severity: [Critical/High/Medium/Low]

Description:
[What is the vulnerability?]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Impact:
[What data/systems are affected?]

Proposed Fix:
[If known]

Discovered By: [Your name]
Date: [Date]
```

### After Reporting

- Do not merge affected code
- Work with Security Team on fix
- Test fix thoroughly
- Update documentation
- Post-mortem for significant issues

## Quick Reference

### Security Code Patterns

```typescript
// 1. Authenticated endpoint
app.get("/api/resource", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  const data = await storage.getResource(orgId);
  res.json(data);
});

// 2. Input validation
const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});

const result = schema.safeParse(input);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}

// 3. Database query with org scoping
const results = await db.query.table.findMany({
  where: and(
    eq(table.organizationId, orgId),
    eq(table.status, status)
  ),
});

// 4. Secure error handling
try {
  await operation();
} catch (err) {
  logError(err as Error, { userId, orgId });
  res.status(500).json({ message: "An error occurred" });
}

// 5. Safe file handling
const safeFileName = fileName
  .replace(/[^a-zA-Z0-9._-]/g, "_")
  .substring(0, 255);
```

### Security Commands

```bash
# Before committing
npm run lint && npm run check && npm test

# Check dependencies
npm audit
npm outdated

# Run tests with coverage
npm run coverage

# Type check all files
npx tsc --noEmit

# Security scan in CI
npm audit --audit-level=high
```

### Common Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});
```

### Validation Patterns

```typescript
// Email
z.string().email()

// URL
z.string().url()

// UUID
z.string().uuid()

// Phone
z.string().regex(/^\+?[\d\s\-()]+$/)

// Enum
z.enum(["active", "inactive", "pending"])

// Positive integer
z.number().int().positive()

// Date string
z.string().datetime()

// Min/Max length
z.string().min(1).max(255)
```

## Additional Resources

- [APPLICATION_SECURITY.md](./APPLICATION_SECURITY.md) - Comprehensive security guide
- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Logging and monitoring
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Getting Help

- **Questions**: Ask in #security channel
- **Code Review**: Tag @security-team
- **Incidents**: Contact Security Team directly
- **Updates**: Watch this document for changes

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for review!
