# UBOS - Verified Workspace Map

Verified against the live working tree on May 5, 2026 at 12:47 PM UTC-07:00.

## Scope

This map inventories the repository contents that are part of the current product and shared-code tree. The inventory explicitly excludes `.windsurf/`, `.git/`, `node_modules/`, `.turbo/`, and build output directories (`.tanstack/`, `dist/`). All counts below refer only to the included tree.

## Verified Snapshot

- Included directories: 22
- Included files: 100+
- Top-level included directories: 4 (`apps/`, `packages/`, `docs/`, `tests/`)
- Root-level files: 10
- Deployable applications: 1
- Shared packages: 2
- `apps/web/`: 16 directories, 60+ source files (excluding build outputs and node_modules)
- `packages/auth/`: 1 directory, 1 source file (excluding build outputs)
- `packages/db/`: 2 directories, 6 source files (excluding build outputs)
- `docs/`: 1 directory, 1 file
- `tests/`: 1 directory, 1 file

## Current State

- `apps/web/` is the main React 19 frontend application (branded as ApexOS) using TanStack Router, TanStack Query, tRPC, and shadcn/ui components with comprehensive business modules.
- `packages/auth/` provides authentication utilities using Better Auth with Drizzle adapter, organization plugin, and TanStack Start cookies integration.
- `packages/db/` handles database operations using Drizzle ORM with PostgreSQL, multi-tenant support via `@usebetterdev/tenant`, and comprehensive schema definitions for auth, CRM, organizations, and access policies.
- The workspace uses pnpm with strict catalog mode for dependency management and workspace package dependencies (`@ubos/auth`, `@ubos/db`).
- Turbo is used for monorepo task orchestration with build, dev, lint, test, and typecheck scripts across all packages.
- The application includes comprehensive UI components (56 shadcn/ui components), pages for various business modules (CRM, Analytics, Finance, etc.), authentication flows, and tRPC integration for type-safe API calls.
- End-to-end testing is configured with Playwright for CRM authentication flows.
- Database migrations are managed with Drizzle Kit and include schema snapshots for tracking.

## Root Inventory

- `apps/` - Top-level directory containing deployable application packages.
- `packages/` - Top-level directory containing shared workspace packages.
- `docs/` - Top-level directory containing documentation and ADRs.
- `tests/` - Top-level directory containing end-to-end tests.
- `.gitignore` - Git ignore rules for dependencies, build output, editor state, and local artifacts.
- `.playwright-auth-crm.json` - Playwright storage state for CRM authentication testing.
- `package.json` - Root workspace manifest with Turbo scripts and workspace configuration.
- `pnpm-lock.yaml` - Exact dependency lockfile for the workspace.
- `pnpm-workspace.yaml` - pnpm workspace membership, catalog with strict mode, and package policy configuration.
- `playwright.config.mjs` - Playwright test configuration for end-to-end testing.
- `tsconfig.base.json` - Shared TypeScript compiler baseline with ES2022 target, React JSX, and strict mode configuration.
- `turbo.json` - Turbo monorepo task configuration with build dependencies, dev persistence, and E2E test caching.
- `WORKSPACE-MAP.md` - This verified repository inventory.

## apps/web

### Directories

- `apps/web/` - Main React 19 frontend application for UBOS.
- `apps/web/public/` - Public assets served directly by the frontend build.
- `apps/web/src/` - Frontend source tree.
- `apps/web/src/components/` - Reusable React components for layout and UI.
- `apps/web/src/components/layout/` - Shell components that build the app frame.
- `apps/web/src/components/ui/` - Shared UI primitives and wrappers used across the frontend.
- `apps/web/src/data/` - Mock data used by the current product UI.
- `apps/web/src/hooks/` - Frontend hooks for responsive state and toast behavior.
- `apps/web/src/lib/` - Frontend utility helpers and client configurations.
- `apps/web/src/pages/` - Route-level business domain pages.
- `apps/web/src/routes/` - TanStack Router route definitions.
- `apps/web/src/server/` - Server-side rendering and API integration code with tRPC.
- `apps/web/src/mocks/` - Mock Service Worker (MSW) handlers for testing.

### Package and Configuration Files

