# Runtime Components

**Purpose:** Document runtime processes, entry points, and lifecycle  
**Last verified:** 2026-02-04

## Runtime Overview

UBOS currently runs as a **single Node.js process** with two modes:

1. **Development:** Server with embedded Vite dev middleware (HMR enabled)
2. **Production:** Server serving pre-built static assets

**No background workers, no async jobs, no separate processes (yet).**

## Development Mode

### Command
```bash
npm run dev
# → cross-env NODE_ENV=development tsx server/index.ts
```

### Process Flow
```
┌─────────────────────────────────────────────────┐
│  Node.js (tsx runtime)                          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Express App                              │ │
│  │  - Security middleware (Helmet, rate     │ │
│  │    limiting, CORS)                        │ │
│  │  - Body parsers (JSON, urlencoded)       │ │
│  │  - API routes (/api/*)                   │ │
│  │  - Vite dev middleware (catch-all)       │ │
│  │    ↳ Serves client via HMR               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Listens on: http://localhost:5000             │
└─────────────────────────────────────────────────┘
```

### Entry Point
[server/index.ts](../../../server/index.ts)

### Key Operations
1. **Load environment:** `DATABASE_URL`, `PORT` (default 5000)
2. **Initialize DB:** Drizzle pool ([server/db.ts](../../../server/db.ts))
3. **Apply security middleware:** [server/security.ts](../../../server/security.ts)
4. **Register API routes:** [server/routes.ts](../../../server/routes.ts)
5. **Attach Vite middleware:** [server/vite.ts](../../../server/vite.ts)
6. **Start HTTP server:** `httpServer.listen(port)`

### Hot Reload
- **Client:** Vite HMR (instant)
- **Server:** Manual restart (no watch mode)
- **Schema changes:** Require server restart + migration

## Production Mode

### Build Command
```bash
npm run build
# → tsx script/build.ts
```

### Build Steps
1. **Clean:** Remove `dist/` directory
2. **Build client:** Vite build → `dist/public/`
3. **Build server:** esbuild bundle → `dist/index.cjs`
4. **Bundle dependencies:** Allowlist for faster cold start (see [script/build.ts](../../../script/build.ts))

### Run Command
```bash
npm start
# → cross-env NODE_ENV=production node dist/index.cjs
```

### Process Flow
```
┌─────────────────────────────────────────────────┐
│  Node.js (native)                               │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Express App (dist/index.cjs)             │ │
│  │  - Security middleware                    │ │
│  │  - Body parsers                           │ │
│  │  - API routes (/api/*)                   │ │
│  │  - Static file serving (dist/public/*)   │ │
│  │    ↳ Prebuilt SPA assets                 │ │
│  │  - SPA fallback (index.html)             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Listens on: PORT env var (default 5000)       │
└─────────────────────────────────────────────────┘
```

### Key Differences from Dev
- No Vite middleware (static files only)
- Bundled dependencies (faster startup)
- `NODE_ENV=production` (Secure cookies, stricter CORS)

## Component Breakdown

### 1. HTTP Server ([server/index.ts](../../../server/index.ts))

**Responsibilities:**
- Create Express app + HTTP server
- Apply security middleware (headers, rate limiting, CORS)
- Install body parsers (JSON, urlencoded) with 100kb limit
- Register API routes
- Serve client (Vite dev or static prod)
- Enhanced request logging with PII redaction

**Lifecycle:**
```typescript
1. Load env vars (DATABASE_URL, PORT)
2. Initialize Express app
3. setupSecurityMiddleware(app)
4. app.use(express.json({ limit: '100kb' }))
5. registerRoutes(httpServer, app)
6. if (prod) serveStatic(app)
   else setupViteMiddleware(app)
7. httpServer.listen(port)
```

