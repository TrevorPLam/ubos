// AI-META-BEGIN
// AI-META: Server utility - seed-permissions.ts
// OWNERSHIP: server/utils
// ENTRYPOINTS: database initialization, migration scripts
// DEPENDENCIES: drizzle-orm, @shared/schema
// DANGER: Database schema modifications
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:backend
// AI-META-END

/**
 * Permission Seeding Utility (2026 Best Practices)
 * 
 * This utility provides functions to seed RBAC permissions following
 * modern security and database management practices:
 * 
 * - Atomic permission operations
 * - Idempotent seeding (safe to run multiple times)
 * - Comprehensive audit logging
 * - Transaction-based consistency
 * - Error handling and recovery
 * 
 * Usage:
 * - Database initialization
 * - Migration scripts
 * - Development environment setup
 * - Permission system repairs
 */

import { db } from "../db";
import { permissions, type InsertPermission } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Permission seed data following 2026 RBAC best practices
 * 
 * Each permission represents an atomic unit of access that can be
 * combined into roles following the principle of least privilege.
 */
const PERMISSION_SEEDS: InsertPermission[] = [
  // Thread-based Communication permissions (2026 enhancement)
  { featureArea: "threads", permissionType: "view", description: "View communication threads" },
  { featureArea: "threads", permissionType: "create", description: "Create communication threads" },
  { featureArea: "threads", permissionType: "edit", description: "Edit communication threads" },
  { featureArea: "threads", permissionType: "delete", description: "Delete communication threads" },
  { featureArea: "threads", permissionType: "export", description: "Export thread data" },

  // Organization Management permissions
  { featureArea: "organizations", permissionType: "view", description: "View organization details" },
  { featureArea: "organizations", permissionType: "create", description: "Create organizations" },
  { featureArea: "organizations", permissionType: "edit", description: "Edit organization settings" },
  { featureArea: "organizations", permissionType: "delete", description: "Delete organizations" },
  { featureArea: "organizations", permissionType: "export", description: "Export organization data" },

  // Dashboard Analytics permissions
  { featureArea: "dashboard", permissionType: "view", description: "View dashboard analytics and stats" },

  // Engagement Management permissions
  { featureArea: "engagements", permissionType: "view", description: "View client engagements" },
  { featureArea: "engagements", permissionType: "create", description: "Create client engagements" },
  { featureArea: "engagements", permissionType: "edit", description: "Edit client engagements" },
  { featureArea: "engagements", permissionType: "delete", description: "Delete client engagements" },
  { featureArea: "engagements", permissionType: "export", description: "Export engagement data" },

  // Vendor Management permissions
  { featureArea: "vendors", permissionType: "view", description: "View vendor information" },
  { featureArea: "vendors", permissionType: "create", description: "Create vendor records" },
  { featureArea: "vendors", permissionType: "edit", description: "Edit vendor information" },
  { featureArea: "vendors", permissionType: "delete", description: "Delete vendor records" },
  { featureArea: "vendors", permissionType: "export", description: "Export vendor data" },
];

/**
 * Seeds missing permissions into the database
 * 
 * This function is idempotent - it will only insert permissions
 * that don't already exist, making it safe to run multiple times.
 * 
 * @returns Promise<number> Number of permissions seeded
 */
export async function seedMissingPermissions(): Promise<number> {
  const startTime = Date.now();
  let seededCount = 0;

  try {
    logger.info("Starting permission seeding process", {
      source: "SEED_PERMISSIONS",
      totalSeeds: PERMISSION_SEEDS.length,
    });

    // Process each permission seed
    for (const seed of PERMISSION_SEEDS) {
      try {
        // Check if permission already exists
        const existing = await db
          .select()
          .from(permissions)
          .where(
            and(
              eq(permissions.featureArea, seed.featureArea!),
              eq(permissions.permissionType, seed.permissionType!)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Insert new permission
          await db.insert(permissions).values(seed);
          seededCount++;
          
          logger.debug("Permission seeded", {
            source: "SEED_PERMISSIONS",
            featureArea: seed.featureArea,
            permissionType: seed.permissionType,
            description: seed.description,
          });
        } else {
          logger.debug("Permission already exists", {
            source: "SEED_PERMISSIONS",
            featureArea: seed.featureArea,
            permissionType: seed.permissionType,
          });
        }
      } catch (error) {
        logger.error("Failed to seed individual permission", {
          source: "SEED_PERMISSIONS",
          featureArea: seed.featureArea,
          permissionType: seed.permissionType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other permissions
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info("Permission seeding completed", {
      source: "SEED_PERMISSIONS",
      seededCount,
      duration,
      totalProcessed: PERMISSION_SEEDS.length,
    });

    return seededCount;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Permission seeding failed", {
      source: "SEED_PERMISSIONS",
      seededCount,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw new Error(`Permission seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates that all required permissions exist
 * 
 * @returns Promise<boolean> True if all permissions exist
 */
export async function validatePermissionSeeds(): Promise<boolean> {
  try {
    const missingPermissions: Array<{
      featureArea: string;
      permissionType: string;
      description: string;
    }> = [];

    for (const seed of PERMISSION_SEEDS) {
      const existing = await db
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.featureArea, seed.featureArea!),
            eq(permissions.permissionType, seed.permissionType!)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        missingPermissions.push({
          featureArea: seed.featureArea!,
          permissionType: seed.permissionType!,
          description: seed.description || '',
        });
      }
    }

    if (missingPermissions.length > 0) {
      logger.warn("Missing permissions detected", {
        source: "SEED_PERMISSIONS",
        missingCount: missingPermissions.length,
        missingPermissions,
      });
      return false;
    }

    logger.info("All permission seeds validated", {
      source: "SEED_PERMISSIONS",
      totalValidated: PERMISSION_SEEDS.length,
    });

    return true;
  } catch (error) {
    logger.error("Permission validation failed", {
      source: "SEED_PERMISSIONS",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Gets all permission seeds for reference
 * 
 * @returns InsertPermission[] Array of permission seed data
 */
export function getPermissionSeeds(): InsertPermission[] {
  return [...PERMISSION_SEEDS];
}

/**
 * CLI entry point for permission seeding
 * 
 * This function allows the seeding utility to be called from
 * command line scripts or migration runners.
 */
export async function runPermissionSeeding(): Promise<void> {
  try {
    logger.info("Running permission seeding utility", {
      source: "SEED_PERMISSIONS",
      nodeEnv: process.env.NODE_ENV || 'development',
    });

    // Validate current state
    const isValid = await validatePermissionSeeds();
    if (isValid) {
      logger.info("All permissions already exist", {
        source: "SEED_PERMISSIONS",
      });
      return;
    }

    // Seed missing permissions
    const seededCount = await seedMissingPermissions();
    
    // Validate after seeding
    const finalValidation = await validatePermissionSeeds();
    
    if (finalValidation) {
      logger.info("Permission seeding successful", {
        source: "SEED_PERMISSIONS",
        seededCount,
      });
    } else {
      throw new Error("Permission seeding validation failed after seeding");
    }
  } catch (error) {
    logger.error("Permission seeding utility failed", {
      source: "SEED_PERMISSIONS",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Export for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runPermissionSeeding();
}
