---
title: "Build and Tooling"
last_updated: "2026-02-04"
status: "active"
owner: "Platform Team"
classification: "internal"
---

# Build and Tooling

**Purpose**: Document the build system, tooling, and development workflow for UBOS  
**Status**: PARTIAL - needs completion  
**Last Updated**: 2026-02-04

---

## Overview

UBOS uses a modern TypeScript-based monorepo build system with Vite as the primary build tool.

---

## Build Tools

### Primary Build System

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vite** | Frontend build, dev server, HMR | [vite.config.ts](/vite.config.ts) |
| **TypeScript** | Type checking, transpilation | [tsconfig.json](/tsconfig.json), [tsconfig.node.json](/tsconfig.node.json) |
| **ESBuild** | Fast bundling (via Vite) | Configured in Vite config |
| **Vitest** | Testing framework | [vitest.config.ts](/vitest.config.ts), [vitest.config.client.ts](/vitest.config.client.ts) |

### Package Management

- **Package Manager**: npm (default) or pnpm/yarn
- **Configuration**: [package.json](/package.json)
- **Lock File**: package-lock.json

### Code Quality Tools

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | JavaScript/TypeScript linting | [eslint.config.js](/eslint.config.js) |
| **TypeScript** | Static type checking | [tsconfig.json](/tsconfig.json) |

### CSS/Styling

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Tailwind CSS** | Utility-first CSS framework | [tailwind.config.ts](/tailwind.config.ts) |
| **PostCSS** | CSS processing | [postcss.config.cjs](/postcss.config.cjs) |

---

## Build Commands

### Development

```bash
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Type Checking

```bash
npm run check        # Run TypeScript type checking
```

### Testing

```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:backend # Run backend tests only
npm run test:frontend # Run frontend tests only
```

### Linting

```bash
npm run lint         # Run ESLint (if configured)
```

---

## Build Outputs

### Production Build

- **Client Assets**: `dist/public/` - Static frontend assets
- **Server Bundle**: `dist/` - Server-side code
- **Sourcemaps**: Generated for debugging

### Development Mode

- **Dev Server**: Runs on port 5000 (configurable)
- **HMR**: Hot module replacement for fast iteration
- **API Proxy**: Backend API proxied through Vite dev server

---

## Development Workflow

### 1. Initial Setup

```bash
git clone <repository>
cd ubos
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your database URL and other config
```

### 3. Database Setup

```bash
# Run migrations (TODO: add migration commands)
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Run Tests

```bash
npm test
```

---

## Tooling Integration

### IDE Support

- **VS Code**: Recommended editor with TypeScript, ESLint, and Tailwind extensions
- **IntelliJ/WebStorm**: Full TypeScript and Node.js support

### Git Hooks

**TODO**: Add pre-commit hooks for:
- Type checking
- Linting
- Test runs

---

## Build Performance

### Current Metrics

**TODO**: Add build time metrics
- Cold start build time: UNKNOWN
- Incremental build time: UNKNOWN
- Test execution time: UNKNOWN

---

## Evidence Links

- **Build Configuration**: [vite.config.ts](/vite.config.ts)
- **Package Dependencies**: [package.json](/package.json)
- **Type Configuration**: [tsconfig.json](/tsconfig.json)
- **Test Configuration**: [vitest.config.ts](/vitest.config.ts)

---

**Status**: INCOMPLETE - Needs:
- Build performance metrics
- Git hooks configuration
- CI/CD integration details
- Dependency management guidelines
