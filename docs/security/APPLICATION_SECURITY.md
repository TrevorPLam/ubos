---
title: Application Security Guide
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
---

# Application Security Guide

## Table of Contents

- [Overview](#overview)
- [OWASP Top 10 Prevention](#owasp-top-10-prevention)
- [Secure Coding Practices](#secure-coding-practices)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [XSS Prevention](#xss-prevention)
- [CSRF Protection](#csrf-protection)
- [Authentication & Session Management](#authentication--session-management)
- [Authorization & Access Control](#authorization--access-control)
- [Secure API Design](#secure-api-design)
- [Error Handling](#error-handling)
- [File Upload Security](#file-upload-security)
- [Dependency Management](#dependency-management)
- [Security Testing](#security-testing)

## Overview

This guide provides comprehensive security guidance for the UBOS application built with TypeScript, React, Express, and Drizzle ORM. All team members should follow these practices to maintain a secure application.

### Tech Stack Security Context

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod schemas
- **Testing**: Vitest

## OWASP Top 10 Prevention

### 1. Broken Access Control

**Risk**: Users can access data/functions they shouldn't.

**Prevention**:

```typescript
// server/routes.ts - Always check organizationId
const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).user = { claims: { sub: userId } };
  next();
};

// Always scope queries to organization
async function getOrCreateOrg(userId: string): Promise<string> {
  let org = await storage.getUserOrganization(userId);
  if (!org) {
    org = await storage.createOrganization(
      { name: "My Organization", slug: `org-${userId.slice(0, 8)}` },
      userId,
    );
  }
  return org.id;
}
```

**Best Practices**:
- ✅ Always use `requireAuth` middleware on protected routes
- ✅ Resolve `orgId` before data access
- ✅ Filter all queries by `organizationId`
- ✅ Never trust client-provided IDs without validation
- ❌ Don't use predictable IDs (use UUIDs)

### 2. Cryptographic Failures

**Risk**: Sensitive data exposed due to weak encryption.

**Prevention**:

```typescript
// Use HttpOnly cookies for session tokens
app.get("/api/login", async (req, res) => {
  const userId = randomUUID();
  
  // HttpOnly prevents JavaScript access
  res.cookie(USER_ID_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  res.json({ success: true });
});
```

**Best Practices**:
- ✅ Use HTTPS in production (`secure: true` cookies)
- ✅ Store passwords with bcrypt/argon2 (never plain text)
- ✅ Use environment variables for secrets
- ✅ Encrypt sensitive data at rest
- ❌ Don't log sensitive data (passwords, tokens, PII)
- ❌ Don't store secrets in code or version control

### 3. Injection

**Risk**: SQL, NoSQL, command injection vulnerabilities.

**Prevention** (see [SQL Injection Prevention](#sql-injection-prevention))

### 4. Insecure Design

**Risk**: Fundamental security flaws in architecture.

**Prevention**:

```typescript
// Multi-tenancy isolation by design
export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  // ... other fields
}, (table) => ({
  orgIdIdx: index("clients_org_id_idx").on(table.organizationId),
}));

// Storage layer enforces tenant isolation
async getClient(orgId: string, clientId: string) {
  return db.query.clients.findFirst({
    where: and(
      eq(clients.organizationId, orgId),
      eq(clients.id, clientId)
    ),
  });
}
```

**Best Practices**:
- ✅ Design for security from the start
- ✅ Implement defense in depth (multiple security layers)
- ✅ Follow principle of least privilege
- ✅ Enforce tenant isolation in schema design
- ✅ Use rate limiting on sensitive endpoints

### 5. Security Misconfiguration

**Prevention**:

```typescript
// server/index.ts - Secure Express configuration
const app = express();

// Disable X-Powered-By header
app.disable("x-powered-by");

// Set security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// Use proper CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
  credentials: true,
}));
```

**Best Practices**:
- ✅ Remove default credentials
- ✅ Disable directory listings
- ✅ Use security headers
- ✅ Keep software updated
- ❌ Don't expose stack traces in production
- ❌ Don't use default configurations

### 6. Vulnerable and Outdated Components

**Prevention**:

```bash
# Regular dependency updates
npm audit
npm audit fix

# Check for known vulnerabilities
npm install -g npm-check-updates
ncu -u
```

**Best Practices**:
- ✅ Run `npm audit` before deployment
- ✅ Enable Dependabot alerts
- ✅ Review security advisories weekly
- ✅ Keep dependencies updated
- ❌ Don't use deprecated packages

### 7. Identification and Authentication Failures

**Prevention** (see [Authentication & Session Management](#authentication--session-management))

### 8. Software and Data Integrity Failures

**Prevention**:

```typescript
// Verify webhook signatures
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody as Buffer,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Process verified event
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return res.status(400).send("Webhook Error");
  }
});
```

**Best Practices**:
- ✅ Verify webhook signatures
- ✅ Use integrity checks (SRI for CDN resources)
- ✅ Implement CI/CD security checks
- ✅ Use package lock files
- ❌ Don't trust unsigned updates

### 9. Security Logging and Monitoring Failures

**Prevention** (see [SECURITY_MONITORING.md](./SECURITY_MONITORING.md))

### 10. Server-Side Request Forgery (SSRF)

**Prevention**:

```typescript
// Validate and sanitize URLs
import { z } from "zod";

const webhookSchema = z.object({
  url: z.string().url().refine((url) => {
    const parsed = new URL(url);
    // Block private IPs
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "169.254.169.254", // AWS metadata
      "::1",
    ];
    return !blockedHosts.some(blocked => parsed.hostname.includes(blocked));
  }, "URL cannot point to internal resources"),
});

app.post("/api/webhooks", async (req, res) => {
  const result = webhookSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  // Safe to use validated URL
  await registerWebhook(result.data.url);
  res.json({ success: true });
});
```

**Best Practices**:
- ✅ Validate all URLs
- ✅ Block private IP ranges
- ✅ Use allowlists for external APIs
- ✅ Implement network segmentation
- ❌ Don't allow user-controlled URLs without validation

## Secure Coding Practices

### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Defensive Programming

```typescript
// Always validate input
function processUser(data: unknown) {
  // ❌ BAD: Assumes structure
  const user = data as { email: string };
  
  // ✅ GOOD: Validates structure
  const userSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(255),
  });
  
  const result = userSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Invalid user data");
  }
  
  return result.data;
}

// Always check for null/undefined
function getUserEmail(userId: string): string | null {
  const user = users.get(userId);
  
  // ❌ BAD: Potential null pointer
  return user.email;
  
  // ✅ GOOD: Null-safe access
  return user?.email ?? null;
}
```

## Input Validation

### Zod Schema Validation

```typescript
// shared/schema.ts - Define validation schemas
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const insertClientSchema = createInsertSchema(clients, {
  name: z.string().min(1, "Name required").max(255, "Name too long"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone").optional(),
  website: z.string().url("Invalid URL").optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
```

### Request Validation Middleware

```typescript
// Reusable validation middleware
import { ZodSchema } from "zod";

function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.errors.map(e => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    
    req.body = result.data;
    next();
  };
}

// Usage in routes
app.post("/api/clients", 
  requireAuth,
  validateBody(insertClientSchema),
  async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    
    // req.body is now validated and typed
    const client = await storage.createClient(orgId, req.body);
    res.json(client);
  }
);
```

### Query Parameter Validation

```typescript
// Validate query parameters
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).default("20"),
});

app.get("/api/clients", requireAuth, async (req, res) => {
  const result = paginationSchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid pagination" });
  }
  
  const { page, limit } = result.data;
  // Safe to use validated parameters
});
```

### Sanitization

```typescript
// Sanitize HTML content (if storing user HTML)
import DOMPurify from "isomorphic-dompurify";

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href"],
  });
}

// Sanitize file names
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 255);
}
```

## SQL Injection Prevention

### Drizzle ORM Best Practices

```typescript
// ✅ GOOD: Parameterized queries via Drizzle
import { eq, and, like } from "drizzle-orm";

async function searchClients(orgId: string, searchTerm: string) {
  return db.query.clients.findMany({
    where: and(
      eq(clients.organizationId, orgId),
      like(clients.name, `%${searchTerm}%`)
    ),
  });
}

// ❌ BAD: String concatenation (DON'T DO THIS)
async function unsafeSearch(orgId: string, term: string) {
  // VULNERABLE TO SQL INJECTION!
  return db.execute(sql`
    SELECT * FROM clients 
    WHERE organization_id = '${orgId}' 
    AND name LIKE '%${term}%'
  `);
}

// ✅ GOOD: Using sql.raw with parameterization
async function advancedQuery(orgId: string, status: string) {
  return db.execute(sql`
    SELECT * FROM clients 
    WHERE organization_id = ${orgId} 
    AND status = ${status}
  `);
}
```

### Dynamic Queries

```typescript
// Building dynamic queries safely
function buildClientQuery(
  orgId: string,
  filters: { name?: string; status?: string }
) {
  const conditions = [eq(clients.organizationId, orgId)];
  
  if (filters.name) {
    conditions.push(like(clients.name, `%${filters.name}%`));
  }
  
  if (filters.status) {
    conditions.push(eq(clients.status, filters.status));
  }
  
  return db.query.clients.findMany({
    where: and(...conditions),
  });
}
```

## XSS Prevention

### React Automatic Escaping

```typescript
// ✅ React automatically escapes by default
function UserProfile({ name, bio }: { name: string; bio: string }) {
  // Safe: React escapes these values
  return (
    <div>
      <h1>{name}</h1>
      <p>{bio}</p>
    </div>
  );
}

// ❌ BAD: dangerouslySetInnerHTML without sanitization
function UnsafeComponent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ GOOD: Sanitize before using dangerouslySetInnerHTML
import DOMPurify from "isomorphic-dompurify";

function SafeComponent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### Content Security Policy

```typescript
// server/index.ts - Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for Vite
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  next();
});
```

### URL Validation

```typescript
// Validate URLs before rendering
const urlSchema = z.string().url().refine((url) => {
  const parsed = new URL(url);
  return ["http:", "https:"].includes(parsed.protocol);
}, "Only HTTP(S) URLs allowed");

function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  const result = urlSchema.safeParse(href);
  
  if (!result.success) {
    return <span>{children}</span>;
  }
  
  return (
    <a href={result.data} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
```

## CSRF Protection

### SameSite Cookies

```typescript
// Primary defense: SameSite cookies
res.cookie(USER_ID_COOKIE_NAME, userId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", // Prevents CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### CSRF Tokens (Additional Layer)

```typescript
import { randomBytes } from "crypto";

// Generate CSRF token
function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

// Validate CSRF token middleware
function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-csrf-token"];
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  
  next();
}

// Use on state-changing operations
app.post("/api/clients", requireAuth, validateCsrfToken, async (req, res) => {
  // Handle request
});

// Provide token to client
app.get("/api/csrf-token", requireAuth, (req, res) => {
  const token = generateCsrfToken();
  req.session.csrfToken = token;
  res.json({ csrfToken: token });
});
```

## Authentication & Session Management

### Session Configuration

```typescript
// server/routes.ts - Current implementation
const USER_ID_COOKIE_NAME = "ubos_user_id";

app.get("/api/login", async (req, res) => {
  const userId = randomUUID();
  
  res.cookie(USER_ID_COOKIE_NAME, userId, {
    httpOnly: true, // Prevents XSS
    secure: process.env.NODE_ENV === "production", // HTTPS only
    sameSite: "strict", // Prevents CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  res.json({ success: true });
});

app.post("/api/logout", requireAuth, (req, res) => {
  res.clearCookie(USER_ID_COOKIE_NAME);
  res.json({ success: true });
});
```

### Password Requirements (Future Enhancement)

```typescript
// When implementing password auth
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character");

import bcrypt from "bcrypt";

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Session Timeout

```typescript
// Implement session timeout
interface Session {
  userId: string;
  createdAt: number;
  lastActivity: number;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function validateSession(session: Session): boolean {
  const now = Date.now();
  return (now - session.lastActivity) < SESSION_TIMEOUT;
}
```

## Authorization & Access Control

### Role-Based Access Control (RBAC)

```typescript
// shared/schema.ts - Member roles
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin", 
  "member",
  "viewer"
]);

// Define role permissions
const rolePermissions = {
  owner: ["*"], // All permissions
  admin: ["read", "write", "delete", "invite"],
  member: ["read", "write"],
  viewer: ["read"],
} as const;

type Permission = "read" | "write" | "delete" | "invite";

function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role as keyof typeof rolePermissions];
  return permissions.includes("*") || permissions.includes(permission);
}

// Middleware to check permissions
function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    
    const member = await storage.getOrganizationMember(orgId, userId);
    
    if (!member || !hasPermission(member.role, permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
}

// Usage
app.delete("/api/clients/:id", 
  requireAuth,
  requirePermission("delete"),
  async (req, res) => {
    // Handle deletion
  }
);
```

### Resource-Level Authorization

```typescript
// Check ownership before allowing access
app.put("/api/projects/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  const projectId = req.params.id;
  
  // Verify project belongs to user's organization
  const project = await storage.getProject(orgId, projectId);
  
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  
  // Check if user has permission to modify
  const member = await storage.getOrganizationMember(orgId, userId);
  if (!hasPermission(member.role, "write")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Proceed with update
  const updated = await storage.updateProject(orgId, projectId, req.body);
  res.json(updated);
});
```

## Secure API Design

### Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.use("/api/", globalLimiter);
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
```

### API Versioning

```typescript
// Version your APIs for security updates
app.use("/api/v1", routerV1);
app.use("/api/v2", routerV2); // Can include security improvements

// Deprecation warnings
app.use("/api/v1", (req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "2026-12-31");
  next();
});
```

### Request Size Limits

```typescript
// Prevent DoS via large payloads
app.use(express.json({ 
  limit: "10mb", // Reasonable limit
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ 
  extended: false,
  limit: "10mb",
}));
```

### API Response Structure

```typescript
// Consistent error responses
interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// ✅ GOOD: Generic error messages
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  
  const response: ApiError = {
    message: status === 500 
      ? "Internal server error" // Generic for 500s
      : err.message,
  };
  
  // Only include details in development
  if (process.env.NODE_ENV === "development") {
    response.details = err.stack;
  }
  
  res.status(status).json(response);
});
```

## Error Handling

### Secure Error Messages

```typescript
// ❌ BAD: Exposes implementation details
try {
  await db.query.users.findFirst({ where: eq(users.email, email) });
} catch (err) {
  res.status(500).json({ error: err.message }); // Might expose DB structure
}

// ✅ GOOD: Generic error message
try {
  await db.query.users.findFirst({ where: eq(users.email, email) });
} catch (err) {
  console.error("Database error:", err); // Log for debugging
  res.status(500).json({ message: "An error occurred" }); // Generic to client
}
```

### Error Logging

```typescript
// server/index.ts - Structured error logging
export function logError(error: Error, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  
  // Never log sensitive data
  const sanitizedContext = context ? 
    Object.fromEntries(
      Object.entries(context).filter(([key]) => 
        !["password", "token", "secret", "ssn", "creditCard"].includes(key)
      )
    ) : {};
  
  console.error(JSON.stringify({
    timestamp,
    message: error.message,
    stack: error.stack,
    context: sanitizedContext,
  }));
}

// Usage
try {
  await processPayment(paymentData);
} catch (err) {
  logError(err as Error, { 
    userId, 
    orgId,
    // ❌ DON'T include: creditCard, cvv, password
  });
  res.status(500).json({ message: "Payment processing failed" });
}
```

## File Upload Security

### Validation and Sanitization

```typescript
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Configure multer with security in mind
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || "/tmp/uploads");
  },
  filename: (req, file, cb) => {
    // Generate safe filename
    const ext = path.extname(file.originalname);
    const safeExt = [".jpg", ".jpeg", ".png", ".pdf"].includes(ext.toLowerCase()) 
      ? ext 
      : "";
    
    cb(null, `${randomUUID()}${safeExt}`);
  },
});

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Validate MIME type
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];
  
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error("Invalid file type"));
    return;
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1, // Single file
  },
});

// File upload endpoint
app.post("/api/upload", 
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }
    
    // Additional validation: verify actual file content
    const fileType = await getFileType(req.file.path);
    if (!["image/jpeg", "image/png"].includes(fileType)) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: "Invalid file content" });
    }
    
    res.json({ 
      filename: req.file.filename,
      size: req.file.size,
    });
  }
);
```

### File Type Verification

```typescript
// Use file-type library to verify actual content
import { fileTypeFromFile } from "file-type";

async function verifyFileType(
  filePath: string,
  allowedTypes: string[]
): Promise<boolean> {
  const type = await fileTypeFromFile(filePath);
  
  if (!type) {
    return false;
  }
  
  return allowedTypes.includes(type.mime);
}
```

## Dependency Management

### Audit Process

```bash
# Before deployment
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Update specific package
npm update package-name
```

### Package.json Security

```json
{
  "scripts": {
    "preinstall": "npm audit --audit-level=high",
    "postinstall": "patch-package"
  }
}
```

### Lock Files

- ✅ Always commit `package-lock.json`
- ✅ Use `npm ci` in CI/CD (faster, more reliable)
- ❌ Don't manually edit lock files

### Dependency Review

```typescript
// Review dependencies before adding
// - Check npm weekly downloads
// - Review GitHub activity
// - Check for known vulnerabilities
// - Prefer packages with active maintenance
```

## Security Testing

### Unit Tests for Security

```typescript
// tests/backend/auth-middleware.test.ts
import { describe, it, expect } from 'vitest';

describe('Authentication', () => {
  it('should reject requests without auth', async () => {
    const response = await request(app)
      .get('/api/clients')
      .expect(401);
    
    expect(response.body).toEqual({ message: 'Unauthorized' });
  });
  
  it('should accept valid auth token', async () => {
    const response = await request(app)
      .get('/api/clients')
      .set('x-user-id', 'test-user')
      .expect(200);
  });
});

describe('Input Validation', () => {
  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/clients')
      .set('x-user-id', 'test-user')
      .send({ name: 'Test', email: 'invalid-email' })
      .expect(400);
    
    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ message: 'Invalid email' })
    );
  });
});
```

### Integration Tests

```typescript
// tests/backend/multi-tenant-isolation.test.ts
describe('Multi-tenant Isolation', () => {
  it('should not allow access to other org data', async () => {
    const org1User = 'user1';
    const org2User = 'user2';
    
    // Create data in org1
    const client = await request(app)
      .post('/api/clients')
      .set('x-user-id', org1User)
      .send({ name: 'Org1 Client' })
      .expect(200);
    
    // Try to access from org2
    await request(app)
      .get(`/api/clients/${client.body.id}`)
      .set('x-user-id', org2User)
      .expect(404); // Should not find
  });
});
```

### Security Scanning in CI/CD

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

## Quick Reference

### Security Checklist for New Features

- [ ] Authentication required on all protected endpoints
- [ ] Authorization checks for resource access
- [ ] Input validation with Zod schemas
- [ ] SQL queries parameterized (using Drizzle)
- [ ] XSS protection (React escaping or DOMPurify)
- [ ] CSRF protection (SameSite cookies)
- [ ] Error messages don't leak sensitive info
- [ ] Sensitive data not logged
- [ ] Rate limiting on sensitive endpoints
- [ ] Tests include security scenarios
- [ ] Dependencies audited (`npm audit`)

### Common Security Patterns

```typescript
// 1. Protected route
app.get("/api/resource", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.claims.sub;
  const orgId = await getOrCreateOrg(userId);
  // ... handle request with orgId
});

// 2. Input validation
const schema = z.object({ /* ... */ });
const result = schema.safeParse(data);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}

// 3. Safe database query
const results = await db.query.table.findMany({
  where: and(
    eq(table.organizationId, orgId),
    eq(table.id, id)
  ),
});

// 4. Secure error handling
try {
  // ... operation
} catch (err) {
  logError(err as Error, { userId, orgId });
  res.status(500).json({ message: "An error occurred" });
}
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/overview)
- [Zod Documentation](https://zod.dev/)

## Updates and Maintenance

This document should be reviewed and updated:
- After any security incident
- When adding new technologies
- Quarterly security review
- When OWASP Top 10 is updated

For questions or updates, contact the Security Team.
