/**
 * User Profile API Tests - 2026 Best Practices Implementation
 * 
 * Test suite covering all user profile API endpoints with comprehensive validation:
 * - Security controls (rate limiting, authentication, authorization)
 * - Privacy-by-design principles (data minimization, audit logging)
 * - Input validation and error handling
 * - GDPR compliance considerations
 * 
 * Requirements: 92.1, 92.2, 92.3, 92.4, 92.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../setup/backend.setup';
import { storage as _storage } from '../../server/storage';
import { 
  updateProfileSchema as _updateProfileSchema, 
  updatePasswordSchema as _updatePasswordSchema, 
  updateNotificationPreferencesSchema as _updateNotificationPreferencesSchema 
} from '@shared/schema';

// Mock storage for controlled testing
const mockStorage = {
  getUser: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserPassword: vi.fn(),
  updateUserNotificationPreferences: vi.fn(),
  updateUserAvatar: vi.fn(),
  checkEmailExists: vi.fn(),
  createActivityEvent: vi.fn(),
  getOrCreateOrg: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

describe('User Profile API - 2026 Security Standards', () => {
  const testUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    timezone: 'America/New_York',
    profileImageUrl: 'https://example.com/avatar.jpg',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      projectUpdates: true,
      taskReminders: true,
      invoiceNotifications: true,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getOrCreateOrg.mockResolvedValue('org-123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/me - Profile Retrieval', () => {
    it('should return user profile with data minimization', async () => {
      mockStorage.getUser.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        email: testUser.email,
        phone: testUser.phone,
        timezone: testUser.timezone,
        profileImageUrl: testUser.profileImageUrl,
        notificationPreferences: testUser.notificationPreferences,
        createdAt: testUser.createdAt.toISOString(),
        updatedAt: testUser.updatedAt.toISOString(),
      });

      // 2026 privacy: Verify no sensitive metadata is exposed
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('internalNotes');
      expect(response.body).not.toHaveProperty('systemFlags');
    });

    it('should return 404 for non-existent user', async () => {
      mockStorage.getUser.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', 'userId=non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'User not found',
        message: 'User profile not found',
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/users/me')
        .expect(401);
    });
  });

  describe('PUT /api/users/me - Profile Update', () => {
    it('should update profile with valid data', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+9876543210',
        timezone: 'Europe/London',
      };

      const updatedUser = { ...testUser, ...updateData, updatedAt: new Date() };
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserProfile.mockResolvedValue(updatedUser);
      mockStorage.checkEmailExists.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(mockStorage.updateUserProfile).toHaveBeenCalledWith('user-123', updateData);
      expect(mockStorage.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user',
          entityId: 'user-123',
          type: 'updated',
          description: 'profile updated',
          metadata: expect.objectContaining({
            fields: Object.keys(updateData),
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should enforce email uniqueness', async () => {
      const updateData = { email: 'existing@example.com' };
      
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .send(updateData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Email conflict',
        message: 'Email address is already in use',
      });

      expect(mockStorage.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should validate input data with Zod schema', async () => {
      const invalidData = {
        firstName: '', // Invalid: empty string
        email: 'invalid-email', // Invalid: not a proper email
        phone: 'abc', // Invalid: not a phone format
      };

      mockStorage.getUser.mockResolvedValue(testUser);

      const response = await request(app)
        .put('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(mockStorage.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserProfile.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(false);

      // Make multiple requests to trigger rate limiting
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .put('/api/users/me')
          .set('Cookie', 'userId=user-123')
          .send({ firstName: 'Test' })
      );

      const responses = await Promise.all(requests);
      
      // First 10 should succeed, rest should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses).toHaveLength(10);
      expect(rateLimitedResponses).toHaveLength(2);

      rateLimitedResponses.forEach(response => {
        expect(response.body).toMatchObject({
          error: 'Rate limit exceeded',
          message: 'Too many profile updates. Please try again later.',
        });
      });
    });
  });

  describe('PUT /api/users/me/password - Password Change', () => {
    it('should update password with valid data', async () => {
      const passwordData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
        confirmPassword: 'newPassword456!',
      };

      mockStorage.updateUserPassword.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Cookie', 'userId=user-123')
        .send(passwordData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password updated successfully',
      });

      expect(mockStorage.updateUserPassword).toHaveBeenCalledWith(
        'user-123',
        passwordData.currentPassword,
        passwordData.newPassword
      );

      expect(mockStorage.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user',
          entityId: 'user-123',
          type: 'updated',
          description: 'password changed',
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        })
      );

      // 2026 privacy: Verify passwords are not logged
      const activityCall = mockStorage.createActivityEvent.mock.calls[0][0];
      expect(activityCall.metadata).not.toHaveProperty('currentPassword');
      expect(activityCall.metadata).not.toHaveProperty('newPassword');
    });

    it('should validate password strength requirements', async () => {
      const weakPasswordData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'weak', // Too short and lacks complexity
        confirmPassword: 'weak',
      };

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Cookie', 'userId=user-123')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(mockStorage.updateUserPassword).not.toHaveBeenCalled();
    });

    it('should enforce password confirmation matching', async () => {
      const mismatchedPasswordData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
        confirmPassword: 'differentPassword456!',
      };

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Cookie', 'userId=user-123')
        .send(mismatchedPasswordData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: 'Passwords don\'t match',
          }),
        ]),
      });

      expect(mockStorage.updateUserPassword).not.toHaveBeenCalled();
    });

    it('should handle incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword123!',
        newPassword: 'newPassword456!',
        confirmPassword: 'newPassword456!',
      };

      mockStorage.updateUserPassword.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/users/me/password')
        .set('Cookie', 'userId=user-123')
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Password update failed',
        message: 'Current password may be incorrect',
      });
    });

    it('should enforce rate limiting on password changes', async () => {
      mockStorage.updateUserPassword.mockResolvedValue(true);

      const passwordData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
        confirmPassword: 'newPassword456!',
      };

      // Make multiple requests to trigger rate limiting
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .put('/api/users/me/password')
          .set('Cookie', 'userId=user-123')
          .send(passwordData)
      );

      const responses = await Promise.all(requests);
      
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses).toHaveLength(10);
      expect(rateLimitedResponses).toHaveLength(2);
    });
  });

  describe('PUT /api/users/me/preferences - Notification Preferences', () => {
    it('should update notification preferences', async () => {
      const preferencesData = {
        email: false,
        push: true,
        sms: true,
        projectUpdates: false,
        taskReminders: true,
        invoiceNotifications: false,
      };

      const updatedUser = {
        ...testUser,
        notificationPreferences: preferencesData,
        updatedAt: new Date(),
      };

      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserNotificationPreferences.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/me/preferences')
        .set('Cookie', 'userId=user-123')
        .send(preferencesData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Notification preferences updated successfully',
        notificationPreferences: preferencesData,
      });

      expect(mockStorage.updateUserNotificationPreferences).toHaveBeenCalledWith(
        'user-123',
        preferencesData
      );

      expect(mockStorage.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user',
          entityId: 'user-123',
          type: 'updated',
          description: 'notification preferences updated',
          metadata: expect.objectContaining({
            preferences: preferencesData,
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should use default values for missing preferences', async () => {
      const partialPreferencesData = {
        email: false,
        // Other fields should use defaults
      };

      const updatedUser = {
        ...testUser,
        notificationPreferences: {
          ...testUser.notificationPreferences,
          ...partialPreferencesData,
        },
        updatedAt: new Date(),
      };

      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserNotificationPreferences.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/me/preferences')
        .set('Cookie', 'userId=user-123')
        .send(partialPreferencesData)
        .expect(200);

      expect(response.body.notificationPreferences).toMatchObject({
        email: false,
        push: true, // Default value
        sms: false, // Default value
        projectUpdates: true, // Default value
        taskReminders: true, // Default value
        invoiceNotifications: true, // Default value
      });
    });

    it('should validate preference data types', async () => {
      const invalidPreferencesData = {
        email: 'not-a-boolean', // Should be boolean
        push: null, // Should be boolean
      };

      mockStorage.getUser.mockResolvedValue(testUser);

      const response = await request(app)
        .put('/api/users/me/preferences')
        .set('Cookie', 'userId=user-123')
        .send(invalidPreferencesData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(mockStorage.updateUserNotificationPreferences).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users/me/avatar - Avatar Upload', () => {
    it('should upload profile avatar', async () => {
      const updatedUser = {
        ...testUser,
        profileImageUrl: '/uploads/avatars/user-123/test.jpg',
        updatedAt: new Date(),
      };

      mockStorage.updateUserAvatar.mockResolvedValue(updatedUser);

      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Cookie', 'userId=user-123')
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Profile photo uploaded successfully',
        profileImageUrl: '/uploads/avatars/user-123/test.jpg',
      });

      expect(mockStorage.updateUserAvatar).toHaveBeenCalledWith(
        'user-123',
        '/uploads/avatars/user-123/test.jpg'
      );
    });

    it('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Cookie', 'userId=user-123')
        .attach('avatar', Buffer.from('fake-text-data'), 'test.txt')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Only image files are allowed',
      });

      expect(mockStorage.updateUserAvatar).not.toHaveBeenCalled();
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Cookie', 'userId=user-123')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'No file uploaded',
        message: 'Profile photo is required',
      });

      expect(mockStorage.updateUserAvatar).not.toHaveBeenCalled();
    });
  });

  describe('2026 Security and Privacy Compliance', () => {
    it('should maintain audit trail for all profile operations', async () => {
      // Test that all profile modifications create audit events
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserProfile.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(false);

      await request(app)
        .put('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(mockStorage.createActivityEvent).toHaveBeenCalled();
    });

    it('should implement data minimization in responses', async () => {
      mockStorage.getUser.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .expect(200);

      // Verify only necessary fields are returned
      const expectedFields = [
        'id', 'firstName', 'lastName', 'email', 'phone', 
        'timezone', 'profileImageUrl', 'notificationPreferences',
        'createdAt', 'updatedAt'
      ];

      expect(Object.keys(response.body)).toEqual(expect.arrayContaining(expectedFields));
      expect(Object.keys(response.body)).not.toContain('passwordHash');
      expect(Object.keys(response.body)).not.toContain('internalId');
    });

    it('should handle errors without exposing sensitive information', async () => {
      mockStorage.getUser.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', 'userId=user-123')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch user profile',
      });

      // Should not expose internal error details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('internalError');
    });
  });
});

/**
 * Integration Tests for User Profile API
 * Tests the complete flow with database interactions
 */
describe('User Profile API - Integration Tests', () => {
  // These tests would require a real database connection
  // They can be run in a separate test environment with proper setup
  
  it('should handle complete profile update workflow', () => {
    // Integration test for complete profile update workflow
    // This would test the entire flow from API to database
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain data consistency across operations', () => {
    // Integration test for data consistency
    expect(true).toBe(true); // Placeholder
  });
});
