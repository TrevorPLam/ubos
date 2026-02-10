import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg, AuthenticatedRequest } from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";

export const projectsRoutes = Router();

// ==================== PROJECTS ====================

projectsRoutes.get("/api/projects", requireAuth, checkPermission("projects", "view"), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const projects = await storage.getProjects(orgId);
    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

projectsRoutes.post("/api/projects", requireAuth, checkPermission("projects", "create"), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const project = await storage.createProject({ ...req.body, organizationId: orgId });
    res.status(201).json(project);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

projectsRoutes.patch(
  "/api/projects/:id",
  requireAuth,
  checkPermission("projects", "edit"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const project = await storage.updateProject(req.params.id, orgId, req.body);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  },
);

projectsRoutes.delete(
  "/api/projects/:id",
  requireAuth,
  checkPermission("projects", "delete"),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.claims.sub;
      const orgId = await getOrCreateOrg(userId);
      const success = await storage.deleteProject(req.params.id, orgId);
      if (!success) return res.status(404).json({ error: "Project not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  },
);

// ==================== TASKS ====================

projectsRoutes.get("/api/tasks", requireAuth, checkPermission("tasks", "view"), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const projectId = req.query.projectId as string | undefined;
    const tasks = await storage.getTasks(orgId, projectId);
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

projectsRoutes.post("/api/tasks", requireAuth, checkPermission("tasks", "create"), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.claims.sub;
    const orgId = await getOrCreateOrg(userId);
    const task = await storage.createTask({ ...req.body, organizationId: orgId });
    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});
