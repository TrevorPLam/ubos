import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  TrendingUp,
  Briefcase,
  Receipt,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import type { Deal, Engagement, Invoice, Task } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    clients: number;
    deals: number;
    engagements: number;
    pendingInvoices: number;
    totalRevenue: string;
  }>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: recentDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: activeEngagements, isLoading: engagementsLoading } = useQuery<Engagement[]>({
    queryKey: ["/api/engagements"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: pendingInvoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6">
      <PageHeader
        title={`${greeting()}, ${user?.firstName || "there"}`}
        description="Here's what's happening with your business today."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Active Clients"
              value={stats?.clients || 0}
              icon={Building2}
            />
            <StatCard
              title="Open Deals"
              value={stats?.deals || 0}
              icon={TrendingUp}
            />
            <StatCard
              title="Active Engagements"
              value={stats?.engagements || 0}
              icon={Briefcase}
            />
            <StatCard
              title="Pending Invoices"
              value={stats?.pendingInvoices || 0}
              icon={Receipt}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold">Recent Deals</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/deals">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {dealsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDeals && recentDeals.length > 0 ? (
              <div className="divide-y divide-border">
                {recentDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center gap-3 p-4 hover-elevate"
                    data-testid={`deal-${deal.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(deal.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={deal.stage} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No deals yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold">Active Engagements</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/engagements">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {engagementsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeEngagements && activeEngagements.length > 0 ? (
              <div className="divide-y divide-border">
                {activeEngagements.map((engagement) => (
                  <Link
                    key={engagement.id}
                    href={`/engagements/${engagement.id}`}
                    className="flex items-center gap-3 p-4 hover-elevate"
                    data-testid={`engagement-${engagement.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{engagement.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(engagement.totalValue || 0).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={engagement.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active engagements</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {tasksLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingTasks && upcomingTasks.length > 0 ? (
              <div className="divide-y divide-border">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-4"
                    data-testid={`task-${task.id}`}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded border border-border">
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.priority} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold">Pending Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {invoicesLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingInvoices && pendingInvoices.length > 0 ? (
              <div className="divide-y divide-border">
                {pendingInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center gap-3 p-4 hover-elevate"
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">#{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(invoice.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending invoices</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
