---
title: Secure Configuration Guide
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "DevOps Team"
classification: "internal"
related_docs:
  - APPLICATION_SECURITY.md
  - DATA_PROTECTION.md
  - SECURITY_MONITORING.md
---

# Secure Configuration Guide

## Table of Contents

- [Overview](#overview)
- [Production Environment Configuration](#production-environment-configuration)
- [Database Security Settings](#database-security-settings)
- [Network Security Configuration](#network-security-configuration)
- [TLS/SSL Configuration](#tlsssl-configuration)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Rate Limiting Setup](#rate-limiting-setup)
- [Logging Configuration](#logging-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Deployment Security Checklist](#deployment-security-checklist)

## Overview

This guide provides secure configuration standards for deploying and operating UBOS in production. Following these guidelines ensures the application meets security best practices and compliance requirements.

### Configuration Principles

1. **Secure by Default**: All defaults should be secure
2. **Principle of Least Privilege**: Minimal permissions granted
3. **Defense in Depth**: Multiple layers of security controls
4. **Fail Secure**: System fails to secure state on errors
5. **Auditability**: All security events logged

## Production Environment Configuration

### Environment Variables

```bash
# .env.production - Never commit this file to version control

# ============================================================
# CRITICAL SECURITY SETTINGS
# ============================================================

# Node environment (REQUIRED)
NODE_ENV=production

# Application port (default: 5000)
PORT=5000

# Database connection (REQUIRED)
# Format: postgresql://username:password@host:port/database?sslmode=require
DATABASE_URL=postgresql://ubos_prod:STRONG_PASSWORD@postgres-prod.internal:5432/ubos?sslmode=require

# ============================================================
# ENCRYPTION & SECRETS (stored in AWS Secrets Manager)
# ============================================================

# Application encryption key (256-bit, base64-encoded)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=<fetch-from-secrets-manager>

# JWT secret (if using JWT authentication)
JWT_SECRET=<fetch-from-secrets-manager>

# Cookie signing secret
COOKIE_SECRET=<fetch-from-secrets-manager>

# ============================================================
# TLS/SSL CERTIFICATES
# ============================================================

# TLS certificate paths
TLS_CERT_PATH=/etc/ssl/certs/ubos.crt
TLS_KEY_PATH=/etc/ssl/private/ubos.key
TLS_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# ============================================================
# AWS CONFIGURATION (if using AWS)
# ============================================================

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<use-iam-role-instead>
AWS_SECRET_ACCESS_KEY=<use-iam-role-instead>

# S3 buckets
S3_BUCKET=ubos-prod-storage
BACKUP_BUCKET=ubos-prod-backups

# KMS keys
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/abc123
BACKUP_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/def456

# ============================================================
# EXTERNAL SERVICES
# ============================================================

# Stripe (payment processing)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# SendGrid (email)
SENDGRID_API_KEY=SG.xxxxx

# ============================================================
# MONITORING & OBSERVABILITY
# ============================================================

# Sentry (error tracking)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production

# Datadog (monitoring)
DD_API_KEY=xxxxx
DD_APP_KEY=xxxxx
DD_SITE=datadoghq.com

# ============================================================
# SECURITY SETTINGS
# ============================================================

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Session settings
SESSION_MAX_AGE=86400000     # 24 hours (milliseconds)
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict

# CORS allowed origins (comma-separated)
CORS_ORIGINS=https://app.ubos.com,https://www.ubos.com

# ============================================================
# FEATURE FLAGS
# ============================================================

ENABLE_API_KEYS=true
ENABLE_MFA=false
ENABLE_AUDIT_LOGGING=true

# ============================================================
# COMPLIANCE
# ============================================================

# Data retention (days)
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
SESSION_RETENTION_DAYS=90
```

### Secrets Management

```typescript
// server/config.ts - Load secrets from AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

interface ApplicationSecrets {
  encryptionKey: string;
  jwtSecret: string;
  cookieSecret: string;
  databasePassword: string;
  stripeSecretKey: string;
  sendgridApiKey: string;
}

export async function loadSecrets(): Promise<ApplicationSecrets> {
  try {
    const secretName = `ubos/${process.env.NODE_ENV}/app-secrets`;
    
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    if (!response.SecretString) {
      throw new Error("Secret not found");
    }

    const secrets = JSON.parse(response.SecretString);
    
    // Validate all required secrets are present
    const requiredSecrets = [
      "encryptionKey",
      "jwtSecret",
      "cookieSecret",
      "databasePassword",
    ];

    for (const key of requiredSecrets) {
      if (!secrets[key]) {
        throw new Error(`Missing required secret: ${key}`);
      }
    }

    return secrets;
  } catch (error) {
    console.error("Failed to load secrets:", error);
    throw new Error("Application secrets not available");
  }
}

// Initialize configuration
export async function initializeConfig(): Promise<void> {
  // Load secrets
  const secrets = await loadSecrets();

  // Override environment variables with secrets
  process.env.ENCRYPTION_KEY = secrets.encryptionKey;
  process.env.JWT_SECRET = secrets.jwtSecret;
  process.env.COOKIE_SECRET = secrets.cookieSecret;

  // Build DATABASE_URL with secret password
  if (process.env.DATABASE_HOST) {
    process.env.DATABASE_URL = 
      `postgresql://${process.env.DATABASE_USER}:${secrets.databasePassword}@` +
      `${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || 5432}/` +
      `${process.env.DATABASE_NAME}?sslmode=require`;
  }

  console.log("✅ Configuration loaded successfully");
}
```

### Configuration Validation

```typescript
// server/config-validation.ts
import { z } from "zod";

const ProductionConfigSchema = z.object({
  NODE_ENV: z.literal("production"),
  PORT: z.string().regex(/^\d+$/).default("5000"),
  DATABASE_URL: z.string().url().refine(
    (url) => url.includes("sslmode=require"),
    "DATABASE_URL must include sslmode=require"
  ),
  ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  TLS_CERT_PATH: z.string().min(1),
  TLS_KEY_PATH: z.string().min(1),
  SESSION_COOKIE_SECURE: z.enum(["true"]),
  ENABLE_AUDIT_LOGGING: z.enum(["true"]),
});

export function validateProductionConfig(): void {
  try {
    ProductionConfigSchema.parse(process.env);
    console.log("✅ Production configuration valid");
  } catch (error) {
    console.error("❌ Invalid production configuration:");
    console.error(error);
    process.exit(1);
  }
}

// Run validation on startup
if (process.env.NODE_ENV === "production") {
  validateProductionConfig();
}
```

## Database Security Settings

### PostgreSQL Configuration

```sql
-- postgresql.conf - Security hardening

-- ============================================================
-- SSL/TLS CONFIGURATION
-- ============================================================

# Require SSL for all connections
ssl = on
ssl_cert_file = '/var/lib/postgresql/server.crt'
ssl_key_file = '/var/lib/postgresql/server.key'
ssl_ca_file = '/var/lib/postgresql/root.crt'

# Minimum TLS version
ssl_min_protocol_version = 'TLSv1.2'

# Cipher suites (strong ciphers only)
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL:!eNULL'
ssl_prefer_server_ciphers = on

-- ============================================================
-- CONNECTION SETTINGS
-- ============================================================

# Listen only on private network
listen_addresses = '10.0.1.10'  # Private IP
port = 5432

# Maximum connections
max_connections = 100
superuser_reserved_connections = 3

-- ============================================================
-- AUTHENTICATION
-- ============================================================

# Password encryption
password_encryption = scram-sha-256

# Connection timeout
authentication_timeout = 30s

-- ============================================================
-- LOGGING & AUDITING
-- ============================================================

# Enable comprehensive logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

# Log all DDL statements
log_statement = 'ddl'

# Log connections and disconnections
log_connections = on
log_disconnections = on

# Log long-running queries (> 1 second)
log_min_duration_statement = 1000

# Log failed authentication attempts
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

-- ============================================================
-- PERFORMANCE & SECURITY
-- ============================================================

# Prevent huge queries from consuming memory
work_mem = 4MB
maintenance_work_mem = 64MB

# Shared buffers (25% of RAM)
shared_buffers = 2GB

# Effective cache size (50% of RAM)
effective_cache_size = 4GB

-- ============================================================
-- DATA INTEGRITY
-- ============================================================

# Enable checksums (verify on initdb)
data_checksums = on

# Full page writes (crash safety)
full_page_writes = on

# Write-ahead logging
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

-- ============================================================
-- STATEMENT TIMEOUT (prevent runaway queries)
-- ============================================================

statement_timeout = 30000  # 30 seconds
```

### PostgreSQL Access Control

```sql
-- pg_hba.conf - Host-based authentication

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Reject all connections from public internet
host    all             all             0.0.0.0/0               reject

# Allow connections from application servers only (private network)
hostssl ubos            ubos_app        10.0.1.0/24             scram-sha-256
hostssl ubos            ubos_readonly   10.0.1.0/24             scram-sha-256

# Allow replication from standby servers
hostssl replication     replicator      10.0.2.0/24             scram-sha-256

# Local connections for maintenance (Unix socket only)
local   all             postgres                                peer
```

### Database User Roles

```sql
-- Create application user with minimal privileges

-- 1. Application user (read/write)
CREATE ROLE ubos_app WITH LOGIN PASSWORD 'STRONG_PASSWORD';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE ubos TO ubos_app;
GRANT USAGE ON SCHEMA public TO ubos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ubos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ubos_app;

-- Prevent DDL operations
REVOKE CREATE ON SCHEMA public FROM ubos_app;

-- 2. Read-only user (for analytics/reporting)
CREATE ROLE ubos_readonly WITH LOGIN PASSWORD 'STRONG_PASSWORD';

GRANT CONNECT ON DATABASE ubos TO ubos_readonly;
GRANT USAGE ON SCHEMA public TO ubos_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ubos_readonly;

-- Prevent all modifications
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM ubos_readonly;

-- 3. Migration user (for schema migrations)
CREATE ROLE ubos_migration WITH LOGIN PASSWORD 'STRONG_PASSWORD';

GRANT CONNECT ON DATABASE ubos TO ubos_migration;
GRANT ALL PRIVILEGES ON SCHEMA public TO ubos_migration;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ubos_migration;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ubos_migration;

-- Only used during deployments, should be disabled otherwise
ALTER ROLE ubos_migration NOLOGIN;  -- Enable only for migrations
```

### Database Connection Pooling

```typescript
// server/db.ts - Secure connection pool configuration
import { Pool, PoolConfig } from "pg";
import fs from "fs";

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // SSL/TLS configuration
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.TLS_CA_PATH || "/etc/ssl/certs/ca-bundle.crt").toString(),
    cert: process.env.DB_CLIENT_CERT 
      ? fs.readFileSync(process.env.DB_CLIENT_CERT).toString()
      : undefined,
    key: process.env.DB_CLIENT_KEY
      ? fs.readFileSync(process.env.DB_CLIENT_KEY).toString()
      : undefined,
  } : false,
  
  // Connection pool settings
  max: 20,                        // Maximum pool size
  min: 5,                         // Minimum pool size
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if can't connect in 10s
  
  // Application name for identification in logs
  application_name: "ubos-app",
  
  // Statement timeout (prevent runaway queries)
  statement_timeout: 30000,      // 30 seconds
  
  // Query timeout
  query_timeout: 30000,
};

export const pool = new Pool(poolConfig);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing database pool...");
  await pool.end();
  console.log("Database pool closed");
  process.exit(0);
});

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
  // Alert monitoring system
  if (process.env.NODE_ENV === "production") {
    // Send to Sentry/Datadog
  }
});

