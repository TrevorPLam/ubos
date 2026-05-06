# UBOS - Unified Business Operating System

A modern, full-stack business SaaS platform built with React 19, featuring a comprehensive CRM system and multi-tenant architecture.

## 🚀 Features

### Core Platform
- **Multi-tenant SaaS architecture** with organization isolation
- **Modern dark-themed UI** with glassmorphism effects
- **Real-time updates** with optimistic UI changes
- **Type-safe API** with tRPC and OpenAPI documentation

### Functional Modules
- **🏢 CRM** - Fully functional lead management with kanban board, CRUD operations, and real-time updates
- **🔐 Authentication** - Complete auth system with Better Auth, organization management, and tenant switching
- **📊 Analytics** - Interactive charts and dashboards (Overview functional, others coming soon)
- **📁 Projects** - Task management and project tracking (partially implemented)
- **💼 Documents** - Document repository and e-signature management (UI complete)
- **💰 Finance** - Financial operations and reporting (UI complete)
- **📦 Assets** - Asset inventory and management (UI complete)
- **🌐 Portal** - Client portal management (UI complete)
- **⚙️ Settings** - System configuration and user management (UI complete)

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** for file-based routing
- **TanStack Query** for server state management
- **tRPC** for type-safe API calls
- **Tailwind CSS v4** with dark theme
- **Framer Motion** for animations
- **shadcn/ui** component library

### Backend
- **Hono** API server
- **tRPC** for API procedures
- **Better Auth** with organization plugin
- **Drizzle ORM** with PostgreSQL
- **Row Level Security** for tenant isolation

### Development
- **pnpm** workspace with supply-chain controls
- **Turbo** monorepo orchestration
- **Playwright** for E2E testing
- **Vitest** for unit testing
- **ESLint** and TypeScript strict mode

## 📦 Project Structure

```
ubos/
├── apps/
│   └── web/                 # Main React application
├── packages/
│   ├── auth/               # Authentication package
│   └── db/                 # Database layer and migrations
├── docs/                   # Architecture decisions
├── tests/                  # E2E tests
└── tasks/                  # Infrastructure tasks
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 10.19.0+
- PostgreSQL (optional - app works with in-memory fallback)

### Installation

```bash
# Clone the repository
git clone https://github.com/thetrevorlam/ubos.git
cd ubos

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Environment Variables

```env
# Database (optional - app works without it)
DATABASE_URL=postgresql://user:password@localhost:ubos

# Auth (auto-generated if not provided)
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173
```

## 🏗 Architecture

### Multi-Tenant Design
- **Organization isolation** via Row Level Security
- **Tenant-aware API** with automatic header injection
- **Graceful degradation** when database unavailable

### CRM Module (Production Ready)
- **Kanban board** with drag-and-drop stages
- **Real-time CRUD** with optimistic updates
- **Toast notifications** for user feedback
- **Form validation** with Zod schemas
- **Database persistence** with in-memory fallback

### Authentication System
- **Sign up/Sign in** flows
- **Organization management** with member invitations
- **Role-based access** control scaffolding
- **Session management** with secure cookies

## 🧪 Testing

```bash
# Run E2E tests
pnpm test:e2e

# Run unit tests
pnpm test

# Test specific module
pnpm test --filter=crm
```

## 📊 Current Status

| Module | Status | Notes |
|--------|--------|-------|
| CRM | ✅ Production Ready | Full CRUD, real-time updates |
| Authentication | ✅ Production Ready | Better Auth with organizations |
| Database | ✅ Production Ready | Complete schema with RLS |
| API | ✅ Production Ready | tRPC with REST compatibility |
| Analytics | 🟡 Partial | Overview charts functional |
| Projects | 🟡 Partial | Task management functional |
| Other Modules | 🟡 UI Complete | Visual implementation, backend pending |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: (Coming soon)
- **Documentation**: [docs/](./docs/)
- **API Documentation**: Available at `/api/openapi.json` when running
- **Issues**: [GitHub Issues](https://github.com/thetrevorlam/ubos/issues)

---

**UBOS** - Building the future of business operations software.
