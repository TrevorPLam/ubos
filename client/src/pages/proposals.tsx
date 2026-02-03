/**
 * Proposals page.
 *
 * Domain notes:
 * - Proposal status transitions use a dedicated endpoint (`/send`) so the server can stamp `sentAt`.
 * - Keep `statusOptions` aligned with `proposalStatusEnum` in `shared/schema.ts`.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FileText, Search, MoreHorizontal, Pencil, Trash2, Send } from "lucide-react";
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
import type { Proposal, Deal, ClientCompany } from "@shared/schema";

const proposalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dealId: z.string().optional(),
  clientCompanyId: z.string().optional(),
  totalValue: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export default function ProposalsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      name: "",
      dealId: "",
      clientCompanyId: "",
      totalValue: "",
      status: "draft",
    },
  });

  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: clients } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProposalFormValues) => {
      return apiRequest("POST", "/api/proposals", {
        ...data,
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        dealId: data.dealId || null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Proposal created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create proposal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProposalFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/proposals/${data.id}`, {
        ...data,
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        dealId: data.dealId || null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      setEditingProposal(null);
      form.reset();
      toast({ title: "Proposal updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update proposal", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete proposal", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/proposals/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send proposal", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProposalFormValues) => {
    if (editingProposal) {
      updateMutation.mutate({ ...data, id: editingProposal.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    form.reset({
      name: proposal.name,
      dealId: proposal.dealId || "",
      clientCompanyId: proposal.clientCompanyId || "",
      totalValue: proposal.totalValue?.toString() || "",
      status: proposal.status,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProposal(null);
    form.reset();
  };

  const filteredProposals = proposals?.filter((proposal) =>
    proposal.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns = [
    {
      header: "Proposal",
      accessor: (proposal: Proposal) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{proposal.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(proposal.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Value",
      accessor: (proposal: Proposal) => (
        <span className="font-mono">${Number(proposal.totalValue || 0).toLocaleString()}</span>
      ),
    },
    {
      header: "Status",
      accessor: (proposal: Proposal) => <StatusBadge status={proposal.status} />,
    },
    {
      header: "",
      className: "w-12",
      accessor: (proposal: Proposal) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-proposal-menu-${proposal.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {proposal.status === "draft" && (
              <DropdownMenuItem onClick={() => sendMutation.mutate(proposal.id)}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEdit(proposal)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(proposal.id)}
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
        title="Proposals"
        description="Create and manage proposals"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-proposal">
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProposal ? "Edit Proposal" : "New Proposal"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proposal Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Website Redesign Proposal"
                            {...field}
                            data-testid="input-proposal-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dealId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Deal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-proposal-deal">
                                <SelectValue placeholder="Select deal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {deals?.map((deal) => (
                                <SelectItem key={deal.id} value={deal.id}>
                                  {deal.name}
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
                      name="clientCompanyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-proposal-client">
                                <SelectValue placeholder="Select client" />
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="totalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Value ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10000"
                              {...field}
                              data-testid="input-proposal-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-proposal-status">
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
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-proposal"
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
            placeholder="Search proposals..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-proposals"
          />
        </div>
      </div>

      {!isLoading && (!proposals || proposals.length === 0) ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Create your first proposal to start winning clients."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-proposal">
              <Plus className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredProposals || []}
          isLoading={isLoading}
          onRowClick={(proposal) => setLocation(`/proposals/${proposal.id}`)}
          getRowKey={(proposal) => proposal.id}
          emptyMessage="No proposals found"
        />
      )}
    </div>
  );
}