- `apps/web/package.json` - Frontend package manifest with 82 dependencies including React, TanStack stack, tRPC, 38 Radix UI components, Better Auth, Drizzle ORM, Hono, and workspace packages (@ubos/auth, @ubos/db).
- `apps/web/tsconfig.json` - TypeScript config extending base, path aliases (`@/*`, `#/*`), allowImportingTsExtensions, verbatimModuleSyntax, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, and vite/client types.
- `apps/web/vite.config.ts` - Vite configuration with TanStack Start plugin, Tailwind CSS v4, React plugin, TanStack devtools, and tsconfig paths resolution.
- `apps/web/README.md` - TanStack Start application documentation with setup, testing, styling, routing, server functions, API routes, and data fetching instructions.
- `apps/web/.cta.json` - Create TanStack App configuration: file-router mode, TypeScript, Tailwind, pnpm, react framework, eslint add-on, git disabled, examples excluded.
- `apps/web/.prettierignore` - Prettier ignore rules excluding package lock files.
- `apps/web/eslint.config.js` - ESLint using TanStack config with disabled rules (import/no-cycle, import/order, sort-imports, @typescript-eslint/array-type, @typescript-eslint/require-await, pnpm/json-enforce-catalog).
- `apps/web/prettier.config.js` - Prettier configuration with no semicolons, single quotes, and trailing commas.
- `apps/web/.gitignore` - Git ignore rules for node_modules, dist, dist-ssr, .env, .tanstack, .output, .vinxi, .nitro, .wrangler, __unconfig*, todos.json.
- `apps/web/src/router.tsx` - TanStack Router configuration with scroll restoration, intent-based preloading, and stale time configuration.
- `apps/web/src/routeTree.gen.ts` - Generated route tree file from TanStack Router file-based routing.
- `apps/web/src/styles.css` - Global styles with Tailwind CSS v4, design tokens, dark theme, and custom color palette.

### Public Assets

- `apps/web/public/favicon.ico` - Website favicon.
- `apps/web/public/logo192.png` - 192x192 logo for PWA.
- `apps/web/public/logo512.png` - 512x512 logo for PWA.
- `apps/web/public/manifest.json` - Progressive Web App manifest.
- `apps/web/public/mockServiceWorker.js` - MSW worker for API mocking.
- `apps/web/public/robots.txt` - Search engine crawler instructions.

### Shell and Layout Components

- `apps/web/src/components/CommandPalette.tsx` - Global command-palette using cmdk with cmd+K shortcut, 9 page navigation options (Dashboard, CRM, Projects, Documents, Finance, Assets, Portal, Analytics, Settings), dark theme styling with Dialog wrapper.
- `apps/web/src/components/layout/Header.tsx` - Top header with ApexOS branding, breadcrumb navigation, search trigger with cmd+K hint, notification bell with indicator, and user dropdown with initials and sign-out functionality.
- `apps/web/src/components/layout/MainLayout.tsx` - Main app frame with Sidebar, Header, Framer Motion AnimatePresence page transitions, dark theme background, and responsive overflow handling.
- `apps/web/src/components/layout/Sidebar.tsx` - Collapsible left navigation with 9 domain links, ApexOS branding with logo, Framer Motion width animations (60px collapsed, 220px expanded), active state highlighting, and toggle button.

### UI Primitive Components (56 components)

