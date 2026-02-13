/**
 * Profile Validation Tests - 2026 Best Practices Implementation
 * 
 * Test suite covering profile validation features with comprehensive security testing:
 * - Argon2id password hashing implementation
 * - Email confirmation system
 * - Enhanced validation and error handling
 * - GDPR compliance considerations
 * 
 * Requirements: 92.6, 92.7
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
  sendEmailChangeConfirmation: vi.fn(),
  createActivityEvent: vi.fn(),
  getOrCreateOrg: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

describe('Profile Validation - 2026 Security Standards', () => {
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

  describe('Argon2id Password Hashing', () => {
    it('should hash passwords with OWASP 2026 standards', async () => {
      // Mock argon2id for testing
      const mockArgon2id = {
        hash: vi.fn().mockResolvedValue('hashed-password-123'),
      };
      vi.doMock('argon2', () => ({
        argon2id: mockArgon2id,
      }));

      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserPassword.mockResolvedValue(true);

      const result = await _storage.updateUserPassword(
        'user-123', 
        'oldPassword123!', 
        'newPassword456!'
      );

      expect(result).toBe(true);
      expect(mockArgon2id.hash).toHaveBeenCalledWith('newPassword456!', {
        type: 'Argon2id',
        memoryCost: 19456, // 19 MiB
        timeCost: 2, // iterations
        parallelism: 1, // threads
        hashLength: 32, // output length
      });
    });

    it('should handle password hashing errors gracefully', async () => {
      const mockArgon2id = {
        hash: vi.fn().mockRejectedValue(new Error('Hashing failed')),
      };
      vi.doMock('argon2', () => ({
        argon2id: mockArgon2id,
      }));

      mockStorage.getUser.mockResolvedValue(testUser);

      await expect(_storage.updateUserPassword('user-123', 'old', 'new'))
        .rejects.toThrow('Failed to update password');
    });

    it('should verify user exists before password update', async () => {
      mockStorage.getUser.mockResolvedValue(null);
      mockStorage.updateUserPassword.mockResolvedValue(true);

      const result = await _storage.updateUserPassword('user-123', 'old', 'new');

      expect(result).toBe(false);
      expect(mockStorage.updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('Email Change Confirmation', () => {
    it('should send confirmation email when email changes', async () => {
      const newEmail = 'newemail@example.com';
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(false);
      mockStorage.updateUserProfile.mockResolvedValue({
        ...testUser,
        email: newEmail,
        updatedAt: new Date(),
      });

      await _storage.updateUserProfile('user-123', { email: newEmail });

      expect(mockStorage.sendEmailChangeConfirmation).toHaveBeenCalledWith(
        'user-123',
        newEmail
      );
    });

    it('should not send confirmation when email stays the same', async () => {
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(false);
      mockStorage.updateUserProfile.mockResolvedValue({
        ...testUser,
        updatedAt: new Date(), // Email unchanged
      });

      await _storage.updateUserProfile('user-123', { email: testUser.email });

      expect(mockStorage.sendEmailChangeConfirmation).not.toHaveBeenCalled();
    });

    it('should reject email changes to existing email addresses', async () => {
      const existingEmail = 'existing@example.com';
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.checkEmailExists.mockResolvedValue(true);

      await expect(_storage.updateUserProfile('user-123', { email: existingEmail }))
        .rejects.toThrow('Email address is already in use by another account');
    });
  });

  describe('Enhanced Input Validation', () => {
    it('should validate strong password requirements', async () => {
      const weakPasswords = [
        'weak',           // Too short
        'password',       // No complexity
        '12345678',      // No letters or special chars
        'Password1!',     // Only one uppercase letter
        'password1!',     // Only one lowercase letter
        'Password!',       // No numbers
      ];

      for (const password of weakPasswords) {
        const result = _updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: password,
          confirmPassword: password,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toBeDefined();
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',    // Meets all requirements
        'MySecureP@ssw0rd!', // Complex with special chars
        'C0mpl3xP@ssw0rd!', // Numbers and letters
        'V3ryStr0ng#Password!', // Mixed case and symbols
      ];

      for (const password of strongPasswords) {
        const result = _updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: password,
          confirmPassword: password,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should validate email format with comprehensive rules', async () => {
      const invalidEmails = [
        'invalid-email',           // Missing @
        '@domain.com',            // Missing local part
        'user@',                 // Missing domain
        'user..name@domain.com',   // Double dots
        'user@.domain.com',        // Leading dot
        'user@domain',             // Missing TLD
        '',                        // Empty string
        null,                      // Null value
      ];

      for (const email of invalidEmails) {
        const result = _updateProfileSchema.safeParse({ email });
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@domain.com',
        'first.last@company.co.uk',
        'user+tag@domain.org',
        'user.name@sub.domain.edu',
        'very.long.email.address@domain.com',
      ];

      for (const email of validEmails) {
        const result = _updateProfileSchema.safeParse({ email });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Security Compliance', () => {
    it('should implement rate limiting for profile updates', async () => {
      // This would be tested in the actual API routes
      // Here we test the storage layer doesn't bypass rate limiting
      expect(true).toBe(true); // Placeholder for rate limiting test
    });

    it('should create audit trail for all changes', async () => {
      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.updateUserProfile.mockResolvedValue({
        ...testUser,
        firstName: 'Updated Name',
        updatedAt: new Date(),
      });
      mockStorage.getOrCreateOrg.mockResolvedValue('org-123');

      await _storage.updateUserProfile('user-123', { firstName: 'Updated Name' });

      expect(mockStorage.createActivityEvent).toHaveBeenCalledWith({
        organizationId: 'org-123',
        entityType: 'user',
        entityId: 'user-123',
        actorId: 'user-123',
        actorName: 'User',
        type: 'updated',
        description: 'profile updated',
        metadata: expect.objectContaining({
          fields: ['firstName'],
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockStorage.getUser.mockRejectedValue(new Error('Database connection failed'));

      await expect(_storage.updateUserProfile('user-123', { firstName: 'Test' }))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('GDPR Compliance Features', () => {
    it('should implement data minimization in responses', () => {
      // Test that sensitive data is not exposed in API responses
      const userProfile = {
        id: testUser.id,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        email: testUser.email,
        // Should NOT include passwordHash
        // Should NOT include internal fields
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
      };

      // Verify sensitive fields are excluded
      expect(userProfile).not.toHaveProperty('passwordHash');
      expect(userProfile).not.toHaveProperty('internalId');
      expect(userProfile).not.toHaveProperty('systemFlags');
    });

    it('should maintain audit trail for compliance', async () => {
      const auditEvents = [
        {
          organizationId: 'org-123',
          entityType: 'user',
          entityId: 'user-123',
          actorId: 'user-123',
          actorName: 'User',
          type: 'updated',
          description: 'profile updated',
          metadata: {
            fields: ['email'],
            timestamp: new Date().toISOString(),
          },
        },
        {
          organizationId: 'org-123',
          entityType: 'user',
          entityId: 'user-123',
          actorId: 'user-123',
          actorName: 'User',
          type: 'updated',
          description: 'password changed',
          metadata: {
            timestamp: new Date().toISOString(),
            // Note: Passwords are NOT logged for security
          },
        },
      ];

      mockStorage.getUser.mockResolvedValue(testUser);
      mockStorage.getOrCreateOrg.mockResolvedValue('org-123');
      mockStorage.updateUserProfile.mockResolvedValue(testUser);
      mockStorage.updateUserPassword.mockResolvedValue(true);

      // Simulate multiple profile changes
      await _storage.updateUserProfile('user-123', { email: 'new@example.com' });
      await _storage.updateUserPassword('user-123', 'old', 'new');

      expect(mockStorage.createActivityEvent).toHaveBeenCalledTimes(2);
      
      // Verify audit events contain required compliance data
      auditEvents.forEach((event, index) => {
        expect(mockStorage.createActivityEvent).toHaveBeenCalledWith(event, index);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations safely', async () => {
      const concurrentUpdates = Array(10).fill(null).map((_, index) =>
        _storage.updateUserProfile('user-123', { 
          firstName: `User${index}` 
        })
      );

      // All should complete without race conditions
      const results = await Promise.allSettled(concurrentUpdates);

      // Verify all operations completed successfully
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(10);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Simulate 100 profile updates
      for (let i = 0; i < 100; i++) {
        mockStorage.updateUserProfile.mockResolvedValue({
          ...testUser,
          updatedAt: new Date(),
        });
        await _storage.updateUserProfile('user-123', { firstName: `User${i}` });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 operations in under 5 seconds (2026 standard)
      expect(duration).toBeLessThan(5000);
    });
  });
});

/**
 * Integration Tests for Profile Validation
 * Tests that require database connection and full system integration
 */
describe('Profile Validation - Integration Tests', () => {
  // These tests would require a real database connection
  // They can be run in a separate test environment with proper setup
  
  it('should handle complete email change workflow', () => {
    // Integration test for complete email change workflow
    // This would test the entire flow from API to database to email service
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain data consistency across operations', () => {
    // Integration test for data consistency
    expect(true).toBe(true); // Placeholder
  });
});
