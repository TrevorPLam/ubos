import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";

export const communicationsRoutes = Router();

// ==================== THREADS / MESSAGES ====================

communicationsRoutes.get("/api/threads", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const threads = await storage.getThreads(orgId);
    res.json(threads);
  } catch (error) {
    console.error("Get threads error:", error);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

communicationsRoutes.post("/api/threads", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const thread = await storage.createThread({
      ...req.body,
      organizationId: orgId,
      createdById: userId,
    });
    res.status(201).json(thread);
  } catch (error) {
    console.error("Create thread error:", error);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

communicationsRoutes.get(
  "/api/threads/:id/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const thread = await storage.getThread(req.params.id, orgId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },
);

communicationsRoutes.post(
  "/api/threads/:id/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const user = await storage.getUser(userId);
      const orgId = await getOrCreateOrg(userId);
      const thread = await storage.getThread(req.params.id, orgId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const message = await storage.createMessage({
        threadId: req.params.id,
        senderId: userId,
        senderName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown"
          : "Unknown",
        content: req.body.content,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  },
);
