# REPO.md — UBOS Repository Context

## What this repo is / will become 
- Current Status
- Goal

## Repo Map (Reality)
- apps/: …
- server/: …
- client/: …
- shared/: …
- docs/: …

## Conventions
- Language: TypeScript (primary)
- Monorepo tooling: (pnpm/turbo/etc.)
- Testing: vitest (backend + client configs)
- Security: /server/security.ts + /docs/security/

## Golden Commands
- Install: <command>
- Typecheck: <command>
- Tests: <commands>
- Build: <command>
- Security validation: <command>

## Critical Invariants
- Multi-tenant scoping required on all data access
- No sensitive logging (redaction enforced)
- No “dev auth bypass” in production