- `apps/web/src/components/ui/PageTransition.tsx` - Framer Motion wrapper with opacity/y transitions (0.2s easeOut), exit animation, and configurable className.
- `apps/web/src/components/ui/accordion.tsx` - Radix UI accordion with ChevronDown icon, border styling, hover underline, and animated content transitions.
- `apps/web/src/components/ui/alert-dialog.tsx` - Radix UI confirmation dialog with 11 components (Root, Trigger, Portal, Overlay, Content, Header, Footer, Title, Description, Action, Cancel) and button variant integration.
- `apps/web/src/components/ui/alert.tsx` - Alert banner with class-variance-authority variants (default, destructive), AlertTitle, and AlertDescription components.
- `apps/web/src/components/ui/aspect-ratio.tsx` - Radix UI aspect-ratio primitive wrapper.
- `apps/web/src/components/ui/avatar.tsx` - Radix UI avatar with Avatar, AvatarImage, and AvatarFallback components, 10x40px sizing, and rounded-full styling.
- `apps/web/src/components/ui/badge.tsx` - Badge component with class-variance-authority variants (default, secondary, destructive, outline), hover-elevate styling, and whitespace-nowrap.
- `apps/web/src/components/ui/breadcrumb.tsx` - Radix UI breadcrumb navigation with 7 components (Breadcrumb, List, Item, Link, Page, Separator, Ellipsis) and ChevronRight/MoreHorizontal icons.
- `apps/web/src/components/ui/button-group.tsx` - Button group layout with horizontal/vertical orientations, ButtonGroupText, ButtonGroupSeparator, and focus management.
- `apps/web/src/components/ui/button.tsx` - Button component with class-variance-authority variants (default, destructive, outline, secondary, ghost, link), sizes (default, sm, lg, icon), hover-elevate styling, and Slot support.
- `apps/web/src/components/ui/calendar.tsx` - React Day Picker calendar with custom styling, button variants, dropdown formatters, CalendarDayButton component, and range selection support.
- `apps/web/src/components/ui/card.tsx` - Card layout primitives with 6 components (Card, Header, Footer, Title, Description, Content), rounded-xl styling, and shadow effects.
- `apps/web/src/components/ui/carousel.tsx` - Embla-based carousel with 6 components (Carousel, Content, Item, Previous, Next, type CarouselApi), horizontal/vertical orientation, keyboard navigation, and ArrowLeft/Right buttons.
- `apps/web/src/components/ui/chart.tsx` - Recharts integration with 6 components (ChartContainer, Tooltip, TooltipContent, Legend, LegendContent, ChartStyle), theme support, custom styling, and ChartConfig system.
- `apps/web/src/components/ui/checkbox.tsx` - Radix UI checkbox with Check icon, 4x4px sizing, rounded-sm styling, and focus ring support.
- `apps/web/src/components/ui/collapsible.tsx` - Radix UI collapsible with 3 components (Collapsible, Trigger, Content).
- `apps/web/src/components/ui/command.tsx` - cmdk-based command menu with 10 components (Command, Dialog, Input, List, Empty, Group, Item, Shortcut, Separator) and Search icon integration.
- `apps/web/src/components/ui/context-menu.tsx` - Radix UI context menu with 15 components (ContextMenu, Trigger, Content, Item, CheckboxItem, RadioItem, Label, Separator, Shortcut, Group, Portal, Sub, SubContent, SubTrigger, RadioGroup) and Check/ChevronRight/Circle icons.
- `apps/web/src/components/ui/dialog.tsx` - Radix UI modal dialog with 10 components (Dialog, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description), X icon, and hideClose option.
- `apps/web/src/components/ui/drawer.tsx` - Vaul-based drawer with 10 components (Drawer, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description), bottom sheet positioning, and background scaling.
- `apps/web/src/components/ui/dropdown-menu.tsx` - Radix UI dropdown menu with 16 components (DropdownMenu, Trigger, Content, Item, CheckboxItem, RadioItem, Label, Separator, Shortcut, Group, Portal, Sub, SubContent, SubTrigger, RadioGroup) and Check/ChevronRight/Circle icons.
- `apps/web/src/components/ui/empty.tsx` - Empty-state presentation with 6 components (Empty, Header, Title, Description, Content, Media), class-variance-authority variants, and responsive styling.
- `apps/web/src/components/ui/field.tsx` - Form field layout with 11 components (Field, Label, Description, Error, Group, Legend, Separator, Set, Content, Title), orientation variants (vertical, horizontal, responsive), and validation styling.
- `apps/web/src/components/ui/form.tsx` - React Hook Form bindings with 7 components (Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage), context providers, and validation integration.
- `apps/web/src/components/ui/hover-card.tsx` - Radix UI hover-card with 3 components (HoverCard, Trigger, Content), center alignment, 4px side offset, and animated transitions.
- `apps/web/src/components/ui/input-group.tsx` - Input group wrappers with 6 components (InputGroup, Addon, Button, Text, Input, Textarea), alignment variants (inline-start/end, block-start/end), focus/error states, and Button integration.
- `apps/web/src/components/ui/input-otp.tsx` - OTP input with 4 components (InputOTP, Group, Slot, Separator), 9x9px slots, animated caret blink, and Minus separator icon.
- `apps/web/src/components/ui/input.tsx` - Shared text input with Tailwind styling, 9x36px sizing, file input support, focus ring, disabled states, and responsive text sizing.
- `apps/web/src/components/ui/item.tsx` - Reusable item-row/list presentation with 10 components (Item, Media, Content, Actions, Group, Separator, Title, Description, Header, Footer), class-variance-authority variants, and Slot support.
- `apps/web/src/components/ui/kbd.tsx` - Keyboard-shortcut badge with 2 components (Kbd, KbdGroup), 5x20px sizing, rounded-sm styling, and tooltip theming support.
- `apps/web/src/components/ui/label.tsx` - Radix UI form-label with class-variance-authority variants, peer-disabled states, and font-medium styling.
- `apps/web/src/components/ui/menubar.tsx` - Radix UI menubar with 16 components (Menubar, Menu, Trigger, Content, Item, Separator, Label, CheckboxItem, RadioGroup, RadioItem, Portal, SubContent, SubTrigger, Group, Sub, Shortcut) and Check/ChevronRight/Circle icons.
- `apps/web/src/components/ui/navigation-menu.tsx` - Radix UI navigation menu with 8 components (NavigationMenu, List, Item, Content, Trigger, Link, Indicator, Viewport), ChevronDown icon, and motion animations.
- `apps/web/src/components/ui/pagination.tsx` - Pagination controls with 7 components (Pagination, Content, Link, Item, Previous, Next, Ellipsis), ChevronLeft/Right/MoreHorizontal icons, and button variant integration.
- `apps/web/src/components/ui/popover.tsx` - Radix UI popover with 4 components (Popover, Trigger, Content, Anchor), center alignment, 4px side offset, and animated transitions.
- `apps/web/src/components/ui/progress.tsx` - Radix UI progress bar with 2px height, rounded-full styling, primary/20 background, and transform-based animations.
- `apps/web/src/components/ui/radio-group.tsx` - Radix UI radio group with 2 components (RadioGroup, RadioGroupItem), 4x4px sizing, Circle indicator, and grid layout.
- `apps/web/src/components/ui/resizable.tsx` - React resizable panels with 3 components (ResizablePanelGroup, ResizablePanel, ResizableHandle), vertical/horizontal support, and GripVertical handle option.
- `apps/web/src/components/ui/scroll-area.tsx` - Radix UI scroll-area with 2 components (ScrollArea, ScrollBar), vertical/horizontal orientation, 2.5px scrollbar width, and rounded-full thumb.
- `apps/web/src/components/ui/select.tsx` - Radix UI select with 10 components (Select, Group, Value, Trigger, Content, Label, Item, Separator, ScrollUpButton, ScrollDownButton), ChevronDown/Up icons, and Check indicator.
- `apps/web/src/components/ui/separator.tsx` - Radix UI visual separator with horizontal/vertical orientation, 1px sizing, decorative mode, and shrink-0 styling.
- `apps/web/src/components/ui/sheet.tsx` - Radix UI sheet with 10 components (Sheet, Portal, Overlay, Trigger, Close, Content, Header, Footer, Title, Description), side variants (top/bottom/left/right), X icon, and slide animations.
- `apps/web/src/components/ui/sidebar.tsx` - Full sidebar system with 25 components (Sidebar, Content, Footer, Group, GroupAction, GroupContent, GroupLabel, Header, Input, Inset, Menu, MenuAction, MenuBadge, MenuButton, MenuItem, MenuSkeleton, MenuSub, MenuSubButton, MenuSubItem, Provider, Rail, Separator, Trigger, useSidebar), cookie persistence, keyboard shortcut (b), width variants (16rem/3rem), mobile sheet integration, and PanelLeft icon.
- `apps/web/src/components/ui/skeleton.tsx` - Loading skeleton with animate-pulse animation, rounded-md styling, and primary/10 background.
- `apps/web/src/components/ui/slider.tsx` - Radix UI slider with 3 components (Root, Track, Range, Thumb), 1.5px track height, 4x4px thumb, and primary/20 background.
- `apps/web/src/components/ui/sonner.tsx` - Sonner toast with next-themes integration, CSS class names for theming (toaster group, toast, description, actionButton, cancelButton).
- `apps/web/src/components/ui/spinner.tsx` - Loading spinner with Loader2Icon, 4x4px sizing, animate-spin animation, and accessibility attributes.
- `apps/web/src/components/ui/switch.tsx` - Radix UI switch with 2 components (Root, Thumb), 5x20px sizing, 4x4px thumb, translate-x-4 animation, and focus ring styling.
- `apps/web/src/components/ui/table.tsx` - Table primitives with 8 components (Table, Header, Body, Footer, Row, Head, Cell, Caption), overflow wrapper, hover states, and responsive styling.
- `apps/web/src/components/ui/tabs.tsx` - Radix UI tabs with 4 components (Tabs, List, Trigger, Content), 9x36px list sizing, rounded-lg styling, and shadow effects.
- `apps/web/src/components/ui/textarea.tsx` - Shared textarea with 60px min-height, rounded-md styling, focus ring, disabled states, and responsive text sizing.
- `apps/web/src/components/ui/toast.tsx` - Radix UI toast with 7 components (ToastProvider, Viewport, Toast, Title, Description, Close, Action), class-variance-authority variants (default, destructive), swipe animations, and X icon.
- `apps/web/src/components/ui/toaster.tsx` - Radix toast provider with use-toast hook integration, Toast/ToastTitle/ToastDescription/ToastClose mapping, and grid layout.
- `apps/web/src/components/ui/toggle-group.tsx` - Radix UI toggle group with 2 components (ToggleGroup, ToggleGroupItem), context provider, and toggle variants integration.
- `apps/web/src/components/ui/toggle.tsx` - Radix UI toggle with class-variance-authority variants (default, outline), sizes (default, sm, lg), and data-state styling.
- `apps/web/src/components/ui/tooltip.tsx` - Radix UI tooltip with 4 components (Tooltip, Trigger, Content, Provider), 4px side offset, primary background, and zoom/slide animations.