pool.on("connect", () => {
  console.log("Database connection established");
});

pool.on("remove", () => {
  console.log("Database connection removed from pool");
});
```

## Network Security Configuration

### Firewall Rules

```bash
#!/bin/bash
# firewall-rules.sh - Production firewall configuration

# Default: Deny all incoming, allow all outgoing
ufw default deny incoming
ufw default allow outgoing

# SSH (from bastion host only)
ufw allow from 10.0.0.10 to any port 22 proto tcp

# HTTPS (from load balancer only)
ufw allow from 10.0.1.0/24 to any port 443 proto tcp

# PostgreSQL (from application servers only)
ufw allow from 10.0.1.0/24 to any port 5432 proto tcp

# Application port (internal only)
ufw allow from 10.0.1.0/24 to any port 5000 proto tcp

# Monitoring (from monitoring server only)
ufw allow from 10.0.3.10 to any port 9090 proto tcp

# Enable firewall
ufw --force enable

# Log denied connections
ufw logging on
```

### Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│ Public Subnet (DMZ)                                         │
│ ┌──────────────┐        ┌──────────────┐                   │
│ │ Load Balancer│───────▶│     WAF      │                   │
│ └──────────────┘        └──────────────┘                   │
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTPS only
┌────────────────────────────────┼────────────────────────────┐
│ Private Subnet (Application)   │                            │
│                    ┌────────────▼────────────┐              │
│                    │   App Server 1          │              │
│                    │   (10.0.1.10)           │              │
│                    └─────────────┬───────────┘              │
│                    ┌─────────────▼───────────┐              │
│                    │   App Server 2          │              │
│                    │   (10.0.1.11)           │              │
│                    └─────────────┬───────────┘              │
└──────────────────────────────────┼──────────────────────────┘
                                   │ PostgreSQL only
┌──────────────────────────────────┼──────────────────────────┐
│ Private Subnet (Data)            │                          │
│                    ┌─────────────▼───────────┐              │
│                    │  PostgreSQL Primary     │              │
│                    │  (10.0.2.10)            │              │
│                    └─────────────┬───────────┘              │
│                    ┌─────────────▼───────────┐              │
│                    │  PostgreSQL Standby     │              │
│                    │  (10.0.2.11)            │              │
│                    └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### AWS Security Groups

```typescript
// infrastructure/security-groups.ts (Terraform/CDK)
export const securityGroups = {
  // Load balancer security group
  loadBalancer: {
    name: "ubos-lb-sg",
    ingress: [
      { port: 443, protocol: "tcp", cidr: "0.0.0.0/0", description: "HTTPS from internet" },
      { port: 80, protocol: "tcp", cidr: "0.0.0.0/0", description: "HTTP redirect to HTTPS" },
    ],
    egress: [
      { port: 5000, protocol: "tcp", cidr: "10.0.1.0/24", description: "To app servers" },
    ],
  },

  // Application server security group
  appServer: {
    name: "ubos-app-sg",
    ingress: [
      { port: 5000, protocol: "tcp", cidr: "10.0.1.0/24", description: "From load balancer" },
      { port: 22, protocol: "tcp", cidr: "10.0.0.0/24", description: "SSH from bastion" },
    ],
    egress: [
      { port: 5432, protocol: "tcp", cidr: "10.0.2.0/24", description: "To PostgreSQL" },
      { port: 443, protocol: "tcp", cidr: "0.0.0.0/0", description: "HTTPS to internet" },
    ],
  },

  // Database security group
  database: {
    name: "ubos-db-sg",
    ingress: [
      { port: 5432, protocol: "tcp", cidr: "10.0.1.0/24", description: "From app servers" },
    ],
    egress: [], // No outbound connections
  },

  // Bastion host security group
  bastion: {
    name: "ubos-bastion-sg",
    ingress: [
      { port: 22, protocol: "tcp", cidr: "1.2.3.4/32", description: "SSH from office IP" },
    ],
    egress: [
      { port: 22, protocol: "tcp", cidr: "10.0.0.0/16", description: "SSH to internal servers" },
    ],
  },
};
```

## TLS/SSL Configuration

### Certificate Management

```bash
#!/bin/bash
# generate-certificates.sh - Generate TLS certificates

