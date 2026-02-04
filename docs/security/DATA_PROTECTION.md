---
title: Data Protection and Encryption
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "internal"
related_docs:
  - APPLICATION_SECURITY.md
  - ACCESS_CONTROL.md
  - GDPR_COMPLIANCE.md
  - HIPAA_COMPLIANCE.md
---

# Data Protection and Encryption

## Table of Contents

- [Overview](#overview)
- [Data Classification](#data-classification)
- [Encryption at Rest](#encryption-at-rest)
- [Encryption in Transit](#encryption-in-transit)
- [Key Management](#key-management)
- [Data Masking and Tokenization](#data-masking-and-tokenization)
- [Data Retention Policies](#data-retention-policies)
- [Secure Data Deletion](#secure-data-deletion)
- [Backup Security](#backup-security)
- [Data Loss Prevention](#data-loss-prevention)
- [PII Handling](#pii-handling)
- [Implementation Examples](#implementation-examples)

## Overview

This document outlines UBOS's data protection and encryption strategies, ensuring confidentiality, integrity, and compliance with privacy regulations (GDPR, HIPAA, CCPA). All sensitive data must be protected both at rest and in transit using industry-standard encryption methods.

### Data Protection Principles

1. **Defense in Depth**: Multiple layers of protection
2. **Encryption by Default**: All sensitive data encrypted
3. **Data Minimization**: Collect only what's necessary
4. **Purpose Limitation**: Use data only for stated purposes
5. **Access Control**: Restrict data access based on need

## Data Classification

### Classification Levels

UBOS classifies data into four categories with corresponding protection requirements:

```typescript
// shared/data-classification.ts
export enum DataClassification {
  PUBLIC = "public",           // No restrictions (marketing content, public docs)
  INTERNAL = "internal",       // Internal use only (org names, project titles)
  CONFIDENTIAL = "confidential", // Business-sensitive (financial data, contracts)
  RESTRICTED = "restricted",   // Highly sensitive (PII, credentials, payment data)
}

interface ClassificationMetadata {
  level: DataClassification;
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionDays: number;
  allowedRegions?: string[];
}

const CLASSIFICATION_RULES: Record<DataClassification, ClassificationMetadata> = {
  [DataClassification.PUBLIC]: {
    level: DataClassification.PUBLIC,
    encryptionRequired: false,
    auditRequired: false,
    retentionDays: 365,
  },
  [DataClassification.INTERNAL]: {
    level: DataClassification.INTERNAL,
    encryptionRequired: true,
    auditRequired: false,
    retentionDays: 1095, // 3 years
  },
  [DataClassification.CONFIDENTIAL]: {
    level: DataClassification.CONFIDENTIAL,
    encryptionRequired: true,
    auditRequired: true,
    retentionDays: 2555, // 7 years
  },
  [DataClassification.RESTRICTED]: {
    level: DataClassification.RESTRICTED,
    encryptionRequired: true,
    auditRequired: true,
    retentionDays: 2555, // 7 years
    allowedRegions: ["us", "eu"], // Data residency requirements
  },
};
```

### Data Classification Matrix

| Data Type | Classification | Examples | Storage Requirements |
|-----------|---------------|----------|---------------------|
| Public content | PUBLIC | Marketing materials, public docs | Standard storage |
| Business data | INTERNAL | Organization names, project titles | Encrypted at rest |
| Financial data | CONFIDENTIAL | Invoices, deals, contracts | Encrypted + audited |
| Personal data | RESTRICTED | Email, phone, SSN, payment info | Encrypted + access controls + audited |
| Authentication | RESTRICTED | Passwords, API keys, tokens | Hashed/encrypted + strict access |

### Field-Level Classification

```typescript
// shared/schema.ts - Annotate tables with classification
export const clientContacts = pgTable("client_contacts", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(), // INTERNAL
  
  // INTERNAL - Business data
  companyName: varchar("company_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  
  // RESTRICTED - PII
  firstName: varchar("first_name", { length: 255 }), // PII
  lastName: varchar("last_name", { length: 255 }),   // PII
  email: varchar("email", { length: 255 }),          // PII
  phone: varchar("phone", { length: 50 }),           // PII
  
  // CONFIDENTIAL - Business sensitive
  notes: text("notes"), // May contain business-sensitive info
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type annotation for runtime classification
export const CONTACT_FIELD_CLASSIFICATION = {
  id: DataClassification.INTERNAL,
  organizationId: DataClassification.INTERNAL,
  companyName: DataClassification.INTERNAL,
  jobTitle: DataClassification.INTERNAL,
  firstName: DataClassification.RESTRICTED,
  lastName: DataClassification.RESTRICTED,
  email: DataClassification.RESTRICTED,
  phone: DataClassification.RESTRICTED,
  notes: DataClassification.CONFIDENTIAL,
} as const;
```

## Encryption at Rest

### Database Encryption

UBOS relies on PostgreSQL's native encryption capabilities and cloud provider encryption.

#### PostgreSQL TDE (Transparent Data Encryption)

```bash
# PostgreSQL configuration (postgresql.conf)
# Enable SSL for client connections
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/root.crt'

# Force SSL connections
ssl_min_protocol_version = 'TLSv1.2'
```

#### Cloud Provider Encryption

```typescript
// Infrastructure as Code (Terraform example)
// AWS RDS with encryption at rest
resource "aws_db_instance" "ubos_postgres" {
  identifier              = "ubos-postgres-prod"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = "db.t3.medium"
  
  # Encryption at rest
  storage_encrypted       = true
  kms_key_id             = aws_kms_key.rds_encryption.arn
  
  # Encryption in transit
  ca_cert_identifier      = "rds-ca-2019"
  
  # Backup encryption
  backup_retention_period = 30
  copy_tags_to_snapshot  = true
  
  # Enable encryption for performance insights
  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.rds_encryption.arn
}
```

### Application-Level Encryption

For highly sensitive fields that require encryption beyond database-level protection:

```typescript
// server/encryption.ts - Field-level encryption
import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;

// Load encryption key from environment (managed by secrets manager)
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }
  return Buffer.from(key, "base64");
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptField(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptField(encrypted: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(encrypted.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");
  
  return plaintext;
}

// Example: Encrypt sensitive notes
export const clientContactsEncrypted = pgTable("client_contacts", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  email: varchar("email", { length: 255 }),
  
  // Store encrypted data as JSONB
  encryptedNotes: jsonb("encrypted_notes").$type<EncryptedData>(),
});

// Storage layer handles encryption/decryption transparently
class EncryptedStorage {
  async createContact(data: {
    organizationId: string;
    email: string;
    notes: string;
  }) {
    const encryptedNotes = encryptField(data.notes);
    
    const [contact] = await db
      .insert(clientContactsEncrypted)
      .values({
        organizationId: data.organizationId,
        email: data.email,
        encryptedNotes,
      })
      .returning();
      
    return contact;
  }
  
  async getContact(id: string, orgId: string) {
    const [contact] = await db
      .select()
      .from(clientContactsEncrypted)
      .where(
        and(
          eq(clientContactsEncrypted.id, id),
          eq(clientContactsEncrypted.organizationId, orgId)
        )
      );
      
    if (!contact) return null;
    
    // Decrypt notes before returning
    return {
      ...contact,
      notes: contact.encryptedNotes 
        ? decryptField(contact.encryptedNotes)
        : null,
    };
  }
}
```

### File Storage Encryption

```typescript
// server/storage.ts - Encrypted file storage
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

async function uploadEncryptedFile(
  file: Buffer,
  key: string,
  organizationId: string
): Promise<string> {
  // Files are automatically encrypted by S3 server-side encryption
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `${organizationId}/${key}`,
      Body: file,
      
      // Server-side encryption with AWS KMS
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: process.env.KMS_KEY_ID,
      
      // Additional security headers
      ContentType: "application/octet-stream",
      Metadata: {
        organizationId,
        uploadedAt: new Date().toISOString(),
      },
    })
  );
  
  return `${organizationId}/${key}`;
}

async function downloadEncryptedFile(
  key: string,
  organizationId: string
): Promise<Buffer> {
  // Verify organization has access to file
  if (!key.startsWith(`${organizationId}/`)) {
    throw new Error("Access denied: File does not belong to organization");
  }
  
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })
  );
  
  // S3 automatically decrypts on download
  return Buffer.from(await response.Body!.transformToByteArray());
}
```

## Encryption in Transit

### TLS Configuration

All network communications must use TLS 1.2 or higher.

#### Express.js HTTPS Setup

```typescript
// server/index.ts - Production HTTPS configuration
import https from "https";
import fs from "fs";

if (process.env.NODE_ENV === "production") {
  // Load TLS certificates
  const privateKey = fs.readFileSync(
    process.env.TLS_KEY_PATH || "/etc/ssl/private/ubos.key",
    "utf8"
  );
  const certificate = fs.readFileSync(
    process.env.TLS_CERT_PATH || "/etc/ssl/certs/ubos.crt",
    "utf8"
  );
  const ca = fs.readFileSync(
    process.env.TLS_CA_PATH || "/etc/ssl/certs/ca-bundle.crt",
    "utf8"
  );

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
    
    // TLS configuration
    minVersion: "TLSv1.2" as const,
    ciphers: [
      "ECDHE-ECDSA-AES128-GCM-SHA256",
      "ECDHE-RSA-AES128-GCM-SHA256",
      "ECDHE-ECDSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-ECDSA-CHACHA20-POLY1305",
      "ECDHE-RSA-CHACHA20-POLY1305",
    ].join(":"),
    honorCipherOrder: true,
  };

  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(443, () => {
    console.log("HTTPS server running on port 443");
  });
  
  // Redirect HTTP to HTTPS
  const httpApp = express();
  httpApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
  httpApp.listen(80, () => {
    console.log("HTTP redirect server running on port 80");
  });
} else {
  // Development: HTTP only
  const port = parseInt(process.env.PORT || "5000", 10);
  app.listen(port, () => {
    console.log(`Development server running on http://localhost:${port}`);
  });
}
```

#### Database TLS Connection

```typescript
// server/db.ts - PostgreSQL TLS connection
import { Pool } from "pg";
import fs from "fs";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // SSL/TLS configuration
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync("/path/to/ca-certificate.crt").toString(),
    
    // Client certificate authentication (optional)
    cert: process.env.DB_CLIENT_CERT 
      ? fs.readFileSync(process.env.DB_CLIENT_CERT).toString()
      : undefined,
    key: process.env.DB_CLIENT_KEY
      ? fs.readFileSync(process.env.DB_CLIENT_KEY).toString()
      : undefined,
  } : false,
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Security Headers

```typescript
// server/middleware/security-headers.ts
import { Request, Response, NextFunction } from "express";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // HSTS: Force HTTPS for 1 year
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for React
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  next();
}

// Apply to all routes
app.use(securityHeaders);
```

## Key Management

### Encryption Key Hierarchy

```
Master Key (AWS KMS / Cloud Provider)
    └── Data Encryption Keys (DEKs)
        ├── Database Encryption Key
        ├── File Storage Encryption Key
        ├── Application Encryption Key (ENCRYPTION_KEY)
        └── Backup Encryption Key
```

### Key Rotation Strategy

```typescript
// server/key-rotation.ts
interface EncryptionKeyVersion {
  version: number;
  keyId: string;
  createdAt: Date;
  rotatedAt?: Date;
  status: "active" | "deprecated" | "destroyed";
}

export const encryptionKeys = pgTable("encryption_keys", {
  version: integer("version").primaryKey(),
  keyId: text("key_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  rotatedAt: timestamp("rotated_at"),
  status: text("status").$type<"active" | "deprecated" | "destroyed">().default("active"),
});

class KeyRotationManager {
  private currentVersion: number = 1;

  async rotateEncryptionKey(): Promise<void> {
    // 1. Generate new key version
    const newVersion = this.currentVersion + 1;
    const newKeyId = await this.generateNewKey();

    // 2. Mark current key as deprecated
    await db
      .update(encryptionKeys)
      .set({ status: "deprecated", rotatedAt: new Date() })
      .where(eq(encryptionKeys.version, this.currentVersion));

    // 3. Store new key
    await db.insert(encryptionKeys).values({
      version: newVersion,
      keyId: newKeyId,
      status: "active",
    });

    this.currentVersion = newVersion;

    // 4. Re-encrypt data in background (async job)
    await this.scheduleDataReEncryption(this.currentVersion, newVersion);
  }

  async scheduleDataReEncryption(
    oldVersion: number,
    newVersion: number
  ): Promise<void> {
    // Re-encrypt data with new key
    const encryptedRecords = await db
      .select()
      .from(clientContactsEncrypted)
      .where(eq(clientContactsEncrypted.encryptionKeyVersion, oldVersion))
      .limit(1000); // Process in batches

    for (const record of encryptedRecords) {
      // Decrypt with old key
      const plaintext = decryptField(record.encryptedNotes, oldVersion);
      
      // Encrypt with new key
      const newEncrypted = encryptField(plaintext, newVersion);
      
      // Update record
      await db
        .update(clientContactsEncrypted)
        .set({ 
          encryptedNotes: newEncrypted,
          encryptionKeyVersion: newVersion,
        })
        .where(eq(clientContactsEncrypted.id, record.id));
    }
  }

  private async generateNewKey(): Promise<string> {
    // Use cloud KMS to generate new data encryption key
    // Example: AWS KMS, Google Cloud KMS, Azure Key Vault
    return crypto.randomBytes(32).toString("base64");
  }
}

// Automated key rotation (run monthly)
cron.schedule("0 0 1 * *", async () => {
  const rotationManager = new KeyRotationManager();
  await rotationManager.rotateEncryptionKey();
});
```

### Secrets Management

```typescript
// server/secrets.ts - Integration with secrets manager
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

export async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    if (response.SecretString) {
      return response.SecretString;
    }

    throw new Error("Secret not found");
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw error;
  }
}

// Load secrets at startup
async function initializeSecrets() {
  process.env.ENCRYPTION_KEY = await getSecret("ubos/encryption-key");
  process.env.DATABASE_PASSWORD = await getSecret("ubos/database-password");
  process.env.JWT_SECRET = await getSecret("ubos/jwt-secret");
}

// Call before starting server
initializeSecrets().then(() => {
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
});
```

## Data Masking and Tokenization

### Data Masking for Logs and UI

```typescript
// shared/data-masking.ts
export function maskEmail(email: string): string {
  const [username, domain] = email.split("@");
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  return `${username.substring(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  // Mask middle digits: +1 (555) ***-1234
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ***-${cleaned.substring(6)}`;
  }
  return `***-${cleaned.substring(cleaned.length - 4)}`;
}

export function maskCreditCard(cardNumber: string): string {
  // Show only last 4 digits: **** **** **** 1234
  const cleaned = cardNumber.replace(/\D/g, "");
  return `**** **** **** ${cleaned.substring(cleaned.length - 4)}`;
}

export function maskSSN(ssn: string): string {
  // Show only last 4 digits: ***-**-1234
  const cleaned = ssn.replace(/\D/g, "");
  return `***-**-${cleaned.substring(cleaned.length - 4)}`;
}

// Usage in API responses
app.get("/api/contacts/:id", requireAuth, async (req, res) => {
  const contact = await storage.getContact(req.params.id, orgId);
  
  // Mask PII for non-admin users
  const member = await storage.getOrganizationMember(userId, orgId);
  if (member.role === "viewer") {
    contact.email = maskEmail(contact.email);
    contact.phone = maskPhone(contact.phone);
  }
  
  res.json(contact);
});
```

### Tokenization for Payment Data

```typescript
// server/payment-tokenization.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

// Never store credit card numbers directly
// Use Stripe tokens instead
export async function createPaymentMethod(
  cardToken: string,
  customerId: string
): Promise<string> {
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: cardToken },
  });

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  // Store only the payment method ID (token)
  return paymentMethod.id;
}

// Payment processing with tokens
export async function chargeCustomer(
  paymentMethodId: string,
  amount: number,
  currency: string
): Promise<void> {
  await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method: paymentMethodId,
    confirm: true,
  });
}

// Store tokens, not sensitive data
export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(), // Token
  last4: text("last4"), // Last 4 digits (safe to store)
  brand: text("brand"), // Visa, Mastercard, etc.
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Data Retention Policies

### Retention Rules by Classification

```typescript
// server/data-retention.ts
interface RetentionPolicy {
  classification: DataClassification;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays: number;
}

const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    classification: DataClassification.PUBLIC,
    retentionDays: 365,
    deleteAfterDays: 365,
  },
  {
    classification: DataClassification.INTERNAL,
    retentionDays: 1095, // 3 years
    archiveAfterDays: 730, // 2 years
    deleteAfterDays: 1095,
  },
  {
    classification: DataClassification.CONFIDENTIAL,
    retentionDays: 2555, // 7 years (financial/legal compliance)
    archiveAfterDays: 1825, // 5 years
    deleteAfterDays: 2555,
  },
  {
    classification: DataClassification.RESTRICTED,
    retentionDays: 2555, // 7 years
    archiveAfterDays: 1825,
    deleteAfterDays: 2555,
  },
];

// Automated data retention job
class DataRetentionManager {
  async enforceRetentionPolicies(): Promise<void> {
    for (const policy of RETENTION_POLICIES) {
      await this.archiveOldData(policy);
      await this.deleteExpiredData(policy);
    }
  }

  private async archiveOldData(policy: RetentionPolicy): Promise<void> {
    if (!policy.archiveAfterDays) return;

    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - policy.archiveAfterDays);

    // Archive old client contacts
    const oldContacts = await db
      .select()
      .from(clientContacts)
      .where(lt(clientContacts.updatedAt, archiveThreshold));

    for (const contact of oldContacts) {
      // Move to archive table or cold storage
      await this.archiveRecord("clientContacts", contact);
    }
  }

  private async deleteExpiredData(policy: RetentionPolicy): Promise<void> {
    const deleteThreshold = new Date();
    deleteThreshold.setDate(deleteThreshold.getDate() - policy.deleteAfterDays);

    // Delete expired audit logs
    await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, deleteThreshold));

    // Delete expired sessions
    await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
  }

  private async archiveRecord(table: string, record: any): Promise<void> {
    // Move to S3 Glacier for long-term storage
    const archiveData = JSON.stringify(record);
    const key = `archives/${table}/${record.id}-${Date.now()}.json`;
    
    await uploadToGlacier(key, archiveData);
    
    // Mark as archived in database
    await db
      .update(clientContacts)
      .set({ archivedAt: new Date(), archivedLocation: key })
      .where(eq(clientContacts.id, record.id));
  }
}

// Run daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  const retentionManager = new DataRetentionManager();
  await retentionManager.enforceRetentionPolicies();
});
```

### User-Initiated Data Deletion (GDPR Right to Erasure)

```typescript
// server/gdpr.ts - Right to be forgotten
export async function deleteUserData(userId: string, orgId: string): Promise<void> {
  // 1. Anonymize user in audit logs (keep for compliance)
  await db
    .update(auditLogs)
    .set({ 
      actorId: "DELETED_USER",
      metadata: sql`jsonb_set(metadata, '{anonymized}', 'true')`,
    })
    .where(
      and(
        eq(auditLogs.actorId, userId),
        eq(auditLogs.organizationId, orgId)
      )
    );

  // 2. Delete user's PII from contacts
  await db
    .update(clientContacts)
    .set({
      email: null,
      phone: null,
      notes: "User data deleted per GDPR request",
    })
    .where(
      and(
        eq(clientContacts.createdBy, userId),
        eq(clientContacts.organizationId, orgId)
      )
    );

  // 3. Remove from organization membership
  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, orgId)
      )
    );

  // 4. Log the deletion
  await storage.createAuditLog({
    organizationId: orgId,
    action: "user.data.deleted",
    actorId: "SYSTEM",
    targetId: userId,
    metadata: { reason: "GDPR right to erasure" },
  });
}
```

## Secure Data Deletion

### Secure Deletion Methods

```typescript
// server/secure-deletion.ts
import { randomBytes } from "crypto";

