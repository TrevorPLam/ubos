import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";

export const agreementsRoutes = Router();

// ==================== PROPOSALS ====================

agreementsRoutes.get("/api/proposals", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const proposals = await storage.getProposals(orgId);
    res.json(proposals);
  } catch (error) {
    console.error("Get proposals error:", error);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

agreementsRoutes.post("/api/proposals", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const proposal = await storage.createProposal({
      ...req.body,
      organizationId: orgId,
      createdById: userId,
    });
    res.status(201).json(proposal);
  } catch (error) {
    console.error("Create proposal error:", error);
    res.status(500).json({ error: "Failed to create proposal" });
  }
});

agreementsRoutes.patch(
  "/api/proposals/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposal = await storage.updateProposal(req.params.id, orgId, req.body);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (error) {
      console.error("Update proposal error:", error);
      res.status(500).json({ error: "Failed to update proposal" });
    }
  },
);

agreementsRoutes.post(
  "/api/proposals/:id/send",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const proposal = await storage.updateProposal(req.params.id, orgId, {
        status: "sent",
        sentAt: new Date(),
      });
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (error) {
      console.error("Send proposal error:", error);
      res.status(500).json({ error: "Failed to send proposal" });
    }
  },
);

agreementsRoutes.delete(
  "/api/proposals/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteProposal(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Proposal not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete proposal error:", error);
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  },
);

// ==================== CONTRACTS ====================

agreementsRoutes.get("/api/contracts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const contracts = await storage.getContracts(orgId);
    res.json(contracts);
  } catch (error) {
    console.error("Get contracts error:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

agreementsRoutes.post("/api/contracts", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const contract = await storage.createContract({
      ...req.body,
      organizationId: orgId,
      createdById: userId,
    });
    res.status(201).json(contract);
  } catch (error) {
    console.error("Create contract error:", error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

agreementsRoutes.patch(
  "/api/contracts/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contract = await storage.updateContract(req.params.id, orgId, req.body);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      console.error("Update contract error:", error);
      res.status(500).json({ error: "Failed to update contract" });
    }
  },
);

agreementsRoutes.post(
  "/api/contracts/:id/send",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const contract = await storage.updateContract(req.params.id, orgId, { status: "sent" });
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      console.error("Send contract error:", error);
      res.status(500).json({ error: "Failed to send contract" });
    }
  },
);

agreementsRoutes.post(
  "/api/contracts/:id/sign",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
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
  },
);

agreementsRoutes.delete(
  "/api/contracts/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteContract(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Contract not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete contract error:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  },
);
