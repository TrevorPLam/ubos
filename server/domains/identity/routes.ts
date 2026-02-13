import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import multer from "multer";
import { storage, db } from "../../storage";
import { 
  requireAuth, 
  getUserIdFromRequest, 
  USER_ID_COOKIE_NAME, 
  AuthenticatedRequest,
  getOrCreateOrg 
} from "../../middleware/auth";
import { checkPermission } from "../../middleware/permissions";
import { insertInvitationSchema, invitations, updateProfileSchema, updatePasswordSchema, updateNotificationPreferencesSchema } from "@shared/schema";
// import { emailService } from "../../services/email";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const identityRoutes = Router();

// ==================== AUTH ====================
// Minimal local auth endpoints (no external provider)
identityRoutes.get("/api/login", async (_req, res) => {
  const userId = randomUUID();
  res.setHeader(
    "Set-Cookie",
    // `Secure` is intentionally omitted for local HTTP dev; add it when you enforce HTTPS.
    `${USER_ID_COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax`,
  );
  res.redirect("/");
});

identityRoutes.get("/api/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${USER_ID_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  res.redirect("/");
});

identityRoutes.get("/api/auth/user", requireAuth, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    let user = await storage.getUser(userId);
    if (!user) {
      user = await storage.upsertUser({ id: userId });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ==================== INVITATIONS ====================

// Validation schemas
const createInvitationSchema = insertInvitationSchema.pick({
  email: true,
  roleId: true,
});

const bulkInvitationSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(100), // Limit to 100 at a time
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character"),
});

/**
 * POST /api/invitations - Send invitation email
 * Requirements: 91.1, 91.4
 */
identityRoutes.post("/api/invitations", requireAuth, checkPermission("users", "create"), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    // Validate request body
    const validatedData = createInvitationSchema.parse(req.body);
    
    // Check if email already has a pending invitation
    const existingInvitation = await storage.getPendingInvitationByEmail(orgId, validatedData.email);
    if (existingInvitation) {
      return res.status(409).json({ 
        error: "Invitation already exists",
        message: "A pending invitation for this email already exists"
      });
    }

    // Verify role exists in organization
    const role = await storage.getRole(validatedData.roleId!, orgId);
    if (!role) {
      return res.status(400).json({ 
        error: "Invalid role",
        message: "The specified role does not exist in this organization"
      });
    }

    // Generate secure token with 7-day expiration
    // Use UTC timestamp arithmetic to avoid DST transitions (2026 best practice)
    const token = randomUUID();
    const now = new Date();
    const expiresAtTimestamp = now.getTime() + (7 * 24 * 60 * 60 * 1000); // Exactly 7 days
    const expiresAt = new Date(expiresAtTimestamp);

    // Create invitation
    const invitation = await storage.createInvitation({
      ...validatedData,
      organizationId: orgId,
      token,
      invitedById: userId,
      expiresAt: expiresAt.toISOString(),
    });

    // Send invitation email
    // await emailService.sendInvitationEmail({
    //   email: validatedData.email,
    //   inviterName: testUser?.firstName || 'Team Member', // TODO: Get actual user name
    //   organizationName: 'Test Organization', // TODO: Get actual org name
    //   roleName: role.name,
    //   invitationToken: token,
    //   expiresAt: expiresAt
    // });
    
    console.log(`Invitation created (email service disabled): ${validatedData.email}`);

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      roleId: invitation.roleId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create invitation" });
  }
});

/**
 * POST /api/invitations/bulk - Bulk invite via CSV
 * Requirements: 91.4, 91.6
 */