class SecureDeletion {
  // DOD 5220.22-M standard (3-pass overwrite)
  async secureDeleteFile(filePath: string): Promise<void> {
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;

    // Pass 1: Overwrite with zeros
    await this.overwriteFile(filePath, Buffer.alloc(fileSize, 0));

    // Pass 2: Overwrite with ones
    await this.overwriteFile(filePath, Buffer.alloc(fileSize, 255));

    // Pass 3: Overwrite with random data
    await this.overwriteFile(filePath, randomBytes(fileSize));

    // Finally, delete the file
    await fs.promises.unlink(filePath);
  }

  private async overwriteFile(filePath: string, data: Buffer): Promise<void> {
    const fd = await fs.promises.open(filePath, "w");
    await fd.write(data, 0, data.length, 0);
    await fd.sync(); // Force write to disk
    await fd.close();
  }

  // Secure deletion from database
  async secureDeleteRecord(
    table: string,
    id: string,
    orgId: string
  ): Promise<void> {
    // 1. Overwrite sensitive fields with random data
    await db
      .update(clientContacts)
      .set({
        firstName: randomBytes(16).toString("hex"),
        lastName: randomBytes(16).toString("hex"),
        email: `${randomBytes(8).toString("hex")}@deleted.local`,
        phone: randomBytes(10).toString("hex"),
        notes: randomBytes(32).toString("hex"),
      })
      .where(
        and(
          eq(clientContacts.id, id),
          eq(clientContacts.organizationId, orgId)
        )
      );

    // 2. Delete the record
    await db
      .delete(clientContacts)
      .where(
        and(
          eq(clientContacts.id, id),
          eq(clientContacts.organizationId, orgId)
        )
      );

    // 3. Run VACUUM to reclaim space (PostgreSQL)
    await db.execute(sql`VACUUM FULL client_contacts`);
  }
}

