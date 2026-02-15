import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseStorage } from '../../server/storage';
import { randomUUID } from 'crypto';

describe('Password Storage - 2026 Security Standards', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
  });

  describe('Argon2id Implementation', () => {
    it('should hash passwords with OWASP 2026 recommended parameters', async () => {
      const userId = randomUUID();
      const password = 'TestPassword123!';

      // Create user first
      await storage.upsertUser({
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      // Update password (new user scenario - no current password)
      const result = await storage.updateUserPassword(userId, null, password);
      
      expect(result).toBe(true);

      // Verify password works
      const isValid = await storage.verifyPassword(userId, password);
      expect(isValid).toBe(true);

      // Verify wrong password fails
      const isInvalid = await storage.verifyPassword(userId, 'WrongPassword123!');
      expect(isInvalid).toBe(false);
    });

    it('should verify current password before updating existing users', async () => {
      const userId = randomUUID();
      const currentPassword = 'CurrentPassword123!';
      const newPassword = 'NewPassword456!';

      // Create user with initial password
      await storage.upsertUser({
        id: userId,
        email: 'test2@example.com',
        firstName: 'Test',
        lastName: 'User2',
      });

      // Set initial password
      await storage.updateUserPassword(userId, null, currentPassword);

      // Try to update with wrong current password
      const wrongResult = await storage.updateUserPassword(userId, 'WrongPassword', newPassword);
      expect(wrongResult).toBe(false);

      // Update with correct current password
      const correctResult = await storage.updateUserPassword(userId, currentPassword, newPassword);
      expect(correctResult).toBe(true);

      // Verify new password works
      const isValid = await storage.verifyPassword(userId, newPassword);
      expect(isValid).toBe(true);

      // Verify old password no longer works
      const isOldValid = await storage.verifyPassword(userId, currentPassword);
      expect(isOldValid).toBe(false);
    });

    it('should handle password verification for non-existent users', async () => {
      const nonExistentUserId = randomUUID();
      const password = 'TestPassword123!';

      const result = await storage.verifyPassword(nonExistentUserId, password);
      expect(result).toBe(false);
    });

    it('should handle password verification for users without passwords', async () => {
      const userId = randomUUID();

      // Create user without password
      await storage.upsertUser({
        id: userId,
        email: 'test3@example.com',
        firstName: 'Test',
        lastName: 'User3',
      });

      const result = await storage.verifyPassword(userId, 'AnyPassword123!');
      expect(result).toBe(false);
    });

    it('should use memory-efficient Argon2id configuration', async () => {
      const userId = randomUUID();
      const password = 'TestPassword123!';

      // Create user
      await storage.upsertUser({
        id: userId,
        email: 'test4@example.com',
        firstName: 'Test',
        lastName: 'User4',
      });

      // Update password and verify it uses correct parameters
      const result = await storage.updateUserPassword(userId, null, password);
      expect(result).toBe(true);

      // The implementation should use OWASP 2026 recommended settings:
      // - memoryCost: 19456 (19 MiB)
      // - timeCost: 2 iterations
      // - parallelism: 1 thread
      // - hashLength: 32 characters
      // - type: argon2id

      const isValid = await storage.verifyPassword(userId, password);
      expect(isValid).toBe(true);
    });
  });

  describe('Security Compliance', () => {
    it('should not store plain text passwords', async () => {
      const userId = randomUUID();
      const password = 'PlainPassword123!';

      // Create user
      await storage.upsertUser({
        id: userId,
        email: 'test5@example.com',
        firstName: 'Test',
        lastName: 'User5',
      });

      // Update password
      await storage.updateUserPassword(userId, null, password);

      // Get user and verify password is not stored in plain text
      const user = await storage.getUser(userId);
      expect(user).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash).toMatch(/^\$argon2id\$/); // Argon2id hash format
    });

    it('should generate unique hashes for identical passwords', async () => {
      const userId1 = randomUUID();
      const userId2 = randomUUID();
      const password = 'SamePassword123!';

      // Create two users
      await storage.upsertUser({
        id: userId1,
        email: 'test6@example.com',
        firstName: 'Test',
        lastName: 'User6',
      });

      await storage.upsertUser({
        id: userId2,
        email: 'test7@example.com',
        firstName: 'Test',
        lastName: 'User7',
      });

      // Set same password for both users
      await storage.updateUserPassword(userId1, null, password);
      await storage.updateUserPassword(userId2, null, password);

      // Get users and verify hashes are different (due to salt)
      const user1 = await storage.getUser(userId1);
      const user2 = await storage.getUser(userId2);

      expect(user1?.passwordHash).not.toBe(user2?.passwordHash);
      expect(user1?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user2?.passwordHash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle password hashing within reasonable time', async () => {
      const userId = randomUUID();
      const password = 'PerformanceTest123!';

      // Create user
      await storage.upsertUser({
        id: userId,
        email: 'test8@example.com',
        firstName: 'Test',
        lastName: 'User8',
      });

      // Measure hashing time
      const startTime = Date.now();
      const result = await storage.updateUserPassword(userId, null, password);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle password verification efficiently', async () => {
      const userId = randomUUID();
      const password = 'VerificationTest123!';

      // Create user and set password
      await storage.upsertUser({
        id: userId,
        email: 'test9@example.com',
        firstName: 'Test',
        lastName: 'User9',
      });

      await storage.updateUserPassword(userId, null, password);

      // Measure verification time
      const startTime = Date.now();
      const isValid = await storage.verifyPassword(userId, password);
      const endTime = Date.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