### Business Module Pages

- `apps/web/src/pages/Analytics.tsx` - Analytics module with Overview/CRM/Projects/Finance/Assets/Custom categories, Recharts visualizations (area chart for Revenue Growth, bar chart for Lead Volume, pie chart for Lead Sources), responsive dark theme design with glassmorphism effects.
- `apps/web/src/pages/Assets.tsx` - Asset management with Inventory/Check-Out/Maintenance/Depreciation tabs, Scan Barcode and New Asset buttons, asset table with Asset Name/Category/Location/Status/Serial # columns, status badges (Available/Assigned), hover effects and action buttons.
- `apps/web/src/pages/CRM.tsx` - CRM module with Leads/Contacts/Deals/Email/Engagements tabs, full CRUD operations with TanStack Query mutations, lead board with drag-drop stages (new/contacted/qualified), create/edit/delete lead functionality, slide-out detail panels, contact management table with status badges (Hot/Active), optimistic updates and error handling.
- `apps/web/src/pages/Dashboard.tsx` - Dashboard landing with metrics cards showing trend indicators (TrendingUp/TrendingDown), Upcoming Deadlines section with assignee and status badges (At Risk/On Track), Activity Feed with timeline visualization, New Project/New Lead action buttons, responsive grid layout.
- `apps/web/src/pages/Documents.tsx` - Document management with Repository/E-Sign/Workflows/Inbox tabs, folder sidebar with Cabinets navigation, file table with Name/Size/Modified columns, file preview modal with version history, E-Sign requests table with Document/Signers/Status/Sent columns, upload and e-sign action buttons.
- `apps/web/src/pages/Finance.tsx` - Finance module with AP/AR/Spend toggle views, AP Approvals Queue with approve/reject actions and status badges (Approved/Pending/Overdue), Invoice Capture section with email forwarding instructions, Spend view with Corporate Cards display and Budget vs Actual progress bars, virtual/physical card management.
- `apps/web/src/pages/Portal.tsx` - Client portal with Management/Preview tabs, Management view with client table showing Client/Status/Portal Access/Last Login columns, portal access toggle switches, Branding panel with custom domain and brand color settings, Preview tab simulating light-theme client interface with KPIs and action items.
- `apps/web/src/pages/Projects.tsx` - Project management with My Week/Board/Projects/Templates/Scheduler tabs, My Week view with 3-column task board (Focus/This Week/Later) and calendar sidebar, Projects table with Name/Client/Status/Progress/Due Date columns and progress bars, slide-out project details panel with Tasks/Timeline/Time & Budget/Details sub-tabs.
- `apps/web/src/pages/Settings.tsx` - Settings with 7 categories (General, Users & Permissions, Email & Notifications, Integrations, Audit Log, Billing, API & Webhooks), Users & Permissions table with User/Email/Role/Status columns, role dropdowns and status toggle switches, Integrations grid with connection status badges and configure/connect buttons, Invite User action button.
- `apps/web/src/pages/SignIn.tsx` - Authentication sign-in with email/password fields, Better Auth client integration, workspace restoration from organization list, tenant ID localStorage management, navigation to dashboard after successful sign-in, auth unavailable state handling.
- `apps/web/src/pages/SignUp.tsx` - Authentication sign-up with user creation (name, email, password) and organization setup (organization name, slug generation), Better Auth client integration, tenant ID initialization, navigation to dashboard after successful workspace creation, toSlug utility function for organization slugs.
- `apps/web/src/pages/not-found.tsx` - 404 error page with Card layout, AlertCircle icon, debugging hint about adding pages to router, light theme styling with gray background.

