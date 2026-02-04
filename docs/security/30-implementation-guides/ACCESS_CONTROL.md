---
title: Access Control and Authorization
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
related_docs:
  - APPLICATION_SECURITY.md
  - SECURITY_MONITORING.md
  - DEVELOPER_GUIDE.md
---

# Access Control and Authorization

## Table of Contents

- [Overview](#overview)
- [Authentication Mechanisms](#authentication-mechanisms)
- [Authorization Patterns](#authorization-patterns)
- [Multi-Tenant Isolation](#multi-tenant-isolation)
- [Session Management](#session-management)
- [Password Policies](#password-policies)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [API Key Management](#api-key-management)
- [Service Account Management](#service-account-management)
- [Access Review Procedures](#access-review-procedures)
- [Principle of Least Privilege](#principle-of-least-privilege)
- [Implementation Examples](#implementation-examples)

## Overview

This document outlines UBOS's access control and authorization architecture, providing guidelines for implementing secure authentication, authorization, and tenant isolation. The system uses a cookie-based authentication mechanism with role-based access control (RBAC) and strict multi-tenant data isolation.

### Architecture Principles

1. **Defense in Depth**: Multiple layers of authorization checks
2. **Zero Trust**: Never trust, always verify
3. **Least Privilege**: Users get minimum access needed
4. **Fail Secure**: Default deny on authorization failures
5. **Audit Trail**: Log all access decisions

## Authentication Mechanisms

### Current Cookie-Based System

UBOS implements a lightweight authentication system using HttpOnly cookies. This system is designed for simplicity while maintaining security best practices.

#### Authentication Flow

```typescript
// server/routes.ts - Login endpoint
app.get("/api/login", (req: Request, res: Response) => {
  // Generate a unique user identifier
  const userId = crypto.randomUUID();
  
  // Set HttpOnly cookie with security flags
  res.cookie(USER_ID_COOKIE_NAME, userId, {
    httpOnly: true,        // Prevents JavaScript access (XSS protection)
    sameSite: "lax",       // CSRF protection
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  
  res.json({ success: true, userId });
});
```

#### User Identification

The system supports two authentication methods:

1. **Browser-based**: HttpOnly cookie (`ubos_user_id`)
2. **API/Script-based**: Custom headers (`x-user-id` or `x-user`)

```typescript
// server/routes.ts - User ID extraction
function getUserIdFromRequest(req: Request): string | undefined {
  // Priority 1: Header-based authentication (for automation/testing)
  const headerUserId = req.header("x-user-id") || req.header("x-user");
  if (headerUserId) return headerUserId;

  // Priority 2: Cookie-based authentication (for browsers)
  const cookies = parseCookies(req.header("cookie"));
  return cookies[USER_ID_COOKIE_NAME];
}
```

#### Authentication Middleware

```typescript
// server/routes.ts - Require authentication
const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Standardize user claims for handlers
  (req as AuthenticatedRequest).user = { 
    claims: { sub: userId } 
  };
  
  next();
};

// Apply to protected routes
app.use("/api/*", requireAuth);
```

### Client-Side Authentication

```typescript
// client/src/lib/auth-utils.ts - Auto-redirect on 401
export async function fetchWithAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: "include", // Include cookies
  });

  if (response.status === 401) {
    // Auto-redirect to login
    window.location.href = "/api/login";
    throw new Error("Unauthorized");
  }

  return response;
}
```

### Session Logout

```typescript
// server/routes.ts - Logout endpoint
app.get("/api/logout", (req: Request, res: Response) => {
  // Clear the authentication cookie
  res.clearCookie(USER_ID_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
  });
  
  res.json({ success: true });
});
```

### Future Authentication Enhancements

When migrating to an external authentication provider (e.g., Auth0, OAuth 2.0), the current architecture is designed for easy upgrades:

```typescript
// Future: OAuth 2.0 / JWT-based authentication
interface AuthenticatedRequest extends Request {
  user: {
    claims: {
      sub: string;        // User ID (already implemented)
      email?: string;     // User email
      email_verified?: boolean;
      name?: string;      // Display name
      picture?: string;   // Avatar URL
      iss?: string;       // Token issuer
      exp?: number;       // Token expiration
    };
  };
}
```

## Authorization Patterns

### Role-Based Access Control (RBAC)

UBOS implements a four-tier RBAC system at the organization level:

```typescript
// shared/schema.ts - Member roles
export const memberRoleEnum = pgEnum("member_role", [
  "owner",   // Full control including billing and deletion
  "admin",   // Full access except billing and org deletion
  "member",  // Standard access to organization features
  "viewer",  // Read-only access
]);

// Organization members table
export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: memberRoleEnum("role").notNull().default("member"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
});
```

### Role Permissions Matrix

| Permission | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| View organization data | ✓ | ✓ | ✓ | ✓ |
| Create/Edit records | ✓ | ✓ | ✓ | ✗ |
| Delete records | ✓ | ✓ | ✓ | ✗ |
| Invite members | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Change member roles | ✓ | ✓ | ✗ | ✗ |
| Billing settings | ✓ | ✗ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ | ✗ |

### Authorization Middleware

```typescript
// server/routes.ts - Role-based authorization (example implementation)
type MemberRole = "owner" | "admin" | "member" | "viewer";

const requireRole = (minimumRole: MemberRole): RequestHandler => {
  return async (req, res, next) => {
    const userId = (req as AuthenticatedRequest).user.claims.sub;
    const orgId = req.params.organizationId || req.body.organizationId;

    // Get user's role in organization
    const member = await storage.getOrganizationMember(userId, orgId);
    
    if (!member) {
      res.status(403).json({ message: "Access denied: Not a member" });
      return;
    }

    // Check role hierarchy
    const roleHierarchy: Record<MemberRole, number> = {
      viewer: 1,
      member: 2,
      admin: 3,
      owner: 4,
    };

    if (roleHierarchy[member.role] < roleHierarchy[minimumRole]) {
      res.status(403).json({ 
        message: `Access denied: Requires ${minimumRole} role` 
      });
      return;
    }

    next();
  };
};

// Usage in routes
app.post("/api/organizations/:orgId/members", 
  requireAuth, 
  requireRole("admin"), 
  async (req, res) => {
    // Only admins and owners can invite members
  }
);

app.delete("/api/organizations/:orgId", 
  requireAuth, 
  requireRole("owner"), 
  async (req, res) => {
    // Only owners can delete organizations
  }
);
```

### Resource-Level Authorization

```typescript
// server/storage.ts - Always check both ID and organizationId
class Storage {
  async getClientCompany(
    id: string, 
    orgId: string
  ): Promise<ClientCompany | undefined> {
    const [client] = await db
      .select()
      .from(clientCompanies)
      .where(
        and(
          eq(clientCompanies.id, id),
          eq(clientCompanies.organizationId, orgId) // Critical: org scoping
        )
      );
    return client;
  }

  async updateClientCompany(
    id: string,
    orgId: string,
    data: Partial<InsertClientCompany>
  ): Promise<ClientCompany | undefined> {
    const [client] = await db
      .update(clientCompanies)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(clientCompanies.id, id),
          eq(clientCompanies.organizationId, orgId) // Critical: org scoping
        )
      )
      .returning();
    return client;
  }
}
```

## Multi-Tenant Isolation

### Architecture Overview

UBOS implements multi-tenancy through organization-based data isolation. Every business entity belongs to exactly one organization, enforced at the database and application layers.

### Database Schema Design

```typescript
// shared/schema.ts - Multi-tenant table pattern
export const clientCompanies = pgTable(
  "client_companies",
  {
    id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }), // Cascade delete
    name: varchar("name", { length: 255 }).notNull(),
    // ... other fields
  },
  (table) => ({
    // Index for fast org-scoped queries
    orgIndex: index("idx_clients_org").on(table.organizationId),
  })
);

export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // ... other fields
  },
  (table) => ({
    orgIndex: index("idx_deals_org").on(table.organizationId),
  })
);
```

### Organization Context Middleware

```typescript
// server/routes.ts - Organization context middleware
const requireOrganization: RequestHandler = async (req, res, next) => {
  const userId = (req as AuthenticatedRequest).user.claims.sub;
  
  // Get or create user's organization
  const org = await storage.getOrCreateOrganization(userId);
  
  if (!org) {
    res.status(500).json({ message: "Failed to get organization" });
    return;
  }

  // Attach organization to request
  (req as AuthenticatedRequest).organization = org;
  next();
};

// Apply to all API routes
app.use("/api/*", requireAuth, requireOrganization);
```

### Tenant Isolation Enforcement

```typescript
// server/storage.ts - Storage layer enforces isolation
class Storage {
  // ❌ WRONG: Missing org scoping
  async getClientWrong(id: string): Promise<ClientCompany | undefined> {
    const [client] = await db
      .select()
      .from(clientCompanies)
      .where(eq(clientCompanies.id, id)); // Vulnerable to cross-tenant access!
    return client;
  }

  // ✅ CORRECT: Always include organizationId
  async getClient(id: string, orgId: string): Promise<ClientCompany | undefined> {
    const [client] = await db
      .select()
      .from(clientCompanies)
      .where(
        and(
          eq(clientCompanies.id, id),
          eq(clientCompanies.organizationId, orgId) // Enforces isolation
        )
      );
    return client;
  }

  // List operations must also be scoped
  async listClients(orgId: string): Promise<ClientCompany[]> {
    return db
      .select()
      .from(clientCompanies)
      .where(eq(clientCompanies.organizationId, orgId))
      .orderBy(desc(clientCompanies.createdAt));
  }
}
```

### Cross-Tenant Access Prevention

```typescript
// tests/backend/multi-tenant-isolation.test.ts - Security tests
describe("Multi-tenant isolation", () => {
  it("prevents cross-organization access to clients", async () => {
    // Create two organizations
    const org1 = await createTestOrganization("Org 1");
    const org2 = await createTestOrganization("Org 2");

    // Create client in org1
    const client = await storage.createClientCompany({
      organizationId: org1.id,
      name: "Secret Client",
    });

    // Attempt to access from org2 (should fail)
    const result = await storage.getClientCompany(client.id, org2.id);
    expect(result).toBeUndefined(); // Access denied
  });

  it("prevents cross-organization updates", async () => {
    const org1 = await createTestOrganization("Org 1");
    const org2 = await createTestOrganization("Org 2");

    const client = await storage.createClientCompany({
      organizationId: org1.id,
      name: "Original Name",
    });

    // Attempt to update from org2 (should fail)
    const result = await storage.updateClientCompany(
      client.id,
      org2.id,
      { name: "Hacked Name" }
    );
    expect(result).toBeUndefined();

    // Verify original data unchanged
    const original = await storage.getClientCompany(client.id, org1.id);
    expect(original?.name).toBe("Original Name");
  });
});
```

## Session Management

### Session Configuration

```typescript
// server/routes.ts - Session cookie settings
const SESSION_CONFIG = {
  cookieName: "ubos_user_id",
  httpOnly: true,              // Prevent XSS attacks
  sameSite: "lax" as const,    // CSRF protection
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: "/",                   // Cookie scope
};

function setSessionCookie(res: Response, userId: string) {
  res.cookie(SESSION_CONFIG.cookieName, userId, SESSION_CONFIG);
}
```

### Session Lifecycle

1. **Creation**: User visits `/api/login` → UUID generated → Cookie set
2. **Validation**: Each request → Cookie extracted → User validated
3. **Refresh**: Automatic via cookie `maxAge` (no explicit refresh needed)
4. **Termination**: User visits `/api/logout` → Cookie cleared

### Session Security Best Practices

```typescript
// Production session configuration
const PRODUCTION_SESSION_CONFIG = {
  httpOnly: true,           // Required: Prevent JavaScript access
  secure: true,             // Required: HTTPS only
  sameSite: "strict",       // Recommended: Maximum CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // Recommended: 24 hours
  domain: ".yourdomain.com", // Optional: Subdomain sharing
  path: "/",
};

// Session validation with timing attack prevention
function validateSession(userId: string): Promise<boolean> {
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(userId),
    Buffer.from(expectedUserId)
  );
}
```

### Session Revocation

```typescript
// Future: Session management table for revocation
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Middleware to check session revocation
const checkSessionRevocation: RequestHandler = async (req, res, next) => {
  const sessionId = req.cookies.session_id;
  const session = await storage.getSession(sessionId);

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    res.clearCookie("session_id");
    res.status(401).json({ message: "Session expired or revoked" });
    return;
  }

  next();
};
```

## Password Policies

### Future Password Requirements

When implementing password-based authentication, enforce these policies:

```typescript
// shared/validation.ts - Password validation
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
  .refine(
    (password) => !commonPasswords.includes(password.toLowerCase()),
    "Password is too common"
  );

// Check against Have I Been Pwned API
async function checkPasswordBreach(password: string): Promise<boolean> {
  const hash = crypto.createHash("sha1").update(password).digest("hex");
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5).toUpperCase();

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();
  
  return text.includes(suffix);
}
```

### Password Storage

```typescript
// server/auth.ts - Secure password hashing
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // Adjust based on server performance

async function hashPassword(password: string): Promise<string> {
  // bcrypt automatically generates a salt
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password reset token generation
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Store reset token with expiration
export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});
```

## Multi-Factor Authentication

### MFA Implementation Considerations

```typescript
// Future: TOTP-based MFA
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";

// MFA enrollment
async function enrollMFA(userId: string): Promise<{
  secret: string;
  qrCode: string;
}> {
  const secret = speakeasy.generateSecret({
    name: `UBOS (${userEmail})`,
    issuer: "UBOS",
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  // Store secret (encrypted!)
  await storage.updateUser(userId, {
    mfaSecret: encryptSecret(secret.base32),
    mfaEnabled: false, // Enabled after verification
  });

  return { secret: secret.base32, qrCode };
}

// MFA verification
async function verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.mfaSecret) return false;

  const decryptedSecret = decryptSecret(user.mfaSecret);

  return speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps (60 seconds) of clock drift
  });
}

// MFA middleware
const requireMFA: RequestHandler = async (req, res, next) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (user.mfaEnabled && !req.session.mfaVerified) {
    res.status(403).json({ 
      message: "MFA verification required",
      mfaRequired: true 
    });
    return;
  }

  next();
};
```

## API Key Management

### API Key Schema

```typescript
// shared/schema.ts - API keys for programmatic access
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  keyHash: text("key_hash").notNull(),     // SHA-256 hash of full key
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  scopes: jsonb("scopes").$type<string[]>(), // ["read:clients", "write:deals"]
});
```

### API Key Generation

```typescript
// server/api-keys.ts - Secure API key generation
function generateApiKey(): { key: string; prefix: string; hash: string } {
  // Format: ubos_live_xxxxx... or ubos_test_xxxxx...
  const environment = process.env.NODE_ENV === "production" ? "live" : "test";
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const key = `ubos_${environment}_${randomBytes}`;
  
  const prefix = key.substring(0, 20); // For display: "ubos_live_abc123..."
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  return { key, prefix, hash };
}

// Create API key
app.post("/api/api-keys", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.claims.sub;
  const org = (req as AuthenticatedRequest).organization;
  const { name, scopes, expiresIn } = req.body;

  const { key, prefix, hash } = generateApiKey();

  const apiKey = await storage.createApiKey({
    organizationId: org.id,
    name,
    keyPrefix: prefix,
    keyHash: hash,
    createdBy: userId,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null,
    scopes,
  });

  // Return the full key ONCE (never stored plaintext)
  res.json({ apiKey, key });
});
```

### API Key Authentication

```typescript
// server/routes.ts - API key authentication middleware
async function authenticateApiKey(req: Request): Promise<Organization | null> {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.substring(7);
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await storage.getApiKeyByHash(hash);
  
  if (!apiKey) return null;
  if (apiKey.revokedAt) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used timestamp
  await storage.updateApiKeyLastUsed(apiKey.id);

  return storage.getOrganization(apiKey.organizationId);
}

// Middleware supporting both cookie and API key auth
const requireAuthOrApiKey: RequestHandler = async (req, res, next) => {
  // Try API key first
  const org = await authenticateApiKey(req);
  if (org) {
    (req as AuthenticatedRequest).organization = org;
    (req as AuthenticatedRequest).isApiKeyAuth = true;
    next();
    return;
  }

  // Fall back to cookie auth
  requireAuth(req, res, next);
};
```

### API Key Scope Validation

```typescript
// server/middleware.ts - Scope-based authorization
function requireScope(scope: string): RequestHandler {
  return async (req, res, next) => {
    const isApiKey = (req as AuthenticatedRequest).isApiKeyAuth;
    
    if (!isApiKey) {
      // Cookie auth has full access
      next();
      return;
    }

    const apiKey = (req as AuthenticatedRequest).apiKey;
    const scopes = apiKey.scopes || [];

    if (!scopes.includes(scope)) {
      res.status(403).json({ 
        message: `Insufficient scope: ${scope} required` 
      });
      return;
    }

    next();
  };
}

// Usage
app.get("/api/clients", 
  requireAuthOrApiKey, 
  requireScope("read:clients"), 
  async (req, res) => {
    // Handler code
  }
);
```

## Service Account Management

### Service Account Schema

```typescript
// shared/schema.ts - Service accounts for system operations
export const serviceAccounts = pgTable("service_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  role: memberRoleEnum("role").notNull().default("member"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  disabledAt: timestamp("disabled_at"),
});

export const serviceAccountKeys = pgTable("service_account_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceAccountId: text("service_account_id")
    .notNull()
    .references(() => serviceAccounts.id, { onDelete: "cascade" }),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
});
```

## Access Review Procedures

### Regular Access Audits

```typescript
// server/access-review.ts - Automated access review
interface AccessReviewReport {
  organizationId: string;
  reviewDate: Date;
  members: {
    userId: string;
    role: string;
    lastActivity: Date | null;
    daysSinceActivity: number;
    recommendation: "keep" | "review" | "remove";
  }[];
  apiKeys: {
    id: string;
    name: string;
    lastUsedAt: Date | null;
    daysSinceUse: number;
    recommendation: "keep" | "review" | "revoke";
  }[];
}

async function generateAccessReview(orgId: string): Promise<AccessReviewReport> {
  const members = await storage.getOrganizationMembers(orgId);
  const apiKeys = await storage.getApiKeys(orgId);
  
  const INACTIVE_THRESHOLD_DAYS = 90;

  return {
    organizationId: orgId,
    reviewDate: new Date(),
    members: members.map((member) => {
      const daysSinceActivity = member.lastActivity
        ? Math.floor((Date.now() - member.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      return {
        userId: member.userId,
        role: member.role,
        lastActivity: member.lastActivity,
        daysSinceActivity,
        recommendation: 
          daysSinceActivity > INACTIVE_THRESHOLD_DAYS ? "remove" :
          daysSinceActivity > 60 ? "review" : "keep",
      };
    }),
    apiKeys: apiKeys.map((key) => {
      const daysSinceUse = key.lastUsedAt
        ? Math.floor((Date.now() - key.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      return {
        id: key.id,
        name: key.name,
        lastUsedAt: key.lastUsedAt,
        daysSinceUse,
        recommendation:
          daysSinceUse > INACTIVE_THRESHOLD_DAYS ? "revoke" :
          daysSinceUse > 60 ? "review" : "keep",
      };
    }),
  };
}
```

### Quarterly Review Process

1. **Generate Review Report**: Run access review for all organizations
2. **Notify Owners**: Email owners with inactive users/keys
3. **Grace Period**: 14-day window for owners to respond
4. **Automated Cleanup**: Revoke unused API keys, flag inactive users
5. **Documentation**: Log all access changes

## Principle of Least Privilege

### Implementation Guidelines

```typescript
// ✅ CORRECT: Minimal permission grants
async function createInvitation(
  organizationId: string,
  invitedBy: string,
  email: string
) {
  // Default to viewer role (lowest privilege)
  return storage.createInvitation({
    organizationId,
    invitedBy,
    email,
    role: "viewer", // Can be elevated later if needed
  });
}

// ✅ CORRECT: Scope API keys to specific resources
const apiKey = await createApiKey({
  name: "Read-only dashboard",
  scopes: ["read:dashboard", "read:clients"], // Minimal scopes
  expiresIn: 90 * 24 * 60 * 60 * 1000, // 90 days
});

// ❌ WRONG: Over-privileged access
const apiKey = await createApiKey({
  name: "Dashboard key",
  scopes: ["*"], // Avoid wildcard permissions
  expiresIn: null, // Avoid non-expiring keys
});
```

### Permission Escalation

```typescript
// Require explicit approval for role changes
app.post("/api/organizations/:orgId/members/:memberId/promote",
  requireAuth,
  requireRole("owner"),
  async (req, res) => {
    const { newRole } = req.body;
    const { orgId, memberId } = req.params;

    // Audit log
    await storage.createAuditLog({
      organizationId: orgId,
      action: "member.role.change",
      actorId: (req as AuthenticatedRequest).user.claims.sub,
      targetId: memberId,
      metadata: { newRole },
    });

    // Update role
    await storage.updateOrganizationMember(memberId, { role: newRole });

    res.json({ success: true });
  }
);
```

## Implementation Examples

### Complete Authorization Flow

```typescript
// server/routes.ts - Complete authorization example
app.put("/api/clients/:id", requireAuth, async (req, res) => {
  try {
    // 1. Extract authenticated user
    const userId = (req as AuthenticatedRequest).user.claims.sub;
    const { id } = req.params;

    // 2. Get user's organization
    const org = await storage.getOrCreateOrganization(userId);
    if (!org) {
      res.status(500).json({ message: "Organization not found" });
      return;
    }

    // 3. Verify user is a member (and get role)
    const member = await storage.getOrganizationMember(userId, org.id);
    if (!member) {
      res.status(403).json({ message: "Not an organization member" });
      return;
    }

    // 4. Check role permissions (viewers cannot edit)
    if (member.role === "viewer") {
      res.status(403).json({ message: "Viewers cannot edit clients" });
      return;
    }

    // 5. Verify resource belongs to organization
    const existingClient = await storage.getClientCompany(id, org.id);
    if (!existingClient) {
      res.status(404).json({ message: "Client not found" });
      return;
    }

    // 6. Validate input
    const validatedData = updateClientSchema.parse(req.body);

    // 7. Perform update (automatically scoped to org)
    const updatedClient = await storage.updateClientCompany(
      id,
      org.id,
      validatedData
    );

    // 8. Audit log
    await storage.createAuditLog({
      organizationId: org.id,
      action: "client.update",
      actorId: userId,
      targetId: id,
      metadata: { changes: validatedData },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Failed to update client:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

### Testing Authorization

```typescript
// tests/backend/authorization.test.ts
describe("Authorization", () => {
  it("prevents viewers from editing clients", async () => {
    const org = await createTestOrganization();
    const viewer = await addMember(org.id, "viewer");
    const client = await createTestClient(org.id);

    const response = await request(app)
      .put(`/api/clients/${client.id}`)
      .set("x-user-id", viewer.userId)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Viewers cannot");
  });

  it("allows members to edit clients", async () => {
    const org = await createTestOrganization();
    const member = await addMember(org.id, "member");
    const client = await createTestClient(org.id);

    const response = await request(app)
      .put(`/api/clients/${client.id}`)
      .set("x-user-id", member.userId)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Updated Name");
  });
});
```

## Related Documents

- [APPLICATION_SECURITY.md](./APPLICATION_SECURITY.md) - Secure coding practices
- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Audit logging and monitoring
- [INCIDENT_RESPONSE.md](../50-incident-response/INCIDENT_RESPONSE.md) - Security incident procedures
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer security guidelines

## Compliance References

- **GDPR**: Article 32 (Security of processing)
- **SOC 2**: CC6.1 (Logical and Physical Access Controls)
- **HIPAA**: §164.312(a)(1) (Access Control)
- **PCI DSS**: Requirement 7 (Restrict access to cardholder data)

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-04 | Security Team | Initial release |
