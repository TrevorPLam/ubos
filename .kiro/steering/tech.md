# Technology Stack

## Core Stack

- **Runtime**: Node.js 20.x LTS
- **Language**: TypeScript 5.6 (strict mode)
- **Frontend**: React 18 + Vite 7
- **Backend**: Express 4
- **Database**: PostgreSQL (via Drizzle ORM)
- **Validation**: Zod schemas for all input/output
- **Routing**: Wouter (client-side)
- **State**: TanStack Query (React Query)
- **UI Components**: Radix UI + Tailwind CSS + shadcn/ui patterns

## Key Libraries

- **Security**: Helmet (headers), express-rate-limit, csurf (CSRF), cookie-parser
- **Testing**: Vitest + Testing Library + MSW (mocking)
- **Code Quality**: ESLint, Prettier, TypeScript compiler
- **Build**: esbuild (server), Vite (client)

## Common Commands

```bash
# Development
npm run dev              # Start dev server (API + client with HMR)

# Type Checking
npm run check            # TypeScript validation (all configs)

# Testing
npm test                 # Run all tests once
npm run test:watch       # Watch mode
npm run test:backend     # Server tests only
npm run test:frontend    # Client tests only
npm run coverage         # Generate coverage report

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
npm run format:check     # Prettier validation

# Production
npm run build            # Build client + server bundle
npm start                # Run production build

# Security
npm run validate:security  # Full security validation suite
```

## Environment Variables

Required: `DATABASE_URL` (Postgres connection string)
Optional: `PORT` (default: 5000), `NODE_ENV` (set by scripts)

See `.env.example` for full list. Variables must be set in shell/IDE (not auto-loaded from `.env`).

## Build Output

- Client: `dist/public/` (static assets)
- Server: `dist/index.cjs` (bundled Node app)

## Module Resolution

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Use these aliases consistently in imports.