### TanStack Router Definitions

- `apps/web/src/routes/__root.tsx` - Root route with authentication guards using beforeLoad, public path handling (/signin, /signup), QueryClient and TooltipProvider setup, conditional MainLayout rendering for authenticated routes, MSW worker initialization, tenant ID sync from activeOrganizationId, TanStack Devtools integration, and NotFoundPage as notFoundComponent.
- `apps/web/src/routes/index.tsx` - Index route using Navigate component to redirect to /dashboard with replace flag.
- `apps/web/src/routes/signin.tsx` - Sign-in route using createFileRoute with SignInPage component, immediate load for auth flow.
- `apps/web/src/routes/signup.tsx` - Sign-up route using createFileRoute with SignUpPage component, immediate load for auth flow.
- `apps/web/src/routes/api.$.ts` - API catch-all route using createFileRoute with server-side handlers for all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS), delegates to Hono apiApp.fetch() for request processing.
- `apps/web/src/routes/analytics.lazy.tsx` - Lazy-loaded analytics route using createLazyFileRoute with AnalyticsPage component for /analytics path.
- `apps/web/src/routes/assets.lazy.tsx` - Lazy-loaded assets route using createLazyFileRoute with AssetsPage component for /assets path.
- `apps/web/src/routes/crm.lazy.tsx` - Lazy-loaded CRM route using createLazyFileRoute with CrmPage component for /crm path.
- `apps/web/src/routes/dashboard.lazy.tsx` - Lazy-loaded dashboard route using createLazyFileRoute with DashboardPage component for /dashboard path.
- `apps/web/src/routes/documents.lazy.tsx` - Lazy-loaded documents route using createLazyFileRoute with DocumentsPage component for /documents path.
- `apps/web/src/routes/finance.lazy.tsx` - Lazy-loaded finance route using createLazyFileRoute with FinancePage component for /finance path.
- `apps/web/src/routes/portal.lazy.tsx` - Lazy-loaded portal route using createLazyFileRoute with PortalPage component for /portal path.
- `apps/web/src/routes/projects.lazy.tsx` - Lazy-loaded projects route using createLazyFileRoute with ProjectsPage component for /projects path.
- `apps/web/src/routes/settings.lazy.tsx` - Lazy-loaded settings route using createLazyFileRoute with SettingsPage component for /settings path.

