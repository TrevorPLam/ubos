// AI-META-BEGIN
// AI-META: Page component - contracts.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components
// DANGER: Review data fetching logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Contracts page.
 *
 * Domain notes:
 * - Signing a contract triggers server-side side effects: it also creates an engagement.
 *   That’s why we invalidate both `/api/contracts` and `/api/engagements` on success.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus,
  FilePenLine,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Contract, Proposal, ClientCompany } from "@shared/schema";

const contractFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  proposalId: z.string().optional(),
  clientCompanyId: z.string().optional(),
  totalValue: z.string().optional(),
  status: z.enum(["draft", "sent", "signed", "expired", "cancelled"]),
});

const signatureFormSchema = z.object({
  signedByName: z.string().min(1, "Name is required"),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;
type SignatureFormValues = z.infer<typeof signatureFormSchema>;

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ContractsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      name: "",
      proposalId: "",
      clientCompanyId: "",
      totalValue: "",
      status: "draft",
    },
  });

  const signatureForm = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureFormSchema),
    defaultValues: {
      signedByName: "",
    },
  });

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: proposals } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: clients } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormValues) => {
      return apiRequest("POST", "/api/contracts", {
        ...data,
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        proposalId: data.proposalId || null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Contract created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create contract", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContractFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/contracts/${data.id}`, {
        ...data,
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        proposalId: data.proposalId || null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setIsDialogOpen(false);
      setEditingContract(null);
      form.reset();
      toast({ title: "Contract updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update contract", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contract", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/contracts/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send contract", variant: "destructive" });
    },
  });

  const signMutation = useMutation({
    mutationFn: async ({ id, signedByName }: { id: string; signedByName: string }) => {
      return apiRequest("POST", `/api/contracts/${id}/sign`, { signedByName });
    },
    onSuccess: () => {
      // Server returns `{ contract, engagement }`; we still invalidate to keep lists coherent.
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
      setIsSignDialogOpen(false);
      setSigningContract(null);
      signatureForm.reset();
      toast({ title: "Contract signed successfully! Engagement created." });
    },
    onError: () => {
      toast({ title: "Failed to sign contract", variant: "destructive" });
    },
  });

  const onSubmit = (data: ContractFormValues) => {
    if (editingContract) {
      updateMutation.mutate({ ...data, id: editingContract.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const onSign = (data: SignatureFormValues) => {
    if (signingContract) {
      signMutation.mutate({ id: signingContract.id, signedByName: data.signedByName });
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    form.reset({
      name: contract.name,
      proposalId: contract.proposalId || "",
      clientCompanyId: contract.clientCompanyId || "",
      totalValue: contract.totalValue?.toString() || "",
      status: contract.status,
    });
    setIsDialogOpen(true);
  };

  const handleSign = (contract: Contract) => {
    setSigningContract(contract);
    signatureForm.reset();
    setIsSignDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingContract(null);
    form.reset();
  };

  const filteredContracts = contracts?.filter((contract) =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns = [
    {
      header: "Contract",
      accessor: (contract: Contract) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <FilePenLine className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{contract.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(contract.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Value",
      accessor: (contract: Contract) => (
        <span className="font-mono">${Number(contract.totalValue || 0).toLocaleString()}</span>
      ),
    },
    {
      header: "Status",
      accessor: (contract: Contract) => <StatusBadge status={contract.status} />,
    },
    {
      header: "Signed By",
      accessor: (contract: Contract) => (
        <span className="text-muted-foreground">{contract.signedByName || "-"}</span>
      ),
    },
    {
      header: "",
      className: "w-12",
      accessor: (contract: Contract) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-contract-menu-${contract.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {contract.status === "draft" && (
              <DropdownMenuItem onClick={() => sendMutation.mutate(contract.id)}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </DropdownMenuItem>
            )}
            {contract.status === "sent" && (
              <DropdownMenuItem onClick={() => handleSign(contract)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Sign
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEdit(contract)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(contract.id)}
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
        title="Contracts"
        description="Manage contracts and e-signatures"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-contract">
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingContract ? "Edit Contract" : "New Contract"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Service Agreement"
                            {...field}
                            data-testid="input-contract-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="proposalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Proposal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contract-proposal">
                                <SelectValue placeholder="Select proposal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {proposals?.map((proposal) => (
                                <SelectItem key={proposal.id} value={proposal.id}>
                                  {proposal.name}
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
                              <SelectTrigger data-testid="select-contract-client">
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
                              data-testid="input-contract-value"
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
                              <SelectTrigger data-testid="select-contract-status">
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
                      data-testid="button-save-contract"
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

      <Dialog open={isSignDialogOpen} onOpenChange={() => setIsSignDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
            <DialogDescription>
              Type your name below to sign this contract. This will create an engagement
              automatically.
            </DialogDescription>
          </DialogHeader>
          <Form {...signatureForm}>
            <form onSubmit={signatureForm.handleSubmit(onSign)} className="space-y-4">
              <FormField
                control={signatureForm.control}
                name="signedByName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="font-serif text-lg italic"
                        data-testid="input-signature-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsSignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={signMutation.isPending}
                  data-testid="button-confirm-sign"
                >
                  {signMutation.isPending ? "Signing..." : "Sign Contract"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contracts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-contracts"
          />
        </div>
      </div>

      {!isLoading && (!contracts || contracts.length === 0) ? (
        <EmptyState
          icon={FilePenLine}
          title="No contracts yet"
          description="Create your first contract to formalize agreements."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-contract">
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredContracts || []}
          isLoading={isLoading}
          onRowClick={(contract) => setLocation(`/contracts/${contract.id}`)}
          getRowKey={(contract) => contract.id}
          emptyMessage="No contracts found"
        />
      )}
    </div>
  );
}
