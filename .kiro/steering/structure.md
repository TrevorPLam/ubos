# Project Structure

## Top-Level Organization

```
├── client/          # React frontend (Vite root)
├── server/          # Express backend + API
├── shared/          # Shared types, schemas, models
├── script/          # Build scripts and utilities
├── tests/           # Test files (backend/frontend)
├── docs/            # Documentation (security, compliance)
├── .kiro/           # Kiro configuration and steering
└── dist/            # Build output (gitignored)
```

## Client Structure (`client/`)

```
client/
├── src/
│   ├── components/     # React components
│   │   ├── ui/         # Radix UI + shadcn components
│   │   └── *.tsx       # Feature components
│   ├── pages/          # Route pages (dashboard, clients, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and helpers
│   ├── App.tsx         # Root component with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles (Tailwind)
└── index.html          # HTML template
```

## Server Structure (`server/`)

```
server/
├── index.ts            # Application entrypoint
├── routes.ts           # API route registration
├── security.ts         # Security middleware setup
├── security-utils.ts   # Security helpers (sanitization, logging)
├── config-validation.ts # Environment validation
├── session.ts          # Session management
├── csrf.ts             # CSRF protection
├── db.ts               # Database connection
├── storage.ts          # Data access layer (org-scoped)
├── logger.ts           # Structured logging
├── static.ts           # Static file serving (production)
└── vite.ts             # Vite middleware (development)
```

## Shared Structure (`shared/`)

```
shared/
├── schema.ts           # Drizzle table definitions + Zod schemas
└── models/
    ├── auth.ts         # Authentication types
    └── index.ts        # Model exports
```

## Key Conventions

### Multi-Tenancy
- Most tables include `organizationId` for tenant isolation
- All queries MUST be scoped by organization (enforced in `server/storage.ts`)
- Never query across organizations

### Naming Patterns
- Database columns: `snake_case` (e.g., `created_at`, `client_company_id`)
- TypeScript: `camelCase` (e.g., `createdAt`, `clientCompanyId`)
- Drizzle ORM handles mapping automatically
- Components: `PascalCase` for files, `kebab-case` for multi-word names

### File Colocation
- Tests live next to source: `component.tsx` + `component.test.tsx`
- Keep related code together (component + styles + tests)

### Import Aliases
- `@/*` for client code: `import { Button } from "@/components/ui/button"`
- `@shared/*` for shared code: `import { insertDealSchema } from "@shared/schema"`
- Use consistently across client and server

### Security Patterns
- All user input validated with Zod schemas
- Security middleware applied before routes (see `server/index.ts`)
- Sensitive data redacted in logs (see `server/security-utils.ts`)
- CSRF protection on state-changing endpoints
- Rate limiting on all API routes

### API Structure
- Routes registered in `server/routes.ts`
- Prefix all API routes with `/api`
- Use HTTP methods semantically (GET, POST, PUT, DELETE)
- Return consistent JSON responses

### Database Access
- Use Drizzle ORM for all queries (parameterized, SQL injection safe)
- Access via `server/storage.ts` methods (org-scoped by default)
- Migrations live in database (not in repo currently)

## Documentation
- Security docs: `docs/security/` (compliance, guides, standards)
- Inline AI-META comments in files describe ownership and dependencies
- README.md for quickstart and architecture overview