### Server-Side Integration and tRPC

- `apps/web/src/server/api.ts` - Hono API application with basePath '/api', conditional tenant middleware for CRM/TRPC routes, health check endpoint, REST endpoints (/crm/leads, /rest/crm/leads) with x-tenant-id header support, tRPC server integration with custom context creation, OpenAPI document generation, and Better Auth handler routing with 503 fallback when DATABASE_URL not configured.
- `apps/web/src/server/trpc/` - tRPC configuration and router setup.
- `apps/web/src/server/trpc/context.ts` - tRPC context creation function that extracts session from headers, determines authEnabled status, and returns context with authEnabled, headers, session, tenantId (from session.activeOrganizationId or fallback), and userId.
- `apps/web/src/server/trpc/init.ts` - tRPC initialization with TrpcContext type, requireSession middleware for authentication checks, requireTenant middleware for organization validation, and exports for router, publicProcedure, protectedProcedure, and tenantProcedure.
- `apps/web/src/server/trpc/router.ts` - Main tRPC router aggregating crmRouter, exports appRouter and AppRouter type for type-safe client usage.
- `apps/web/src/server/trpc/routers/` - Individual tRPC route handlers.
- `apps/web/src/server/trpc/routers/crm.ts` - CRM tRPC router with tenantProcedure middleware, four procedures: listLeadBoard (query), createLead (mutation with input/output validation), updateLead (mutation with input/output validation), deleteLead (mutation), all using Zod schemas and repository functions.
- `apps/web/src/server/trpc/routers/crm.test.ts` - Vitest unit tests for CRM tRPC router operations, comprehensive test covering create/update/delete lead lifecycle with board state validation, uses mock context with authEnabled=false, includes flattenBoard helper utility for testing.
- `apps/web/src/server/crm/` - CRM-specific server logic.
- `apps/web/src/server/crm/repository.ts` - CRM repository with dual database/memory fallback architecture, functions: listLeadBoard, createLead, updateLead, deleteLead with tenant isolation, data normalization (value formatting, optional field handling), Drizzle ORM integration with error fallback to mock data, mockLeadsState management for development.

