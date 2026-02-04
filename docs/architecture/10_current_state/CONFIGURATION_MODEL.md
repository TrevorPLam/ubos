---
title: "Configuration Model"
last_updated: "2026-02-04"
status: "active"
owner: "Platform Team"
classification: "internal"
---

# Configuration Model

**Purpose**: Document how UBOS handles configuration across environments  
**Status**: PARTIAL - needs completion  
**Last Updated**: 2026-02-04

---

## Overview

UBOS uses environment variables for configuration with validation at startup.

---

## Configuration Sources

### 1. Environment Variables

Primary configuration mechanism using `.env` files:

```
DATABASE_URL=postgresql://...
NODE_ENV=development|production
PORT=5000
SESSION_SECRET=<random-secret>
```

### 2. Configuration Files

- **[server/config-validation.ts](/server/config-validation.ts)**: Configuration schema and validation
- **Environment Files**: `.env`, `.env.local`, `.env.production`

---

## Configuration Schema

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |

### Security Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | Yes (prod) | - | Session signing secret |

### Feature Flags

**TODO**: Document feature flag system if implemented

---

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost/ubos_dev
PORT=5000
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://<production-db>
SESSION_SECRET=<strong-secret>
PORT=5000
```

### Test

```bash
NODE_ENV=test
DATABASE_URL=postgresql://localhost/ubos_test
```

---

## Configuration Validation

### Startup Validation

Configuration is validated at application startup using [server/config-validation.ts](/server/config-validation.ts).

**Validation Rules**:
- Required variables must be present
- Database URL format must be valid
- Session secret must be strong in production

### Validation Process

```typescript
// Pseudo-code from server/config-validation.ts
function validateConfig() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}
```

---

## Configuration Access

### Server-Side

```typescript
// Access via process.env
const dbUrl = process.env.DATABASE_URL;
const port = process.env.PORT || 5000;
```

### Client-Side

**Security Note**: Do NOT expose sensitive config to client.

Only expose public configuration:
```typescript
// Vite automatically exposes VITE_* variables
const publicApiUrl = import.meta.env.VITE_API_URL;
```

---

## Security Considerations

### Sensitive Data

**Never commit**:
- `.env` files with real secrets
- `DATABASE_URL` with credentials
- `SESSION_SECRET` values

**Do commit**:
- `.env.example` with placeholder values
- Documentation of required variables

### Secret Management

**Current**: Environment variables in deployment environment  
**Future**: Consider using secret management service (AWS Secrets Manager, Azure Key Vault, etc.)

---

## Configuration Testing

### Test Configuration

Tests use a separate test database and configuration:

```bash
DATABASE_URL=postgresql://localhost/ubos_test
NODE_ENV=test
```

See [tests/setup/backend.setup.ts](/tests/setup/backend.setup.ts) for test environment setup.

---

## Evidence Links

- **Configuration Validation**: [server/config-validation.ts](/server/config-validation.ts)
- **Server Entry Point**: [server/index.ts](/server/index.ts)
- **Test Setup**: [tests/setup/backend.setup.ts](/tests/setup/backend.setup.ts)

---

**Status**: INCOMPLETE - Needs:
- Complete list of all environment variables
- Feature flag system documentation
- Secret rotation procedures
- Configuration change management process
