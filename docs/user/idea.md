## Agent Specialization Framework v2 (Merged)

Below merges your **expanded “specialized agents” blueprint** into your existing **backlog-driven / type-batched** operating model, keeping the same format: **Focus → Responsibilities → Example tasks**.

---

# Core Agents (always-on)

### 1) Governance & Configuration Agent

**Focus:** `type:config`, `type:devex`
**Responsibilities:**

* Governance packs (`AGENTS.toon`, policies, task taxonomy, repo rules)
* Tooling + local dev environment guardrails
* Templates: PR/issue/CONTRIBUTING/SECURITY, repo hygiene
* Version pinning (Node, package manager), consistent scripts

**Example tasks (from your backlog):**

* TASK-20260203-001 (Create AGENTS governance pack)
* TASK-20260203-012 (Pin package manager)
* TASK-20260203-013/014 (SECURITY.md, CONTRIBUTING.md templates)

---

### 2) Infrastructure & Platform Agent

**Focus:** `type:infra`, `type:release`, `type:reliability` (foundation-level)
**Responsibilities:**

* App shell + modular architecture scaffolding
* Docker/compose, local env, DB schema + migrations (non-specialized)
* Release/versioning notes, deployment primitives

**Example tasks:**

* TASK-20260203-004/005 (Stage 0 foundation)
* TASK-20260203-019 (Docker + compose)
* TASK-20260203-018 (versioning + release notes)

---

### 3) Domain Development Agent

**Focus:** `type:dev`
**Responsibilities:**

* Vertical slices (CRM, Scheduling, Files, AR/AP, proposals/contracts, etc.)
* UI components + workflows
* Integration stubs + connectors (non-platform grade)
* DDD boundaries + module contracts

**Example tasks:**

* TASK-20260203-006/007/008 (Stage 1 vertical slices)
* TASK-20260203-009/010/011 (Agreements, Revenue, workflows)

---

### 4) Security & Compliance Agent (Baseline)

**Focus:** `type:security`, `type:reliability` (security hardening + platform controls)
**Responsibilities:**

* AuthN/AuthZ, RBAC, RLS, encryption, secrets handling
* Audit logs + anomaly flags (baseline), secure uploads, secure defaults
* SAST/DAST wiring (implementation + policies)

**Example tasks:**

* TASK-20260204-004 through TASK-20260204-014 (security controls)
* TASK-20260203-017 (error handler fix)

> **Note:** Heavy regulatory work moves to the **Compliance & Regulatory Agent** below.

---

### 5) Quality & Testing Agent

**Focus:** `type:quality`, `type:test`
**Responsibilities:**

* Test strategy + coverage, static analysis, review gates
* Performance checks, regression protection
* Demo/seed data, validation suites (non-SRE-grade)

**Example tasks:**

* All testing-related tasks
* Performance validation and security testing (validation side)

---

### 6) Documentation & Knowledge Agent

**Focus:** `type:docs`
**Responsibilities:**

* Architecture + procedures + “how to operate this repo”
* “State of system” docs, entity docs, indexes, completion summaries
* “Unknowns resolution” investigations (requirements clarity)

**Example tasks:**

* TASK-20260204-015 through TASK-20260204-028 (documentation tasks)

---

### 7) CI/CD & Automation Agent

**Focus:** `type:ci`
**Responsibilities:**

* Pipelines, automated tests, release workflows
* Security tooling inside CI (SAST, dependency scans)
* Build automation (repeatable, minimal permissions)

**Example tasks:**

* TASK-20260204-012 (SAST in CI/CD)
* Release automation + workflow configuration

---

# Specialized Agents (invoke when backlog warrants)

### 8) Legacy Migration & Compatibility Agent

**Focus:** `type:migration`, `type:compatibility`, `type:legacy`
**Responsibilities:**

* Zero-downtime DB migrations, cutovers, replication, backfills
* API versioning + deprecation strategy
* Backward compatibility testing + feature-flagged rollouts
* Data consistency validation + reconciliation tooling

**Example tasks:**

* ### # [id:MIG-001][type:migration][priority:high][component:database] Migrate MongoDB → PostgreSQL without downtime
* ### # [id:MIG-002][type:compatibility][priority:medium][component:api] Run GraphQL alongside REST with deprecation automation

---

### 9) Cost Optimization & Cloud Economics Agent

**Focus:** `type:cost`, `type:budget`, `type:vendor`
**Responsibilities:**