**Evidence:** [server/index.ts](../../../server/index.ts#L1-L184)

### 2. API Routes ([server/routes.ts](../../../server/routes.ts))

**Responsibilities:**
- Authenticate requests (cookie or header-based)
- Resolve user's organization ID
- Dispatch to storage layer
- Return JSON responses

**Endpoint groups:**
- `/api/login`, `/api/logout`, `/api/auth/*` — Auth
- `/api/dashboard/*` — Dashboard stats
- `/api/clients`, `/api/contacts` — CRM
- `/api/deals`, `/api/proposals`, `/api/contracts` — Sales
- `/api/engagements`, `/api/projects`, `/api/tasks` — Delivery
- `/api/threads`, `/api/threads/:id/messages` — Communications
- `/api/invoices`, `/api/bills`, `/api/vendors` — Financials

**Total endpoints:** ~50 REST endpoints (1047 lines)

**Evidence:** [server/routes.ts](../../../server/routes.ts#L1-L1047)

### 3. Storage Layer ([server/storage.ts](../../../server/storage.ts))

**Responsibilities:**
- Execute Drizzle queries
- Enforce `organizationId` filtering
- Return typed results (via schema)

**Pattern:**
```typescript
export const storage = {
  getClientCompanies(orgId: string) {
    return db.query.clientCompanies.findMany({
      where: eq(clientCompanies.organizationId, orgId)
    });
  },
  createClientCompany(data: InsertClientCompany) {
    return db.insert(clientCompanies).values(data).returning();
  },
  // ... ~50 more methods
};
```

**Evidence:** [server/storage.ts](../../../server/storage.ts) (UNKNOWN: need to read file to confirm exact methods)

### 4. Database Connection ([server/db.ts](../../../server/db.ts))

**Responsibilities:**
- Create Postgres connection pool
- Attach Drizzle ORM with schema

**Configuration:**
```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

**Connection pool:** Default pg Pool settings (max 10 connections)

**Evidence:** [server/db.ts](../../../server/db.ts#L1-L24)

### 5. Security Middleware ([server/security.ts](../../../server/security.ts))

**Responsibilities:**
- Security headers (Helmet): HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Rate limiting: 1000 req/15min global, 10 req/15min auth
- CORS: Configurable origins (dev: all, prod: whitelist)
- Request sanitization (see [server/security-utils.ts](../../../server/security-utils.ts))

**Evidence:** [server/security.ts](../../../server/security.ts)

### 6. Client Serving

#### Development ([server/vite.ts](../../../server/vite.ts))
- Attach Vite dev middleware
- HMR WebSocket proxy
- Transform on-demand (ESM modules)

#### Production ([server/static.ts](../../../server/static.ts))
- Serve `dist/public/` static files
- SPA fallback to `index.html` for client-side routes

**Evidence:**
- Dev: [server/vite.ts](../../../server/vite.ts)
- Prod: [server/static.ts](../../../server/static.ts)

## Resource Lifecycle

### Database Connections
- **Pool creation:** On server startup ([server/db.ts](../../../server/db.ts))
- **Connection reuse:** Drizzle handles pooling
- **Cleanup:** ❌ No explicit pool shutdown (process exit)

### HTTP Server
- **Startup:** `httpServer.listen(port)` ([server/index.ts](../../../server/index.ts#L169))
- **Graceful shutdown:** ❌ Not implemented
- **Health checks:** ❌ Not implemented

### Sessions
- **Storage:** In-memory (dev) — ❌ Lost on restart
- **TTL:** UNKNOWN (need to verify [server/session.ts](../../../server/session.ts))
- **Cleanup:** UNKNOWN (no TTL eviction visible)

## Background Jobs (Future)

**Current:** ❌ None  
**Target (per PLAN.md):**
- **Outbox dispatcher:** Poll outbox table, deliver events
- **Email sync:** Poll email providers, create threads/messages
- **Ledger sync:** Push invoices/bills to QBO/Xero
- **Scheduled tasks:** Invoice generation, payment reminders

**Implementation plan:** See [EVENTS_AND_JOBS.md](../40_interfaces/EVENTS_AND_JOBS.md)

## Process Management

### Development
- **Start:** `npm run dev` (foreground)
- **Stop:** Ctrl+C (SIGINT)
- **Restart:** Manual (no auto-reload for server)

### Production (Future)
- **Process manager:** PM2, systemd, or Docker
- **Replicas:** Horizontal scaling (stateless)
- **Load balancer:** Nginx, ALB, etc.
- **Graceful shutdown:** SIGTERM handler (not implemented)

## Environment Variables (Runtime)

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ Yes | None | [server/db.ts](../../../server/db.ts#L19) |
| `PORT` | ❌ No | 5000 | [server/index.ts](../../../server/index.ts#L169) |
| `NODE_ENV` | ⚠️ Auto-set | development | Security, logs |
| `ALLOWED_ORIGINS` | ❌ No | (all in dev) | [server/security.ts](../../../server/security.ts#L173) |

**UNKNOWN:** No `.env` file loader. Vars must be set in shell.

## Health & Readiness

**Current:** ❌ None

**Recommended (future):**
- `GET /health` → `{ "status": "ok", "uptime": 12345, "db": "connected" }`
- `GET /ready` → `200` if DB reachable, `503` if not
- **Use case:** Kubernetes liveness/readiness probes

## Observability

### Logging
- **Level:** `console.log` (no levels)
- **Format:** Plain text with timestamp
- **Redaction:** PII redacted via [server/security-utils.ts](../../../server/security-utils.ts)
- **Correlation IDs:** ❌ Not implemented

### Metrics
- **Current:** ❌ None
- **Target:** Prometheus metrics (`/metrics` endpoint)
  - Request duration histogram
  - Request count by status/route
  - DB connection pool stats
  - Active sessions

### Tracing
- **Current:** ❌ None
- **Target:** OpenTelemetry spans
  - Trace ID propagation
  - DB query spans
  - External API spans

## Performance Characteristics

### Cold Start
- **Development:** ~2-3 seconds (tsx + Vite)
- **Production:** ~1 second (bundled)

### Memory Footprint
- **Idle:** UNKNOWN (need to measure with `process.memoryUsage()`)
- **Under load:** UNKNOWN

### Concurrency Model
- **Event loop:** Single-threaded (Node.js default)
- **Blocking operations:** DB queries (async via pg Pool)
- **Parallelism:** None (no worker threads, no clustering)

### Scalability
- **Vertical:** Limited by single process (CPU, memory)
- **Horizontal:** Possible (stateless API, externalize sessions to Redis)
- **Bottlenecks:** DB connections (max 10 pool), in-memory sessions

---

**Navigation:**
- [CURRENT_ARCHITECTURE_OVERVIEW.md](./CURRENT_ARCHITECTURE_OVERVIEW.md): High-level architecture
- [REPO_MAP.md](./REPO_MAP.md): Directory structure
- [BUILD_AND_TOOLING.md](./BUILD_AND_TOOLING.md): Build system
- [DEPLOYMENT_TOPOLOGY.md](../50_deployment/DEPLOYMENT_TOPOLOGY.md): Deployment architecture

**Last verified by:** Manual inspection + `npm run dev` + `npm run build && npm start`