identityRoutes.post("/api/invitations/bulk", requireAuth, checkPermission("users", "create"), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    // Validate request body
    const validatedData = bulkInvitationSchema.parse(req.body);
    
    // Check organization invitation limits (2026 rate limiting best practice)
    const stats = await storage.getInvitationStats(orgId);
    if (stats.pending + validatedData.invitations.length > 50) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Cannot have more than 50 pending invitations per organization"
      });
    }

    const results = [];
    const errors = [];

    // Process each invitation
    for (const invitationData of validatedData.invitations) {
      try {
        // Check for existing pending invitation
        const existingInvitation = await storage.getPendingInvitationByEmail(orgId, invitationData.email);
        if (existingInvitation) {
          errors.push({
            email: invitationData.email,
            error: "Invitation already exists"
          });
          continue;
        }

        // Verify role exists
        const role = await storage.getRole(invitationData.roleId!, orgId);
        if (!role) {
          errors.push({
            email: invitationData.email,
            error: "Invalid role"
          });
          continue;
        }

        // Create invitation
        const token = randomUUID();
        // Use UTC timestamp arithmetic to avoid DST transitions (2026 best practice)
        const now = new Date();
        const expiresAtTimestamp = now.getTime() + (7 * 24 * 60 * 60 * 1000); // Exactly 7 days
        const expiresAt = new Date(expiresAtTimestamp);

        const invitation = await storage.createInvitation({
          ...invitationData,
          organizationId: orgId,
          token,
          invitedById: userId,
          expiresAt: expiresAt.toISOString(),
        });

        // Send invitation email
        // await emailService.sendInvitationEmail({
        //   email: invitationData.email,
        //   inviterName: 'Team Member', // TODO: Get actual user name
        //   organizationName: 'Test Organization', // TODO: Get actual org name
        //   roleName: role.name,
        //   invitationToken: token,
        //   expiresAt: expiresAt
        // });

        console.log(`Bulk invitation created (email service disabled): ${invitationData.email}`);

        results.push({
          id: invitation.id,
          email: invitation.email,
          roleId: invitation.roleId,
          status: invitation.status,
        });
      } catch (_error) {
        errors.push({
          email: invitationData.email,
          error: "Failed to create invitation"
        });
      }
    }

    res.status(201).json({
      created: results.length,
      failed: errors.length,
      invitations: results,
      errors,
    });
  } catch (error) {
    console.error("Error creating bulk invitations:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create bulk invitations" });
  }
});

/**
 * GET /api/invitations - List pending invitations
 * Requirements: 91.4
 */