* Unit economics + cost/perf tradeoffs
* Autoscaling policies, reserved capacity planning
* Vendor comparisons + pricing tier analysis
* Forecasting + cost guardrails

**Example tasks:**

* ### # [id:COST-001][type:cost][priority:medium][component:infra] Right-size DB/compute based on usage metrics
* ### # [id:COST-003][type:vendor][priority:low][component:billing] Stripe vs Paddle evaluation by volume tiers

---

### 10) Compliance & Regulatory Agent (Heavy)

**Focus:** `type:compliance`, `type:gdpr`, `type:ccpa`, `type:pci`, `type:hipaa`, `type:soc2`
**Responsibilities:**

* Map requirements → technical controls + evidence artifacts
* DSAR automation, retention + deletion enforcement
* Audit trails, breach workflows, compliance documentation packs

**Example tasks:**

* ### # [id:COMP-001][type:gdpr][priority:high][component:data] DSAR automation (export/delete/rectify)
* ### # [id:COMP-002][type:pci][priority:critical][component:payment] Tokenization boundary for PCI scope reduction

---

### 11) Internationalization & Localization Agent

**Focus:** `type:i18n`, `type:l10n`, `type:locale`
**Responsibilities:**

* Locale-aware formatting, plural rules, ICU message patterns
* RTL readiness, Unicode normalization, locale-aware sorting/search
* Translation pipeline + context preservation

**Example tasks:**

* ### # [id:I18N-001][type:i18n][priority:medium][component:client] Locale-aware dates/currency/plurals
* ### # [id:I18N-002][type:l10n][priority:high][component:content] Translation pipeline with context metadata

---

### 12) Accessibility (a11y) Specialist Agent

**Focus:** `type:accessibility`, `type:a11y`
**Responsibilities:**

* WCAG 2.1/2.2 AA pass for core flows
* Keyboard nav, focus management, ARIA correctness
* Automated a11y testing in CI + manual screen reader checks

**Example tasks:**

* ### # [id:A11Y-001][type:accessibility][priority:high][component:client] WCAG AA for core flows
* ### # [id:A11Y-003][type:testing][priority:low][component:ci] Automated a11y scans in CI

---

### 13) Observability & SRE Agent

**Focus:** `type:sre`, `type:observability`, `type:incident`, `type:chaos`
**Responsibilities:**

* SLO/SLA definitions, alerting, dashboards, runbooks
* Distributed tracing + structured logging standards
* Incident automation, postmortems, capacity planning

**Example tasks:**

* ### # [id:SRE-001][type:sre][priority:critical][component:monitoring] Incident response + runbooks automation
* ### # [id:SRE-002][type:observability][priority:high][component:infra] OpenTelemetry tracing baseline

---

### 14) Data Science & ML Integration Agent

**Focus:** `type:ml`, `type:ai`, `type:prediction`
**Responsibilities:**

* Feature engineering + training/validation pipelines
* A/B testing for models, bias checks, explainability notes
* “ML as a module” integration boundaries + monitoring

**Example tasks:**

* ### # [id:ML-003][type:prediction][priority:high][component:sales] Lead scoring model + eval loop
* ### # [id:ML-002][type:ai][priority:low][component:support] Ticket classification (NLP) + routing rules

---

### 15) Mobile & Cross-Platform Agent

**Focus:** `type:mobile`, `type:pwa`, `type:push`, `type:store`
**Responsibilities:**

* Offline-first sync + conflict resolution
* Push notification service + device token lifecycle
* Store compliance + submission automation

**Example tasks:**

* ### # [id:MOB-001][type:mobile][priority:high][component:pwa] Offline-first sync + conflicts
* ### # [id:MOB-002][type:push][priority:medium][component:notifications] Cross-platform push service

---

### 16) Ecosystem & API Platform Agent

**Focus:** `type:platform`, `type:webhook`, `type:developerx`, `type:marketplace`
**Responsibilities:**

* Developer portal + interactive docs (OpenAPI/Swagger)
* API keys, quotas, rate limiting, webhook guarantees
* OAuth flows + third-party integration QA harness

**Example tasks:**

* ### # [id:API-001][type:platform][priority:high][component:api] Developer portal + interactive docs
* ### # [id:API-002][type:webhook][priority:medium][component:events] Reliable webhook delivery (retry + signing)

---

### 17) Sustainability & Green Computing Agent

