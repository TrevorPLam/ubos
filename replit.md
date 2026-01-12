# UBOS - Unified Business Operations Suite

## Overview

UBOS is a multi-tenant SaaS platform that unifies core business operations into a single system. The application centers around the concept of an **Engagement** - a primary object that ties together clients, deals, proposals, contracts, projects, documents, communications, and invoicing.

The platform provides:
- CRM functionality (clients, contacts, deals pipeline)
- Proposal and contract management with e-signature capabilities
- Project management with templates, tasks, and milestones
- Internal and client-facing communication threads
- Accounts receivable (invoicing) and accounts payable (bills) management
- Multi-tenant architecture with organization-based data isolation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: Follows Linear/Stripe/Notion-inspired enterprise SaaS aesthetic with data-dense layouts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript throughout (shared types between client and server)
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via drizzle-kit with `db:push` command

### Multi-tenancy Design
- Organizations are the top-level tenant isolation unit
- All business entities (clients, deals, engagements, etc.) are scoped to an organization
- Users are associated with organizations through the `organization_members` table
- RBAC with roles: owner, admin, member, viewer

### Core Data Model
The **Engagement** is the central entity connecting:
- Client companies and contacts
- Deals, proposals, and contracts
- Projects, tasks, and milestones
- Communication threads and messages
- Invoices and invoice schedules
- Bills and vendors

### Build System
- Development: Vite dev server with HMR
- Production: esbuild for server bundling, Vite for client bundling
- Output: `dist/` directory with `index.cjs` (server) and `public/` (static assets)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, requires `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Data Validation
- **Zod**: Runtime type validation
- **drizzle-zod**: Automatic Zod schema generation from Drizzle tables
- **react-hook-form**: Form state management with Zod resolver

### File Storage (Planned)
- Architecture supports S3/R2 compatible storage for file objects
- File metadata stored in database, actual files stored externally