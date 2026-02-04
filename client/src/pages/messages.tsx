// AI-META-BEGIN
// AI-META: Page component - messages.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components
// DANGER: Review data fetching logic
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Messages page.
 *
 * Routing/data patterns:
 * - Thread list uses `queryKey: ["/api/threads"]`.
 * - Messages are fetched with a segmented key:
 *   `["/api/threads", threadId, "messages"]` → "/api/threads/<id>/messages"
 * - `enabled: !!selectedThread` prevents firing the messages query before selection.
 *
 * AI iteration notes:
 * - If you add realtime updates later, this is the place to bridge WS/SSE → query cache.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MessageSquare, Search, Send, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Thread, Message, Engagement } from "@shared/schema";

const threadFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  engagementId: z.string().min(1, "Engagement is required"),
  type: z.enum(["internal", "client"]),
});

type ThreadFormValues = z.infer<typeof threadFormSchema>;

export default function MessagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const form = useForm<ThreadFormValues>({
    resolver: zodResolver(threadFormSchema),
    defaultValues: {
      subject: "",
      engagementId: "",
      type: "internal",
    },
  });

  const { data: threads, isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/threads"],
  });

  const { data: engagements } = useQuery<Engagement[]>({
    queryKey: ["/api/engagements"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/threads", selectedThread?.id, "messages"],
    // Avoid requests like `/api/threads/undefined/messages`.
    enabled: !!selectedThread,
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: ThreadFormValues) => {
      return apiRequest("POST", "/api/threads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Thread created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create thread", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      return apiRequest("POST", `/api/threads/${threadId}/messages`, { content });
    },
    onSuccess: () => {
      // Keep both the open thread and the thread list (lastMessageAt) up to date.
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const onSubmit = (data: ThreadFormValues) => {
    createThreadMutation.mutate(data);
  };

  const handleSendMessage = () => {
    if (!selectedThread || !newMessage.trim()) return;
    sendMessageMutation.mutate({ threadId: selectedThread.id, content: newMessage.trim() });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const filteredThreads = threads?.filter((thread) =>
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)]">
      <PageHeader
        title="Messages"
        description="Internal and client communications"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-thread">
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Start New Thread</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Discussion topic"
                            {...field}
                            data-testid="input-thread-subject"
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
                            <SelectTrigger data-testid="select-thread-engagement">
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
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thread Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-thread-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal">
                              <div className="flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5" />
                                Internal
                              </div>
                            </SelectItem>
                            <SelectItem value="client">
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                Client Visible
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
                      disabled={createThreadMutation.isPending}
                      data-testid="button-create-thread"
                    >
                      {createThreadMutation.isPending ? "Creating..." : "Create Thread"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-5rem)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search threads..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-threads"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredThreads && filteredThreads.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full text-left p-4 hover-elevate transition-colors ${
                        selectedThread?.id === thread.id ? "bg-muted" : ""
                      }`}
                      data-testid={`thread-${thread.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{thread.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {thread.lastMessageAt
                              ? new Date(thread.lastMessageAt).toLocaleDateString()
                              : new Date(thread.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {thread.type === "internal" ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" /> Internal
                            </>
                          ) : (
                            <>
                              <Users className="h-3 w-3 mr-1" /> Client
                            </>
                          )}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No threads yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedThread ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedThread.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(selectedThread.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {selectedThread.type === "internal" ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" /> Internal
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 mr-1" /> Client
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-[calc(100%-5rem)] p-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading messages...
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderId === user?.id ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.senderId === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.senderId !== user?.id && (
                              <p className="text-xs font-medium mb-1">{message.senderName}</p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="input-message-content"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a thread"
                description="Choose a conversation from the list to view messages."
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