**Focus:** `type:sustainability`, `type:energy`
**Responsibilities:**

* Carbon-aware batch scheduling (where relevant)
* Perf-to-energy optimization (queries, caching, compute patterns)
* Reporting + resource utilization guidance

**Example tasks:**

* ### # [id:GREEN-002][type:energy][priority:medium][component:code] Optimize DB queries to reduce CPU load
* ### # [id:GREEN-003][type:reporting][priority:low][component:metrics] Carbon/resource dashboard

---

### 18) Legal & Intellectual Property Agent

**Focus:** `type:legal`, `type:license`, `type:policy`, `type:patent`
**Responsibilities:**

* OSS license compliance + compatibility audits
* Terms/Privacy policy generation from data flows
* Contract clause extraction + risk flags (assistive, not “legal advice”)

**Example tasks:**

* ### # [id:LEGAL-001][type:license][priority:high][component:oss] Dependency license audit + SBOM linkage
* ### # [id:LEGAL-003][type:policy][priority:low][component:legal] Privacy policy draft from data flow map

---

# Decision-Making Agents (meta-agents)

### 19) Arbitration Agent

**Focus:** `type:arbitration`
Resolves conflicts (security vs cost vs velocity), produces a single “ruling” + rationale.

### 20) Priority Calibration Agent

**Focus:** `type:priority`
Reorders *within* allowed rules when business conditions shift (cash constraints, deadlines, incidents).

### 21) Dependency Resolution Agent

**Focus:** `type:dependency`
Builds dependency graph, blocks impossible TODO batches, proposes sequencing.

### 22) Risk Assessment Agent

**Focus:** `type:risk`
Evaluates decisions against “blast radius,” compliance exposure, operational risk.

---

# Collaboration Model (unchanged, expanded)

```
Backlog → Dispatcher Agent → Specialized Agent
                                   ↓
                           TODO.md (batched by ONE type)
                                   ↓
                         Execution + Tests + Evidence
                                   ↓
                            Docs Agent updates summary
```

---

# Dispatcher Agent Rules (tight + complete)

1. Pull **ONE** `[type:*]` batch from BACKLOG.md
2. Select **≤ 5 tasks** (preserve order) → move to TODO.md
3. Assign to the best-fit agent via matrix below
4. Enforce dependencies (block tasks that require missing foundations)
5. Priority rule: `critical > high > medium > low`, then listed order
6. Require evidence: tests run, diffs, screenshots/logs where relevant

---

# Agent Selection Matrix v2 (type → agent)

* `config`, `devex` → **Governance & Configuration**
* `infra`, `release` → **Infrastructure & Platform**
* `dev` → **Domain Development**
* `security` → **Security & Compliance (Baseline)**
* `quality`, `test` → **Quality & Testing**
* `docs` → **Documentation & Knowledge**
* `ci` → **CI/CD & Automation**

**Specialized types:**

* `migration`, `compatibility`, `legacy` → **Legacy Migration & Compatibility**
* `cost`, `budget`, `vendor` → **Cost Optimization & Cloud Economics**
* `compliance`, `gdpr`, `ccpa`, `pcii`, `hipaa`, `soc2` → **Compliance & Regulatory**
* `i18n`, `l10n`, `locale` → **Internationalization & Localization**
* `accessibility`, `a11y` → **Accessibility Specialist**
* `sre`, `observability`, `incident`, `chaos` → **Observability & SRE**
* `ml`, `ai`, `prediction` → **Data Science & ML Integration**
* `mobile`, `pwa`, `push`, `store` → **Mobile & Cross-Platform**
* `platform`, `webhook`, `developerx`, `marketplace` → **Ecosystem & API Platform**
* `sustainability`, `energy` → **Sustainability & Green Computing**
* `legal`, `license`, `policy`, `patent` → **Legal & IP**
* `arbitration` → **Arbitration Agent**
* `priority` → **Priority Calibration Agent**
* `dependency` → **Dependency Resolution Agent**
* `risk` → **Risk Assessment Agent**

---

# Cross-Agent Collaboration Templates (drop-in)

### Incident Response

`Security (detect) → SRE (mitigate) → Cost (impact) → Docs (postmortem)`

### Feature Launch

`Domain Dev (build) → a11y (review) → i18n (localize) → Compliance (check) → Cost (scale)`

### Technology Migration

`Migration (plan) → Cost (ROI) → Compliance (data handling) → Domain Dev (execute) → Quality (validate)`

---