# 1. Generate private key (4096-bit RSA)
openssl genrsa -out ubos.key 4096

# 2. Generate Certificate Signing Request (CSR)
openssl req -new -key ubos.key -out ubos.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=UBOS Inc/CN=ubos.com"

# 3. Generate self-signed certificate (for development)
openssl x509 -req -days 365 -in ubos.csr -signkey ubos.key -out ubos.crt

# 4. For production, use Let's Encrypt or commercial CA
certbot certonly --standalone -d ubos.com -d www.ubos.com -d app.ubos.com

# 5. Set proper permissions
chmod 600 ubos.key
chmod 644 ubos.crt
chown root:root ubos.key ubos.crt

# 6. Install certificates
cp ubos.crt /etc/ssl/certs/
cp ubos.key /etc/ssl/private/
```

### Express HTTPS Server

```typescript
// server/https-server.ts
import https from "https";
import http from "http";
import fs from "fs";
import express from "express";

export function createHttpsServer(app: express.Application) {
  if (process.env.NODE_ENV !== "production") {
    // Development: HTTP only
    return http.createServer(app);
  }

  // Production: HTTPS with TLS 1.2+
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
    maxVersion: "TLSv1.3" as const,

    // Cipher suites (prioritize ECDHE for forward secrecy)
    ciphers: [
      "ECDHE-ECDSA-AES128-GCM-SHA256",
      "ECDHE-RSA-AES128-GCM-SHA256",
      "ECDHE-ECDSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-ECDSA-CHACHA20-POLY1305",
      "ECDHE-RSA-CHACHA20-POLY1305",
      "DHE-RSA-AES128-GCM-SHA256",
      "DHE-RSA-AES256-GCM-SHA384",
    ].join(":"),

    // Server chooses cipher suite
    honorCipherOrder: true,

    // Enable session resumption
    sessionTimeout: 300, // 5 minutes

    // OCSP stapling
    requestCert: false,
    rejectUnauthorized: false,
  };

  const httpsServer = https.createServer(credentials, app);

  // HTTP to HTTPS redirect server
  const httpApp = express();
  httpApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });

  const httpServer = http.createServer(httpApp);
  httpServer.listen(80, () => {
    console.log("HTTP redirect server listening on port 80");
  });

  return httpsServer;
}
```

### Certificate Renewal Automation

```bash
#!/bin/bash
# renew-certificates.sh - Automate certificate renewal