// Usage
const secureDeletion = new SecureDeletion();
await secureDeletion.secureDeleteRecord("client_contacts", contactId, orgId);
```

## Backup Security

### Encrypted Backup Strategy

```typescript
// server/backup.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class BackupManager {
  async createEncryptedBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = `/tmp/ubos-backup-${timestamp}.sql`;
    const encryptedFile = `${backupFile}.gpg`;

    try {
      // 1. Create database dump
      await execAsync(
        `pg_dump ${process.env.DATABASE_URL} > ${backupFile}`
      );

      // 2. Encrypt backup with GPG
      await execAsync(
        `gpg --symmetric --cipher-algo AES256 --output ${encryptedFile} ${backupFile}`
      );

      // 3. Upload to secure storage
      const s3Key = `backups/${timestamp}.sql.gpg`;
      await this.uploadBackupToS3(encryptedFile, s3Key);

      // 4. Securely delete local files
      const secureDeletion = new SecureDeletion();
      await secureDeletion.secureDeleteFile(backupFile);
      await fs.promises.unlink(encryptedFile);

      return s3Key;
    } catch (error) {
      console.error("Backup failed:", error);
      throw error;
    }
  }

  private async uploadBackupToS3(
    filePath: string,
    key: string
  ): Promise<void> {
    const fileContent = await fs.promises.readFile(filePath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.BACKUP_BUCKET,
        Key: key,
        Body: fileContent,
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: process.env.BACKUP_KMS_KEY_ID,
        StorageClass: "GLACIER", // Long-term archival
      })
    );
  }

  async restoreFromBackup(backupKey: string): Promise<void> {
    const tempFile = `/tmp/restore-${Date.now()}.sql.gpg`;
    const decryptedFile = tempFile.replace(".gpg", "");

    try {
      // 1. Download from S3
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.BACKUP_BUCKET,
          Key: backupKey,
        })
      );

      const fileContent = await response.Body!.transformToByteArray();
      await fs.promises.writeFile(tempFile, fileContent);

      // 2. Decrypt
      await execAsync(
        `gpg --decrypt --output ${decryptedFile} ${tempFile}`
      );

      // 3. Restore to database
      await execAsync(
        `psql ${process.env.DATABASE_URL} < ${decryptedFile}`
      );

      // 4. Clean up
      await fs.promises.unlink(tempFile);
      const secureDeletion = new SecureDeletion();
      await secureDeletion.secureDeleteFile(decryptedFile);
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }
}

