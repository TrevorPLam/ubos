import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";
import { clientListQuerySchema, updateClientCompanySchema } from "@shared/client-schemas";
import { insertClientCompanySchema } from "@shared/schema";
import {
  handleValidationError,
  handleNotFoundError,
  handleDependencyError,
  handleServerError
} from "./error-handlers";

export const crmRoutes = Router();

// ==================== CLIENTS ====================

crmRoutes.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Parse and validate query parameters
    const validation = clientListQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return handleValidationError(res, validation.error, {
        operation: "list_clients",
        userId,
        orgId
      });
    }
    
    // Extract pagination parameters with defaults
    const { page, limit, search, industry, city, state, country } = validation.data;
    
    // Call storage method with pagination and filter options
    const result = await storage.getClientCompaniesPaginated(orgId, {
      page,
      limit,
      search,
      industry,
      city,
      state,
      country
    });
    
    // Return paginated response with data and pagination metadata
    res.json(result);
  } catch (error) {
    return handleServerError(res, error, {
      operation: "list_clients",
      userId,
      orgId
    });
  }
});

crmRoutes.get("/api/clients/stats", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Call storage method to get client statistics
    const stats = await storage.getClientCompanyStats(orgId);
    
    // Return statistics object with 200 status
    res.status(200).json(stats);
  } catch (error) {
    return handleServerError(res, error, {
      operation: "get_client_stats",
      userId,
      orgId
    });
  }
});

crmRoutes.get("/api/clients/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Validate id parameter (basic check - UUID format handled by database)
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    // Call storage method to get client with relations
    const client = await storage.getClientCompanyWithRelations(id, orgId);
    
    // Return 404 if client not found or belongs to different org
    if (!client) {
      return handleNotFoundError(res, "Client", {
        operation: "get_client",
        userId,
        orgId,
        resourceId: id
      });
    }
    
    // Return client with all relations
    res.json(client);
  } catch (error) {
    return handleServerError(res, error, {
      operation: "get_client",
      userId,
      orgId,
      resourceId: req.params.id
    });
  }
});

crmRoutes.post("/api/clients", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Validate request body using insertClientCompanySchema
    const validation = insertClientCompanySchema.safeParse(req.body);
    if (!validation.success) {
      return handleValidationError(res, validation.error, {
        operation: "create_client",
        userId,
        orgId
      });
    }
    
    // Ensure organizationId is set from authenticated user (ignore request body value)
    const clientData = {
      ...validation.data,
      organizationId: orgId
    };
    
    // Call storage.createClientCompany with validated data
    const client = await storage.createClientCompany(clientData);
    
    // Return created client with 201 status
    res.status(201).json(client);
  } catch (error) {
    return handleServerError(res, error, {
      operation: "create_client",
      userId,
      orgId
    });
  }
});

crmRoutes.put("/api/clients/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Validate id parameter
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    // Validate request body using updateClientCompanySchema
    const validation = updateClientCompanySchema.safeParse(req.body);
    if (!validation.success) {
      return handleValidationError(res, validation.error, {
        operation: "update_client",
        userId,
        orgId,
        resourceId: id
      });
    }
    
    // Call storage.updateClientCompany with id, orgId, and validated data
    // Note: organizationId cannot be changed (omitted from schema)
    const client = await storage.updateClientCompany(id, orgId, validation.data);
    
    // Return 404 if client not found or belongs to different org
    if (!client) {
      return handleNotFoundError(res, "Client", {
        operation: "update_client",
        userId,
        orgId,
        resourceId: id
      });
    }
    
    // Return updated client with 200 status
    // updatedAt timestamp is automatically updated by the storage layer
    res.status(200).json(client);
  } catch (error) {
    return handleServerError(res, error, {
      operation: "update_client",
      userId,
      orgId,
      resourceId: req.params.id
    });
  }
});

crmRoutes.delete("/api/clients/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req)!;
  let orgId: string | undefined;
  
  try {
    orgId = await getOrCreateOrg(userId);
    
    // Validate id parameter
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    // Check for dependencies first
    const dependencyCheck = await storage.checkClientCompanyDependencies(id, orgId);
    
    // If dependencies exist, return 409 with dependency details
    if (dependencyCheck.hasDependencies) {
      return handleDependencyError(
        res,
        "Cannot delete client with existing dependencies",
        dependencyCheck.dependencies,
        {
          operation: "delete_client",
          userId,
          orgId,
          resourceId: id
        }
      );
    }
    
    // If no dependencies, proceed with deletion
    const success = await storage.deleteClientCompany(id, orgId);
    
    // Return 404 if client not found or belongs to different org
    if (!success) {
      return handleNotFoundError(res, "Client", {
        operation: "delete_client",
        userId,
        orgId,
        resourceId: id
      });
    }
    
    // Return 204 on successful deletion with no content
    res.status(204).send();
  } catch (error) {
    return handleServerError(res, error, {
      operation: "delete_client",
      userId,
      orgId,
      resourceId: req.params.id
    });
  }
});

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
