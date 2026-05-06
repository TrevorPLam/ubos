# ADR 012: API Contract Strategy

## Status

Accepted

## Context

The UBOS workspace exposes application capabilities through TanStack Start server functions, Hono, and tRPC. Internal product surfaces need end-to-end type safety across the client, server procedures, and shared schemas. External consumers still need a stable HTTP contract for selected endpoints without forcing the team to design and maintain a second API layer by hand.

The CRM slice now demonstrates both needs:

- `crm.listLeadBoard`, `crm.createLead`, `crm.updateLead`, and `crm.deleteLead` are implemented as tRPC procedures.
- `/api/rest/crm/leads` exists as a REST-shaped example for external consumption.

## Decision

UBOS will treat tRPC as the primary application API.

REST contracts for external consumers will be derived from the same procedure layer through `@trpc/openapi` or thin compatibility handlers where required. The team will not maintain a separate hand-written REST API surface in parallel with tRPC.

## Consequences

Positive:

- Internal clients keep a single type-safe source of truth.
- Procedure input and output schemas remain aligned with server implementation.
- External REST consumers can use generated or compatibility contracts without duplicating business logic.
- New domain slices follow one architecture pattern instead of splitting work across two transport layers.

Trade-offs:

- Public REST support must remain intentionally scoped to endpoints that need external access.
- REST compatibility routes must map directly onto existing procedures or shared services to avoid drift.
- OpenAPI generation becomes part of the contract-review process for externally consumed endpoints.

## Implementation Notes

- Prefer adding new capabilities in the tRPC router first.
- Reuse shared Zod schemas for both procedure contracts and transport-level compatibility routes.
- Keep example REST handlers, such as `/api/rest/crm/leads`, thin and delegation-only.
- Do not add a second controller/service stack solely for REST unless a requirement cannot be satisfied through the primary tRPC contract.