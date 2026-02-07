import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";

export const revenueRoutes = Router();

// ==================== INVOICES ====================

revenueRoutes.get("/api/invoices", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const invoices = await storage.getInvoices(orgId);
    res.json(invoices);
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

revenueRoutes.post("/api/invoices", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const invoice = await storage.createInvoice({ ...req.body, organizationId: orgId });
    res.status(201).json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

revenueRoutes.patch(
  "/api/invoices/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoice = await storage.updateInvoice(req.params.id, orgId, req.body);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  },
);

revenueRoutes.post(
  "/api/invoices/:id/send",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const invoice = await storage.updateInvoice(req.params.id, orgId, {
        status: "sent",
        sentAt: new Date(),
      });
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ error: "Failed to send invoice" });
    }
  },
);

revenueRoutes.post(
  "/api/invoices/:id/mark-paid",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
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
  },
);

revenueRoutes.delete(
  "/api/invoices/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteInvoice(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Invoice not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  },
);

// ==================== BILLS ====================

revenueRoutes.get("/api/bills", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const bills = await storage.getBills(orgId);
    res.json(bills);
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

revenueRoutes.post("/api/bills", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const bill = await storage.createBill({
      ...req.body,
      organizationId: orgId,
      createdById: userId,
    });
    res.status(201).json(bill);
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

revenueRoutes.patch("/api/bills/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const bill = await storage.updateBill(req.params.id, orgId, req.body);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (error) {
    console.error("Update bill error:", error);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

revenueRoutes.post(
  "/api/bills/:id/approve",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
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
  },
);

revenueRoutes.post(
  "/api/bills/:id/reject",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, { status: "rejected" });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Reject bill error:", error);
      res.status(500).json({ error: "Failed to reject bill" });
    }
  },
);

revenueRoutes.post(
  "/api/bills/:id/mark-paid",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const bill = await storage.updateBill(req.params.id, orgId, {
        status: "paid",
        paidAt: new Date(),
      });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error) {
      console.error("Mark bill paid error:", error);
      res.status(500).json({ error: "Failed to mark bill as paid" });
    }
  },
);

revenueRoutes.delete(
  "/api/bills/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteBill(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Bill not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete bill error:", error);
      res.status(500).json({ error: "Failed to delete bill" });
    }
  },
);

// ==================== VENDORS ====================

revenueRoutes.get("/api/vendors", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const vendors = await storage.getVendors(orgId);
    res.json(vendors);
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

revenueRoutes.post("/api/vendors", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const vendor = await storage.createVendor({ ...req.body, organizationId: orgId });
    res.status(201).json(vendor);
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});