// Automated daily backups
cron.schedule("0 3 * * *", async () => {
  const backupManager = new BackupManager();
  await backupManager.createEncryptedBackup();
});
```

## Data Loss Prevention

### DLP Rules

```typescript
// server/dlp.ts - Data Loss Prevention
interface DLPRule {
  name: string;
  pattern: RegExp;
  classification: DataClassification;
  action: "block" | "warn" | "audit";
}

const DLP_RULES: DLPRule[] = [
  {
    name: "Credit Card Number",
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    classification: DataClassification.RESTRICTED,
    action: "block",
  },
  {
    name: "Social Security Number",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
    classification: DataClassification.RESTRICTED,
    action: "block",
  },
  {
    name: "Email Address",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    classification: DataClassification.RESTRICTED,
    action: "audit",
  },
  {
    name: "Phone Number",
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    classification: DataClassification.RESTRICTED,
    action: "audit",
  },
];

class DLPEngine {
  async scanContent(content: string, context: string): Promise<{
    violations: string[];
    blocked: boolean;
  }> {
    const violations: string[] = [];
    let blocked = false;

    for (const rule of DLP_RULES) {
      if (rule.pattern.test(content)) {
        violations.push(rule.name);

        if (rule.action === "block") {
          blocked = true;
        }

        // Log violation
        await this.logDLPViolation(rule, context);
      }
    }

    return { violations, blocked };
  }