# Renew Let's Encrypt certificates
certbot renew --quiet --no-self-upgrade

# Reload NGINX/application after renewal
systemctl reload nginx

# Or restart Node.js application
systemctl restart ubos-app

# Add to crontab for daily checks
# 0 3 * * * /usr/local/bin/renew-certificates.sh
```

## Security Headers

### Comprehensive Security Headers Middleware

```typescript
// server/middleware/security-headers.ts
import { Request, Response, NextFunction } from "express";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // ============================================================
  // HSTS: Force HTTPS for 1 year (31536000 seconds)
  // ============================================================
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // ============================================================
  // Content-Type Options: Prevent MIME type sniffing
  // ============================================================
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ============================================================
  // Frame Options: Prevent clickjacking
  // ============================================================
  res.setHeader("X-Frame-Options", "DENY");

  // ============================================================
  // XSS Protection: Enable browser XSS filter (legacy browsers)
  // ============================================================
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // ============================================================
  // Content Security Policy: Restrict resource loading
  // ============================================================
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for React/build tools
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.ubos.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // Report-only mode for testing
  if (process.env.CSP_REPORT_ONLY === "true") {
    res.setHeader("Content-Security-Policy-Report-Only", cspDirectives.join("; "));
    res.setHeader("Content-Security-Policy-Report-To", "/api/csp-report");
  }

  // ============================================================
  // Referrer Policy: Control referrer information
  // ============================================================
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // ============================================================
  // Permissions Policy: Control browser features
  // ============================================================
  const permissionsPolicy = [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=(self)",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ];

  res.setHeader("Permissions-Policy", permissionsPolicy.join(", "));

  // ============================================================
  // Cross-Origin Policies
  // ============================================================

  // Cross-Origin-Embedder-Policy
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

  // Cross-Origin-Opener-Policy
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  // Cross-Origin-Resource-Policy
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // ============================================================
  // Remove server identification headers
  // ============================================================
  res.removeHeader("X-Powered-By");

  next();
}

