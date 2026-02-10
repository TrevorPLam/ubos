import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, getOrCreateOrg } from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const filesRoutes = Router();

filesRoutes.post("/api/files/upload", requireAuth, checkPermission("files", "create"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    const engagementId = req.body.engagementId; 

    const fileObject = await storage.createFileObject({
        organizationId: orgId,
        engagementId: engagementId || null,
        uploadedById: userId,
        name: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path, 
        folder: req.body.folder || "/",
        isClientVisible: req.body.isClientVisible === "true"
    });

    res.json(fileObject);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

filesRoutes.get("/api/files/:id/download", requireAuth, checkPermission("files", "view"), async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req)!;
        const orgId = await getOrCreateOrg(userId);
        const fileId = req.params.id;

        const file = await storage.getFileObject(fileId);
        if (!file || file.organizationId !== orgId) {
            return res.status(404).json({ error: "File not found" });
        }

        res.download(file.path, file.originalName);
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Download failed" });
    }
});

filesRoutes.get("/api/files", requireAuth, checkPermission("files", "view"), async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req)!;
        const orgId = await getOrCreateOrg(userId);
        const engagementId = req.query.engagementId as string;

        const files = await storage.getFileObjects(orgId, engagementId);
        res.json(files);
    } catch (error) {
        console.error("List files error:", error);
        res.status(500).json({ error: "List files failed" });
    }
});
