// AI-META-BEGIN
// AI-META: Domain routes - organizations.ts
// OWNERSHIP: server/domains/organizations
// ENTRYPOINTS: server/routes.ts
// DEPENDENCIES: express, storage, middleware, validation schemas
// DANGER: Review authentication and authorization logic
// CHANGE-SAFETY: Review changes carefully - analyze API endpoints and security
// TESTS: npm run test:backend
// AI-META-END

/**
 * Organization settings API routes.
 *
 * This module handles:
 * - GET /api/organizations/settings - Get current org settings
 * - PUT /api/organizations/settings - Update org settings  
 * - POST /api/organizations/logo - Upload organization logo
 *
 * Requirements: 94.1, 94.2
 * 2026 Best Practices: Zero-trust architecture, comprehensive validation, audit logging
 */

import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { storage } from "../../storage";
import { 
  requireAuth, 
  getUserIdFromRequest, 
  getOrCreateOrg 
} from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";
import { 
  updateOrganizationSettingsSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), 'uploads', 'logos'));
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `org-logo-${timestamp}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const organizationRoutes = Router();

/**
 * GET /api/organizations/settings - Get current org settings
 * Requirements: 94.1
 */
organizationRoutes.get("/api/organizations/settings", requireAuth, checkPermission("organizations", "view"), async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);

    const settings = await storage.getOrganizationSettings(orgId);

    // Return organization settings (exclude sensitive internal fields)
    const {
      id,
      name,
      slug,
      logo,
      timezone,
      currency,
      dateFormat,
      language,
      businessHours,
      createdAt,
      updatedAt,
    } = settings;

    res.json({
      id,
      name,
      slug,
      logo,
      timezone,
      currency,
      dateFormat,
      language,
      businessHours,
      createdAt,
      updatedAt,
    });
  } catch (error) {
    // Safely log error without causing circular reference issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching organization settings:", errorMessage);
    res.status(500).json({ 
      error: "Failed to fetch organization settings" 
    });
  }
});

/**
 * PUT /api/organizations/settings - Update org settings
 * Requirements: 94.1, 94.2
 */
organizationRoutes.put("/api/organizations/settings", requireAuth, checkPermission("organizations", "edit"), async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);

    // Validate request body
    const validatedData = updateOrganizationSettingsSchema.parse(req.body);

    // Update organization settings
    const updatedSettings = await storage.updateOrganizationSettings(orgId, validatedData);

    // Log activity event for audit trail
    await storage.createActivityEvent({
      organizationId: orgId,
      entityType: "organization",
      entityId: orgId,
      actorId: userId,
      type: "updated",
      description: "Organization settings updated",
      metadata: {
        updatedFields: Object.keys(validatedData),
        timestamp: new Date().toISOString(),
      },
    });

    // Return updated settings (exclude sensitive fields)
    const {
      id,
      name,
      slug,
      logo,
      timezone,
      currency,
      dateFormat,
      language,
      businessHours,
      createdAt,
      updatedAt,
    } = updatedSettings;

    res.json({
      id,
      name,
      slug,
      logo,
      timezone,
      currency,
      dateFormat,
      language,
      businessHours,
      createdAt,
      updatedAt,
    });
  } catch (error) {
    // Safely log error without causing circular reference issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof z.ZodError ? error.errors : undefined;
    console.error("Error updating organization settings:", errorMessage, errorDetails || '');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: "Failed to update organization settings" 
    });
  }
});

// Multer error handling middleware
const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: `File upload error: ${error.message}` });
  }
  
  if (error.message && error.message.includes('Only image files are allowed')) {
    return res.status(400).json({ 
      error: "Invalid file type. Only image files are allowed." 
    });
  }
  
  next(error);
};

/**
 * POST /api/organizations/logo - Upload organization logo
 * Requirements: 94.1
 */
organizationRoutes.post("/api/organizations/logo", requireAuth, checkPermission("organizations", "edit"), (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);

    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded" 
      });
    }

    // Generate public URL for the uploaded logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update organization with new logo URL
    const updatedOrg = await storage.updateOrganizationLogo(orgId, logoUrl);

    // Log activity event for audit trail
    await storage.createActivityEvent({
      organizationId: orgId,
      entityType: "organization",
      entityId: orgId,
      actorId: userId,
      type: "updated",
      description: "Organization logo updated",
      metadata: {
        logoUrl,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      message: "Logo uploaded successfully",
      logoUrl,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        logo: updatedOrg.logo,
        updatedAt: updatedOrg.updatedAt,
      },
    });
  } catch (error) {
    // Safely log error without causing circular reference issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error uploading organization logo:", errorMessage);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const fs = await import('fs/promises');
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Failed to clean up uploaded file:", unlinkError instanceof Error ? unlinkError.message : String(unlinkError));
      }
    }

    if (error instanceof Error && error.message.includes('Only image files are allowed')) {
      return res.status(400).json({ 
        error: "Invalid file type. Only image files are allowed." 
      });
    }

    res.status(500).json({ 
      error: "Failed to upload organization logo" 
    });
  }
});

/**
 * DELETE /api/organizations/logo - Remove organization logo
 * Requirements: 94.1
 */
organizationRoutes.delete("/api/organizations/logo", requireAuth, checkPermission("organizations", "edit"), async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);

    // Get current organization to check for existing logo
    const currentOrg = await storage.getOrganizationSettings(orgId);
    
    if (currentOrg.logo) {
      // Delete the logo file from filesystem
      const fs = await import('fs/promises');
      const logoPath = path.join(process.cwd(), currentOrg.logo);
      
      try {
        await fs.unlink(logoPath);
      } catch (fileError) {
        console.error("Failed to delete logo file:", fileError instanceof Error ? fileError.message : String(fileError));
        // Continue even if file deletion fails
      }
    }

    // Remove logo URL from organization
    const updatedOrg = await storage.updateOrganizationLogo(orgId, '');

    // Log activity event for audit trail
    await storage.createActivityEvent({
      organizationId: orgId,
      entityType: "organization",
      entityId: orgId,
      actorId: userId,
      type: "updated",
      description: "Organization logo removed",
      metadata: {
        previousLogoUrl: currentOrg.logo,
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      message: "Logo removed successfully",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        logo: updatedOrg.logo,
        updatedAt: updatedOrg.updatedAt,
      },
    });
  } catch (error) {
    // Safely log error without causing circular reference issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error removing organization logo:", errorMessage);
    res.status(500).json({ 
      error: "Failed to remove organization logo" 
    });
  }
});
