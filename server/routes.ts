/**
 * API routes.
 *
 * This file intentionally keeps “auth” very lightweight for local/dev usage:
 * - `GET /api/login` mints a random user id and stores it in an HttpOnly cookie
 * - API requests authenticate by either:
 *   - `x-user-id` / `x-user` header (handy for scripts/tests)
 *   - `ubos_user_id` cookie (browser)
 *
 * Multi-tenancy model:
 * - All business data is scoped to an `organizationId`.
 * - Handlers should resolve the caller’s org once (`getOrCreateOrg`) then pass `orgId`
 *   to storage methods.
 *
 * AI iteration notes:
 * - When adding a new route:
 *   1) add `requireAuth` (or `isAuthenticated` for back-compat)
 *   2) resolve `orgId`
 *   3) call `storage.*` methods that enforce `orgId` filters
 *
 * Endpoint index (by prefix):
 * - /api/login, /api/logout, /api/auth/*
 * - /api/dashboard/*
 * - /api/clients, /api/contacts
 * - /api/deals, /api/proposals, /api/contracts
 * - /api/engagements, /api/projects, /api/tasks
 * - /api/threads, /api/threads/:id/messages
 * - /api/invoices, /api/bills, /api/vendors
 */

import type { Express, Request, Response, RequestHandler } from "express";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";

const USER_ID_COOKIE_NAME = "ubos_user_id";

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
    };
  };
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};

  for (const part of header.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = decodeURIComponent(rawValueParts.join("=") ?? "");
  }

  return result;
}

function getUserIdFromRequest(req: Request): string | undefined {
  // Allow non-browser callers to impersonate a user via header.
  // This keeps development + automation simple without an external auth provider.
  const headerUserId = req.header("x-user-id") || req.header("x-user");
  if (headerUserId) return headerUserId;

  // Browser path: our `/api/login` endpoint stores the user id in an HttpOnly cookie.
  const cookies = parseCookies(req.header("cookie"));
  return cookies[USER_ID_COOKIE_NAME];
}

const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Standardize where handlers read the authenticated user.
  // We mimic a minimal “claims.sub” shape to ease upgrades to a real auth provider later.
  (req as AuthenticatedRequest).user = { claims: { sub: userId } };
  next();
};

// Back-compat for existing route handlers
const isAuthenticated = requireAuth;

