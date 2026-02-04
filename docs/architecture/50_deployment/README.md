# Deployment & Operations

**Purpose**: Document deployment topology, environments, CI/CD, and operational procedures  
**Audience**: DevOps, SREs, Operations team, Release managers  
**Status**: Living documents - updated with infrastructure changes

---

## 📋 Overview

This folder contains all documentation related to how UBOS is deployed, operated, and maintained in production and non-production environments.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Environment definitions and configurations | 10 min | 🟡 Planned |
| [DEPLOYMENT_TOPOLOGY.md](DEPLOYMENT_TOPOLOGY.md) | Infrastructure architecture and topology | 15 min | 🟡 Planned |
| [CI_CD.md](CI_CD.md) | Continuous integration and deployment | 10 min | 🟡 Planned |

---

## 🎯 Deployment Maturity Levels

### Level 0: Manual Deployment
- Manual server setup
- SSH and copy files
- Manual configuration
- No rollback plan

### Level 1: Scripted Deployment
- Automated build scripts
- Deployment scripts
- Basic health checks
- Manual rollback

### Level 2: CI/CD Pipeline
- Automated testing
- Automated deployment to staging
- Manual promotion to production
- Automated rollback

### Level 3: Continuous Delivery (Current Target)
- Automated deployment to all environments
- Comprehensive testing
- Blue-green or canary deployments
- Automated rollback on failure
- Infrastructure as Code

### Level 4: Continuous Deployment
- Every merge to main → production
- Progressive delivery
- Feature flags
- Automated chaos engineering

**Current State**: Level 2 (CI/CD Pipeline)  
**Target State**: Level 3 (Continuous Delivery)

---

## 🏗️ Enterprise Deployment Patterns

### 1. **Environment Strategy** (Industry Standard)

**Standard Environments**:
1. **Development (Local)**: Developer machines, Docker Compose
2. **CI (Ephemeral)**: Automated test runs, destroyed after
3. **Staging**: Production-like, for final validation
4. **Production**: Live customer environment

**Best Practices**:
- ✅ Staging matches production (same OS, same versions, same configs)
- ✅ Use environment variables for differences
- ✅ Never test in production
- ✅ Production-like data in staging (anonymized)

### 2. **Blue-Green Deployment** (Zero-Downtime)

**Pattern**:
```
Blue Environment (Current)    Green Environment (New)
        ↓                              ↓
    v1.0.0                          v1.1.0
        ↓                              ↓
   Load Balancer ──────────────────────
         │
    Switch traffic
         ↓
   Green is now live
```

**Benefits**:
- Zero downtime deployments
- Instant rollback (switch back to blue)
- Full environment testing before traffic

### 3. **Infrastructure as Code** (IaC)

**Tools**: Terraform, CloudFormation, Pulumi

**Benefits**:
- Version controlled infrastructure
- Reproducible environments
- Automated provisioning
- Disaster recovery

**Example** (Docker Compose for local dev):
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: ubos_dev
      POSTGRES_USER: ubos
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  minio:
    image: minio/minio
    command: server /data
    ports:
      - "9000:9000"
```

### 4. **Secrets Management** (Security)

**Never commit secrets to git!**

**Strategies**:
- **Development**: `.env` file (gitignored, `.env.example` committed)
- **CI/CD**: GitHub Secrets, GitLab CI Variables
- **Production**: AWS Secrets Manager, HashiCorp Vault, Azure Key Vault

**Rotation Policy**:
- Database passwords: Every 90 days
- API keys: Every 180 days
- Encryption keys: Every 365 days
- Emergency rotation: Immediately if compromised

---

## 💡 Unique Differentiators

### 1. **Contract-Test-Deploy Pattern**

**Traditional**: Unit tests → Integration tests → Deploy  
**Our Approach**: Contract tests validate API promises

**Workflow**:
1. OpenAPI spec defines contract
2. Unit tests validate logic
3. Contract tests validate API matches spec
4. Integration tests validate end-to-end flows
5. Deploy only if all tests pass

**Benefits**: Frontend/backend can develop in parallel, API changes caught early

### 2. **Database Migration Safety**

**Pattern**: Expand-Migrate-Contract

**Example**: Renaming a column
```sql
-- Step 1 (Deploy 1): Add new column
ALTER TABLE clients ADD COLUMN business_name VARCHAR(255);
UPDATE clients SET business_name = name;

-- Step 2 (Deploy 2): Application uses new column
-- (Code deployed, both columns populated)

-- Step 3 (Deploy 3): Remove old column
ALTER TABLE clients DROP COLUMN name;
```

**Benefits**: Zero-downtime migrations, safe rollback

### 3. **Tenant-Aware Deployment**

**Feature Flags Per Tenant**:
```typescript
if (await featureFlags.isEnabled('new-dashboard', organizationId)) {
  return newDashboard();
} else {
  return oldDashboard();
}
```

**Benefits**:
- Gradual rollout (10% → 50% → 100%)
- A/B testing
- Enterprise-specific features
- Kill switch for problematic features

### 4. **Health-Check Driven Deployment**

**Before deployment goes live**:
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ All migrations applied
- ✅ No critical errors in logs
- ✅ Sample API request succeeds

**Continuous health checks**:
- `/health`: Liveness probe (is service running?)
- `/health/ready`: Readiness probe (ready to serve traffic?)
- `/health/startup`: Startup probe (finished initializing?)

---

## 🔍 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review approved
- [ ] Database migrations tested in staging
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Stakeholders notified (if major change)
- [ ] Monitoring dashboards ready

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests in staging
- [ ] Monitor staging for 1 hour
- [ ] Deploy to production
- [ ] Verify health checks pass
- [ ] Monitor error rates
- [ ] Monitor performance metrics

### Post-Deployment
- [ ] Verify key workflows work
- [ ] Check error logs
- [ ] Monitor for 4 hours
- [ ] Update changelog
- [ ] Mark deployment successful in tracking

### If Issues Detected
- [ ] Assess severity (P0=rollback immediately, P1=fix forward, P2=monitor)
- [ ] Execute rollback plan if needed
- [ ] Notify stakeholders
- [ ] Create incident report
- [ ] Schedule post-mortem

---

## 📊 Deployment Metrics

### DORA Metrics (DevOps Research & Assessment)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Deployment Frequency** | Daily | TBD | 🟡 |
| **Lead Time for Changes** | < 1 day | TBD | 🟡 |
| **Change Failure Rate** | < 15% | TBD | 🟡 |
| **Mean Time to Recovery (MTTR)** | < 1 hour | TBD | 🟡 |

### Operational Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Uptime** | > 99.9% | TBD |
| **Response Time (p95)** | < 200ms | TBD |
| **Error Rate** | < 0.1% | TBD |
| **Successful Deploys** | > 95% | TBD |

---

## 🔗 Related Documentation

- **Parent**: [docs/architecture/README.md](../README.md)
- **Security**: [docs/security/30-implementation-guides/DEPLOYMENT_SECURITY.md](../../security/30-implementation-guides/DEPLOYMENT_SECURITY.md)
- **Monitoring**: [docs/architecture/30_cross_cutting/LOGGING_AND_OBSERVABILITY.md](../30_cross_cutting/LOGGING_AND_OBSERVABILITY.md)

---

**Quick Navigation**: [Back to Architecture](../README.md) | [Current State](../10_current_state/README.md)