// Apply globally
app.use(securityHeaders);
```

### CSP Violation Reporting

```typescript
// server/routes.ts - CSP violation reporting endpoint
app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  const report = req.body;

  console.warn("CSP Violation:", {
    documentUri: report["document-uri"],
    violatedDirective: report["violated-directive"],
    blockedUri: report["blocked-uri"],
    sourceFile: report["source-file"],
    lineNumber: report["line-number"],
  });

  // Log to monitoring system
  if (process.env.NODE_ENV === "production") {
    // Send to Sentry, Datadog, etc.
  }

  res.status(204).end();
});
```

## CORS Configuration

### Strict CORS Policy

```typescript
// server/middleware/cors.ts
import cors from "cors";

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(",") || [
  "https://app.ubos.com",
  "https://www.ubos.com",
];

// Development: Allow localhost
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
  ALLOWED_ORIGINS.push("http://localhost:5173");
}

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Id",
    "X-User",
  ],

  // Exposed headers (accessible to client)
  exposedHeaders: ["X-Total-Count", "X-Page-Number", "X-Page-Size"],

  // Preflight cache duration (seconds)
  maxAge: 600, // 10 minutes

  // Handle preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));
```

## Rate Limiting Setup

### Multi-Tier Rate Limiting

```typescript
// server/middleware/rate-limiting.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

// Redis connection for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: 0,
});

// ============================================================
// Global rate limit: 100 requests per 15 minutes
// ============================================================
export const globalRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:global:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  
  // Skip rate limiting for whitelisted IPs
  skip: (req) => {
    const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(",") || [];
    return whitelistedIPs.includes(req.ip);
  },
  
  // Custom key generator (use API key if present)
  keyGenerator: (req) => {
    const apiKey = req.header("authorization")?.replace("Bearer ", "");
    return apiKey || req.ip;
  },
});

