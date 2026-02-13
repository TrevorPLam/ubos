// AI-META-BEGIN
// AI-META: Integration tests for complete invitation flow
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, supertest
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Integration Tests for Complete Invitation Flow
 * 
 * Feature: user-invitation-system
 * Requirements: 91.1, 91.3, 91.4, 91.7
 * 
 * This test suite validates the complete invitation flow:
 * - Invitation creation and email sending (91.1)
 * - Invitation acceptance and user creation (91.3)
 * - Bulk invitation processing (91.4)
 * - Token expiration handling (91.7)
 * - Error scenarios and edge cases
 * 
 * 2026 Best Practices Applied:
 * - Integration tests with real database
 * - Clean test isolation with proper setup/teardown
 * - Comprehensive error scenario coverage
 * - Performance testing for bulk operations
 * - Security validation for token handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import { randomUUID } from 'crypto';
import type { InsertInvitation as _InsertInvitation, InsertRole as _InsertRole, InsertUser as _InsertUser } from '@shared/schema';

describe('Invitation System - Integration Tests', () => {
  let testOrg: string;
  let testUser: any;
  let testRole: any;
  let authCookie: string;

  beforeEach(async () => {
    // Create test organization
    testOrg = randomUUID();
    await storage.upsertOrganization({
      id: testOrg,
      name: 'Test Organization',
      domain: 'test-org',
    });

    // Create test user and authenticate
    testUser = await storage.upsertUser({
      id: randomUUID(),
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
    });

    // Create test role
    testRole = await storage.createRole({
      organizationId: testOrg,
      name: 'Team Member',
      description: 'Test role for invitations',
    });

    // Assign role to user
    await storage.assignRoleToUser({
      userId: testUser.id,
      roleId: testRole.id,
      organizationId: testOrg,
      assignedById: testUser.id,
    });

    // Get authentication cookie
    const loginResponse = await request(app)
      .get('/api/login')
      .expect(302);
    
    authCookie = loginResponse.headers['set-cookie']?.[0] || '';
  });

  afterEach(async () => {
    // Clean up test data
    vi.restoreAllMocks();
  });

  describe('Invitation Creation (91.1)', () => {
    it('should create invitation and send email', async () => {
      const invitationData = {
        email: 'newuser@example.com',
        roleId: testRole.id,
      };

      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send(invitationData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: invitationData.email,
        roleId: testRole.id,
        status: 'pending',
        expiresAt: expect.any(String),
        createdAt: expect.any(String),
      });

      // Verify invitation exists in database
      const invitations = await storage.getInvitations(testOrg, { status: 'pending' });
      expect(invitations).toHaveLength(1);
      expect(invitations[0].email).toBe(invitationData.email);

      // Verify token is UUID format
      const invitation = await storage.getInvitationByToken(invitations[0].token);
      expect(invitation).toBeTruthy();
      expect(invitation?.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should reject duplicate invitations', async () => {
      const invitationData = {
        email: 'duplicate@example.com',
        roleId: testRole.id,
      };

      // Create first invitation
      await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send(invitationData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send(invitationData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Invitation already exists',
        message: 'A pending invitation for this email already exists',
      });
    });

    it('should validate invitation data', async () => {
      // Test missing email
      await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send({ roleId: testRole.id })
        .expect(400);

      // Test invalid email
      await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send({ email: 'invalid-email', roleId: testRole.id })
        .expect(400);

      // Test missing role
      await request(app)
        .post('/api/invitations')
        .set('Cookie', authCookie)
        .send({ email: 'test@example.com' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/invitations')
        .send({ email: 'test@example.com', roleId: testRole.id })
        .expect(401);
    });
  });

  describe('Bulk Invitation Processing (91.4)', () => {
    it('should process bulk invitations successfully', async () => {
      const bulkData = {
        invitations: [
          { email: 'bulk1@example.com', roleId: testRole.id },
          { email: 'bulk2@example.com', roleId: testRole.id },
          { email: 'bulk3@example.com', roleId: testRole.id },
        ],
      };

      const response = await request(app)
        .post('/api/invitations/bulk')
        .set('Cookie', authCookie)
        .send(bulkData)
        .expect(201);

      expect(response.body).toMatchObject({
        created: 3,
        failed: 0,
        invitations: expect.arrayContaining([
          expect.objectContaining({ email: 'bulk1@example.com' }),
          expect.objectContaining({ email: 'bulk2@example.com' }),
          expect.objectContaining({ email: 'bulk3@example.com' }),
        ]),
        errors: [],
      });

      // Verify all invitations exist
      const invitations = await storage.getInvitations(testOrg, { status: 'pending' });
      expect(invitations).toHaveLength(3);
    });

    it('should handle partial failures in bulk invitations', async () => {
      // Create one invitation first
      await storage.createInvitation({
        organizationId: testOrg,
        email: 'existing@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const bulkData = {
        invitations: [
          { email: 'existing@example.com', roleId: testRole.id }, // Duplicate
          { email: 'new@example.com', roleId: testRole.id }, // Valid
          { email: 'invalid-email', roleId: testRole.id }, // Invalid email
        ],
      };

      const response = await request(app)
        .post('/api/invitations/bulk')
        .set('Cookie', authCookie)
        .send(bulkData)
        .expect(201);

      expect(response.body).toMatchObject({
        created: 1,
        failed: 2,
        invitations: expect.arrayContaining([
          expect.objectContaining({ email: 'new@example.com' }),
        ]),
        errors: expect.arrayContaining([
          expect.objectContaining({ email: 'existing@example.com' }),
          expect.objectContaining({ email: 'invalid-email' }),
        ]),
      });
    });

    it('should enforce bulk invitation limits', async () => {
      // Create 50 pending invitations first
      const existingInvitations = Array.from({ length: 50 }, (_, i) => ({
        organizationId: testOrg,
        email: `existing${i}@example.com`,
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      for (const invitation of existingInvitations) {
        await storage.createInvitation(invitation);
      }

      const bulkData = {
        invitations: [
          { email: 'overlimit@example.com', roleId: testRole.id },
        ],
      };

      const response = await request(app)
        .post('/api/invitations/bulk')
        .set('Cookie', authCookie)
        .send(bulkData)
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Rate limit exceeded',
        message: 'Cannot have more than 50 pending invitations per organization',
      });
    });

    it('should validate bulk invitation limits', async () => {
      const bulkData = {
        invitations: Array.from({ length: 101 }, (_, i) => ({
          email: `test${i}@example.com`,
          roleId: testRole.id,
        })),
      };

      await request(app)
        .post('/api/invitations/bulk')
        .set('Cookie', authCookie)
        .send(bulkData)
        .expect(400);
    });
  });

  describe('Invitation Acceptance and User Creation (91.3)', () => {
    let invitationToken: string;

    beforeEach(async () => {
      // Create test invitation
      const invitation = await storage.createInvitation({
        organizationId: testOrg,
        email: 'acceptance@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      invitationToken = invitation.token;
    });

    it('should accept invitation and create user account', async () => {
      const acceptData = {
        token: invitationToken,
        name: 'New User',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send(acceptData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Invitation accepted successfully',
        user: expect.objectContaining({
          id: expect.any(String),
          firstName: 'New',
          lastName: 'User',
          email: 'acceptance@example.com',
        }),
      });

      // Verify user was created
      const user = await storage.getUser(response.body.user.id);
      expect(user).toBeTruthy();
      expect(user?.email).toBe('acceptance@example.com');

      // Verify invitation status was updated
      const updatedInvitation = await storage.getInvitationByToken(invitationToken);
      expect(updatedInvitation?.status).toBe('accepted');
      expect(updatedInvitation?.acceptedById).toBe(response.body.user.id);

      // Verify role was assigned to user
      const userRoles = await storage.getUserRoles(response.body.user.id, testOrg);
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].roleId).toBe(testRole.id);
    });

    it('should validate acceptance data', async () => {
      // Test missing token
      await request(app)
        .post('/api/invitations//accept')
        .send({ name: 'Test', password: 'SecurePass123!' })
        .expect(404);

      // Test missing name
      await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({ token: invitationToken, password: 'SecurePass123!' })
        .expect(400);

      // Test missing password
      await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({ token: invitationToken, name: 'Test' })
        .expect(400);

      // Test weak password
      await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({ token: invitationToken, name: 'Test', password: 'weak' })
        .expect(400);
    });

    it('should reject invalid tokens', async () => {
      const acceptData = {
        token: 'invalid-token',
        name: 'Test User',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/invitations/invalid-token/accept')
        .send(acceptData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Invalid invitation',
        message: 'Invitation not found or has been used',
      });
    });

    it('should reject already accepted invitations', async () => {
      // First acceptance
      await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({
          token: invitationToken,
          name: 'First User',
          password: 'SecurePass123!',
        })
        .expect(200);

      // Second acceptance attempt
      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .send({
          token: invitationToken,
          name: 'Second User',
          password: 'SecurePass123!',
        })
        .expect(410);

      expect(response.body).toMatchObject({
        error: 'Invitation not valid',
        message: 'Invitation is accepted',
      });
    });
  });

  describe('Token Expiration Handling (91.7)', () => {
    it('should reject expired invitations', async () => {
      // Create expired invitation
      const expiredInvitation = await storage.createInvitation({
        organizationId: testOrg,
        email: 'expired@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      });

      const acceptData = {
        token: expiredInvitation.token,
        name: 'Expired User',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post(`/api/invitations/${expiredInvitation.token}/accept`)
        .send(acceptData)
        .expect(410);

      expect(response.body).toMatchObject({
        error: 'Invitation expired',
        message: 'Invitation has expired. Please request a new one.',
      });

      // Verify invitation was marked as expired
      const updatedInvitation = await storage.getInvitationByToken(expiredInvitation.token);
      expect(updatedInvitation?.status).toBe('expired');
    });

    it('should handle expiration boundary precisely', async () => {
      // Create invitation that expires in 1 millisecond
      const boundaryInvitation = await storage.createInvitation({
        organizationId: testOrg,
        email: 'boundary@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 1).toISOString(), // 1ms from now
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2));

      const acceptData = {
        token: boundaryInvitation.token,
        name: 'Boundary User',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post(`/api/invitations/${boundaryInvitation.token}/accept`)
        .send(acceptData)
        .expect(410);

      expect(response.body.error).toBe('Invitation expired');
    });
  });

  describe('Invitation Management', () => {
    it('should list pending invitations', async () => {
      // Create multiple invitations
      await storage.createInvitation({
        organizationId: testOrg,
        email: 'list1@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await storage.createInvitation({
        organizationId: testOrg,
        email: 'list2@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await request(app)
        .get('/api/invitations')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        invitations: expect.arrayContaining([
          expect.objectContaining({ email: 'list1@example.com' }),
          expect.objectContaining({ email: 'list2@example.com' }),
        ]),
        pagination: expect.objectContaining({
          limit: 50,
          offset: 0,
          total: expect.any(Number),
        }),
      });

      // Verify tokens are not exposed
      expect(response.body.invitations).not.toContainEqual(
        expect.objectContaining({ token: expect.any(String) })
      );
    });

    it('should resend invitations with new token', async () => {
      const originalInvitation = await storage.createInvitation({
        organizationId: testOrg,
        email: 'resend@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await request(app)
        .post(`/api/invitations/${originalInvitation.id}/resend`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Invitation resent successfully',
        invitation: expect.objectContaining({
          id: originalInvitation.id,
          email: 'resend@example.com',
          expiresAt: expect.any(String),
        }),
      });

      // Verify token was changed
      const updatedInvitation = await storage.getInvitationById(testOrg, originalInvitation.id);
      expect(updatedInvitation?.token).not.toBe(originalInvitation.token);
      expect(updatedInvitation?.expiresAt).not.toBe(originalInvitation.expiresAt);
    });

    it('should validate resend operations', async () => {
      // Test non-existent invitation
      await request(app)
        .post('/api/invitations/non-existent/resend')
        .set('Cookie', authCookie)
        .expect(404);

      // Test accepted invitation
      const acceptedInvitation = await storage.createInvitation({
        organizationId: testOrg,
        email: 'accepted@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await storage.updateInvitationStatus(testOrg, acceptedInvitation.id, 'accepted');

      const response = await request(app)
        .post(`/api/invitations/${acceptedInvitation.id}/resend`)
        .set('Cookie', authCookie)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Cannot resend',
        message: 'Cannot resend invitation with status: accepted',
      });
    });
  });

  describe('Security and Permissions', () => {
    it('should enforce organization isolation', async () => {
      // Create another organization
      const otherOrg = randomUUID();
      await storage.upsertOrganization({
        id: otherOrg,
        name: 'Other Organization',
        domain: 'other-org',
      });

      // Create invitation in other org
      await storage.createInvitation({
        organizationId: otherOrg,
        email: 'other@example.com',
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Try to access from test org
      await request(app)
        .get('/api/invitations')
        .set('Cookie', authCookie)
        .expect(200)
        .expect((res) => {
          expect(res.body.invitations).not.toContainEqual(
            expect.objectContaining({ email: 'other@example.com' })
          );
        });
    });

    it('should require proper permissions', async () => {
      // Create user without permissions
      await storage.upsertUser({
        id: randomUUID(),
        email: 'noperm@example.com',
        firstName: 'No',
        lastName: 'Permission',
      });

      const noPermCookie = await request(app)
        .get('/api/login')
        .expect(302)
        .then(res => res.headers['set-cookie']?.[0] || '');

      // Try to create invitation without permissions
      await request(app)
        .post('/api/invitations')
        .set('Cookie', noPermCookie)
        .send({ email: 'test@example.com', roleId: testRole.id })
        .expect(403);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      const bulkData = {
        invitations: Array.from({ length: 50 }, (_, i) => ({
          email: `perf${i}@example.com`,
          roleId: testRole.id,
        })),
      };

      await request(app)
        .post('/api/invitations/bulk')
        .set('Cookie', authCookie)
        .send(bulkData)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds for 50 invitations)
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain performance with many pending invitations', async () => {
      // Create 100 pending invitations
      const invitations = Array.from({ length: 100 }, (_, i) => ({
        organizationId: testOrg,
        email: `perf${i}@example.com`,
        roleId: testRole.id,
        token: randomUUID(),
        invitedById: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      for (const invitation of invitations) {
        await storage.createInvitation(invitation);
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/invitations')
        .set('Cookie', authCookie)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.invitations).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should be very fast for listing
    });
  });
});
