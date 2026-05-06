import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building, Mail, MoreHorizontal, Plus, Tag, Trash2, Users } from "lucide-react";

import { PageTransition } from "@/components/ui/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crmContacts } from "@/data/mockData";
import {
  type CreateLeadInput,
  createLeadInputSchema,
  type LeadBoard,
  type LeadRecord,
  type LeadStage,
  updateLeadInputSchema,
} from "@/lib/crm/schema";
import {
  crmLeadBoardQueryKey,
  crmLeadBoardQueryOptions,
  createLeadMutation,
  deleteLeadMutation,
  updateLeadMutation,
} from "@/lib/trpc/crm";
import { toast } from "@/hooks/use-toast";

const tabs = ["Leads", "Contacts", "Deals", "Email", "Engagements"] as const;
const leadStages: LeadStage[] = ["new", "contacted", "qualified"];

type CrmTab = (typeof tabs)[number];
type ContactRecord = (typeof crmContacts)[number];

const emptyLeadDraft: CreateLeadInput = {
  name: "",
  company: "",
  value: "",
  source: "",
  stage: "new",
  email: "",
  phone: "",
  notes: "",
};

function cloneLeadBoard(board?: LeadBoard): LeadBoard {
  return {
    new: [...(board?.new ?? [])],
    contacted: [...(board?.contacted ?? [])],
    qualified: [...(board?.qualified ?? [])],
  };
}

function removeLeadFromBoard(board: LeadBoard | undefined, leadId: string): LeadBoard {
  const nextBoard = cloneLeadBoard(board);

  for (const stage of leadStages) {
    nextBoard[stage] = nextBoard[stage].filter((lead) => lead.id !== leadId);
  }

  return nextBoard;
}

function upsertLeadInBoard(board: LeadBoard | undefined, lead: LeadRecord): LeadBoard {
  const nextBoard = removeLeadFromBoard(board, lead.id);
  nextBoard[lead.stage] = [lead, ...nextBoard[lead.stage]];
  return nextBoard;
}

function isLeadRecord(value: LeadRecord | ContactRecord | null): value is LeadRecord {
  return Boolean(value && "source" in value && "stage" in value);
}

