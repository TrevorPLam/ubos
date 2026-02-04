# UBOS

UBOS is a full-stack TypeScript app (React + Express) with a Postgres-backed API.

## Prerequisites

- **Node.js:** 20.x LTS recommended
- **Postgres:** running locally or reachable from your environment

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables.

This repo does **not** auto-load a `.env` file at runtime. Use your shell/IDE to set env vars.
See `.env.example` for the full list.

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/ubos"
$env:PORT = "5000"
npm run dev
```

**bash/zsh (macOS/Linux):**

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/ubos"
export PORT="5000"
npm run dev
```

3. Run the app in development:

```bash
npm run dev
```

Open `http://localhost:5000`.

Tip: the app uses lightweight local auth. Visit `http://localhost:5000/api/login` to mint a dev user cookie.

## Common commands

- **Dev server (API + client via Vite middleware):** `npm run dev`
- **Typecheck:** `npm run check`
- **Production build (client + server):** `npm run build`
- **Run production bundle:** `npm start`

## Build output

- Client build: `dist/public/`
- Server bundle: `dist/index.cjs`

`npm start` runs `node dist/index.cjs` (make sure you’ve run `npm run build` first).

## Environment variables

Documented in `.env.example`.

- **Required**
  - `DATABASE_URL`: Postgres connection string used by the server.
- **Optional**
  - `PORT`: Port the server listens on (defaults to `5000`).
  - `NODE_ENV`: Set by scripts (`development` for `npm run dev`, `production` for `npm start`).

## Troubleshooting

- **“DATABASE_URL must be set”**
  - Set `DATABASE_URL` in your shell/IDE before running the server.
  - Confirm the database is reachable (host/port/credentials).

- **Port already in use**
  - Set `PORT` to another value (e.g. `5001`) and rerun.

- **Production server can’t find built assets**
  - If you see an error about a missing build directory, run `npm run build`.
  - Ensure `dist/public/` exists and is deployed alongside `dist/index.cjs`.

## Repo layout (high level)

- `client/` — React app (Vite root)
- `server/` — Express server + API routes + dev/prod client hosting
- `shared/` — Shared types/schema used by both client and server
- `script/build.ts` — Production build pipeline (Vite + esbuild)
- `tasks/` — File-based task workflow and backlogs
- `docs/` — Project documentation including security standards

## Security

UBOS implements comprehensive security standards and best practices. See [Security Documentation](./docs/security/00-overview/README.md) for details.

### Security Features

- **Authentication & Authorization**: Cookie-based auth with multi-tenant isolation
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more via Helmet
- **Rate Limiting**: Protects against brute force and DoS attacks
- **Input Validation**: Zod schemas for all user input
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: React auto-escaping + output encoding
- **Error Handling**: No information disclosure in production
- **CORS**: Configurable cross-origin resource sharing
- **Request Sanitization**: Defense-in-depth against injection attacks

### Compliance Standards

UBOS documentation supports compliance with:

- **SOC2**: Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
- **PCI-DSS**: Payment Card Industry Data Security Standard guidelines
- **HIPAA**: Health Insurance Portability and Accountability Act compliance
- **GDPR**: General Data Protection Regulation requirements

### Security Documentation

- [Security Overview](./docs/security/00-overview/README.md)
- [Application Security Guide](./docs/security/30-implementation-guides/APPLICATION_SECURITY.md)
- [Developer Security Guide](./docs/security/30-implementation-guides/DEVELOPER_GUIDE.md)
- [SOC2 Compliance](./docs/security/40-compliance/SOC2_COMPLIANCE.md)
- [PCI-DSS Guidelines](./docs/security/40-compliance/PCI_DSS_GUIDELINES.md)
- [HIPAA Compliance](./docs/security/40-compliance/HIPAA_COMPLIANCE.md)
- [GDPR Compliance](./docs/security/40-compliance/GDPR_COMPLIANCE.md)

### Security Testing

Run security-focused tests:

```bash
npm test tests/backend/security.test.ts
```

All tests (101 tests including 32 security tests):

```bash
npm test
```

### Reporting Security Issues

If you discover a security vulnerability, please report it to security@ubos.example.com. We take security seriously and will respond promptly to verified reports.
