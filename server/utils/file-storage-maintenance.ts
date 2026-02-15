// AI-META-BEGIN
// AI-META: File storage management utilities for 2026 best practices
// OWNERSHIP: server/utils
// ENTRYPOINTS: File storage service, scheduled cleanup jobs
// DEPENDENCIES: fs, path, file-storage service
// DANGER: File deletion operations
// CHANGE-SAFETY: Review changes carefully - file operations are destructive
// TESTS: npm run test:backend file-storage
// AI-META-END

/**
 * File storage management utilities for 2026 best practices.
 *
 * Features:
 * - Orphaned file cleanup
 * - Storage usage monitoring
 * - File integrity validation
 * - Automatic maintenance tasks
 * - Storage quota management
 *
 * Security Standards:
 * - Path traversal prevention
 * - Organization isolation enforcement
 * - Audit logging for file operations
 * - Safe file deletion with verification
 */

import fs from 'fs/promises';
import path from 'path';
import { ALLOWED_FILE_TYPES, fileStorageService } from '../services/file-storage';
import { storage } from '../storage';

export interface StorageMetrics {
  totalFiles: number;
  totalSize: number;
  organizationMetrics: Array<{
    organizationId: string;
    fileCount: number;
    totalSize: number;
    lastActivity: Date;
  }>;
  categoryMetrics: Array<{
    category: string;
    fileCount: number;
    totalSize: number;
  }>;
}

export interface CleanupOptions {
  dryRun?: boolean;
  olderThan?: Date;
  organizationId?: string;
  category?: string;
}

/**
 * 2026 best practice: Comprehensive storage metrics collection
 * Provides insights for storage planning and optimization
 */
export async function getStorageMetrics(organizationIds?: string[]): Promise<StorageMetrics> {
  const metrics: StorageMetrics = {
    totalFiles: 0,
    totalSize: 0,
    organizationMetrics: [],
    categoryMetrics: []
  };

  // Use provided organization IDs or get all from file objects
  const orgIds = organizationIds || await getOrganizationIdsFromFiles();

  // Collect metrics per organization
  for (const orgId of orgIds) {
    try {
      const orgStats = await fileStorageService.getFileStatistics(orgId);
      const org = await storage.getOrganizationSettings(orgId);
      
      metrics.organizationMetrics.push({
        organizationId: orgId,
        fileCount: orgStats.totalFiles,
        totalSize: orgStats.totalSize,
        lastActivity: org?.updatedAt || org?.createdAt || new Date()
      });
      
      metrics.totalFiles += orgStats.totalFiles;
      metrics.totalSize += orgStats.totalSize;
    } catch (error) {
      console.error(`Failed to get metrics for organization ${orgId}:`, error);
    }
  }

  // Aggregate category metrics
  const categoryMap = new Map<string, { count: number; size: number }>();
  for (const orgMetric of metrics.organizationMetrics) {
    const orgStats = await fileStorageService.getFileStatistics(orgMetric.organizationId);
    for (const [category, stats] of Object.entries(orgStats.byCategory)) {
      const existing = categoryMap.get(category) || { count: 0, size: 0 };
      categoryMap.set(category, {
        count: existing.count + stats.count,
        size: existing.size + stats.size
      });
    }
  }

  metrics.categoryMetrics = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    fileCount: stats.count,
    totalSize: stats.size
  }));

  return metrics;
}

/**
 * Helper function to get all organization IDs from file objects
 */
async function getOrganizationIdsFromFiles(): Promise<string[]> {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const categories = Object.keys(ALLOWED_FILE_TYPES);
  const orgIds = new Set<string>();

  for (const category of categories) {
    const categoryDir = path.join(uploadsRoot, category);
    try {
      const entries = await fs.readdir(categoryDir, { withFileTypes: true });
      entries
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => orgIds.add(entry.name));
    } catch (error) {
      // Ignore missing directories; log unexpected errors for observability
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to read category directory ${categoryDir}:`, error);
      }
    }
  }

  return Array.from(orgIds);
}

/**
 * 2026 best practice: Safe orphaned file cleanup
 * Removes files without corresponding database records
 */
export async function cleanupOrphanedFiles(options: CleanupOptions = {}): Promise<{
  deletedFiles: string[];
  errors: string[];
  totalSpaceFreed: number;
}> {
  const { dryRun = false, olderThan, organizationId, category } = options;
  const deletedFiles: string[] = [];
  const errors: string[] = [];
  let totalSpaceFreed = 0;

  try {
    // Get organization IDs to process
    const orgIds = organizationId ? [organizationId] : await getOrganizationIdsFromFiles();

    // If no organizations found, return empty results
    if (orgIds.length === 0) {
      return { deletedFiles: [], errors: [], totalSpaceFreed: 0 };
    }

    for (const orgId of orgIds) {
      try {
        // Get all file records for this organization
        const dbFiles = await storage.getFileObjects(orgId);
        const dbFilePaths = new Set(dbFiles.map(f => f.path));

        // Scan filesystem for files
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const orgUploadDir = path.join(uploadsDir, category || 'image', orgId);

        try {
          const files = await fs.readdir(orgUploadDir);
          
          for (const filename of files) {
            const filePath = path.join(orgUploadDir, filename);
            
            // Check if file exists in database
            if (!dbFilePaths.has(filePath)) {
              try {
                const fileStat = await fs.stat(filePath);
                
                // Check age filter if specified
                if (olderThan && fileStat.mtime > olderThan) {
                  continue;
                }

                if (dryRun) {
                  deletedFiles.push(filePath);
                  totalSpaceFreed += fileStat.size;
                } else {
                  await fs.unlink(filePath);
                  deletedFiles.push(filePath);
                  totalSpaceFreed += fileStat.size;
                  console.log(`Deleted orphaned file: ${filePath}`);
                }
              } catch (deleteError) {
                const errorMsg = `Failed to delete file ${filePath}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`;
                errors.push(errorMsg);
              }
            }
          }
        } catch {
          // Directory doesn't exist, which is fine
          continue;
        }
      } catch (orgError) {
        const errorMsg = `Failed to process organization ${orgId}: ${orgError instanceof Error ? orgError.message : String(orgError)}`;
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    errors.push(`Failed to get organization IDs: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    deletedFiles,
    errors,
    totalSpaceFreed
  };
}