// ============================================================
// Authentication rate limit: 5 login attempts per 15 minutes
// ============================================================
export const authRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:auth:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts, please try again later" },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// ============================================================
// API rate limit: 1000 requests per hour for authenticated users
// ============================================================
export const apiRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:api:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: { message: "API rate limit exceeded" },
  keyGenerator: (req) => {
    const userId = (req as any).user?.claims?.sub;
    return userId || req.ip;
  },
});

// ============================================================
// Strict rate limit for sensitive operations
// ============================================================
export const strictRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:strict:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: "Rate limit exceeded for this operation" },
  skipSuccessfulRequests: false,
});

// Apply rate limits to routes
app.use("/api/", globalRateLimit);
app.use("/api/login", authRateLimit);
app.use("/api/logout", authRateLimit);
app.use("/api/*", apiRateLimit);
app.use("/api/admin/*", strictRateLimit);
```

### Rate Limit Bypass for Testing

```typescript
// server/middleware/rate-limit-bypass.ts
import { Request, Response, NextFunction } from "express";

export function rateLimitBypass(req: Request, res: Response, next: NextFunction) {
  // Allow rate limit bypass with special header (for load testing)
  const bypassToken = req.header("x-rate-limit-bypass");
  
  if (bypassToken === process.env.RATE_LIMIT_BYPASS_TOKEN) {
    // Skip rate limiting
    (req as any).skipRateLimit = true;
  }
  
  next();
}

// Apply before rate limit middleware
app.use(rateLimitBypass);
```

## Logging Configuration

### Structured Logging

```typescript
// server/logger.ts
import winston from "winston";

const logLevel = process.env.LOG_LEVEL || (
  process.env.NODE_ENV === "production" ? "info" : "debug"
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "ubos-app",
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // Error logs
    new winston.transports.File({
      filename: "/var/log/ubos/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    }),

    // Combined logs
    new winston.transports.File({
      filename: "/var/log/ubos/combined.log",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Security event logger (separate log file)
export const securityLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: "ubos-security",
  },
  transports: [
    new winston.transports.File({
      filename: "/var/log/ubos/security.log",
      maxsize: 50 * 1024 * 1024, // 50 MB
      maxFiles: 50, // Keep for longer
    }),
  ],
});

// Log security events
export function logSecurityEvent(event: {
  type: string;
  userId?: string;
  ip?: string;
  action: string;
  success: boolean;
  metadata?: any;
}) {
  securityLogger.info("security_event", {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Usage
logSecurityEvent({
  type: "authentication",
  userId: "user123",
  ip: "1.2.3.4",
  action: "login",
  success: true,
});
```

### Request Logging Middleware

```typescript
// server/middleware/request-logger.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { redactPII } from "../../shared/pii";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  logger.info("incoming_request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: (req as any).user?.claims?.sub,
  });

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userId: (req as any).user?.claims?.sub,
    };

    // Log errors at error level
    if (res.statusCode >= 400) {
      logger.error("request_failed", {
        ...logData,
        body: redactPII(req.body),
      });
    } else {
      logger.info("request_completed", logData);
    }

    // Alert on slow requests
    if (duration > 5000) {
      logger.warn("slow_request", {
        ...logData,
        threshold: 5000,
      });
    }
  });

  next();
}

// Apply to all routes
app.use(requestLogger);
```

## Monitoring Setup

### Health Check Endpoint

```typescript
// server/routes.ts - Health check for monitoring
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pool.query("SELECT 1");
    const dbHealthy = dbResult.rowCount === 1;

    // Check Redis connection (if using)
    let redisHealthy = true;
    try {
      await redis.ping();
    } catch {
      redisHealthy = false;
    }

    const health = {
      status: dbHealthy && redisHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? "pass" : "fail",
        redis: redisHealthy ? "pass" : "fail",
      },
    };

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Readiness check (for Kubernetes)
app.get("/ready", async (req, res) => {
  // Check if app is ready to receive traffic
  const isReady = await checkApplicationReadiness();
  
  if (isReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

// Liveness check (for Kubernetes)
app.get("/live", (req, res) => {
  // Simple check that app is running
  res.status(200).json({ alive: true });
});
```

### Metrics Endpoint

```typescript
// server/metrics.ts - Prometheus-compatible metrics
import promClient from "prom-client";

// Enable default metrics
promClient.collectDefaultMetrics();

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code"],
});

export const httpRequestTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status_code"],
});

