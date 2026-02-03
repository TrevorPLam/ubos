/**
 * Engagements page (delivery hub).
 *
 * Pattern:
 * - List: `useQuery({ queryKey: ["/api/engagements"] })`
 * - Mutations: `apiRequest` + invalidate the list query
 * - Form values keep currency/number fields as strings for input, then coerce on submit.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Briefcase, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import type { Engagement, ClientCompany } from "@shared/schema";

const engagementFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientCompanyId: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "cancelled"]),
  totalValue: z.string().optional(),
  description: z.string().optional(),
});

type EngagementFormValues = z.infer<typeof engagementFormSchema>;

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EngagementsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEngagement, setEditingEngagement] = useState<Engagement | null>(null);

  const form = useForm<EngagementFormValues>({
    resolver: zodResolver(engagementFormSchema),
    defaultValues: {
      name: "",
      clientCompanyId: "",
      status: "active",
      totalValue: "",
      description: "",
    },
  });

  const { data: engagements, isLoading } = useQuery<Engagement[]>({
    queryKey: ["/api/engagements"],
  });

  const { data: clients } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: EngagementFormValues) => {
      return apiRequest("POST", "/api/engagements", {
        ...data,
        // Convert input strings to API-friendly shapes.
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Engagement created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create engagement", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EngagementFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/engagements/${data.id}`, {
        ...data,
        totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
        clientCompanyId: data.clientCompanyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
      setIsDialogOpen(false);
      setEditingEngagement(null);
      form.reset();
      toast({ title: "Engagement updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update engagement", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/engagements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
      toast({ title: "Engagement deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete engagement", variant: "destructive" });
    },
  });

  const onSubmit = (data: EngagementFormValues) => {
    if (editingEngagement) {
      updateMutation.mutate({ ...data, id: editingEngagement.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (engagement: Engagement) => {
    setEditingEngagement(engagement);
    form.reset({
      name: engagement.name,
      clientCompanyId: engagement.clientCompanyId || "",
      status: engagement.status,
      totalValue: engagement.totalValue?.toString() || "",
      description: engagement.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEngagement(null);
    form.reset();
  };

  const filteredEngagements = engagements?.filter((engagement) =>
    engagement.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns = [
    {
      header: "Engagement",
      accessor: (engagement: Engagement) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{engagement.name}</p>
            {engagement.description && (
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {engagement.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Value",
      accessor: (engagement: Engagement) => (
        <span className="font-mono">${Number(engagement.totalValue || 0).toLocaleString()}</span>
      ),
    },
    {
      header: "Status",
      accessor: (engagement: Engagement) => <StatusBadge status={engagement.status} />,
    },
    {
      header: "Created",
      accessor: (engagement: Engagement) => (
        <span className="text-muted-foreground">
          {new Date(engagement.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "",
      className: "w-12",
      accessor: (engagement: Engagement) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`button-engagement-menu-${engagement.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(engagement)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(engagement.id)}
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
        title="Engagements"
        description="Manage your client engagements"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-engagement">
                <Plus className="h-4 w-4 mr-2" />
                New Engagement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingEngagement ? "Edit Engagement" : "New Engagement"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engagement Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Website Redesign Project"
                            {...field}
                            data-testid="input-engagement-name"
                          />
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
                            <SelectTrigger data-testid="select-engagement-client">
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
                      name="totalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Value ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25000"
                              {...field}
                              data-testid="input-engagement-value"
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
                              <SelectTrigger data-testid="select-engagement-status">
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
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the engagement..."
                            className="resize-none"
                            {...field}
                            data-testid="input-engagement-description"
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
                      data-testid="button-save-engagement"
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
            placeholder="Search engagements..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-engagements"
          />
        </div>
      </div>

      {!isLoading && (!engagements || engagements.length === 0) ? (
        <EmptyState
          icon={Briefcase}
          title="No engagements yet"
          description="Create your first engagement to start managing client work."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-engagement">
              <Plus className="h-4 w-4 mr-2" />
              New Engagement
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredEngagements || []}
          isLoading={isLoading}
          onRowClick={(engagement) => setLocation(`/engagements/${engagement.id}`)}
          getRowKey={(engagement) => engagement.id}
          emptyMessage="No engagements found"
        />
      )}
    </div>
  );
}
