import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";

export const engagementsRoutes = Router();

// ==================== ENGAGEMENTS ====================

engagementsRoutes.get("/api/engagements", requireAuth, checkPermission("engagements", "view"), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const engagements = await storage.getEngagements(orgId);
    res.json(engagements);
  } catch (error) {
    console.error("Get engagements error:", error);
    res.status(500).json({ error: "Failed to fetch engagements" });
  }
});

engagementsRoutes.post(
  "/api/engagements",
  requireAuth,
  checkPermission("engagements", "create"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const engagement = await storage.createEngagement({
        ...req.body,
        organizationId: orgId,
        ownerId: userId,
      });
      res.status(201).json(engagement);
    } catch (error) {
      console.error("Create engagement error:", error);
      res.status(500).json({ error: "Failed to create engagement" });
    }
  },
);

engagementsRoutes.patch(
  "/api/engagements/:id",
  requireAuth,
  checkPermission("engagements", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const engagement = await storage.updateEngagement(req.params.id, orgId, req.body);
      if (!engagement) return res.status(404).json({ error: "Engagement not found" });
      res.json(engagement);
    } catch (error) {
      console.error("Update engagement error:", error);
      res.status(500).json({ error: "Failed to update engagement" });
    }
  },
);

engagementsRoutes.delete(
  "/api/engagements/:id",
  requireAuth,
  checkPermission("engagements", "delete"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteEngagement(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Engagement not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete engagement error:", error);
      res.status(500).json({ error: "Failed to delete engagement" });
    }
  },
);
