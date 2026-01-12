import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, CreditCard, Search, MoreHorizontal, Pencil, Trash2, CheckCircle, X } from "lucide-react";
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
import type { Bill, Engagement, Vendor } from "@shared/schema";

const billFormSchema = z.object({
  billNumber: z.string().min(1, "Bill number is required"),
  engagementId: z.string().optional(),
  vendorId: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export default function BillsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      billNumber: "",
      engagementId: "",
      vendorId: "",
      amount: "",
      description: "",
      notes: "",
    },
  });

  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: engagements } = useQuery<Engagement[]>({
    queryKey: ["/api/engagements"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BillFormValues) => {
      return apiRequest("POST", "/api/bills", {
        ...data,
        amount: parseFloat(data.amount),
        engagementId: data.engagementId || null,
        vendorId: data.vendorId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Bill created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create bill", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BillFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/bills/${data.id}`, {
        ...data,
        amount: parseFloat(data.amount),
        engagementId: data.engagementId || null,
        vendorId: data.vendorId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsDialogOpen(false);
      setEditingBill(null);
      form.reset();
      toast({ title: "Bill updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update bill", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Bill deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete bill", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/bills/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Bill approved" });
    },
    onError: () => {
      toast({ title: "Failed to approve bill", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/bills/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Bill rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject bill", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/bills/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Bill marked as paid" });
    },
    onError: () => {
      toast({ title: "Failed to mark bill as paid", variant: "destructive" });
    },
  });

  const onSubmit = (data: BillFormValues) => {
    if (editingBill) {
      updateMutation.mutate({ ...data, id: editingBill.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    form.reset({
      billNumber: bill.billNumber,
      engagementId: bill.engagementId || "",
      vendorId: bill.vendorId || "",
      amount: bill.amount?.toString() || "",
      description: bill.description || "",
      notes: bill.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBill(null);
    form.reset();
  };

  const filteredBills = bills?.filter((bill) =>
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      header: "Bill",
      accessor: (bill: Bill) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium font-mono">#{bill.billNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(bill.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Amount",
      accessor: (bill: Bill) => (
        <span className="font-mono font-medium">${Number(bill.amount || 0).toLocaleString()}</span>
      ),
    },
    {
      header: "Status",
      accessor: (bill: Bill) => <StatusBadge status={bill.status} />,
    },
    {
      header: "Due Date",
      accessor: (bill: Bill) => (
        <span className="text-muted-foreground">
          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      header: "",
      className: "w-12",
      accessor: (bill: Bill) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-bill-menu-${bill.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {bill.status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => approveMutation.mutate(bill.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => rejectMutation.mutate(bill.id)}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {bill.status === "approved" && (
              <DropdownMenuItem onClick={() => markPaidMutation.mutate(bill.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEdit(bill)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(bill.id)}
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
        title="Bills"
        description="Manage accounts payable"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-bill">
                <Plus className="h-4 w-4 mr-2" />
                New Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBill ? "Edit Bill" : "New Bill"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="billNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="BILL-001" {...field} data-testid="input-bill-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="engagementId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engagement</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bill-engagement">
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
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bill-vendor">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount ($) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} data-testid="input-bill-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What is this bill for?"
                            className="resize-none"
                            {...field}
                            data-testid="input-bill-description"
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
                      data-testid="button-save-bill"
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
            placeholder="Search bills..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-bills"
          />
        </div>
      </div>

      {!isLoading && (!bills || bills.length === 0) ? (
        <EmptyState
          icon={CreditCard}
          title="No bills yet"
          description="Add bills to track your accounts payable."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-bill">
              <Plus className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredBills || []}
          isLoading={isLoading}
          onRowClick={(bill) => setLocation(`/bills/${bill.id}`)}
          getRowKey={(bill) => bill.id}
          emptyMessage="No bills found"
        />
      )}
    </div>
  );
}
