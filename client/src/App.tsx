// AI-META-BEGIN
// AI-META: Client module - App.tsx
// OWNERSHIP: client
// ENTRYPOINTS: client code
// DEPENDENCIES: react
// DANGER: Review client logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Top-level app composition.
 *
 * Responsibilities:
 * - Global providers (theme, React Query, tooltips, toasts)
 * - Auth gate (show landing vs authenticated app shell)
 * - Client-side routing (wouter) with code-splitting via React.lazy
 *
 * AI iteration notes:
 * - New pages usually mean: add a `lazy()` import + a route in `AuthenticatedRouter`.
 * - Any API call should go through React Query (`queryClient`) to centralize caching/errors.
 */

import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

// AI-NOTE: React.lazy enables code splitting - each page is a separate bundle loaded on demand to reduce initial bundle size
// Route-level code splitting: keep initial bundle small.
const LandingPage = lazy(() => import("@/pages/landing"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ClientsPage = lazy(() => import("@/pages/clients"));
const ContactsPage = lazy(() => import("@/pages/contacts"));
const DealsPage = lazy(() => import("@/pages/deals"));
const ProposalsPage = lazy(() => import("@/pages/proposals"));
const ContractsPage = lazy(() => import("@/pages/contracts"));
const EngagementsPage = lazy(() => import("@/pages/engagements"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const MessagesPage = lazy(() => import("@/pages/messages"));
const InvoicesPage = lazy(() => import("@/pages/invoices"));
const BillsPage = lazy(() => import("@/pages/bills"));
const OrganizationSettingsPage = lazy(() => import("@/pages/organization-settings"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PageLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

const DashboardRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <DashboardPage />
  </Suspense>
);

const ClientsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ClientsPage />
  </Suspense>
);

const ContactsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ContactsPage />
  </Suspense>
);

const DealsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <DealsPage />
  </Suspense>
);

const ProposalsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ProposalsPage />
  </Suspense>
);

const ContractsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ContractsPage />
  </Suspense>
);

const EngagementsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <EngagementsPage />
  </Suspense>
);

const ProjectsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ProjectsPage />
  </Suspense>
);

const MessagesRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <MessagesPage />
  </Suspense>
);

const InvoicesRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <InvoicesPage />
  </Suspense>
);

const BillsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <BillsPage />
  </Suspense>
);

const OrganizationSettingsRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <OrganizationSettingsPage />
  </Suspense>
);

const ProfileRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <ProfilePage />
  </Suspense>
);

const NotFoundRoute = () => (
  <Suspense fallback={<PageLoading />}>
    <NotFound />
  </Suspense>
);

function AuthenticatedRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardRoute} />
        <Route path="/clients" component={ClientsRoute} />
        <Route path="/contacts" component={ContactsRoute} />
        <Route path="/deals" component={DealsRoute} />
        <Route path="/proposals" component={ProposalsRoute} />
        <Route path="/contracts" component={ContractsRoute} />
        <Route path="/engagements" component={EngagementsRoute} />
        <Route path="/projects" component={ProjectsRoute} />
        <Route path="/messages" component={MessagesRoute} />
        <Route path="/invoices" component={InvoicesRoute} />
        <Route path="/bills" component={BillsRoute} />
        <Route path="/settings" component={OrganizationSettingsRoute} />
        <Route path="/profile" component={ProfileRoute} />
        <Route component={NotFoundRoute} />
      </Switch>
    </AppLayout>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xl animate-pulse">
          UB
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Debug logs are intentionally noisy during early iteration; remove/quiet once stable.
  console.log("[Router] Auth state:", { user, isLoading, isAuthenticated, location });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("[Router] Not authenticated, checking for onboarding");
    
    // Check if this is an onboarding route (should be accessible without auth)
    if (location.startsWith("/onboarding")) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <OnboardingPage />
        </Suspense>
      );
    }
    
    console.log("[Router] Not authenticated, showing landing page");
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LandingPage />
      </Suspense>
    );
  }

  console.log("[Router] Authenticated, showing app layout");
  return <AuthenticatedRouter />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ubos-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