  private async logDLPViolation(rule: DLPRule, context: string): Promise<void> {
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "dlp.violation",
      actorId: "DLP_ENGINE",
      metadata: {
        rule: rule.name,
        context,
        action: rule.action,
      },
    });
  }
}

// Middleware to scan requests
const dlpMiddleware: RequestHandler = async (req, res, next) => {
  const dlp = new DLPEngine();
  const content = JSON.stringify(req.body);

  const result = await dlp.scanContent(content, req.path);

  if (result.blocked) {
    res.status(400).json({
      message: "Request blocked by Data Loss Prevention",
      violations: result.violations,
    });
    return;
  }

  next();
};
```

## PII Handling

### PII Identification

```typescript
// shared/pii.ts - PII field identification
export const PII_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "ssn",
  "dateOfBirth",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "nationalId",
  "passportNumber",
  "driversLicense",
  "creditCardNumber",
  "bankAccountNumber",
  "ipAddress",
  "biometricData",
] as const;

export type PIIField = typeof PII_FIELDS[number];

export function isPIIField(field: string): field is PIIField {
  return PII_FIELDS.includes(field as PIIField);
}

// Automatically redact PII in logs
export function redactPII(data: Record<string, any>): Record<string, any> {
  const redacted = { ...data };

  for (const key of Object.keys(redacted)) {
    if (isPIIField(key)) {
      redacted[key] = "[REDACTED]";
    }
  }

  return redacted;
}

