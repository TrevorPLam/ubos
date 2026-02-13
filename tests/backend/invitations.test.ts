import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../server/index";
import { storage } from "../../server/storage";
import { db } from "../../server/db";
import { invitations, roles, users } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Invitation API Endpoints", () => {
  let testOrg: any;
  let testUser: any;
  let testRole: any;
  let authCookie: string;

  beforeEach(async () => {
    // Create test organization
    testOrg = await storage.createOrganization({
      name: "Test Org",
      slug: "test-org-" + Math.random().toString(36).substring(7),
    }, "test-user-id");

    // Create test user
    testUser = await storage.upsertUser({
      id: "test-user-" + Math.random().toString(36).substring(7),
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });

    // Create test role
    testRole = await storage.createRole(testOrg.id, {
      name: "Test Role",
      description: "A test role",
    });

    // Get auth cookie
    const loginResponse = await request(app)
      .get("/api/login")
      .expect(302);

    authCookie = loginResponse.headers["set-cookie"]?.[0] || "";
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(invitations).where(eq(invitations.organizationId, testOrg.id));
    await db.delete(users).where(eq(users.id, testUser.id));
    await db.delete(roles).where(eq(roles.id, testRole.id));
    // Note: Organization cleanup would require additional implementation
  });

  describe("POST /api/invitations", () => {
    it("should create a new invitation", async () => {
      const invitationData = {
        email: "invitee@example.com",
        roleId: testRole.id,
      };

      const response = await request(app)
        .post("/api/invitations")
        .set("Cookie", authCookie)
        .send(invitationData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: invitationData.email,
        roleId: testRole.id,
        status: "pending",
        expiresAt: expect.any(String),
        createdAt: expect.any(String),
      });

      // Verify invitation was stored in database
      const storedInvitation = await storage.getInvitationByToken(response.body.token);
      expect(storedInvitation).toBeTruthy();
      expect(storedInvitation?.email).toBe(invitationData.email);
    });

    it("should reject duplicate email invitations", async () => {
      const invitationData = {
        email: "duplicate@example.com",
        roleId: testRole.id,
      };

      // Create first invitation
      await request(app)
        .post("/api/invitations")
        .set("Cookie", authCookie)
        .send(invitationData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post("/api/invitations")
        .set("Cookie", authCookie)
        .send(invitationData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: "Invitation already exists",
        message: expect.stringContaining("already exists"),
      });
    });

    it("should reject invalid role ID", async () => {
      const invitationData = {
        email: "invalid@example.com",
        roleId: "invalid-role-id",
      };

      const response = await request(app)
        .post("/api/invitations")
        .set("Cookie", authCookie)
        .send(invitationData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Invalid role",
        message: expect.stringContaining("does not exist"),
      });
    });

    it("should require authentication", async () => {
      const invitationData = {
        email: "noauth@example.com",
        roleId: testRole.id,
      };

      await request(app)
        .post("/api/invitations")
        .send(invitationData)
        .expect(401);
    });
  });

  describe("POST /api/invitations/bulk", () => {
    it("should create multiple invitations", async () => {
      const bulkData = {
        invitations: [
          { email: "bulk1@example.com", roleId: testRole.id },
          { email: "bulk2@example.com", roleId: testRole.id },
          { email: "bulk3@example.com", roleId: testRole.id },
        ],
      };

      const response = await request(app)
        .post("/api/invitations/bulk")
        .set("Cookie", authCookie)
        .send(bulkData)
        .expect(201);

      expect(response.body).toMatchObject({
        created: 3,
        failed: 0,
        invitations: expect.arrayContaining([
          expect.objectContaining({ email: "bulk1@example.com" }),
          expect.objectContaining({ email: "bulk2@example.com" }),
          expect.objectContaining({ email: "bulk3@example.com" }),
        ]),
        errors: [],
      });
    });

    it("should handle partial failures in bulk creation", async () => {
      const bulkData = {
        invitations: [
          { email: "valid@example.com", roleId: testRole.id },
          { email: "invalid@example.com", roleId: "invalid-role" },
          { email: "valid2@example.com", roleId: testRole.id },
        ],
      };

      const response = await request(app)
        .post("/api/invitations/bulk")
        .set("Cookie", authCookie)
        .send(bulkData)
        .expect(201);

      expect(response.body).toMatchObject({
        created: 2,
        failed: 1,
        errors: expect.arrayContaining([
          expect.objectContaining({
            email: "invalid@example.com",
            error: "Invalid role",
          }),
        ]),
      });
    });

    it("should enforce rate limits", async () => {
      // Create 45 invitations first (leaving room for 5 more)
      const existingInvitations = Array.from({ length: 45 }, (_, i) => ({
        email: `existing${i}@example.com`,
        roleId: testRole.id,
      }));

      // Create existing invitations
      for (const invitation of existingInvitations) {
        await storage.createInvitation({
          ...invitation,
          organizationId: testOrg.id,
          token: `token-${Math.random()}`,
          invitedById: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Try to create 10 more (should exceed limit of 50)
      const bulkData = {
        invitations: Array.from({ length: 10 }, (_, i) => ({
          email: `new${i}@example.com`,
          roleId: testRole.id,
        })),
      };

      const response = await request(app)
        .post("/api/invitations/bulk")
        .set("Cookie", authCookie)
        .send(bulkData)
        .expect(429);

      expect(response.body).toMatchObject({
        error: "Rate limit exceeded",
        message: expect.stringContaining("50 pending invitations"),
      });
    });
  });

  describe("GET /api/invitations", () => {
    beforeEach(async () => {
      // Create test invitations
      await storage.createInvitation({
        organizationId: testOrg.id,
        email: "list1@example.com",
        roleId: testRole.id,
        token: "token1",
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await storage.createInvitation({
        organizationId: testOrg.id,
        email: "list2@example.com",
        roleId: testRole.id,
        token: "token2",
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    it("should list invitations", async () => {
      const response = await request(app)
        .get("/api/invitations")
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        invitations: expect.arrayContaining([
          expect.objectContaining({
            email: "list1@example.com",
            status: "pending",
          }),
          expect.objectContaining({
            email: "list2@example.com",
            status: "pending",
          }),
        ]),
        pagination: {
          limit: 50,
          offset: 0,
          total: expect.any(Number),
        },
      });

      // Ensure tokens are not exposed
      response.body.invitations.forEach((invitation: any) => {
        expect(invitation.token).toBeUndefined();
      });
    });

    it("should filter by status", async () => {
      const response = await request(app)
        .get("/api/invitations?status=pending")
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body.invitations).toHaveLength(2);
      response.body.invitations.forEach((invitation: any) => {
        expect(invitation.status).toBe("pending");
      });
    });

    it("should require authentication", async () => {
      await request(app)
        .get("/api/invitations")
        .expect(401);
    });
  });

  describe("POST /api/invitations/:token/accept", () => {
    let testInvitation: any;

    beforeEach(async () => {
      testInvitation = await storage.createInvitation({
        organizationId: testOrg.id,
        email: "accept@example.com",
        roleId: testRole.id,
        token: "accept-token",
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    it("should accept invitation and create user", async () => {
      const acceptData = {
        token: "accept-token",
        password: "SecurePass123!",
        name: "New User",
      };

      const response = await request(app)
        .post(`/api/invitations/${testInvitation.token}/accept`)
        .send(acceptData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: "Invitation accepted successfully",
        user: {
          id: expect.any(String),
          firstName: "New",
          lastName: "User",
          email: "accept@example.com",
        },
      });

      // Verify invitation status updated
      const updatedInvitation = await storage.getInvitationById(testOrg.id, testInvitation.id);
      expect(updatedInvitation?.status).toBe("accepted");

      // Verify user role assignment
      const userRoles = await storage.getUserRoles(response.body.user.id, testOrg.id);
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].id).toBe(testRole.id);
    });

    it("should reject invalid token", async () => {
      const acceptData = {
        token: "invalid-token",
        password: "SecurePass123!",
        name: "New User",
      };

      const response = await request(app)
        .post("/api/invitations/invalid-token/accept")
        .send(acceptData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: "Invalid invitation",
        message: expect.stringContaining("not found"),
      });
    });

    it("should reject expired invitation", async () => {
      // Create expired invitation
      const expiredInvitation = await storage.createInvitation({
        organizationId: testOrg.id,
        email: "expired@example.com",
        roleId: testRole.id,
        token: "expired-token",
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      });

      const acceptData = {
        token: "expired-token",
        password: "SecurePass123!",
        name: "New User",
      };

      const response = await request(app)
        .post(`/api/invitations/${expiredInvitation.token}/accept`)
        .send(acceptData)
        .expect(410);

      expect(response.body).toMatchObject({
        error: "Invitation expired",
        message: expect.stringContaining("expired"),
      });
    });

    it("should validate password requirements", async () => {
      const acceptData = {
        token: "accept-token",
        password: "weak", // Too weak
        name: "New User",
      };

      const response = await request(app)
        .post(`/api/invitations/${testInvitation.token}/accept`)
        .send(acceptData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Validation error",
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("password"),
          }),
        ]),
      });
    });
  });

  describe("POST /api/invitations/:id/resend", () => {
    let testInvitation: any;

    beforeEach(async () => {
      testInvitation = await storage.createInvitation({
        organizationId: testOrg.id,
        email: "resend@example.com",
        roleId: testRole.id,
        token: "resend-token",
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    it("should resend invitation with new token", async () => {
      const response = await request(app)
        .post(`/api/invitations/${testInvitation.id}/resend`)
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        message: "Invitation resent successfully",
        invitation: {
          id: testInvitation.id,
          email: testInvitation.email,
          expiresAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Verify token was updated
      const updatedInvitation = await storage.getInvitationById(testOrg.id, testInvitation.id);
      expect(updatedInvitation?.token).not.toBe(testInvitation.token);
    });

    it("should require authentication", async () => {
      await request(app)
        .post(`/api/invitations/${testInvitation.id}/resend`)
        .expect(401);
    });

    it("should reject non-existent invitation", async () => {
      const response = await request(app)
        .post("/api/invitations/non-existent/resend")
        .set("Cookie", authCookie)
        .expect(404);

      expect(response.body).toMatchObject({
        error: "Invitation not found",
        message: expect.stringContaining("not found"),
      });
    });

    it("should reject resending accepted invitations", async () => {
      // Mark invitation as accepted
      await storage.updateInvitationStatus(testOrg.id, testInvitation.id, "accepted");

      const response = await request(app)
        .post(`/api/invitations/${testInvitation.id}/resend`)
        .set("Cookie", authCookie)
        .expect(400);

      expect(response.body).toMatchObject({
        error: "Cannot resend",
        message: expect.stringContaining("accepted"),
      });
    });
  });
});
