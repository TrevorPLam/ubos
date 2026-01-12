import { Switch, Route } from "wouter";
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

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ContactsPage from "@/pages/contacts";
import DealsPage from "@/pages/deals";
import ProposalsPage from "@/pages/proposals";
import ContractsPage from "@/pages/contracts";
import EngagementsPage from "@/pages/engagements";
import ProjectsPage from "@/pages/projects";
import MessagesPage from "@/pages/messages";
import InvoicesPage from "@/pages/invoices";
import BillsPage from "@/pages/bills";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

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
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/deals" component={DealsPage} />
        <Route path="/proposals" component={ProposalsPage} />
        <Route path="/contracts" component={ContractsPage} />
        <Route path="/engagements" component={EngagementsPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/bills" component={BillsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
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

  console.log("[Router] Auth state:", { user, isLoading, isAuthenticated });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("[Router] Not authenticated, showing landing page");
    return <LandingPage />;
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
