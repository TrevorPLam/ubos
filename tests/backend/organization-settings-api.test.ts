/**
 * Organization Settings API Tests - 2026 Best Practices Implementation
 * 
 * Test suite covering organization settings API endpoints with comprehensive security testing:
 * - GET /api/organizations/settings - Retrieve organization settings
 * - PUT /api/organizations/settings - Update organization settings
 * - POST /api/organizations/logo - Upload organization logo
 * - DELETE /api/organizations/logo - Remove organization logo
 * 
 * Requirements: 94.1, 94.2
 * 2026 Best Practices: Zero-trust architecture, comprehensive validation, audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../setup/backend.setup';
import { 
  updateOrganizationSettingsSchema 
} from '@shared/schema';

// Mock storage for controlled testing
const storage = {
  getOrganizationSettings: vi.fn(),
  updateOrganizationSettings: vi.fn(),
  updateOrganizationLogo: vi.fn(),
  createActivityEvent: vi.fn(),
  getUserOrganization: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: storage,
}));

// Mock middleware
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  getUserIdFromRequest: () => 'test-user-id',
  getOrCreateOrg: () => Promise.resolve('test-org-id'),
}));

vi.mock('../../server/middleware/permissions', () => ({
  checkPermission: (resource: string, action: string) => (req: any, res: any, next: any) => {
    // Allow all permissions for testing
    next();
  },
}));

describe('Organization Settings API - 2026 Security Standards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/organizations/settings', () => {
    it('should return organization settings for authenticated user', async () => {
      const mockSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: 'https://example.com/logo.png',
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en-US',
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.getOrganizationSettings).mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/organizations/settings')
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: 'https://example.com/logo.png',
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en-US',
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: mockSettings.createdAt.toISOString(),
        updatedAt: mockSettings.updatedAt.toISOString(),
      });

      expect(storage.getOrganizationSettings).toHaveBeenCalledWith('test-org-id');
    });

    it('should handle organization not found error', async () => {
      vi.mocked(storage.getOrganizationSettings).mockRejectedValue(new Error('Organization not found'));

      const response = await request(app)
        .get('/api/organizations/settings')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch organization settings',
      });
    });

    it('should exclude sensitive internal fields from response', async () => {
      const mockSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        // Internal fields that should be excluded
        internalField: 'should-not-be-in-response',
        secretKey: 'should-not-be-in-response',
      };

      vi.mocked(storage.getOrganizationSettings).mockResolvedValue(mockSettings as any);

      const response = await request(app)
        .get('/api/organizations/settings')
        .expect(200);

      expect(response.body).not.toHaveProperty('internalField');
      expect(response.body).not.toHaveProperty('secretKey');
    });
  });

  describe('PUT /api/organizations/settings', () => {
    it('should update organization settings with valid data', async () => {
      const updateData = {
        timezone: 'Europe/London',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        language: 'en-GB',
      };

      const mockUpdatedSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: null,
        ...updateData,
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.updateOrganizationSettings).mockResolvedValue(mockUpdatedSettings);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: null,
        timezone: 'Europe/London',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        language: 'en-GB',
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: mockUpdatedSettings.createdAt.toISOString(),
        updatedAt: mockUpdatedSettings.updatedAt.toISOString(),
      });

      expect(storage.updateOrganizationSettings).toHaveBeenCalledWith('test-org-id', updateData);
      expect(storage.createActivityEvent).toHaveBeenCalledWith({
        organizationId: 'test-org-id',
        entityType: 'organization',
        entityId: 'test-org-id',
        actorId: 'test-user-id',
        type: 'updated',
        description: 'Organization settings updated',
        metadata: {
          updatedFields: Object.keys(updateData),
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject invalid timezone format', async () => {
      const invalidData = {
        timezone: 'Invalid@Timezone#Format',
      };

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should reject invalid currency format', async () => {
      const invalidData = {
        currency: 'invalid',
      };

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should reject invalid date format', async () => {
      const invalidData = {
        dateFormat: 'INVALID_FORMAT',
      };

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should reject invalid language format', async () => {
      const invalidData = {
        language: 'invalid-language-format',
      };

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should require at least one field to be provided', async () => {
      const emptyData = {};

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(emptyData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        details: expect.any(Array),
      });

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = {
        timezone: 'Asia/Tokyo',
      };

      const mockUpdatedSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: null,
        timezone: 'Asia/Tokyo',
        currency: 'USD', // Unchanged
        dateFormat: 'YYYY-MM-DD', // Unchanged
        language: 'en', // Unchanged
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.updateOrganizationSettings).mockResolvedValue(mockUpdatedSettings);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      const response = await request(app)
        .put('/api/organizations/settings')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.timezone).toBe('Asia/Tokyo');
      expect(response.body.currency).toBe('USD'); // Unchanged
      expect(storage.updateOrganizationSettings).toHaveBeenCalledWith('test-org-id', partialUpdate);
    });
  });

  describe('POST /api/organizations/logo', () => {
    it('should upload organization logo successfully', async () => {
      const mockUpdatedOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        logo: '/uploads/logos/org-logo-1234567890.png',
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.updateOrganizationLogo).mockResolvedValue(mockUpdatedOrg as any);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/organizations/logo')
        .attach('logo', Buffer.from('fake-image-data'), 'test-logo.png')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logo uploaded successfully',
        logoUrl: expect.stringMatching(/^\/uploads\/logos\/org-logo-\d+\.png$/),
        organization: {
          id: 'test-org-id',
          name: 'Test Organization',
          logo: expect.stringMatching(/^\/uploads\/logos\/org-logo-\d+\.png$/),
          updatedAt: mockUpdatedOrg.updatedAt.toISOString(),
        },
      });

      expect(storage.updateOrganizationLogo).toHaveBeenCalledWith('test-org-id', expect.stringMatching(/^\/uploads\/logos\/org-logo-\d+\.png$/));
      expect(storage.createActivityEvent).toHaveBeenCalledWith({
        organizationId: 'test-org-id',
        entityType: 'organization',
        entityId: 'test-org-id',
        actorId: 'test-user-id',
        type: 'updated',
        description: 'Organization logo updated',
        metadata: {
          logoUrl: expect.stringMatching(/^\/uploads\/logos\/org-logo-\d+\.png$/),
          originalFilename: 'test-logo.png',
          fileSize: expect.any(Number),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        },
      });
    });

    it('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/organizations/logo')
        .attach('logo', Buffer.from('fake-pdf-data'), 'test-file.pdf')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid file type. Only image files are allowed.',
      });

      expect(storage.updateOrganizationLogo).not.toHaveBeenCalled();
    });

    it('should reject requests without file', async () => {
      const response = await request(app)
        .post('/api/organizations/logo')
        .expect(400);

      expect(response.body).toEqual({
        error: 'No file uploaded',
      });

      expect(storage.updateOrganizationLogo).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/organizations/logo', () => {
    it('should remove organization logo successfully', async () => {
      const mockCurrentOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        logo: '/uploads/logos/old-logo.png',
      };

      const mockUpdatedOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        logo: '',
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.getOrganizationSettings).mockResolvedValue(mockCurrentOrg as any);
      vi.mocked(storage.updateOrganizationLogo).mockResolvedValue(mockUpdatedOrg as any);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      const response = await request(app)
        .delete('/api/organizations/logo')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logo removed successfully',
        organization: {
          id: 'test-org-id',
          name: 'Test Organization',
          logo: '',
          updatedAt: mockUpdatedOrg.updatedAt.toISOString(),
        },
      });

      expect(storage.updateOrganizationLogo).toHaveBeenCalledWith('test-org-id', '');
      expect(storage.createActivityEvent).toHaveBeenCalledWith({
        organizationId: 'test-org-id',
        entityType: 'organization',
        entityId: 'test-org-id',
        actorId: 'test-user-id',
        type: 'updated',
        description: 'Organization logo removed',
        metadata: {
          previousLogoUrl: '/uploads/logos/old-logo.png',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle organization without existing logo', async () => {
      const mockCurrentOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        logo: null,
      };

      const mockUpdatedOrg = {
        id: 'test-org-id',
        name: 'Test Organization',
        logo: '',
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.getOrganizationSettings).mockResolvedValue(mockCurrentOrg as any);
      vi.mocked(storage.updateOrganizationLogo).mockResolvedValue(mockUpdatedOrg as any);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      const response = await request(app)
        .delete('/api/organizations/logo')
        .expect(200);

      expect(response.body.organization.logo).toBe('');
    });
  });

  describe('Security and Compliance', () => {
    it('should implement data minimization in API responses', async () => {
      const mockSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        // Internal sensitive fields
        internalApiKey: 'secret-key',
        databaseCredentials: 'db-credentials',
        auditLogs: ['sensitive-data'],
      };

      vi.mocked(storage.getOrganizationSettings).mockResolvedValue(mockSettings as any);

      const response = await request(app)
        .get('/api/organizations/settings')
        .expect(200);

      // Verify sensitive fields are excluded
      expect(response.body).not.toHaveProperty('internalApiKey');
      expect(response.body).not.toHaveProperty('databaseCredentials');
      expect(response.body).not.toHaveProperty('auditLogs');
    });

    it('should validate input sanitization', async () => {
      const maliciousInputs = [
        { timezone: '<script>alert("xss")</script>' },
        { currency: 'DROP TABLE organizations;' },
        { language: '../../../etc/passwd' },
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .put('/api/organizations/settings')
          .send(input)
          .expect(400);

        expect(response.body).toEqual({
          error: 'Validation error',
          details: expect.any(Array),
        });
      }

      expect(storage.updateOrganizationSettings).not.toHaveBeenCalled();
    });

    it('should handle concurrent requests safely', async () => {
      const updateData = { timezone: 'Europe/Paris' };
      const mockUpdatedSettings = {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        logo: null,
        timezone: 'Europe/Paris',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
        businessHours: {
          monday: { enabled: true, open: '09:00', close: '17:00' },
          tuesday: { enabled: true, open: '09:00', close: '17:00' },
          wednesday: { enabled: true, open: '09:00', close: '17:00' },
          thursday: { enabled: true, open: '09:00', close: '17:00' },
          friday: { enabled: true, open: '09:00', close: '17:00' },
          saturday: { enabled: false, open: '09:00', close: '17:00' },
          sunday: { enabled: false, open: '09:00', close: '17:00' },
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(storage.updateOrganizationSettings).mockResolvedValue(mockUpdatedSettings);
      vi.mocked(storage.createActivityEvent).mockResolvedValue({} as any);

      // Send multiple concurrent requests
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .put('/api/organizations/settings')
          .send(updateData)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.timezone).toBe('Europe/Paris');
      });

      // Should have called storage methods for each request
      expect(storage.updateOrganizationSettings).toHaveBeenCalledTimes(5);
      expect(storage.createActivityEvent).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle validation efficiently', async () => {
      const startTime = Date.now();
      
      // Simulate 100 validation operations
      for (let i = 0; i < 100; i++) {
        updateOrganizationSettingsSchema.safeParse({
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          language: 'en-US',
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle large business hours configurations efficiently', async () => {
      const complexBusinessHours = {
        monday: { enabled: true, open: '09:00', close: '17:00' },
        tuesday: { enabled: true, open: '09:00', close: '17:00' },
        wednesday: { enabled: true, open: '09:00', close: '17:00' },
        thursday: { enabled: true, open: '09:00', close: '17:00' },
        friday: { enabled: true, open: '09:00', close: '17:00' },
        saturday: { enabled: false, open: '09:00', close: '17:00' },
        sunday: { enabled: false, open: '09:00', close: '17:00' },
      };

      const startTime = Date.now();
      
      // Simulate 50 business hours validations
      for (let i = 0; i < 50; i++) {
        updateOrganizationSettingsSchema.safeParse({
          businessHours: complexBusinessHours,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 50 validations in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