export default function CRM() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CrmTab>("Leads");
  const [slideOutOpen, setSlideOutOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LeadRecord | ContactRecord | null>(null);
  const [createLeadDraft, setCreateLeadDraft] = useState<CreateLeadInput>(emptyLeadDraft);
  const [editLeadDraft, setEditLeadDraft] = useState<Partial<LeadRecord>>({});

  const leadsQuery = useQuery({
    ...crmLeadBoardQueryOptions(),
    enabled: activeTab === "Leads",
  });
  const leadBoard = leadsQuery.data;

  useEffect(() => {
    if (isLeadRecord(selectedItem)) {
      setEditLeadDraft({
        id: selectedItem.id,
        name: selectedItem.name,
        company: selectedItem.company,
        value: selectedItem.value,
        source: selectedItem.source,
        stage: selectedItem.stage,
        email: selectedItem.email,
        phone: selectedItem.phone,
        notes: selectedItem.notes,
      });
      return;
    }

    setEditLeadDraft({});
  }, [selectedItem]);

  const createMutation = useMutation({
    mutationFn: createLeadMutation,
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: crmLeadBoardQueryKey });
      const previousBoard = queryClient.getQueryData<LeadBoard>(crmLeadBoardQueryKey);
      const optimisticId = crypto.randomUUID();

      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) =>
        upsertLeadInBoard(currentBoard, {
          id: optimisticId,
          ...draft,
        })
      );

      return { optimisticId, previousBoard };
    },
    onError: (error, _draft, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(crmLeadBoardQueryKey, context.previousBoard);
      }

      toast({
        title: "Lead creation failed",
        description: error instanceof Error ? error.message : "The lead could not be created.",
        variant: "destructive",
      });
    },
    onSuccess: (createdLead, _draft, context) => {
      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) => {
        const nextBoard = context?.optimisticId
          ? removeLeadFromBoard(currentBoard, context.optimisticId)
          : cloneLeadBoard(currentBoard);
        return upsertLeadInBoard(nextBoard, createdLead);
      });

      setCreateLeadOpen(false);
      setCreateLeadDraft(emptyLeadDraft);
      toast({
        title: "Lead created",
        description: `${createdLead.name} was added to the board.`,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateLeadMutation,
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: crmLeadBoardQueryKey });
      const previousBoard = queryClient.getQueryData<LeadBoard>(crmLeadBoardQueryKey);

      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) => {
        const currentLead = leadStages
          .flatMap((stage) => currentBoard?.[stage] ?? [])
          .find((lead) => lead.id === draft.id);

        if (!currentLead) {
          return cloneLeadBoard(currentBoard);
        }

        return upsertLeadInBoard(currentBoard, {
          ...currentLead,
          ...draft,
          stage: draft.stage ?? currentLead.stage,
        });
      });

      return { previousBoard };
    },
    onError: (error, _draft, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(crmLeadBoardQueryKey, context.previousBoard);
      }

      toast({
        title: "Lead update failed",
        description: error instanceof Error ? error.message : "The lead could not be updated.",
        variant: "destructive",
      });
    },
    onSuccess: (updatedLead) => {
      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) =>
        upsertLeadInBoard(currentBoard, updatedLead)
      );
      setSelectedItem(updatedLead);
      toast({
        title: "Lead updated",
        description: `${updatedLead.name} was saved.`,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLeadMutation,
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey: crmLeadBoardQueryKey });
      const previousBoard = queryClient.getQueryData<LeadBoard>(crmLeadBoardQueryKey);

      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) =>
        removeLeadFromBoard(currentBoard, leadId)
      );

      return { previousBoard };
    },
    onError: (error, _leadId, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(crmLeadBoardQueryKey, context.previousBoard);
      }

      toast({
        title: "Lead deletion failed",
        description: error instanceof Error ? error.message : "The lead could not be deleted.",
        variant: "destructive",
      });
    },
    onSuccess: (_result, leadId) => {
      queryClient.setQueryData<LeadBoard>(crmLeadBoardQueryKey, (currentBoard) =>
        removeLeadFromBoard(currentBoard, leadId)
      );
      setSelectedItem(null);
      setSlideOutOpen(false);
      toast({
        title: "Lead removed",
        description: "The lead was removed from the board.",
      });
    },
  });

  const handleItemClick = (item: LeadRecord | ContactRecord) => {
    setSelectedItem(item);
    setSlideOutOpen(true);
  };

  const handleCreateLeadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDraft = createLeadInputSchema.safeParse(createLeadDraft);
    if (!parsedDraft.success) {
      toast({
        title: "Lead details are incomplete",
        description: parsedDraft.error.issues[0]?.message ?? "Check the form fields and try again.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(parsedDraft.data);
  };

  const handleUpdateLeadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDraft = updateLeadInputSchema.safeParse(editLeadDraft);
    if (!parsedDraft.success) {
      toast({
        title: "Lead details are incomplete",
        description: parsedDraft.error.issues[0]?.message ?? "Check the form fields and try again.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(parsedDraft.data);
  };

  return (
    <PageTransition className="flex flex-col h-full overflow-hidden">
      <div className="flex-none p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold text-white">CRM</h1>
          <Button
            className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_12px_rgba(0,91,181,0.3)] hover:shadow-[0_0_15px_rgba(0,91,181,0.5)]"
            disabled={activeTab !== "Leads"}
            onClick={() => setCreateLeadOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> New Lead
          </Button>
        </div>
        <div className="flex space-x-6 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSlideOutOpen(false);
              }}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(0,91,181,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-auto p-6 bg-[#0B0C0E]">
          {activeTab === "Leads" && leadBoard ? (
            <div className="flex gap-6 h-full overflow-x-auto pb-4 scrollbar-hide">
              {leadStages.map((stage) => (
                <div
                  key={stage}
                  className="w-80 flex-shrink-0 bg-[#111317]/50 rounded-lg p-4 border border-white/5 flex flex-col h-full"
                >
                  <h3 className="font-medium text-sm mb-4 flex items-center justify-between text-muted-foreground capitalize">
                    {stage} <span className="bg-white/5 px-2 py-0.5 rounded text-xs">{leadBoard[stage].length}</span>
                  </h3>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                    {leadBoard[stage].map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => handleItemClick(lead)}
                        className="bg-[#111317] border border-white/5 rounded-md p-4 hover:border-primary/50 hover:shadow-[0_0_0_1px_rgba(0,91,181,0.5)] transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm text-white">{lead.name}</div>
                          <button className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                          <Building size={12} /> {lead.company}
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs font-medium text-emerald-400">{lead.value}</span>
                          <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-muted-foreground">
                            {lead.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "Contacts" && (
            <div className="bg-[#111317]/80 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/5 flex gap-2">
                <Button variant="outline" className="bg-white/5 border-white/10 text-xs h-8">
                  My Contacts
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/10 text-xs h-8">
                  Uncontacted
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/10 text-xs h-8">
                  Hot Leads
                </Button>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Last Contact</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {crmContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => handleItemClick(contact)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{contact.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{contact.company}</td>
                      <td className="px-6 py-4 text-muted-foreground">{contact.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(contact.lastContact).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] px-2 py-1 rounded ${
                            contact.status === "Hot"
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : contact.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-white/5 text-muted-foreground border border-white/10"
                          }`}
                        >
                          {contact.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!leadBoard && activeTab === "Leads" ? (
            <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-white/5 text-muted-foreground">
              Loading CRM board...
            </div>
          ) : null}

          {activeTab !== "Leads" && activeTab !== "Contacts" && (
            <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-white/5">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{activeTab} view coming soon</p>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {createLeadOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCreateLeadOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="absolute left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-[#111317]/95 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">Create lead</h2>
                    <p className="text-sm text-muted-foreground mt-1">Add a new lead and place it directly into the board.</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCreateLeadOpen(false)} className="hover:bg-white/10 rounded-full h-8 w-8">
                    &times;
                  </Button>
                </div>
                <form className="space-y-4" onSubmit={handleCreateLeadSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Lead name"
                      value={createLeadDraft.name}
                    />
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, company: event.target.value }))}
                      placeholder="Company"
                      value={createLeadDraft.company}
                    />
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, value: event.target.value }))}
                      placeholder="$50k"
                      value={createLeadDraft.value}
                    />
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, source: event.target.value }))}
                      placeholder="Source"
                      value={createLeadDraft.source}
                    />
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email"
                      value={createLeadDraft.email ?? ""}
                    />
                    <Input
                      className="border-white/10 bg-white/5"
                      onChange={(event) => setCreateLeadDraft((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Phone"
                      value={createLeadDraft.phone ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Stage</label>
                    <select
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      onChange={(event) =>
                        setCreateLeadDraft((current) => ({
                          ...current,
                          stage: event.target.value as LeadStage,
                        }))
                      }
                      value={createLeadDraft.stage}
                    >
                      {leadStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    className="border-white/10 bg-white/5"
                    onChange={(event) => setCreateLeadDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Notes"
                    value={createLeadDraft.notes ?? ""}
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={() => setCreateLeadOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending} type="submit">
                      {createMutation.isPending ? "Creating..." : "Create lead"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {slideOutOpen && selectedItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSlideOutOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute top-0 right-0 bottom-0 w-[440px] bg-[#111317]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">{selectedItem.name}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{selectedItem.company}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSlideOutOpen(false)} className="hover:bg-white/10 rounded-full h-8 w-8">
                    &times;
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isLeadRecord(selectedItem) ? (
                    <form className="space-y-4" onSubmit={handleUpdateLeadSubmit}>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, name: event.target.value }))}
                          value={editLeadDraft.name ?? ""}
                        />
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, company: event.target.value }))}
                          value={editLeadDraft.company ?? ""}
                        />
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, value: event.target.value }))}
                          value={editLeadDraft.value ?? ""}
                        />
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, source: event.target.value }))}
                          value={editLeadDraft.source ?? ""}
                        />
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, email: event.target.value }))}
                          value={editLeadDraft.email ?? ""}
                        />
                        <Input
                          className="border-white/10 bg-white/5"
                          onChange={(event) => setEditLeadDraft((current) => ({ ...current, phone: event.target.value }))}
                          value={editLeadDraft.phone ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Stage</label>
                        <select
                          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                          onChange={(event) =>
                            setEditLeadDraft((current) => ({
                              ...current,
                              stage: event.target.value as LeadStage,
                            }))
                          }
                          value={editLeadDraft.stage ?? selectedItem.stage}
                        >
                          {leadStages.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        className="border-white/10 bg-white/5"
                        onChange={(event) => setEditLeadDraft((current) => ({ ...current, notes: event.target.value }))}
                        value={editLeadDraft.notes ?? ""}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-md border border-white/5">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Tag size={12} /> Value
                          </div>
                          <div className="font-medium text-emerald-400">{editLeadDraft.value ?? selectedItem.value}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-md border border-white/5">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Building size={12} /> Source
                          </div>
                          <div className="font-medium text-white">{editLeadDraft.source ?? selectedItem.source}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <Button
                          className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(selectedItem.id)}
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deleteMutation.isPending ? "Removing..." : "Delete"}
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90" disabled={updateMutation.isPending} type="submit">
                          {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white/5 p-3 rounded-md border border-white/5">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Mail size={12} /> Email
                          </div>
                          <div className="font-medium text-white">{selectedItem.email}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-md border border-white/5">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Building size={12} /> Last contact
                          </div>
                          <div className="font-medium text-white">
                            {new Date(selectedItem.lastContact).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-white uppercase tracking-wider">Activity</h3>
                        <div className="border-l border-white/10 ml-2 space-y-4 pl-4 relative">
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-[#111317]"></div>
                            <div className="text-sm text-white font-medium">Viewed proposal</div>
                            <div className="text-xs text-muted-foreground mt-0.5">2 hours ago</div>
                          </div>
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white/20 ring-4 ring-[#111317]"></div>
                            <div className="text-sm text-white font-medium">Email sent</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Yesterday</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
