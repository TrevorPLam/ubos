# UBOS Documentation

**Single source of truth for all UBOS technical documentation.**

**Last Updated**: 2026-02-04  
**Purpose**: Comprehensive technical documentation for developers, operators, security engineers, and architects  
**Goal**: Understand the system in under 30 minutes, make informed decisions, operate safely

---

## Quick Navigation

### By Role

| Role | Start Here | Essential Reading |
|------|-----------|------------------|
| **New Engineer** | [Architecture Overview](architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md) | [Repo Map](architecture/10_current_state/REPO_MAP.md), [Data Overview](data/10_current_state/CURRENT_STATE_OVERVIEW.md) |
| **Frontend Developer** | [Client Analysis](archive/CLIENT_ANALYSIS.md) | [API Docs](api/README.md), [Tests](tests/README.md) |
| **Backend Developer** | [Architecture](architecture/README.md) | [Data Model](data/README.md), [Security Baseline](security/30-implementation-guides/APPLICATION_SECURITY.md) |
| **DevOps/SRE** | [Runtime Components](architecture/10_current_state/RUNTIME_COMPONENTS.md) | [Security Config](security/30-implementation-guides/CONFIGURATION_GUIDE.md), [Deployment](architecture/50_deployment/DEPLOYMENT_TOPOLOGY.md) |
| **Security Engineer** | [Security Summary](security/00-overview/SECURITY_SUMMARY.md) | [Controls Matrix](security/10-controls/CONTROLS_MATRIX.md), [Threat Model](security/20-threat-model/THREAT_MODEL.md) |
| **Auditor/Compliance** | [Security Index](security/README.md) | [Compliance Frameworks](security/40-compliance/), [Test Reports](#test-reports) |

### By Task

| Task | Start Here |
|------|-----------|
| **Understand current architecture** | [Architecture Docs](architecture/README.md) |
| **Add new feature/domain** | [Target Architecture](architecture/00_plan_intent/TARGET_ARCHITECTURE.md), [Gap Analysis](architecture/60_gaps_and_roadmap/GAP_ANALYSIS.md) |
| **Work with data/entities** | [Data Docs](data/README.md), [Entity Index](data/20_entities/ENTITY_INDEX.md) |
| **Integrate with API** | [API Docs](api/README.md), [API Routes](api/platform/README.md) |
| **Fix security issue** | [Security Docs](security/README.md), [Application Security](security/30-implementation-guides/APPLICATION_SECURITY.md) |
| **Write or fix tests** | [Testing Guide](tests/README.md) |
| **Deploy or configure** | [Deployment](architecture/50_deployment/), [Configuration Guide](security/30-implementation-guides/CONFIGURATION_GUIDE.md) |

---

## Documentation Sections

### 🏗️ [Architecture](architecture/README.md)

**System design, structure, and technical decisions**

- **Current State**: [Overview](architecture/10_current_state/CURRENT_ARCHITECTURE_OVERVIEW.md), [Repo Map](architecture/10_current_state/REPO_MAP.md), [Runtime Components](architecture/10_current_state/RUNTIME_COMPONENTS.md)
- **Target State**: [Target Architecture](architecture/00_plan_intent/TARGET_ARCHITECTURE.md), [Plan Summary](architecture/00_plan_intent/PLAN_SUMMARY.md)
- **Decisions**: [ADR Index](architecture/20_decisions/ADR_INDEX.md)
- **Cross-Cutting**: [Auth & Session](architecture/30_cross_cutting/AUTH_AND_SESSION.md), [Security Baseline](architecture/30_cross_cutting/SECURITY_BASELINE.md), [Logging](architecture/30_cross_cutting/LOGGING_AND_OBSERVABILITY.md)
- **Deployment**: [Environments](architecture/50_deployment/ENVIRONMENTS.md), [CI/CD](architecture/50_deployment/CI_CD.md)
- **Gaps**: [Gap Analysis](architecture/60_gaps_and_roadmap/GAP_ANALYSIS.md), [Migration Plan](architecture/60_gaps_and_roadmap/MIGRATION_PLAN.md)

**Time to read**: 30-60 minutes for core understanding

### 📊 [Data](data/README.md)

**Data model, entities, flows, and governance**

- **Current State**: [Overview](data/10_current_state/CURRENT_STATE_OVERVIEW.md), [Data Sources](data/10_current_state/DATA_SOURCES.md), [Tenancy](data/10_current_state/TENANCY_AND_ACCESS.md)
- **Target State**: [Target Data Model](data/00_plan_intent/TARGET_DATA_MODEL.md)
- **Entities**: [Entity Index](data/20_entities/ENTITY_INDEX.md) (23 entities documented)
- **Interfaces**: [API Contracts](data/30_interfaces/API_CONTRACTS.md), [Events & Webhooks](data/30_interfaces/EVENTS_AND_WEBHOOKS.md)
- **Gaps**: [Gap Analysis](data/40_gaps_and_roadmap/GAP_ANALYSIS.md), [Evidence Map](data/40_gaps_and_roadmap/EVIDENCE_MAP.md)

**Time to read**: 20-30 minutes for data understanding

### 🔌 [API](api/README.md)

**REST API documentation by domain**

- **Platform**: [Health & Diagnostics](api/platform/README.md)
- **Auth**: [Authentication & Session](api/auth/README.md)
- **CRM**: [Clients, Contacts, Deals](api/crm/README.md)
- **Agreements**: [Proposals & Contracts](api/agreements/README.md)
- **Projects**: [Projects & Tasks](api/projects/README.md)
- **Revenue**: [Invoices & Bills](api/revenue/README.md)
- **Files**: [File Upload & Management](api/files/README.md)
- **OpenAPI**: [OpenAPI Specification](api/openapi/)

**Time to read**: 10-15 minutes per domain

### 🔒 [Security](security/README.md)

**Security controls, compliance, and incident response**

- **Overview**: [Security Summary](security/00-overview/SECURITY_SUMMARY.md) (maturity assessment)
- **Controls**: [Controls Matrix](security/10-controls/CONTROLS_MATRIX.md) (50+ controls), [Validation](security/10-controls/SECURITY_VALIDATION.md)
- **Threats**: [Threat Model](security/20-threat-model/THREAT_MODEL.md) (STRIDE + OWASP)
- **Implementation**: [Access Control](security/30-implementation-guides/ACCESS_CONTROL.md), [Application Security](security/30-implementation-guides/APPLICATION_SECURITY.md), [Data Protection](security/30-implementation-guides/DATA_PROTECTION.md)
- **Compliance**: [SOC2](security/40-compliance/SOC2_COMPLIANCE.md), [GDPR](security/40-compliance/GDPR_COMPLIANCE.md), [PCI-DSS](security/40-compliance/PCI_DSS_GUIDELINES.md)
- **Incident Response**: [IR Plan](security/50-incident-response/INCIDENT_RESPONSE.md)

**Time to read**: 45-60 minutes for comprehensive understanding

### 🧪 [Tests](tests/README.md)

**Testing infrastructure, patterns, and execution**

- **Framework**: Vitest (frontend + backend)
- **Structure**: Co-located unit tests, integration tests in `/tests/`
- **Running Tests**: `npm test`, `npm run test:backend`, `npm run test:frontend`
- **Coverage**: Current state and targets
- **Fixtures**: Test data factories and utilities

**Time to read**: 15-20 minutes

---

## Test Reports

Comprehensive test validation reports:

- **[Test Implementation Summary](archive/TEST_IMPLEMENTATION_SUMMARY.md)**: Overview of test coverage
- **[Test Validation Report](archive/TEST_VALIDATION_REPORT.md)**: Detailed validation results
- **[Final Validation Report](archive/FINAL_VALIDATION_REPORT.md)**: Final test verification
- **[Current State & Test Plan](archive/CURRENT_STATE_AND_TEST_PLAN.md)**: Current state analysis with test plan

---

## Standards & Patterns

Documentation follows these standards:

- **[ISO 42010](standards/iso-42010/)**: Architecture description standard
- **[C4 Model](standards/c4-model/)**: System visualization
- **[ADR Pattern](standards/adr-pattern/)**: Architecture Decision Records
- **[Diátaxis Framework](standards/diataxis-framework/)**: Documentation structure (tutorials, how-to guides, reference, explanation)
- **[Microsoft Style Guide](standards/microsoft-style-guide/)**: Writing style

---

## Archive

Historical and superseded documentation:

- **[Archive Index](archive/README.md)**: Complete list of archived documents
- **Analysis Documents**: [ANALYSIS.md](archive/ANALYSIS.md), [ANALYSIS_SUMMARY.md](archive/ANALYSIS_SUMMARY.md)
- **Client Analysis**: [CLIENT_ANALYSIS.md](archive/CLIENT_ANALYSIS.md), [CLIENT_ANALYSIS_SUPPLEMENT.md](archive/CLIENT_ANALYSIS_SUPPLEMENT.md)
- **Historical Test Plans**: See [archive/](archive/)

---

## User Documentation

End-user guides and tutorials (separate from technical docs):

- **[User Docs](user/README.md)**: Guides, tutorials, and FAQs for UBOS users (not developers)

---

## Contributing to Documentation

### Principles

1. **Evidence-based**: Link to code, tests, and configurations
2. **Current + Target**: Show both current state and planned state
3. **Findable**: Use consistent structure and cross-references
4. **Actionable**: Provide runbooks, checklists, and examples
5. **Versioned**: Include "Last updated" dates and status

### When to Update

- **Adding features**: Update architecture, data, and API docs
- **Security changes**: Update security docs and controls matrix
- **Schema changes**: Update data docs and entity docs
- **API changes**: Update API docs and OpenAPI spec
- **Deprecations**: Update docs and add migration notes

### Documentation Templates

- **Entity**: See [data/20_entities/README.md](data/20_entities/README.md)
- **ADR**: See [architecture/20_decisions/ADR_TEMPLATE.md](architecture/20_decisions/ADR_TEMPLATE.md)
- **API Domain**: See existing domain docs in [api/](api/)

---

## Getting Help

### Documentation Issues

- Broken links, outdated info, missing docs
- File issue with label: `documentation`

### Technical Questions

1. Check relevant documentation section above
2. Search for ADRs: [ADR Index](architecture/20_decisions/ADR_INDEX.md)
3. Check security controls: [Controls Matrix](security/10-controls/CONTROLS_MATRIX.md)
4. Review evidence maps: [Architecture](architecture/60_gaps_and_roadmap/EVIDENCE_MAP.md), [Data](data/40_gaps_and_roadmap/EVIDENCE_MAP.md)

---

## Quick Links

| Resource | Location |
|----------|----------|
| **Main Plan** | [/PLAN.md](/PLAN.md) |
| **Source Code** | [/client/](/client/), [/server/](/server/), [/shared/](/shared/) |
| **Tests** | [/tests/](/tests/) |
| **Build Config** | [/vite.config.ts](/vite.config.ts), [/tsconfig.json](/tsconfig.json) |
| **Package Info** | [/package.json](/package.json) |
| **Task Management** | [/tasks/](/tasks/) |

---

**Navigation**: [Top](#ubos-documentation) | [Architecture](architecture/README.md) | [Data](data/README.md) | [API](api/README.md) | [Security](security/README.md) | [Tests](tests/README.md)
