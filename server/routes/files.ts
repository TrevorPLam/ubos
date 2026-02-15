// AI-META-BEGIN
// AI-META: Secure file serving routes with path traversal prevention
// OWNERSHIP: server/routes
// ENTRYPOINTS: server/routes.ts
// DEPENDENCIES: express, fs, path, file-storage service
// DANGER: Path traversal attacks, unauthorized file access
// CHANGE-SAFETY: Review changes carefully - analyze security implications
// TESTS: npm run test:backend file-serving
// AI-META-END

/**
 * Secure file serving routes implementing 2026 OWASP best practices.
 *
 * Features:
 * - Path traversal prevention
 * - Filename validation
 * - Organization-scoped access control
 * - Content-Type header setting
 * - File existence validation
 * - Error handling without information leakage
 *
 * Security Standards:
 * - OWASP File Upload Cheat Sheet 2026
 * - Path traversal prevention
 * - Secure filename validation
 * - Organization isolation
 */

import { Router } from "express";
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { 
  requireAuth, 
  getUserIdFromRequest, 
  getOrCreateOrg 
} from "../middleware/auth";
import { getSecureFilePath } from "../services/file-storage";

export const fileRoutes = Router();

/**
 * GET /uploads/:category/:orgId/:filename - Serve uploaded files securely
 * 
 * This endpoint serves uploaded files with comprehensive security validation:
 * - Validates filename format to prevent path traversal
 * - Ensures file is within expected directory structure
 * - Checks file existence before serving
 * - Sets appropriate Content-Type headers
 * - Implements organization-scoped access control
 */
fileRoutes.get("/uploads/:category/:orgId/:filename", requireAuth, async (req, res) => {
  try {
    const { category, orgId, filename } = req.params;
    const userId = getUserIdFromRequest(req)!;
    const userOrgId = await getOrCreateOrg(userId);

    // 2026 security: Validate organization access
    if (orgId !== userOrgId) {
      return res.status(403).json({ 
        error: "Access denied" 
      });
    }

    // 2026 security: Validate category
    const allowedCategories = ['image'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ 
        error: "Invalid file category" 
      });
    }

    // 2026 security: Get secure file path (validates filename and prevents traversal)
    const filePath = getSecureFilePath(category as any, orgId, filename);

    // Check if file exists
    try {
      await fsPromises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      // Log error for debugging but send generic 404 to client
      console.error(`File access error for ${filename}:`, error instanceof Error ? error.message : String(error));
      return res.status(404).send('File not found.');
    }

    // Set appropriate Content-Type header based on file extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.type(contentType);

    // Set cache headers for performance
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.set('ETag', `"${filename}-${Date.now()}"`);

    // Stream the file to the client for efficiency
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamErr) => {
      console.error('Error streaming file:', streamErr);
      if (!res.headersSent) {
        res.status(500).send('Error serving file.');
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    if (!res.headersSent) {
      if (error instanceof Error && error.message.includes('Invalid filename')) {
        return res.status(400).send('Invalid filename format.');
      }
      if (error instanceof Error && error.message.includes('Path traversal')) {
        return res.status(400).send('Invalid filename format.');
      }
      res.status(500).send('Error serving file.');
    }
  }
});

/**
 * GET /api/files/stats - Get file statistics for monitoring
 * Requires organization-level access
 */
fileRoutes.get("/api/files/stats", requireAuth, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);

    // Import here to avoid circular dependency
    const { fileStorageService } = await import("../services/file-storage");
    
    const stats = await fileStorageService.getFileStatistics(orgId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting file statistics:', error);
    res.status(500).json({ 
      error: "Failed to get file statistics" 
    });
  }
});
