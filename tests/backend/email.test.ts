import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { emailService } from "../../server/services/email";
import { validateEmailConfig } from "../../server/config/email";

describe("Email Service", () => {
  beforeEach(() => {
    // Mock environment variables for testing
    process.env.NODE_ENV = "test";
    process.env.MAILTRAP_HOST = "localhost";
    process.env.MAILTRAP_PORT = "1025";
    process.env.MAILTRAP_USER = "test-user";
    process.env.MAILTRAP_PASS = "test-pass";
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.FROM_EMAIL = "test@ubos.pro";
    process.env.SUPPORT_EMAIL = "support@ubos.pro";
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.MAILTRAP_HOST;
    delete process.env.MAILTRAP_PORT;
    delete process.env.MAILTRAP_USER;
    delete process.env.MAILTRAP_PASS;
    delete process.env.FRONTEND_URL;
    delete process.env.FROM_EMAIL;
    delete process.env.SUPPORT_EMAIL;
  });

  describe("Configuration", () => {
    it("should validate email configuration with valid environment variables", () => {
      expect(validateEmailConfig()).toBe(true);
    });

    it("should fail validation with missing environment variables", () => {
      delete process.env.MAILTRAP_USER;
      expect(validateEmailConfig()).toBe(false);
    });

    it("should return service status", () => {
      const status = emailService.getStatus();
      expect(status).toHaveProperty("configured");
      expect(status).toHaveProperty("environment");
      expect(status).toHaveProperty("preview");
    });
  });

  describe("Invitation Email", () => {
    it("should send invitation email with valid data", async () => {
      const invitationData = {
        email: "test@example.com",
        inviterName: "John Doe",
        organizationName: "Acme Corp",
        roleName: "Team Member",
        invitationToken: "test-token-123",
        expiresAt: new Date("2026-02-20")
      };

      // In test environment, this should not throw
      await expect(
        emailService.sendInvitationEmail(invitationData)
      ).resolves.not.toThrow();
    });

    it("should handle invalid email addresses", async () => {
      const invitationData = {
        email: "invalid-email",
        inviterName: "John Doe",
        organizationName: "Acme Corp",
        roleName: "Team Member",
        invitationToken: "test-token-123",
        expiresAt: new Date("2026-02-20")
      };

      await expect(
        emailService.sendInvitationEmail(invitationData)
      ).rejects.toThrow("Email delivery failed");
    });

    it("should include all required template variables", async () => {
      const invitationData = {
        email: "test@example.com",
        inviterName: "John Doe",
        organizationName: "Acme Corp",
        roleName: "Team Member",
        invitationToken: "test-token-123",
        expiresAt: new Date("2026-02-20")
      };

      // Mock console.log to verify email send
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await emailService.sendInvitationEmail(invitationData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invitation email sent to test@example.com")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Generic Email", () => {
    it("should send generic template email", async () => {
      const emailData = {
        to: "test@example.com",
        subject: "Test Email",
        template: "test-template",
        data: {
          userName: "Test User",
          message: "Hello World"
        }
      };

      await expect(
        emailService.sendEmail(emailData)
      ).resolves.not.toThrow();
    });

    it("should handle multiple recipients", async () => {
      const emailData = {
        to: ["user1@example.com", "user2@example.com"],
        subject: "Test Email",
        template: "test-template",
        data: {}
      };

      await expect(
        emailService.sendEmail(emailData)
      ).resolves.not.toThrow();
    });
  });

  describe("Connection Verification", () => {
    it("should verify connection status", async () => {
      const isConnected = await emailService.verifyConnection();
      expect(typeof isConnected).toBe("boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle template not found errors", async () => {
      const emailData = {
        to: "test@example.com",
        subject: "Test",
        template: "non-existent-template",
        data: {}
      };

      await expect(
        emailService.sendEmail(emailData)
      ).rejects.toThrow("Email delivery failed");
    });

    it("should log errors appropriately", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const invalidData = {
        email: "invalid-email",
        inviterName: "John",
        organizationName: "Acme",
        roleName: "Member",
        invitationToken: "token",
        expiresAt: new Date()
      };

      try {
        await emailService.sendInvitationEmail(invalidData);
      } catch {
        // Expected to fail
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to send invitation email:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