### Client Libraries and Utilities

- `apps/web/src/lib/utils.ts` - Tailwind CSS class merging utility using clsx and tailwind-merge libraries, exports cn function for combining class names with proper conflict resolution.
- `apps/web/src/lib/auth/` - Authentication client utilities.
- `apps/web/src/lib/auth/client.ts` - Better Auth client with organization plugin, dynamic baseURL detection (window.location.origin for client, BETTER_AUTH_URL/BASE_URL/env fallback for server), creates authClient with proper SSR support.
- `apps/web/src/lib/auth/session.functions.ts` - TanStack Start server function using createServerFn with GET method, exports getAuthState function that calls getSessionSnapshot with request headers for server-side auth state retrieval.
- `apps/web/src/lib/crm/` - CRM-specific client utilities.
- `apps/web/src/lib/crm/schema.ts` - Comprehensive Zod schemas for CRM data: crmLeadStageSchema (enum), crmLeadSchema (full lead record), leadBoardSchema (board structure), input schemas (createLeadInputSchema, updateLeadInputSchema, deleteLeadInputSchema) with validation, TypeScript type exports, and hydrateLeadBoard utility function.
- `apps/web/src/lib/trpc/` - tRPC client utilities.
- `apps/web/src/lib/trpc/client.ts` - tRPC proxy client with singleton pattern using getTrpcClient function, httpBatchLink to '/api/trpc', automatic x-tenant-id header injection from localStorage, client-side only header logic, AppRouter type safety.
- `apps/web/src/lib/trpc/crm.ts` - CRM tRPC client utilities with crmLeadBoardQueryKey constant, crmLeadBoardQueryOptions using queryOptions with placeholderData from mockData and 30s staleTime, mutation helpers (createLeadMutation, updateLeadMutation, deleteLeadMutation) that call tRPC client methods.

### Hooks and Data

- `apps/web/src/hooks/use-mobile.tsx` - Mobile breakpoint detection hook using useIsMobile function, MOBILE_BREAKPOINT constant (768px), window.matchMedia API with event listener cleanup, returns boolean for screens smaller than breakpoint.
- `apps/web/src/hooks/use-toast.ts` - Comprehensive toast notification system with reducer-based state management, TOAST_LIMIT (1), auto-dismiss with TOAST_REMOVE_DELAY (1M), action types (ADD_TOAST, UPDATE_TOAST, DISMISS_TOAST, REMOVE_TOAST), genId function for unique IDs, listener pattern for state updates, useToast hook returning state, toast function, and dismiss method.
- `apps/web/src/data/mockData.ts` - Central mock dataset with date-fns for date calculations, exports: metrics (Revenue MTD, Active Projects, Open Leads, Overdue Tasks), activities (deal_won, doc_signed, payment_received, task_completed), deadlines (At Risk/On Track status), crmLeads (new/contacted/qualified stages), crmContacts (Active/Inactive/Hot status), projectsData (tasks/board/projects), documentsData (repository/esign), financeData (AP/AR/spend), assetsData, portalClients, and settingsUsers.

### Mock Service Worker

- `apps/web/src/mocks/browser.ts` - MSW browser setup with singleton pattern using started flag, startMockWorker function with onUnhandledRequest: 'bypass' and custom serviceWorker URL '/mockServiceWorker.js', prevents multiple worker starts.
- `apps/web/src/mocks/handlers.ts` - MSW request handlers array with http.get for '/api/trpc/crm.listLeadBoard', modifies first lead name to include 'MSW' prefix for testing, returns tRPC-compatible response format with result.data structure.

## packages/auth

### Directories

- `packages/auth/` - Shared authentication package using Better Auth with Drizzle adapter.
- `packages/auth/src/` - Source tree for the authentication package (1 file).

### Files

- `packages/auth/package.json` - Package manifest for the authentication library with Better Auth and Drizzle dependencies.
- `packages/auth/tsconfig.json` - TypeScript config with rootDir/src, outDir/dist, declaration and declarationMap enabled for package builds.
- `packages/auth/src/index.ts` - Package entrypoint that exports Better Auth configuration with Drizzle adapter, organization plugin, TanStack Start cookies integration, and session management utilities with conditional auth enablement (falls back to null when DATABASE_URL is not configured).

## packages/db

### Directories

