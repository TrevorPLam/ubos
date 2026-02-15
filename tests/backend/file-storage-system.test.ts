// AI-META-BEGIN
// AI-META: Comprehensive file storage system tests for 2026 best practices
// OWNERSHIP: tests/backend
// ENTRYPOINTS: npm run test:backend file-storage
// DEPENDENCIES: vitest, file-storage service, maintenance utilities
// DANGER: File operations in tests
// CHANGE-SAFETY: Review changes carefully - test file operations
// TESTS: npm run test:backend file-storage
// AI-META-END

/**
 * Comprehensive file storage system tests following 2026 best practices.
 *
 * Test Coverage:
 * - File upload and validation
 * - Security measures (path traversal, file signature validation)
 * - Storage metrics and maintenance
 * - Orphaned file cleanup
 * - File integrity validation
 * - Storage quota monitoring
 *
 * Security Standards:
 * - OWASP File Upload Cheat Sheet 2026
 * - Path traversal prevention
 * - File signature validation
 * - Content-Type validation
 * - Filename sanitization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileStorageService, validateFile, generateSecureFilename, validateFileSignature } from '../../server/services/file-storage';
import { cleanupOrphanedFiles, validateFileIntegrity, checkStorageQuotas } from '../../server/utils/file-storage-maintenance';
import { storage } from '../../server/storage';
import fs from 'fs/promises';
import path from 'path';

describe('FileStorageService - 2026 Best Practices', () => {
  const testOrgId = 'test-org-123';
  const testUserId = 'test-user-123';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'image', testOrgId);

  beforeEach(async () => {
    // Create test upload directory
    await fs.mkdir(uploadsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        await fs.unlink(path.join(uploadsDir, file));
      }
      await fs.rmdir(uploadsDir);
    } catch {
      // Directory might not exist
    }
  });

  describe('File Validation - Security First', () => {
    it('should validate allowed file types', () => {
      const result = validateFile('test.jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.extension).toBe('.jpg');
    });

    it('should reject invalid file extensions', () => {
      const result = validateFile('test.exe', 'application/octet-stream', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject invalid MIME types', () => {
      const result = validateFile('test.jpg', 'application/pdf', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });

    it('should reject oversized files', () => {
      const result = validateFile('test.jpg', 'image/jpeg', 10 * 1024 * 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject dangerous filenames', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file<script>alert(1)</script>.jpg',
        'file|.jpg',
        'file?.jpg',
        'file*.jpg',
        '.hidden.jpg',
        '-file.jpg',
        ' file.jpg'
      ];

      dangerousNames.forEach(filename => {
        const result = validateFile(filename, 'image/jpeg', 1024, 'image');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid filename format');
      });
    });
  });

  describe('File Signature Validation - Content Security', () => {
    it('should validate JPEG file signatures', () => {
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const isValid = validateFileSignature(jpegSignature, 'image/jpeg');
      expect(isValid).toBe(true);
    });

    it('should validate PNG file signatures', () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const isValid = validateFileSignature(pngSignature, 'image/png');
      expect(isValid).toBe(true);
    });

    it('should reject mismatched file signatures', () => {
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const isValid = validateFileSignature(jpegSignature, 'image/png');
      expect(isValid).toBe(false);
    });
  });

  describe('Secure Filename Generation', () => {
    it('should generate cryptographically secure filenames', () => {
      const filename1 = generateSecureFilename('test.jpg');
      const filename2 = generateSecureFilename('test.jpg');
      
      expect(filename1).toMatch(/^[a-z0-9-]+\.jpg$/i);
      expect(filename2).toMatch(/^[a-z0-9-]+\.jpg$/i);
      expect(filename1).not.toBe(filename2); // Should be unique
    });

    it('should preserve file extensions', () => {
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      extensions.forEach(ext => {
        const filename = generateSecureFilename(`test${ext}`);
        expect(filename).toMatch(new RegExp(`${ext}$`));
      });
    });
  });

  describe('File Upload Integration', () => {
    it('should upload and process files successfully', async () => {
      const testBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG signature
      
      const uploadedFile = await fileStorageService.uploadFile(
        testBuffer,
        'test.jpg',
        'image/jpeg',
        {
          category: 'image',
          organizationId: testOrgId,
          userId: testUserId,
          optimize: false // Disable optimization for test
        }
      );

      expect(uploadedFile.originalName).toBe('test.jpg');
      expect(uploadedFile.mimeType).toBe('image/jpeg');
      expect(uploadedFile.category).toBe('image');
      expect(uploadedFile.organizationId).toBe(testOrgId);
      expect(uploadedFile.url).toMatch(/^\/uploads\/image\/test-org-123\/[a-z0-9-]+\.jpg$/);
      
      // Verify file exists on disk
      const fileExists = await fs.access(uploadedFile.path).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should reject files with invalid signatures', async () => {
      const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]); // Invalid signature
      
      await expect(
        fileStorageService.uploadFile(
          invalidBuffer,
          'test.jpg',
          'image/jpeg',
          {
            category: 'image',
            organizationId: testOrgId,
            userId: testUserId
          }
        )
      ).rejects.toThrow('File signature does not match MIME type');
    });
  });

  describe('File Statistics and Metrics', () => {
    it('should provide accurate file statistics', async () => {
      const testBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      
      // Upload a test file
      await fileStorageService.uploadFile(
        testBuffer,
        'test.jpg',
        'image/jpeg',
        {
          category: 'image',
          organizationId: testOrgId,
          userId: testUserId,
          optimize: false
        }
      );

      const stats = await fileStorageService.getFileStatistics(testOrgId);
      
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byCategory.image.count).toBe(1);
      expect(stats.byCategory.image.size).toBeGreaterThan(0);
    });
  });
});

describe('File Storage Maintenance - 2026 Best Practices', () => {
  const testOrgId = 'test-org-maintenance';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'image', testOrgId);

  beforeEach(async () => {
    await fs.mkdir(uploadsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        await fs.unlink(path.join(uploadsDir, file));
      }
      await fs.rmdir(uploadsDir);
    } catch {
      // Directory might not exist
    }
  });

  describe('Orphaned File Cleanup', () => {
    it('should identify orphaned files in dry run mode', async () => {
      // Create a test file on disk without database record
      const orphanedFile = path.join(uploadsDir, 'orphaned.jpg');
      await fs.writeFile(orphanedFile, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      const result = await cleanupOrphanedFiles({
        dryRun: true,
        organizationId: testOrgId
      });

      expect(result.deletedFiles).toContain(orphanedFile);
      expect(result.errors).toHaveLength(0);
      expect(result.totalSpaceFreed).toBeGreaterThan(0);
    });

    it('should delete orphaned files in production mode', async () => {
      // Create a test file on disk without database record
      const orphanedFile = path.join(uploadsDir, 'orphaned.jpg');
      await fs.writeFile(orphanedFile, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      const result = await cleanupOrphanedFiles({
        dryRun: false,
        organizationId: testOrgId
      });

      expect(result.deletedFiles).toContain(orphanedFile);
      expect(result.errors).toHaveLength(0);
      
      // Verify file was actually deleted
      const fileExists = await fs.access(orphanedFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  describe('File Integrity Validation', () => {
    it('should detect missing files', async () => {
      // Create a database record without actual file
      const mockFileObject = {
        id: 'test-file-id',
        organizationId: testOrgId,
        name: 'missing.jpg',
        originalName: 'missing.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        path: path.join(uploadsDir, 'missing.jpg'),
        folder: '/image',
        isClientVisible: false,
        uploadedById: 'test-user'
      };

      // Mock storage.getFileObjects to return our test file
      const originalGetFileObjects = storage.getFileObjects;
      storage.getFileObjects = vi.fn().mockResolvedValue([mockFileObject]);

      const result = await validateFileIntegrity(testOrgId);

      expect(result.missingFiles).toHaveLength(1);
      expect(result.missingFiles[0].id).toBe('test-file-id');
      expect(result.missingFiles[0].path).toContain('missing.jpg');

      // Restore original method
      storage.getFileObjects = originalGetFileObjects;
    });
  });

  describe('Storage Quota Monitoring', () => {
    it('should calculate storage usage correctly', async () => {
      // Mock the file storage service to return test statistics
      const originalGetFileStatistics = fileStorageService.getFileStatistics;
      fileStorageService.getFileStatistics = vi.fn().mockResolvedValue({
        totalFiles: 5,
        totalSize: 10 * 1024 * 1024, // 10MB
        byCategory: {
          image: { count: 5, size: 10 * 1024 * 1024 }
        }
      });

      // Mock getUserOrganization
      const originalGetUserOrganization = storage.getUserOrganization;
      storage.getUserOrganization = vi.fn().mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await checkStorageQuotas(100); // 100MB quota

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].organizationId).toBe(testOrgId);
      expect(result.organizations[0].usageMB).toBe(10);
      expect(result.organizations[0].quotaMB).toBe(100);
      expect(result.organizations[0].usagePercentage).toBe(10);
      expect(result.organizations[0].status).toBe('normal');

      // Restore original methods
      fileStorageService.getFileStatistics = originalGetFileStatistics;
      storage.getUserOrganization = originalGetUserOrganization;
    });

    it('should set warning status at 75% usage', async () => {
      const originalGetFileStatistics = fileStorageService.getFileStatistics;
      fileStorageService.getFileStatistics = vi.fn().mockResolvedValue({
        totalFiles: 5,
        totalSize: 80 * 1024 * 1024, // 80MB
        byCategory: { image: { count: 5, size: 80 * 1024 * 1024 } }
      });

      const originalGetUserOrganization = storage.getUserOrganization;
      storage.getUserOrganization = vi.fn().mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await checkStorageQuotas(100);

      expect(result.organizations[0].status).toBe('warning');

      // Restore original methods
      fileStorageService.getFileStatistics = originalGetFileStatistics;
      storage.getUserOrganization = originalGetUserOrganization;
    });

    it('should set critical status at 90% usage', async () => {
      const originalGetFileStatistics = fileStorageService.getFileStatistics;
      fileStorageService.getFileStatistics = vi.fn().mockResolvedValue({
        totalFiles: 5,
        totalSize: 95 * 1024 * 1024, // 95MB
        byCategory: { image: { count: 5, size: 95 * 1024 * 1024 } }
      });

      const originalGetUserOrganization = storage.getUserOrganization;
      storage.getUserOrganization = vi.fn().mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await checkStorageQuotas(100);

      expect(result.organizations[0].status).toBe('critical');

      // Restore original methods
      fileStorageService.getFileStatistics = originalGetFileStatistics;
      storage.getUserOrganization = originalGetUserOrganization;
    });
  });
});

describe('File Storage Security - 2026 Best Practices', () => {
  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal in filename generation', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\SAM'
      ];

      dangerousNames.forEach(filename => {
        expect(() => generateSecureFilename(filename)).not.toThrow();
        const secureFilename = generateSecureFilename(filename);
        expect(secureFilename).not.toContain('..');
        expect(secureFilename).not.toContain('/');
        expect(secureFilename).not.toContain('\\');
      });
    });
  });

  describe('File Type Security', () => {
    it('should enforce strict file type validation', () => {
      const maliciousFiles = [
        { name: 'malware.exe', mime: 'application/octet-stream' },
        { name: 'script.js', mime: 'application/javascript' },
        { name: 'payload.php', mime: 'application/x-php' },
        { name: 'backdoor.sh', mime: 'application/x-sh' }
      ];

      maliciousFiles.forEach(file => {
        const result = validateFile(file.name, file.mime, 1024, 'image');
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Size Limit Enforcement', () => {
    it('should enforce file size limits', () => {
      const largeFile = {
        name: 'huge.jpg',
        mime: 'image/jpeg',
        size: 10 * 1024 * 1024 // 10MB
      };

      const result = validateFile(largeFile.name, largeFile.mime, largeFile.size, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
    });
  });
});