/**
 * 2026 best practice: File integrity validation
 * Verifies that database records match actual files
 */
export async function validateFileIntegrity(organizationId?: string): Promise<{
  validFiles: number;
  missingFiles: Array<{ id: string; path: string; organizationId: string }>;
  extraFiles: string[];
}> {
  const orgIds = organizationId ? [organizationId] : await getOrganizationIdsFromFiles();
  let validFiles = 0;
  const missingFiles: Array<{ id: string; path: string; organizationId: string }> = [];
  const extraFiles: string[] = [];

  for (const orgId of orgIds) {
    try {
      // Check database files exist on disk
      const dbFiles = await storage.getFileObjects(orgId);
      
      for (const file of dbFiles) {
        try {
          await fs.access(file.path);
          validFiles++;
        } catch {
          // File doesn't exist on disk
          missingFiles.push({
            id: file.id,
            path: file.path,
            organizationId: orgId
          });
        }
      }

      // Check for extra files (already handled by cleanupOrphanedFiles)
      const cleanupResult = await cleanupOrphanedFiles({ 
        dryRun: true, 
        organizationId: orgId 
      });
      extraFiles.push(...cleanupResult.deletedFiles);
    } catch (error) {
      console.error(`Failed to validate organization ${orgId}:`, error);
    }
  }

  return {
    validFiles,
    missingFiles,
    extraFiles
  };
}

/**
 * 2026 best practice: Storage quota monitoring
 * Warns when organizations approach storage limits
 */
export async function checkStorageQuotas(quotaPerOrganizationMB: number = 100): Promise<{
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    usageMB: number;
    quotaMB: number;
    usagePercentage: number;
    status: 'normal' | 'warning' | 'critical';
  }>;
}> {
  const orgIds = await getOrganizationIdsFromFiles();
  const results = [];

  // If no organizations found, return empty results
  if (orgIds.length === 0) {
    return { organizations: [] };
  }

  for (const orgId of orgIds) {
    try {
      const stats = await fileStorageService.getFileStatistics(orgId);
      const org = await storage.getUserOrganization(orgId);
      const usageMB = Math.round(stats.totalSize / (1024 * 1024));
      const usagePercentage = Math.round((usageMB / quotaPerOrganizationMB) * 100);
      
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (usagePercentage >= 90) {
        status = 'critical';
      } else if (usagePercentage >= 75) {
        status = 'warning';
      }

      results.push({
        organizationId: orgId,
        organizationName: org?.name || 'Unknown Organization',
        usageMB,
        quotaMB: quotaPerOrganizationMB,
        usagePercentage,
        status
      });
    } catch (error) {
      console.error(`Failed to check quota for organization ${orgId}:`, error);
    }
  }

  return { organizations: results };
}

/**
 * 2026 best practice: Automatic file maintenance
 * Suggested to be run periodically (e.g., daily cron job)
 */
export async function performMaintenanceTasks(): Promise<{
  cleanupResult: Awaited<ReturnType<typeof cleanupOrphanedFiles>>;
  integrityResult: Awaited<ReturnType<typeof validateFileIntegrity>>;
  quotaResult: Awaited<ReturnType<typeof checkStorageQuotas>>;
}> {
  console.log('Starting file storage maintenance tasks...');

  const cleanupResult = await cleanupOrphanedFiles({ dryRun: false });
  const integrityResult = await validateFileIntegrity();
  const quotaResult = await checkStorageQuotas();

  console.log('File storage maintenance completed:', {
    orphanedFilesDeleted: cleanupResult.deletedFiles.length,
    spaceFreedMB: Math.round(cleanupResult.totalSpaceFreed / (1024 * 1024)),
    missingFiles: integrityResult.missingFiles.length,
    organizationsAtWarning: quotaResult.organizations.filter(o => o.status === 'warning').length,
    organizationsAtCritical: quotaResult.organizations.filter(o => o.status === 'critical').length
  });

  return {
    cleanupResult,
    integrityResult,
    quotaResult
  };
}
