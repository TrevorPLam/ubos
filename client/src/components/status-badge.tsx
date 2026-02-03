/**
 * Status badge.
 *
 * Maps enum-like status strings to human labels + color tokens.
 * Keep this aligned with the enums in `shared/schema.ts` (deal stage, invoice status, etc.).
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
  | "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "signed" | "cancelled"
  | "active" | "on_hold" | "completed"
  | "not_started" | "in_progress" | "review"
  | "todo"
  | "paid" | "overdue"
  | "pending" | "approved"
  | "low" | "medium" | "high" | "urgent";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  qualified: { label: "Qualified", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  proposal: { label: "Proposal", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  negotiation: { label: "Negotiation", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  won: { label: "Won", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  viewed: { label: "Viewed", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  expired: { label: "Expired", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  signed: { label: "Signed", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  on_hold: { label: "On Hold", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  not_started: { label: "Not Started", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  review: { label: "In Review", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  todo: { label: "To Do", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  paid: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  low: { label: "Low", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Fallback prevents runtime crashes if a new status is introduced before the mapping is updated.
  const config = statusConfig[status] || { label: status, className: "" };
  
  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border-0", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
