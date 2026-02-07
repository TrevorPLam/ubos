import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";

export const crmRoutes = Router();

// ==================== CLIENTS ====================

crmRoutes.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
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

crmRoutes.post("/api/clients", requireAuth, async (req: Request, res: Response) => {
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

crmRoutes.patch(
  "/api/clients/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const client = await storage.updateClientCompany(req.params.id, orgId, req.body);
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  },
);

crmRoutes.delete(
  "/api/clients/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteClientCompany(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Client not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  },
);

// ==================== CONTACTS ====================

crmRoutes.get("/api/contacts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const contacts = await storage.getContacts(orgId);
    res.json(contacts);
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

crmRoutes.post("/api/contacts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const contact = await storage.createContact({ ...req.body, organizationId: orgId });
    res.status(201).json(contact);
  } catch (error) {
    console.error("Create contact error:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

crmRoutes.patch(
  "/api/contacts/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contact = await storage.updateContact(req.params.id, orgId, req.body);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  },
);

crmRoutes.delete(
  "/api/contacts/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteContact(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Contact not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  },
);

// ==================== DEALS ====================

crmRoutes.get("/api/deals", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const deals = await storage.getDeals(orgId);
    res.json(deals);
  } catch (error) {
    console.error("Get deals error:", error);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

crmRoutes.post("/api/deals", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const deal = await storage.createDeal({
      ...req.body,
      organizationId: orgId,
      ownerId: userId,
    });
    res.status(201).json(deal);
  } catch (error) {
    console.error("Create deal error:", error);
    res.status(500).json({ error: "Failed to create deal" });
  }
});

crmRoutes.patch("/api/deals/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const deal = await storage.updateDeal(req.params.id, orgId, req.body);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  } catch (error) {
    console.error("Update deal error:", error);
    res.status(500).json({ error: "Failed to update deal" });
  }
});

crmRoutes.delete(
  "/api/deals/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteDeal(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Deal not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  },
);