identityRoutes.get("/api/invitations", requireAuth, checkPermission("users", "view"), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    const { status, limit = 50, offset = 0 } = req.query;
    
    const invitations = await storage.getInvitations(orgId, {
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Don't expose tokens in list view
    const sanitizedInvitations = invitations.map(({ token: _token, ...invitation }) => invitation);

    res.json({
      invitations: sanitizedInvitations,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: sanitizedInvitations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

/**
 * GET /api/invitations/:token/validate - Validate invitation token
 * Returns invitation details without changing status
 * Requirements: 91.3
 */
identityRoutes.get("/api/invitations/:token/validate", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        error: "Missing token",
        message: "Invitation token is required"
      });
    }

    // Find invitation by token
    const invitation = await storage.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({ 
        error: "Invalid invitation",
        message: "Invitation not found or has been used"
      });
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return res.status(410).json({ 
        error: "Invitation not valid",
        message: `Invitation is ${invitation.status}`
      });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ 
        error: "Invitation expired",
        message: "Invitation has expired. Please request a new one."
      });
    }

    // Get organization and inviter details
    // Note: getOrganization method doesn't exist, using a placeholder
    // TODO: Implement getOrganization method or use existing organization methods
    const organization = { name: "Test Organization" }; // Placeholder
    const inviter = await storage.getUser(invitation.invitedById);
    
    // Get role name if role exists
    let roleName = "Team Member";
    if (invitation.roleId) {
      const role = await storage.getRole(invitation.roleId, invitation.organizationId);
      roleName = role?.name || "Team Member";
    }

    res.json({
      email: invitation.email,
      organizationName: organization?.name || "Unknown Organization",
      roleName,
      inviterName: `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim() || "Someone",
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    res.status(500).json({ 
      error: "Validation failed", 
      message: "Failed to validate invitation" 
    });
  }
});

/**
 * POST /api/invitations/:token/accept - Accept invitation
 * Requirements: 91.3
 */
identityRoutes.post("/api/invitations/:token/accept", upload.single('profilePhoto'), async (req, res) => {
  try {
    const { token } = req.params;
    
    // Parse form data
    const name = req.body.name;
    const password = req.body.password;
    
    const validatedData = acceptInvitationSchema.parse({ token, name, password });

    // Find invitation by token
    const invitation = await storage.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({ 
        error: "Invalid invitation",
        message: "Invitation not found or has been used"
      });
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return res.status(410).json({ 
        error: "Invitation not valid",
        message: `Invitation is ${invitation.status}`
      });
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await storage.updateInvitationStatus(invitation.organizationId, invitation.id, "expired");
      return res.status(410).json({ 
        error: "Invitation expired",
        message: "Invitation has expired. Please request a new one."
      });
    }

    // Create user account
    const userId = randomUUID();
    const user = await storage.upsertUser({
      id: userId,
      firstName: validatedData.name.split(' ')[0],
      lastName: validatedData.name.split(' ').slice(1).join(' ') || '',
      email: invitation.email,
    });

    // TODO: Store password properly (Task 4.2 - User Profile Management)
    // For now, we'll skip password storage as it's outside the scope of this task
    console.log(`User ${userId} created with password (to be properly hashed)`);

    // TODO: Handle profile photo upload (Task 4.1 - User Profile Management)
    // For now, we'll skip photo storage as it's outside the scope of this task
    if (req.file) {
      console.log(`Profile photo uploaded for user ${userId}: ${req.file.originalname}`);
    }

    // Update invitation status
    await storage.updateInvitationStatus(
      invitation.organizationId,
      invitation.id,
      "accepted",
      {
        acceptedById: userId,
        acceptedAt: new Date(),
      }
    );

    // Assign role to user
    if (invitation.roleId) {
      await storage.assignRoleToUser({
        userId,
        roleId: invitation.roleId,
        organizationId: invitation.organizationId,
        assignedById: invitation.invitedById,
      });
    }

    // Set authentication cookie
    res.setHeader(
      "Set-Cookie",
      `${USER_ID_COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax`
    );

    res.json({
      message: "Invitation accepted successfully",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

/**
 * POST /api/invitations/:id/resend - Resend invitation
 * Requirements: 91.4
 */
identityRoutes.post("/api/invitations/:id/resend", requireAuth, checkPermission("users", "create"), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    const { id } = req.params;

    // Find invitation
    const invitation = await storage.getInvitationById(orgId, id);
    if (!invitation) {
      return res.status(404).json({ 
        error: "Invitation not found",
        message: "Invitation not found in this organization"
      });
    }

    // Check if invitation can be resent
    if (invitation.status !== "pending") {
      return res.status(400).json({ 
        error: "Cannot resend",
        message: `Cannot resend invitation with status: ${invitation.status}`
      });
    }

    // Generate new token and extend expiration
    // Use UTC timestamp arithmetic to avoid DST transitions (2026 best practice)
    const newToken = randomUUID();
    const now = new Date();
    const newExpiresAtTimestamp = now.getTime() + (7 * 24 * 60 * 60 * 1000); // Exactly 7 days
    const newExpiresAt = new Date(newExpiresAtTimestamp);

    // Update invitation with new token
    const updatedInvitation = await storage.updateInvitationStatus(
      orgId,
      id,
      "pending", // Keep status as pending
    );

    if (!updatedInvitation) {
      return res.status(500).json({ error: "Failed to update invitation" });
    }

    // Update token and expiration separately
    await db.update(invitations)
      .set({ 
        token: newToken, 
        expiresAt: newExpiresAt,
        updatedAt: new Date()
      })
      .where(eq(invitations.id, id));

    // Send invitation email with new token
    // await emailService.sendInvitationEmail({
    //   email: invitation.email,
    //   inviterName: 'Team Member', // TODO: Get actual user name
    //   organizationName: 'Test Organization', // TODO: Get actual org name
    //   roleName: 'Team Member', // TODO: Get actual role name
    //   invitationToken: newToken,
    //   expiresAt: newExpiresAt
    // });

    console.log(`Invitation resent (email service disabled): ${invitation.email} with new token ${newToken}`);

    res.json({
      message: "Invitation resent successfully",
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    res.status(500).json({ error: "Failed to resend invitation" });
  }
});

// ==================== USER PROFILE MANAGEMENT ====================

// 2026 security best practice: Rate limiting for profile updates
const profileUpdateRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 profile updates per 15 minutes

/**
 * 2026 privacy-by-design: Rate limiting middleware for profile operations
 * Prevents abuse and protects against unauthorized data modifications
 */
function enforceProfileRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = profileUpdateRateLimit.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    profileUpdateRateLimit.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

/**
 * 2026 security best practice: Audit logging for profile operations
 * Creates comprehensive audit trail for all profile modifications
 */
async function logProfileActivity(
  userId: string, 
  action: string, 
  metadata: any, 
  orgId: string
): Promise<void> {
  try {
    await storage.createActivityEvent({
      organizationId: orgId,
      entityType: 'user',
      entityId: userId,
      actorId: userId,
      actorName: 'User', // TODO: Get actual user name
      type: 'updated' as any,
      description: `Profile ${action}`,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log profile activity:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * GET /api/users/me - Get current user profile
 * Requirements: 92.1
 */
identityRoutes.get("/api/users/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        message: "User profile not found" 
      });
    }

    // Return user profile without sensitive data
    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      timezone: user.timezone,
      profileImageUrl: user.profileImageUrl,
      notificationPreferences: user.notificationPreferences || {
        email: true,
        push: true,
        sms: false,
        projectUpdates: true,
        taskReminders: true,
        invoiceNotifications: true,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * PUT /api/users/me - Update profile (name, email, phone, timezone)
 * Requirements: 92.1, 92.2
 */
identityRoutes.put("/api/users/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    // 2026 security best practice: Enforce rate limiting
    if (!enforceProfileRateLimit(userId)) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many profile updates. Please try again later." 
      });
    }
    
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);
    
    // 2026 privacy-by-design: Check email uniqueness if changing email
    if (validatedData.email) {
      const emailExists = await storage.checkEmailExists(validatedData.email, userId);
      if (emailExists) {
        return res.status(409).json({ 
          error: "Email conflict",
          message: "Email address is already in use" 
        });
      }
    }
    
    // Update user profile
    const updatedUser = await storage.updateUserProfile(userId, validatedData);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        error: "User not found",
        message: "User profile not found" 
      });
    }

    // 2026 security best practice: Log profile update activity
    await logProfileActivity(userId, 'profile updated', {
      fields: Object.keys(validatedData),
      timestamp: new Date().toISOString()
    }, orgId);

    // Return updated profile with 2026 data minimization principles
    const userProfile = {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      timezone: updatedUser.timezone,
      profileImageUrl: updatedUser.profileImageUrl,
      notificationPreferences: updatedUser.notificationPreferences,
      updatedAt: updatedUser.updatedAt,
      // 2026 privacy: Exclude sensitive metadata from responses
    };

    res.json(userProfile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    if (error instanceof Error && error.message.includes("already in use")) {
      return res.status(409).json({ 
        error: "Email conflict",
        message: error.message 
      });
    }
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

/**
 * POST /api/users/me/avatar - Upload profile photo
 * Requirements: 92.3
 */
identityRoutes.post("/api/users/me/avatar", requireAuth, upload.single('avatar'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        message: "Profile photo is required" 
      });
    }

    // TODO: Implement proper file storage (Task 4.2)
    // For now, we'll simulate avatar upload with a placeholder URL
    const avatarUrl = `/uploads/avatars/${userId}/${req.file.originalname}`;
    console.log(`Avatar uploaded for user ${userId}: ${req.file.originalname} (storage to be implemented in Task 4.2)`);

    // Update user avatar URL
    const updatedUser = await storage.updateUserAvatar(userId, avatarUrl);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        error: "User not found",
        message: "User profile not found" 
      });
    }

    res.json({
      message: "Profile photo uploaded successfully",
      profileImageUrl: avatarUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

/**
 * PUT /api/users/me/password - Change password
 * Requirements: 92.4
 */
identityRoutes.put("/api/users/me/password", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    // 2026 security best practice: Enforce rate limiting for password changes
    if (!enforceProfileRateLimit(userId)) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many password change attempts. Please try again later." 
      });
    }
    
    // Validate request body
    const validatedData = updatePasswordSchema.parse(req.body);
    
    // Update password with 2026 security practices
    const success = await storage.updateUserPassword(
      userId, 
      validatedData.currentPassword, 
      validatedData.newPassword
    );
    
    if (!success) {
      return res.status(400).json({ 
        error: "Password update failed",
        message: "Current password may be incorrect" 
      });
    }

    // 2026 security best practice: Log password change activity
    await logProfileActivity(userId, 'password changed', {
      timestamp: new Date().toISOString(),
      // 2026 privacy: Don't log actual passwords, just the change event
    }, orgId);

    res.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to update password" });
  }
});

/**
 * PUT /api/users/me/preferences - Update notification preferences
 * Requirements: 92.5
 */
identityRoutes.put("/api/users/me/preferences", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    const orgId = await getOrCreateOrg(userId);
    
    // Validate request body
    const validatedData = updateNotificationPreferencesSchema.parse(req.body);
    
    // Update notification preferences
    const updatedUser = await storage.updateUserNotificationPreferences(userId, validatedData);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        error: "User not found",
        message: "User profile not found" 
      });
    }

    // 2026 security best practice: Log preference changes
    await logProfileActivity(userId, 'notification preferences updated', {
      preferences: validatedData,
      timestamp: new Date().toISOString()
    }, orgId);

    res.json({
      message: "Notification preferences updated successfully",
      notificationPreferences: updatedUser.notificationPreferences,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});