async function getOrCreateOrg(userId: string): Promise<string> {
  // Ensure every user has an organization; most API handlers assume `orgId` exists.
  // This keeps first-run UX simple: sign in once → data is immediately writable.
  let org = await storage.getUserOrganization(userId);
  if (!org) {
    org = await storage.createOrganization(
      { name: "My Organization", slug: `org-${userId.slice(0, 8)}` },
      userId
    );
  }
  return org.id;
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // `server` is reserved for real-time features (SSE/WebSocket) where we need the HTTP server.
  // Keeping it in the signature avoids a future breaking change.
  void server;

  // ==================== AUTH ====================
  // Minimal local auth endpoints (no external provider)
  app.get("/api/login", async (_req, res) => {
    const userId = randomUUID();
    res.setHeader(
      "Set-Cookie",
      // `Secure` is intentionally omitted for local HTTP dev; add it when you enforce HTTPS.
      `${USER_ID_COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax`,
    );
    res.redirect("/");
  });

  app.get("/api/logout", (_req, res) => {
    res.setHeader(
      "Set-Cookie",
      `${USER_ID_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    res.redirect("/");
  });

  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({ id: userId });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==================== DASHBOARD ====================
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      
      const [clients, deals, engagements, invoices] = await Promise.all([
        storage.getClientCompanies(orgId),
        storage.getDeals(orgId),
        storage.getEngagements(orgId),
        storage.getInvoices(orgId),
      ]);
      
      const pendingInvoices = invoices.filter(i => i.status === "sent" || i.status === "viewed");
      const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
      
      res.json({
        clients: clients.length,
        deals: deals.filter(d => d.stage !== "won" && d.stage !== "lost").length,
        engagements: engagements.filter(e => e.status === "active").length,
        pendingInvoices: pendingInvoices.length,
        totalRevenue: totalRevenue.toFixed(2),
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== CLIENTS ====================

  app.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const clients = await storage.getClientCompanies(orgId);
      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);
      const client = await storage.createClientCompany({ ...req.body, organizationId: orgId });
      res.status(201).json(client);
    } catch (error) {
      console.error("Create client error:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const client = await storage.updateClientCompany(req.params.id, orgId, req.body);
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteClientCompany(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Client not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // ==================== CONTACTS ====================

  app.get("/api/contacts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contacts = await storage.getContacts(orgId);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contact = await storage.createContact({ ...req.body, organizationId: orgId });
      res.status(201).json(contact);
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contact = await storage.updateContact(req.params.id, orgId, req.body);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteContact(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Contact not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // ==================== DEALS ====================

  app.get("/api/deals", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const deals = await storage.getDeals(orgId);
      res.json(deals);
    } catch (error) {
      console.error("Get deals error:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.post("/api/deals", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const deal = await storage.createDeal({ ...req.body, organizationId: orgId, ownerId: userId });
      res.status(201).json(deal);
    } catch (error) {
      console.error("Create deal error:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const deal = await storage.updateDeal(req.params.id, orgId, req.body);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      res.json(deal);
    } catch (error) {
      console.error("Update deal error:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteDeal(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Deal not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // ==================== PROPOSALS ====================

  app.get("/api/proposals", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposals = await storage.getProposals(orgId);
      res.json(proposals);
    } catch (error) {
      console.error("Get proposals error:", error);
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.post("/api/proposals", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposal = await storage.createProposal({ ...req.body, organizationId: orgId, createdById: userId });
      res.status(201).json(proposal);
    } catch (error) {
      console.error("Create proposal error:", error);
      res.status(500).json({ error: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposal = await storage.updateProposal(req.params.id, orgId, req.body);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (error) {
      console.error("Update proposal error:", error);
      res.status(500).json({ error: "Failed to update proposal" });
    }
  });

  app.post("/api/proposals/:id/send", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposal = await storage.updateProposal(req.params.id, orgId, { status: "sent", sentAt: new Date() });
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (error) {
      console.error("Send proposal error:", error);
      res.status(500).json({ error: "Failed to send proposal" });
    }
  });

  app.delete("/api/proposals/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteProposal(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Proposal not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete proposal error:", error);
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  // ==================== CONTRACTS ====================

  app.get("/api/contracts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contracts = await storage.getContracts(orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts error:", error);
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contract = await storage.createContract({ ...req.body, organizationId: orgId, createdById: userId });
      res.status(201).json(contract);
    } catch (error) {
      console.error("Create contract error:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contract = await storage.updateContract(req.params.id, orgId, req.body);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      console.error("Update contract error:", error);
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  app.post("/api/contracts/:id/send", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contract = await storage.updateContract(req.params.id, orgId, { status: "sent" });
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      console.error("Send contract error:", error);
      res.status(500).json({ error: "Failed to send contract" });
    }
  });

  app.post("/api/contracts/:id/sign", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const { signedByName } = req.body;
      
      const contract = await storage.updateContract(req.params.id, orgId, {
        status: "signed",
        signedAt: new Date(),
        signedByName,
      });
      
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      
      const engagement = await storage.createEngagement({
        organizationId: orgId,
        contractId: contract.id,
        dealId: contract.dealId,
        clientCompanyId: contract.clientCompanyId,
        contactId: contract.contactId,
        ownerId: userId,
        name: `Engagement: ${contract.name}`,
        status: "active",
        totalValue: contract.totalValue,
        startDate: new Date(),
      });
      
      res.json({ contract, engagement });
    } catch (error) {
      console.error("Sign contract error:", error);
      res.status(500).json({ error: "Failed to sign contract" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteContract(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Contract not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete contract error:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  });

  // ==================== ENGAGEMENTS ====================

  app.get("/api/engagements", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const engagements = await storage.getEngagements(orgId);
      res.json(engagements);
    } catch (error) {
      console.error("Get engagements error:", error);
      res.status(500).json({ error: "Failed to fetch engagements" });
    }
  });

  app.post("/api/engagements", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const engagement = await storage.createEngagement({ ...req.body, organizationId: orgId, ownerId: userId });
      res.status(201).json(engagement);
    } catch (error) {
      console.error("Create engagement error:", error);
      res.status(500).json({ error: "Failed to create engagement" });
    }
  });

  app.patch("/api/engagements/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const engagement = await storage.updateEngagement(req.params.id, orgId, req.body);
      if (!engagement) return res.status(404).json({ error: "Engagement not found" });
      res.json(engagement);
    } catch (error) {
      console.error("Update engagement error:", error);
      res.status(500).json({ error: "Failed to update engagement" });
    }
  });

  app.delete("/api/engagements/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteEngagement(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Engagement not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete engagement error:", error);
      res.status(500).json({ error: "Failed to delete engagement" });
    }
  });

  // ==================== PROJECTS ====================

  app.get("/api/projects", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const projects = await storage.getProjects(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const project = await storage.createProject({ ...req.body, organizationId: orgId });
      res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const project = await storage.updateProject(req.params.id, orgId, req.body);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteProject(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Project not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ==================== TASKS ====================

  app.get("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const projectId = req.query.projectId as string | undefined;
      const tasks = await storage.getTasks(orgId, projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const task = await storage.createTask({ ...req.body, organizationId: orgId });
      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // ==================== THREADS / MESSAGES ====================

  app.get("/api/threads", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const threads = await storage.getThreads(orgId);
      res.json(threads);
    } catch (error) {
      console.error("Get threads error:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  app.post("/api/threads", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const thread = await storage.createThread({ ...req.body, organizationId: orgId, createdById: userId });
      res.status(201).json(thread);
    } catch (error) {
      console.error("Create thread error:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.get("/api/threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const thread = await storage.getThread(req.params.id, orgId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      const orgId = await getOrCreateOrg(userId);
      const thread = await storage.getThread(req.params.id, orgId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const message = await storage.createMessage({
        threadId: req.params.id,
        senderId: userId,
        senderName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown" : "Unknown",
        content: req.body.content,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // ==================== INVOICES ====================

  app.get("/api/invoices", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoices = await storage.getInvoices(orgId);
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoice = await storage.createInvoice({ ...req.body, organizationId: orgId });
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoice = await storage.updateInvoice(req.params.id, orgId, req.body);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.post("/api/invoices/:id/send", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoice = await storage.updateInvoice(req.params.id, orgId, { status: "sent", sentAt: new Date() });
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ error: "Failed to send invoice" });
    }
  });

  app.post("/api/invoices/:id/mark-paid", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const existing = await storage.getInvoice(req.params.id, orgId);
      if (!existing) return res.status(404).json({ error: "Invoice not found" });
      const invoice = await storage.updateInvoice(req.params.id, orgId, {
        status: "paid",
        paidAt: new Date(),
        paidAmount: existing.totalAmount,
      });
      res.json(invoice);
    } catch (error) {
      console.error("Mark invoice paid error:", error);
      res.status(500).json({ error: "Failed to mark invoice as paid" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteInvoice(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Invoice not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // ==================== BILLS ====================

  app.get("/api/bills", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bills = await storage.getBills(orgId);
      res.json(bills);
    } catch (error) {
      console.error("Get bills error:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.post("/api/bills", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.createBill({ ...req.body, organizationId: orgId, createdById: userId });
      res.status(201).json(bill);
    } catch (error) {
      console.error("Create bill error:", error);
      res.status(500).json({ error: "Failed to create bill" });
    }
  });

  app.patch("/api/bills/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, req.body);
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Update bill error:", error);
      res.status(500).json({ error: "Failed to update bill" });
    }
  });

  app.post("/api/bills/:id/approve", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
      });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Approve bill error:", error);
      res.status(500).json({ error: "Failed to approve bill" });
    }
  });

  app.post("/api/bills/:id/reject", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, { status: "rejected" });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Reject bill error:", error);
      res.status(500).json({ error: "Failed to reject bill" });
    }
  });

  app.post("/api/bills/:id/mark-paid", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, { status: "paid", paidAt: new Date() });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Mark bill paid error:", error);
      res.status(500).json({ error: "Failed to mark bill as paid" });
    }
  });

  app.delete("/api/bills/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteBill(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Bill not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete bill error:", error);
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  // ==================== VENDORS ====================

  app.get("/api/vendors", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const vendors = await storage.getVendors(orgId);
      res.json(vendors);
    } catch (error) {
      console.error("Get vendors error:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const vendor = await storage.createVendor({ ...req.body, organizationId: orgId });
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Create vendor error:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });
}
