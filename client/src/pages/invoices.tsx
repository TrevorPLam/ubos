// AI-META-BEGIN
// AI-META: Page component - invoices.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components
// DANGER: Review data fetching logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Invoices page (accounts receivable).
 *
 * Domain notes:
 * - `amount` and `tax` are strings in the form, coerced to numbers for the API.
 * - `totalAmount` is computed client-side for convenience; server stores the values.
 * - Status transitions use dedicated endpoints (send / mark-paid) to keep audit fields consistent.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus,
  Receipt,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, Engagement, ClientCompany } from "@shared/schema";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  engagementId: z.string().min(1, "Engagement is required"),
  clientCompanyId: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  // Optional UI field; treated as 0 when empty.
  tax: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled"]),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoicesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      engagementId: "",
      clientCompanyId: "",
      amount: "",
      tax: "0",
      status: "draft",
      notes: "",
    },
  });

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: engagements } = useQuery<Engagement[]>({
    queryKey: ["/api/engagements"],
  });

  const { data: clients } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const amount = parseFloat(data.amount);
      const tax = parseFloat(data.tax || "0");
      return apiRequest("POST", "/api/invoices", {
        ...data,
        amount,
        tax,
        // Kept in sync with server expectations; see `/api/invoices/:id/mark-paid`.
        totalAmount: amount + tax,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Invoice created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create invoice", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues & { id: string }) => {
      const amount = parseFloat(data.amount);
      const tax = parseFloat(data.tax || "0");
      return apiRequest("PATCH", `/api/invoices/${data.id}`, {
        ...data,
        amount,
        tax,
        totalAmount: amount + tax,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      setEditingInvoice(null);
      form.reset();
      toast({ title: "Invoice updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update invoice", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete invoice", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      // Separate endpoint so the server can set `sentAt` consistently.
      return apiRequest("POST", `/api/invoices/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      // Separate endpoint so the server can set `paidAt` + `paidAmount` consistently.
      return apiRequest("POST", `/api/invoices/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: () => {
      toast({ title: "Failed to mark invoice as paid", variant: "destructive" });
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    if (editingInvoice) {
      updateMutation.mutate({ ...data, id: editingInvoice.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      invoiceNumber: invoice.invoiceNumber,
      engagementId: invoice.engagementId,
      clientCompanyId: invoice.clientCompanyId || "",
      amount: invoice.amount?.toString() || "",
      tax: invoice.tax?.toString() || "0",
      status: invoice.status,
      notes: invoice.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingInvoice(null);
    form.reset();
  };

  const filteredInvoices = invoices?.filter((invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns = [
    {
      header: "Invoice",
      accessor: (invoice: Invoice) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium font-mono">#{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Amount",
      accessor: (invoice: Invoice) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono font-medium">
            {Number(invoice.totalAmount || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      header: "Due Date",
      accessor: (invoice: Invoice) => (
        <span className="text-muted-foreground">
          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      header: "",
      className: "w-12",
      accessor: (invoice: Invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-invoice-menu-${invoice.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {invoice.status === "draft" && (
              <DropdownMenuItem onClick={() => sendMutation.mutate(invoice.id)}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </DropdownMenuItem>
            )}
            {(invoice.status === "sent" || invoice.status === "viewed") && (
              <DropdownMenuItem onClick={() => markPaidMutation.mutate(invoice.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(invoice.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Invoices"
        description="Manage accounts receivable"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-invoice">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="INV-001"
                            {...field}
                            data-testid="input-invoice-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="engagementId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engagement *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice-engagement">
                              <SelectValue placeholder="Select engagement" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {engagements?.map((engagement) => (
                              <SelectItem key={engagement.id} value={engagement.id}>
                                {engagement.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1000"
                              {...field}
                              data-testid="input-invoice-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              data-testid="input-invoice-tax"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="resize-none"
                            {...field}
                            data-testid="input-invoice-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-invoice"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search invoices..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-invoices"
          />
        </div>
      </div>

      {!isLoading && (!invoices || invoices.length === 0) ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create your first invoice to start tracking payments."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-invoice">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredInvoices || []}
          isLoading={isLoading}
          onRowClick={(invoice) => setLocation(`/invoices/${invoice.id}`)}
          getRowKey={(invoice) => invoice.id}
          emptyMessage="No invoices found"
        />
      )}
    </div>
  );
}