// Safe logging function
export function logSafe(message: string, data?: Record<string, any>) {
  const redactedData = data ? redactPII(data) : undefined;
  console.log(message, redactedData);
}

// Usage
logSafe("User updated contact", {
  id: "123",
  email: "user@example.com", // Will be redacted
  phone: "555-1234",          // Will be redacted
  companyName: "Acme Corp",   // Not redacted (not PII)
});
// Output: User updated contact { id: '123', email: '[REDACTED]', phone: '[REDACTED]', companyName: 'Acme Corp' }
```

### GDPR Consent Management

```typescript
// shared/schema.ts - Consent tracking
export const consentRecords = pgTable("consent_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  consentType: text("consent_type").notNull(), // "marketing", "analytics", "data_processing"
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// API endpoint for consent management
app.post("/api/consent", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.claims.sub;
  const { consentType, granted } = req.body;

  const consent = await storage.createConsent({
    userId,
    organizationId: req.organization.id,
    consentType,
    granted,
    grantedAt: granted ? new Date() : null,
    revokedAt: !granted ? new Date() : null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.json(consent);
});

// Check consent before processing
async function hasConsent(
  userId: string,
  orgId: string,
  consentType: string
): Promise<boolean> {
  const consent = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.organizationId, orgId),
        eq(consentRecords.consentType, consentType),
        eq(consentRecords.granted, true),
        isNull(consentRecords.revokedAt)
      )
    )
    .orderBy(desc(consentRecords.grantedAt))
    .limit(1);

  return consent.length > 0;
}
```

## Implementation Examples

### Complete Encryption Flow

```typescript
// Example: End-to-end encrypted notes feature
class EncryptedNotesService {
  async createNote(
    userId: string,
    orgId: string,
    content: string
  ): Promise<Note> {
    // 1. Classify data
    const classification = DataClassification.CONFIDENTIAL;

    // 2. DLP scan
    const dlp = new DLPEngine();
    const dlpResult = await dlp.scanContent(content, "notes.create");
    if (dlpResult.blocked) {
      throw new Error("Content blocked by DLP");
    }

    // 3. Encrypt content
    const encrypted = encryptField(content);

    // 4. Store encrypted data
    const [note] = await db
      .insert(notes)
      .values({
        organizationId: orgId,
        createdBy: userId,
        encryptedContent: encrypted,
        classification,
      })
      .returning();

    // 5. Audit log
    await storage.createAuditLog({
      organizationId: orgId,
      action: "note.create",
      actorId: userId,
      targetId: note.id,
      metadata: { classification },
    });

    return note;
  }