- `packages/db/` - Shared database package for Drizzle ORM and PostgreSQL access with multi-tenant support.
- `packages/db/src/` - Database package source tree (2 source files).
- `packages/db/src/schema/` - Drizzle table/schema definitions (5 files).
- `packages/db/drizzle/` - Drizzle migration files.
- `packages/db/drizzle/meta/` - Drizzle migration metadata.

### Files

- `packages/db/package.json` - Package manifest for the database layer, including Drizzle ORM, PostgreSQL, and tenant support.
- `packages/db/tsconfig.json` - TypeScript config with rootDir/src, outDir/dist, declaration and declarationMap enabled for package builds.
- `packages/db/drizzle.config.ts` - Drizzle Kit configuration for schema generation and migrations with PostgreSQL dialect, schema path './src/schema/index.ts', output directory './drizzle', DATABASE_URL from environment, strict and verbose settings enabled.
- `packages/db/src/index.ts` - Database bootstrap creating PostgreSQL pool from DATABASE_URL, exports db (Drizzle instance), tenant (multi-tenant system with betterTenant), utility functions: isDatabaseConfigured, getDb, getScopedDb, withTenantDatabase (tenant isolation), withSystemDatabase (system-level access), and schema exports.

### Database Schema Files

- `packages/db/src/schema/index.ts` - Schema barrel export that re-exports auth, CRM, and organizations table definitions.
- `packages/db/src/schema/auth.ts` - Better Auth tables with comprehensive relations: usersTable (email unique), sessionsTable (token unique, activeOrganizationId), accountsTable (provider/account unique), verificationsTable, membersTable (organization/user unique), invitationsTable, rolesTable (key unique), userRolesTable (membership unique), with proper indexes, foreign keys, and TypeScript type exports.
- `packages/db/src/schema/crm.ts` - CRM business tables with RLS enabled: crmCompaniesTable, crmContactsTable (references companies), crmDealsTable (references companies/contacts, value_cents), crmLeadsTable (references companies, stage enum), with organizationIdColumn integration, proper indexes, tenant policies, and TypeScript type exports.
- `packages/db/src/schema/organizations.ts` - Multi-tenant organizationsTable with RLS enabled, unique slug field, organizationIdColumn with current_setting('app.current_tenant') default, organizationTablePolicies for public read/insert and scoped update/delete, TypeScript type exports.
- `packages/db/src/schema/policies.ts` - PostgreSQL Row Level Security policy helpers: bypassRlsCondition for admin override, tenantScopeCondition for tenant isolation, tenantOrSystemCondition for flexible access, tenantTablePolicies (bypass + tenant scope), organizationTablePolicies (public read/insert + scoped update/delete), using current_setting('app.current_tenant') and app.bypass_rls.

### Database Migrations

- `packages/db/drizzle/0000_easy_dazzler.sql` - Initial database migration (209 lines) creating all schema: CRM enums (crm_contact_status, crm_deal_stage, crm_lead_stage), auth tables (users, sessions, accounts, verifications, members, invitations, roles, user_roles), CRM tables (crm_companies, crm_contacts, crm_deals, crm_leads) with RLS, organizations table, foreign key constraints, unique indexes, and RLS policies for tenant isolation.
- `packages/db/drizzle/meta/0000_snapshot.json` - Comprehensive Drizzle schema snapshot (1,688 lines) with detailed table definitions, column types, indexes, foreign keys, unique constraints, RLS policies, and metadata for migration tracking, includes all auth, CRM, and organization tables with complete schema structure.
- `packages/db/drizzle/meta/_journal.json` - Migration journal tracking applied migrations with version 7, PostgreSQL dialect, single entry (idx: 0) for 0000_easy_dazzler migration with timestamp 1778003870674 and breakpoints enabled.

## docs

### Directories

- `docs/` - Documentation directory containing Architecture Decision Records (1 subdirectory).
- `docs/adr/` - Architecture Decision Records directory.

### Files

- `docs/adr/012-api-contract.md` - ADR establishing tRPC as the primary application API with REST compatibility routes derived from the same procedures using `@trpc/openapi`.

## tests

### Directories

- `tests/` - End-to-end test directory (1 subdirectory).
- `tests/e2e/` - Playwright end-to-end tests.

### Files

- `tests/e2e/auth-crm.spec.mjs` - Playwright E2E test for authentication and CRM workflow, includes fillWhenStable helper for input stability, complete user journey: signup with organization creation, sign-in verification, CRM lead creation from board, with proper test skipping when Better Auth disabled and comprehensive assertions.