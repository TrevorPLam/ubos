// AI-META-BEGIN
// AI-META: Comprehensive file storage security tests
// OWNERSHIP: tests/backend
// ENTRYPOINTS: npm run test:backend
// DEPENDENCIES: vitest, file-storage service, multer
// DANGER: File system operations during testing
// CHANGE-SAFETY: Review changes carefully - test file operations
// TESTS: npm run test:backend file-storage
// AI-META-END

/**
 * Comprehensive file storage security tests implementing 2026 best practices.
 *
 * Test Coverage:
 * - File validation (extension, MIME type, signature)
 * - Path traversal prevention
 * - Filename security
 * - Size limits
 * - Organization isolation
 * - File optimization
 * - Error handling
 * - Security vulnerabilities
 *
 * Security Standards:
 * - OWASP File Upload Cheat Sheet 2026
 * - Path traversal prevention
 * - File signature validation
 * - Input validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  validateFile, 
  generateSecureFilename, 
  isValidFilename,
  validateFileSignature,
  getSecureFilePath,
  ALLOWED_FILE_TYPES,
  type FileCategory
} from '../../server/services/file-storage';

describe('File Storage Security', () => {
  describe('validateFile', () => {
    it('should accept valid image files', () => {
      const result = validateFile('test.jpg', 'image/jpeg', 1024 * 1024, 'image');
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.extension).toBe('.jpg');
    });

    it('should reject invalid extensions', () => {
      const result = validateFile('test.exe', 'application/octet-stream', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject invalid MIME types', () => {
      const result = validateFile('test.jpg', 'application/pdf', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });

    it('should reject files that are too large', () => {
      const result = validateFile('test.jpg', 'image/jpeg', 10 * 1024 * 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject dangerous filenames', () => {
      const result = validateFile('../../../etc/passwd.jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid filename format');
    });

    it('should reject filenames with null bytes', () => {
      const result = validateFile('test\0.jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid filename format');
    });

    it('should reject hidden files', () => {
      const result = validateFile('.hidden.jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid filename format');
    });

    it('should reject overly long filenames', () => {
      const longName = 'a'.repeat(256) + '.jpg';
      const result = validateFile(longName, 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid filename format');
    });
  });

  describe('generateSecureFilename', () => {
    it('should generate unique filenames with correct extension', () => {
      const filename1 = generateSecureFilename('test.jpg');
      const filename2 = generateSecureFilename('test.jpg');
      
      expect(filename1).toMatch(/^[a-z0-9-]+\.jpg$/);
      expect(filename2).toMatch(/^[a-z0-9-]+\.jpg$/);
      expect(filename1).not.toBe(filename2); // Should be unique
    });

    it('should preserve original extension case-insensitively', () => {
      const filename1 = generateSecureFilename('test.JPG');
      const filename2 = generateSecureFilename('test.png');
      
      expect(filename1).toMatch(/\.jpg$/);
      expect(filename2).toMatch(/\.png$/);
    });

    it('should handle files without extensions', () => {
      const filename = generateSecureFilename('test');
      expect(filename).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('isValidFilename', () => {
    it('should accept safe filenames', () => {
      expect(isValidFilename('test.jpg')).toBe(true);
      expect(isValidFilename('my-file-123.png')).toBe(true);
      expect(isValidFilename('file_with_underscores.gif')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(isValidFilename('../test.jpg')).toBe(false);
      expect(isValidFilename('..\\test.jpg')).toBe(false);
      expect(isValidFilename('folder/../test.jpg')).toBe(false);
      expect(isValidFilename('/etc/passwd')).toBe(false);
    });

    it('should reject dangerous characters', () => {
      expect(isValidFilename('test<file>.jpg')).toBe(false);
      expect(isValidFilename('test|file.jpg')).toBe(false);
      expect(isValidFilename('test?file.jpg')).toBe(false);
      expect(isValidFilename('test*file.jpg')).toBe(false);
      expect(isValidFilename('test"file.jpg')).toBe(false);
      expect(isValidFilename('test\0file.jpg')).toBe(false);
    });

    it('should reject hidden files', () => {
      expect(isValidFilename('.hidden.jpg')).toBe(false);
      expect(isValidFilename('..jpg')).toBe(false);
    });

    it('should reject files starting with hyphen or space', () => {
      expect(isValidFilename('-test.jpg')).toBe(false);
      expect(isValidFilename(' test.jpg')).toBe(false);
    });

    it('should reject overly long filenames', () => {
      const longName = 'a'.repeat(256) + '.jpg';
      expect(isValidFilename(longName)).toBe(false);
    });
  });

  describe('validateFileSignature', () => {
    it('should validate JPEG signatures', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      expect(validateFileSignature(jpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('should validate PNG signatures', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
      expect(validateFileSignature(pngBuffer, 'image/png')).toBe(true);
    });

    it('should validate GIF signatures', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(validateFileSignature(gifBuffer, 'image/gif')).toBe(true);
    });

    it('should reject mismatched signatures', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF]);
      expect(validateFileSignature(jpegBuffer, 'image/png')).toBe(false);
    });

    it('should reject invalid signatures', () => {
      const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(validateFileSignature(invalidBuffer, 'image/jpeg')).toBe(false);
    });

    it('should handle buffers shorter than signature', () => {
      const shortBuffer = Buffer.from([0xFF]);
      expect(validateFileSignature(shortBuffer, 'image/jpeg')).toBe(false);
    });
  });

  describe('getSecureFilePath', () => {
    it('should construct valid file paths', () => {
      const path = getSecureFilePath('image', 'org-123', 'test-abc123.jpg');
      expect(path).toContain('uploads');
      expect(path).toContain('image');
      expect(path).toContain('org-123');
      expect(path).toContain('test-abc123.jpg');
    });

    it('should reject invalid filename formats', () => {
      expect(() => {
        getSecureFilePath('image', 'org-123', '../etc/passwd');
      }).toThrow('Invalid filename format');

      expect(() => {
        getSecureFilePath('image', 'org-123', 'test<script>.jpg');
      }).toThrow('Invalid filename format');
    });

    it('should prevent path traversal', () => {
      expect(() => {
        getSecureFilePath('image', 'org-123', '../../../etc/passwd.jpg');
      }).toThrow('Invalid filename format'); // Gets caught by filename validation first
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle double extension attempts', () => {
      const result = validateFile('test.jpg.php', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
    });

    it('should handle null byte injection attempts', () => {
      const result = validateFile('test.jpg\0.php', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
    });

    it('should handle Unicode bypass attempts', () => {
      const result = validateFile('test｡jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(false);
    });

    it('should handle case variation bypass attempts', () => {
      const result = validateFile('test.JpG', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(true); // Should accept valid case variations
    });

    it('should handle MIME type spoofing', () => {
      const result = validateFile('test.jpg', 'application/x-php', 1024, 'image');
      expect(result.isValid).toBe(false);
    });
  });

  describe('File Category Validation', () => {
    it('should validate allowed categories', () => {
      expect(ALLOWED_FILE_TYPES.image).toBeDefined();
      expect(ALLOWED_FILE_TYPES.image.extensions).toContain('.jpg');
      expect(ALLOWED_FILE_TYPES.image.mimeTypes).toContain('image/jpeg');
    });

    it('should enforce category-specific rules', () => {
      const result = validateFile('test.jpg', 'image/jpeg', 1024, 'image');
      expect(result.isValid).toBe(true);

      // Test that non-image categories would be rejected
      const invalidResult = validateFile('test.jpg', 'image/jpeg', 1024, 'nonexistent' as any);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('Invalid file category');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of filename generations efficiently', () => {
      const start = Date.now();
      const filenames = new Set();
      
      for (let i = 0; i < 1000; i++) {
        const filename = generateSecureFilename('test.jpg');
        filenames.add(filename);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(filenames.size).toBe(1000); // All should be unique
    });

    it('should validate files efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        validateFile(`test${i}.jpg`, 'image/jpeg', 1024, 'image');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});