  async getNote(
    userId: string,
    orgId: string,
    noteId: string
  ): Promise<Note | null> {
    // 1. Fetch encrypted note
    const [note] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, noteId),
          eq(notes.organizationId, orgId)
        )
      );

    if (!note) return null;

    // 2. Check access permissions
    const member = await storage.getOrganizationMember(userId, orgId);
    if (!member) {
      throw new Error("Access denied");
    }

    // 3. Decrypt content
    const decrypted = decryptField(note.encryptedContent);

    // 4. Audit log
    await storage.createAuditLog({
      organizationId: orgId,
      action: "note.read",
      actorId: userId,
      targetId: noteId,
    });

    return {
      ...note,
      content: decrypted,
    };
  }
}
```

## Related Documents

- [ACCESS_CONTROL.md](./ACCESS_CONTROL.md) - Authentication and authorization
- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Audit logging and monitoring
- [GDPR_COMPLIANCE.md](./GDPR_COMPLIANCE.md) - GDPR requirements
- [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md) - HIPAA requirements

## Compliance References

- **GDPR**: Article 32 (Security of processing), Article 17 (Right to erasure)
- **HIPAA**: §164.312(a)(2)(iv) (Encryption and Decryption)
- **PCI DSS**: Requirement 3 (Protect stored cardholder data)
- **SOC 2**: CC6.1 (Logical and Physical Access Controls), CC6.7 (Encryption)

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-04 | Security Team | Initial release |
