# UBOS - Unified Business Operating System

A comprehensive business SaaS platform built with modern web technologies, featuring a production-ready CRM module and extensible architecture for multi-domain business operations.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ubos.git
cd ubos

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## 📋 Overview

UBOS is a React 19 monorepo application that presents as a unified business platform across nine domains:

- **CRM** - Fully functional customer relationship management
- **Projects** - Project management and task tracking
- **Documents** - Document repository and e-signature management
- **Finance** - Financial operations and expense management
- **Assets** - Asset tracking and inventory management
- **Portal** - Client portal and external access management
- **Analytics** - Business intelligence and reporting
- **Settings** - System configuration and user management
- **Dashboard** - Centralized business overview

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Query, Tailwind CSS v4
- **Backend**: Hono, tRPC, Better Auth, Drizzle ORM
- **Database**: PostgreSQL with Row Level Security
- **Tooling**: pnpm workspace, Turbo monorepo, TypeScript
- **Testing**: Playwright E2E, Vitest unit tests
- **UI**: shadcn/ui components with dark theme

### Monorepo Structure

```
ubos/
├── apps/
│   └── web/           # Main React application
├── packages/
│   ├── auth/          # Authentication package
│   └── db/            # Database layer and migrations
├── docs/              # Architecture decisions
├── tests/             # E2E tests
└── tasks/             # Infrastructure planning
```

## ✨ Features

### Production-Ready CRM

The CRM module demonstrates the full capability of the platform:

- **Full CRUD Operations** - Create, read, update, delete leads and contacts
- **Kanban Board** - Drag-and-drop lead management through stages
- **Real-time Updates** - Optimistic updates with toast notifications
- **Data Persistence** - PostgreSQL with in-memory fallback for development
- **Multi-tenant Support** - Organization isolation with Row Level Security
- **Form Validation** - Comprehensive Zod schema validation
- **Error Handling** - Graceful degradation and user feedback

### Authentication & Security

- **Better Auth Integration** - Modern authentication with organization plugin
- **Multi-organization Support** - Switch between organizations seamlessly
- **Tenant Isolation** - Row Level Security for data separation
- **Session Management** - Secure session handling with cookies
- **Role-based Access** - Scaffolding for permissions and roles

### Developer Experience

- **Type Safety** - End-to-end TypeScript with strict mode
- **Hot Reloading** - Fast development with Vite and TanStack Start
- **API Documentation** - Auto-generated OpenAPI from tRPC
- **Testing Infrastructure** - E2E and unit test setup
- **Code Quality** - ESLint, Prettier, and comprehensive linting

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm 10.19.0+
- PostgreSQL (optional - app graceful degrades without DATABASE_URL)

### Environment Setup

1. **Clone and install**:
   ```bash
   git clone https://github.com/your-username/ubos.git
   cd ubos
   pnpm install
   ```

2. **Environment variables**:
   ```bash
   # Optional: For full functionality
   DATABASE_URL=postgresql://user:password@localhost:5432/ubos
   
   # Auth configuration (production)
   AUTH_SECRET=your-secret-key
   ```

3. **Database setup** (if using PostgreSQL):
   ```bash
   # Apply migrations
   pnpm db:migrate
   ```

4. **Start development**:
   ```bash
   pnpm dev
   ```

### Available Scripts

```bash
pnpm dev          # Start all services in development
pnpm build        # Build for production
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm lint         # Run linting
pnpm typecheck    # Run TypeScript checks
```

## 📊 Current Status

| Domain | Status | Description |
|--------|--------|-------------|
| **CRM** | ✅ Production Ready | Full CRUD, real-time updates, persistence |
| **Authentication** | ✅ Complete | Better Auth, organizations, tenant isolation |
| **Database** | ✅ Complete | Schema, migrations, multi-tenant support |
| **API** | ✅ Functional | tRPC server with REST compatibility |
| **Projects** | 🔄 Partial | Mixed implementation, some functionality |
| **Documents** | 🎨 Mock Only | Visual UI, no real functionality |
| **Finance** | 🎨 Mock Only | Visual UI, no real functionality |
| **Assets** | 🎨 Mock Only | Table view, no interactions |
| **Portal** | 🎨 Mock Only | Visual UI, no real functionality |
| **Analytics** | 📊 Partial | One functional chart view |
| **Settings** | 📊 Partial | One functional tab, others placeholder |

## 🧪 Testing

### E2E Tests

Playwright tests cover critical user flows:

```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e --ui
```

Current test coverage:
- Authentication flow (signup → signin)
- CRM lead creation and management
- Organization switching

### Unit Tests

Vitest tests for backend logic:

```bash
# Run unit tests
pnpm test
```

## 🚀 Deployment

### Environment Variables

Required for production:

```bash
DATABASE_URL=postgresql://user:password@host:5432/ubos
AUTH_SECRET=your-production-secret
NODE_ENV=production
```

### Build Process

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature description'`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Add tests for new functionality
- Update documentation for API changes
- Ensure TypeScript strict compliance
- Use existing UI components from shadcn/ui

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://ubos-demo.vercel.app) (coming soon)
- [API Documentation](https://github.com/your-username/ubos/blob/main/docs/api.md)
- [Architecture Decisions](https://github.com/your-username/ubos/blob/main/docs/adr/)

## 🙏 Acknowledgments

Built with modern open-source technologies and community-driven tools.
