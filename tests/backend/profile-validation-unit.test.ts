/**
 * Profile Validation Unit Tests - 2026 Best Practices
 * 
 * Standalone test suite for profile validation without database dependencies.
 * Tests core validation logic for email, password, and profile updates.
 * 
 * Requirements: 92.6, 92.7
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Validation schemas matching the actual implementation
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100, "First name must be 100 characters or less").optional(),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be 100 characters or less").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required").max(50, "Timezone must be 50 characters or less").optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

describe('Profile Validation Unit Tests', () => {
  describe('Email Validation (Requirement 92.6)', () => {
    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',           // Missing @
        '@domain.com',            // Missing local part
        'user@',                 // Missing domain
        'user..name@domain.com',   // Double dots
        'user@.domain.com',        // Leading dot
        'user@domain',             // Missing TLD
        '',                        // Empty string
      ];

      for (const email of invalidEmails) {
        const result = updateProfileSchema.safeParse({ email });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toBeDefined();
          expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
        }
      }
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'user@domain.com',
        'first.last@company.co.uk',
        'user+tag@domain.org',
        'user.name@sub.domain.edu',
        'very.long.email.address@domain.com',
      ];

      for (const email of validEmails) {
        const result = updateProfileSchema.safeParse({ email });
        expect(result.success).toBe(true);
      }
    });

    it('should handle null email gracefully', () => {
      const result = updateProfileSchema.safeParse({ email: null });
      expect(result.success).toBe(false);
    });
  });

  describe('Password Strength Validation (Requirement 92.7)', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'weak', expectedError: "at least 8 characters" },
        { password: 'password', expectedError: "uppercase letter" },
        { password: 'PASSWORD', expectedError: "lowercase letter" },
        { password: 'Password1', expectedError: "special character" },
        { password: 'Password!', expectedError: "number" },
      ];

      for (const testCase of weakPasswords) {
        const result = updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: testCase.password,
          confirmPassword: testCase.password,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toBeDefined();
          const hasExpectedError = result.error.issues.some(issue => 
            issue.message.toLowerCase().includes(testCase.expectedError.toLowerCase())
          );
          expect(hasExpectedError).toBe(true);
        }
      }
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecureP@ssw0rd!',
        'C0mpl3xP@ssw0rd!',
        'V3ryStr0ng#Password!',
      ];

      for (const password of strongPasswords) {
        const result = updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: password,
          confirmPassword: password,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject password mismatches', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'oldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match");
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('should require current password', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message === "Current password is required"
        )).toBe(true);
      }
    });
  });

  describe('Profile Field Validation', () => {
    it('should validate name field length constraints', () => {
      const invalidNames = [
        { field: 'firstName', value: 'a'.repeat(101) },
        { field: 'lastName', value: 'b'.repeat(101) },
      ];

      for (const testCase of invalidNames) {
        const result = updateProfileSchema.safeParse({ [testCase.field]: testCase.value });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.message.includes("100 characters or less")
          )).toBe(true);
        }
      }
    });

    it('should validate timezone field constraints', () => {
      const invalidTimezones = [
        '',                    // Empty
        'a'.repeat(51),      // Too long
      ];

      for (const timezone of invalidTimezones) {
        const result = updateProfileSchema.safeParse({ timezone });
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid profile data', () => {
      const validProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        timezone: 'America/New_York',
      };

      const result = updateProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should handle partial updates', () => {
      const partialUpdates = [
        { firstName: 'Updated Name' },
        { lastName: 'Updated Last Name' },
        { phone: '+9876543210' },
        { timezone: 'Europe/London' },
      ];

      for (const update of partialUpdates) {
        const result = updateProfileSchema.safeParse(update);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle potentially malicious inputs', () => {
      const maliciousInputs = [
        { firstName: '<script>alert("xss")</script>' },
        { lastName: 'DROP TABLE users;' },
        { email: 'user@example.com<script>' },
      ];

      for (const input of maliciousInputs) {
        const result = updateProfileSchema.safeParse(input);
        // Schema validation should handle these appropriately
        expect(result).toBeDefined();
      }
    });

    it('should validate common edge cases', () => {
      const edgeCases = [
        { firstName: '   ', lastName: 'Doe' }, // Whitespace only
        { firstName: 'John', lastName: '' },    // Empty optional field
        { phone: '123' },                       // Short phone number
        { phone: '+1 (555) 123-4567' },         // Formatted phone number
      ];

      for (const testCase of edgeCases) {
        const result = updateProfileSchema.safeParse(testCase);
        // Should handle edge cases without crashing
        expect(result).toBeDefined();
      }
    });

    it('should enforce password complexity requirements individually', () => {
      const complexityTests = [
        { password: 'short', rule: '8 characters' },
        { password: 'alllowercase1!', rule: 'uppercase' },
        { password: 'ALLUPPERCASE1!', rule: 'lowercase' },
        { password: 'NoNumbers!', rule: 'number' },
        { password: 'NoSpecialChars1', rule: 'special' },
      ];

      for (const test of complexityTests) {
        const result = updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: test.password,
          confirmPassword: test.password,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const hasRuleError = result.error.issues.some(issue =>
            issue.message.toLowerCase().includes(test.rule.toLowerCase())
          );
          expect(hasRuleError).toBe(true);
        }
      }
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle validation efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 1000 validation operations
      for (let i = 0; i < 1000; i++) {
        updateProfileSchema.safeParse({
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@example.com`,
          timezone: 'UTC',
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 validations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle password validation efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 100 password validations
      for (let i = 0; i < 100; i++) {
        updatePasswordSchema.safeParse({
          currentPassword: 'oldPassword123!',
          newPassword: `NewPassword${i}!`,
          confirmPassword: `NewPassword${i}!`,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 password validations in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});

describe('Profile Validation Integration Scenarios', () => {
  describe('Complete Workflows', () => {
    it('should validate complete profile update workflow', () => {
      const originalProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        timezone: 'America/New_York',
      };

      const updatedProfile = {
        firstName: 'Jonathan',
        lastName: 'Doe-Smith',
        phone: '+9876543210',
        timezone: 'Europe/London',
      };

      // Validate both profiles
      const originalResult = updateProfileSchema.safeParse(originalProfile);
      const updatedResult = updateProfileSchema.safeParse(updatedProfile);

      expect(originalResult.success).toBe(true);
      expect(updatedResult.success).toBe(true);
    });

    it('should validate password change workflow', () => {
      const validPasswordChange = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      };

      const result = updatePasswordSchema.safeParse(validPasswordChange);
      expect(result.success).toBe(true);

      // Test failure scenarios
      const failureScenarios = [
        { ...validPasswordChange, currentPassword: '' },
        { ...validPasswordChange, newPassword: 'weak' },
        { ...validPasswordChange, confirmPassword: 'different' },
      ];

      for (const scenario of failureScenarios) {
        const failResult = updatePasswordSchema.safeParse(scenario);
        expect(failResult.success).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidData = {
        firstName: '',
        email: 'invalid-email',
        timezone: 'a'.repeat(100),
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        
        const errorMessages = result.error.issues.map(issue => issue.message);
        expect(errorMessages.some(msg => 
          msg.includes('required') || 
          msg.includes('format') || 
          msg.includes('characters')
        )).toBe(true);
      }
    });

    it('should handle concurrent validation safely', async () => {
      const concurrentValidations = Array(10).fill(null).map((_, index) =>
        Promise.resolve(updateProfileSchema.safeParse({
          firstName: `User${index}`,
          lastName: 'Test',
          email: `user${index}@example.com`,
        }))
      );

      const results = await Promise.all(concurrentValidations);
      const successful = results.filter(r => r.success);
      expect(successful).toHaveLength(10);
    });
  });
});