export const activeConnections = new promClient.Gauge({
  name: "active_connections",
  help: "Number of active connections",
});

export const databaseQueryDuration = new promClient.Histogram({
  name: "database_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["query_type"],
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  const metrics = await promClient.register.metrics();
  res.send(metrics);
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.observe(
      { method: req.method, path: req.path, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
    });
  });

  next();
});
```

## Deployment Security Checklist

### Pre-Deployment Checklist

```markdown
## Pre-Deployment Security Checklist

### Configuration
- [ ] All environment variables set (no defaults in production)
- [ ] Secrets loaded from secrets manager (not .env file)
- [ ] `NODE_ENV=production` set
- [ ] TLS certificates installed and valid
- [ ] Database password is strong (> 20 characters)
- [ ] All API keys rotated for production

### Network Security
- [ ] Firewall rules configured
- [ ] Security groups restrict access to private subnets
- [ ] Load balancer configured for HTTPS only
- [ ] HSTS header enabled
- [ ] Rate limiting configured

### Database Security
- [ ] PostgreSQL SSL/TLS enabled
- [ ] Database accessible only from application servers
- [ ] Application user has minimal privileges
- [ ] Connection pooling configured
- [ ] Statement timeout set

### Application Security
- [ ] Security headers configured
- [ ] CORS configured with allowed origins
- [ ] CSP policy defined and tested
- [ ] Authentication and authorization working
- [ ] Session management secure (HttpOnly, Secure, SameSite)
- [ ] PII redacted from logs

### Monitoring & Logging
- [ ] Health check endpoint responding
- [ ] Metrics endpoint configured
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation configured
- [ ] Alerts configured for critical events

### Backup & Recovery
- [ ] Automated backups configured
- [ ] Backup encryption enabled
- [ ] Backup restore tested
- [ ] Disaster recovery plan documented

### Compliance
- [ ] Audit logging enabled
- [ ] Data retention policies configured
- [ ] GDPR compliance verified
- [ ] Incident response plan ready

### Testing
- [ ] Security scan completed (no critical vulnerabilities)
- [ ] Penetration testing completed
- [ ] Load testing completed
- [ ] Failover testing completed
```

### Post-Deployment Verification

```bash
#!/bin/bash
# verify-deployment.sh - Verify production deployment

echo "=== Deployment Verification ==="

# 1. Check application is running
echo "Checking application health..."
curl -f https://app.ubos.com/health || exit 1

# 2. Verify TLS configuration
echo "Verifying TLS configuration..."
echo | openssl s_client -connect app.ubos.com:443 -servername app.ubos.com 2>/dev/null | \
  openssl x509 -noout -dates

# 3. Check security headers
echo "Checking security headers..."
curl -I https://app.ubos.com | grep -i "strict-transport-security"
curl -I https://app.ubos.com | grep -i "x-content-type-options"
curl -I https://app.ubos.com | grep -i "x-frame-options"

# 4. Verify rate limiting
echo "Verifying rate limiting..."
for i in {1..10}; do
  curl -s https://app.ubos.com/api/login | grep -q "Too many requests" && echo "✓ Rate limiting active"
done

# 5. Check database connectivity
echo "Checking database connectivity..."
curl -f https://app.ubos.com/health | jq -r '.checks.database' | grep -q "pass"

# 6. Verify monitoring
echo "Verifying monitoring..."
curl -f https://app.ubos.com/metrics | grep -q "http_requests_total"

echo "=== Verification Complete ==="
```

## Related Documents

- [APPLICATION_SECURITY.md](./APPLICATION_SECURITY.md) - Secure coding practices
- [DATA_PROTECTION.md](./DATA_PROTECTION.md) - Encryption and data handling
- [ACCESS_CONTROL.md](./ACCESS_CONTROL.md) - Authentication and authorization
- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Monitoring and alerting

## Compliance References

- **SOC 2**: CC6.6 (Logical and Physical Access Controls), CC7.2 (System Monitoring)
- **PCI DSS**: Requirement 2 (Default Security Parameters), Requirement 4 (Encryption of Data in Transit)
- **NIST**: SP 800-123 (Guide to General Server Security)

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-04 | DevOps Team | Initial release |
