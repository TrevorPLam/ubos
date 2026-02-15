import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { 
  requireAuth, 
  getUserIdFromRequest, 
  getOrCreateOrg 
} from "./middleware/auth";
import { checkPermission } from "./middleware/permissions";
import { logger } from "./logger";

// Domain Routes
import { identityRoutes } from "./domains/identity/routes";
import { crmRoutes } from "./domains/crm/routes";
import { projectsRoutes } from "./domains/projects/routes";
import { revenueRoutes } from "./domains/revenue/routes";
import { communicationsRoutes } from "./domains/communications/routes";
import { agreementsRoutes } from "./domains/agreements/routes";
import { engagementsRoutes } from "./domains/engagements/routes";
import { fileRoutes } from "./routes/files";
import { rbacRoutes } from "./domains/rbac/routes";
import { organizationRoutes } from "./domains/organizations/routes";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // `server` is reserved for real-time features (SSE/WebSocket) where we need the HTTP server.
  // Keeping it in the signature avoids a future breaking change.
  void server;

  // Register Domain Routes
  // These routers contain their own path definitions (e.g. /api/clients)
  app.use(identityRoutes);
  app.use(crmRoutes);
  app.use(projectsRoutes);
  app.use(revenueRoutes);
  app.use(communicationsRoutes);
  app.use(agreementsRoutes);
  app.use(engagementsRoutes);
  app.use(fileRoutes);
  app.use(rbacRoutes);
  app.use(organizationRoutes);

  // ==================== DASHBOARD ====================
  // Kept here for now as it aggregates across domains
  app.get("/api/dashboard/stats", requireAuth, checkPermission("dashboard", "view"), async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req)!;
      const orgId = await getOrCreateOrg(userId);

      const [clients, deals, engagements, invoices] = await Promise.all([
        storage.getClientCompanies(orgId),
        storage.getDeals(orgId),
        storage.getEngagements(orgId),
        storage.getInvoices(orgId),
      ]);

      const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "viewed");
      const totalRevenue = invoices
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

      res.json({
        clients: clients.length,
        deals: deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length,
        engagements: engagements.filter((e) => e.status === "active").length,
        pendingInvoices: pendingInvoices.length,
        totalRevenue: totalRevenue.toFixed(2),
      });
    } catch (error) {
      // 2026 Best Practice: Structured logging with PII redaction
      logger.error("Dashboard stats error", {
        source: "dashboard",
        userId: getUserIdFromRequest(req),
        error: error instanceof Error ? error.message : String(error),
        path: "/api/dashboard/stats",
        method: "GET"
      });
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
}
