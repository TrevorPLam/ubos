/**
 * Deals page (pipeline CRUD).
 *
 * Data/model notes:
 * - The form models `value` as a string for input ergonomics, then we coerce to number/null.
 * - Clients are fetched separately to populate the “Client” select.
 *
 * AI iteration notes:
 * - If you add new deal fields: update `dealFormSchema`, defaultValues, and the submit coercion.
 * - Keep `stage` options aligned with the enum in `shared/schema.ts`.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, TrendingUp, Search, MoreHorizontal, Pencil, Trash2, DollarSign } from "lucide-react";
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
import type { Deal, ClientCompany } from "@shared/schema";

const dealFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientCompanyId: z.string().optional(),
  value: z.string().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  probability: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

const stages = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export default function DealsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: "",
      clientCompanyId: "",
      value: "",
      stage: "lead",
      probability: 0,
      description: "",
      notes: "",
    },
  });

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: clients } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      return apiRequest("POST", "/api/deals", {
        ...data,
        // Convert string inputs to the shapes the API/database expects.
        value: data.value ? parseFloat(data.value) : null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      // Refresh deal list; a fine default until we need optimistic updates.
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Deal created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create deal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DealFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/deals/${data.id}`, {
        ...data,
        value: data.value ? parseFloat(data.value) : null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setIsDialogOpen(false);
      setEditingDeal(null);
      form.reset();
      toast({ title: "Deal updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update deal", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete deal", variant: "destructive" });
    },
  });

  const onSubmit = (data: DealFormValues) => {
    if (editingDeal) {
      updateMutation.mutate({ ...data, id: editingDeal.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    form.reset({
      name: deal.name,
      clientCompanyId: deal.clientCompanyId || "",
      value: deal.value?.toString() || "",
      stage: deal.stage,
      probability: deal.probability || 0,
      description: deal.description || "",
      notes: deal.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDeal(null);
    form.reset();
  };

  const filteredDeals = deals?.filter((deal) =>
    deal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      header: "Deal",
      accessor: (deal: Deal) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{deal.name}</p>
            {deal.description && (
              <p className="text-xs text-muted-foreground truncate max-w-xs">{deal.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Value",
      accessor: (deal: Deal) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono">{Number(deal.value || 0).toLocaleString()}</span>
        </div>
      ),
    },
    {
      header: "Stage",
      accessor: (deal: Deal) => <StatusBadge status={deal.stage} />,
    },
    {
      header: "Probability",
      accessor: (deal: Deal) => (
        <span className="text-muted-foreground">{deal.probability || 0}%</span>
      ),
    },
    {
      header: "",
      className: "w-12",
      accessor: (deal: Deal) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-deal-menu-${deal.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(deal)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(deal.id)}
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
        title="Deals"
        description="Track your sales pipeline"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-deal">
                <Plus className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingDeal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Website Redesign" {...field} data-testid="input-deal-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-client">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
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
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10000" {...field} data-testid="input-deal-value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-deal-stage">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stages.map((stage) => (
                                <SelectItem key={stage.value} value={stage.value}>
                                  {stage.label}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the deal..."
                            className="resize-none"
                            {...field}
                            data-testid="input-deal-description"
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
                      data-testid="button-save-deal"
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
            placeholder="Search deals..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-deals"
          />
        </div>
      </div>

      {!isLoading && (!deals || deals.length === 0) ? (
        <EmptyState
          icon={TrendingUp}
          title="No deals yet"
          description="Create your first deal to start tracking your sales pipeline."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-deal">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDeals || []}
          isLoading={isLoading}
          onRowClick={(deal) => setLocation(`/deals/${deal.id}`)}
          getRowKey={(deal) => deal.id}
          emptyMessage="No deals found"
        />
      )}
    </div>
  );
}
