/**
 * Clients page.
 *
 * Patterns used here (copy/paste-friendly for other CRUD pages):
 * - List query: `useQuery({ queryKey: ["/api/clients"] })`
 * - Mutations via `apiRequest` + `queryClient.invalidateQueries` to refresh the list
 * - Form validation with Zod + react-hook-form
 *
 * AI iteration notes:
 * - Add new client fields by updating:
 *   1) `clientFormSchema`
 *   2) form defaults + `handleEdit` mapping
 *   3) server schema/storage/routes if persisted
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Building2, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ClientCompany } from "@shared/schema";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().url().optional().or(z.literal("")),
  // Keep `website` optional but validate format when present.
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      website: "",
      industry: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      notes: "",
    },
  });

  const { data: clients, isLoading } = useQuery<ClientCompany[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      // Refresh the list; simplest approach while iteration is fast.
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Client created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create client", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormValues & { id: string }) => {
      return apiRequest("PATCH", `/api/clients/${data.id}`, data);
    },
    onSuccess: () => {
      // Invalidate the list to reflect updates; consider optimistic updates later.
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      setEditingClient(null);
      form.reset();
      toast({ title: "Client updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update client", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete client", variant: "destructive" });
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    if (editingClient) {
      updateMutation.mutate({ ...data, id: editingClient.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: ClientCompany) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      website: client.website || "",
      industry: client.industry || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      country: client.country || "",
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    form.reset();
  };

  const filteredClients = clients?.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      header: "Company",
      accessor: (client: ClientCompany) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{client.name}</p>
            {client.website && (
              <p className="text-xs text-muted-foreground">{client.website}</p>
            )}
          </div>
        </div>
      ),
    },
    { header: "Industry", accessor: (client: ClientCompany) => client.industry || "-" },
    {
      header: "Location",
      accessor: (client: ClientCompany) => {
        const parts = [client.city, client.state, client.country].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      header: "",
      className: "w-12",
      accessor: (client: ClientCompany) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(client)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate(client.id)}
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
        title="Clients"
        description="Manage your client companies"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-client">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} data-testid="input-client-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} data-testid="input-client-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="Technology" {...field} data-testid="input-client-industry" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} data-testid="input-client-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco" {...field} data-testid="input-client-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} data-testid="input-client-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="94102" {...field} data-testid="input-client-zip" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} data-testid="input-client-country" />
                          </FormControl>
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
                      data-testid="button-save-client"
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
            placeholder="Search clients..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-clients"
          />
        </div>
      </div>

      {!isLoading && (!clients || clients.length === 0) ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first client to start managing your business relationships."
          action={
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-client">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredClients || []}
          isLoading={isLoading}
          onRowClick={(client) => setLocation(`/clients/${client.id}`)}
          getRowKey={(client) => client.id}
          emptyMessage="No clients found"
        />
      )}
    </div>
  );
}
