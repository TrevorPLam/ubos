# Code Commentary Guidelines

These notes are here to keep comments **useful for humans** and (most importantly) **fast for AI iteration**.

## Philosophy

- Prefer **high-signal** comments over volume.
- Comments should answer “why / how / where to extend”, not restate obvious TypeScript.
- Put the most important orientation at the **top of the file** so tools/agents see it first.

## File headers

Use a short module header (JSDoc style) near the top:

- **What this file is responsible for**
- **What it intentionally does NOT do** (if that’s a common confusion)
- **Key invariants / constraints** (tenancy, auth assumptions, ordering constraints)
- **AI iteration notes** (the concrete steps to add/extend the feature)

Example sections:

- Responsibilities
- Data flow
- AI iteration notes

## Inline comments

Inline comments are best for:

- Non-obvious control flow (e.g., why a catch-all route must be last)
- Safety/constraints (auth/tenant scoping, security tradeoffs)
- Conventions (e.g., “queryKey is a URL”) that are relied upon across the codebase

Avoid inline comments for:

- Trivial statements (e.g., “increment i”)
- Repeating a function name

## UBOS-specific conventions

- **Auth** (dev/local): cookie + optional `x-user-id` header (see `server/routes.ts`).
- **Tenancy**: most data is scoped by `organizationId`; enforce in `server/storage.ts`.
- **Client routing**: wouter routes defined in `client/src/App.tsx`.
- **API calls**: use React Query utilities in `client/src/lib/queryClient.ts`.
