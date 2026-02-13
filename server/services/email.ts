// AI-META-BEGIN
// AI-META: Email service with 2026 best practices
// OWNERSHIP: server/services
// ENTRYPOINTS: API routes for sending emails
// DEPENDENCIES: nodemailer, email-templates, pug
// DANGER: Email deliverability and security
// CHANGE-SAFETY: Review email templates and provider configuration
// TESTS: unit tests for email rendering and sending
// AI-META-END

/**
 * Email service implementing 2026 best practices
 * 
 * Features:
 * - Template-based email rendering with Pug
 * - Development preview with preview-email
 * - Multi-provider support (Mailtrap dev, AWS SES prod)
 * - Security and deliverability optimization
 * - Comprehensive error handling and logging
 */

import nodemailer from 'nodemailer';
import Email from 'email-templates';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEmailConfig, getEmailSettings } from '../config/email';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EmailData {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, any>;
  from?: string;
  replyTo?: string;
}

export interface InvitationEmailData {
  email: string;
  inviterName: string;
  organizationName: string;
  roleName: string;
  invitationToken: string;
  expiresAt: Date;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private emailTemplate: Email;

  constructor() {
    const config = getEmailConfig();
    const settings = getEmailSettings();
    
    this.transporter = nodemailer.createTransporter(config);
    
    this.emailTemplate = new Email({
      message: {
        from: settings.fromEmail
      },
      send: true,
      preview: process.env.NODE_ENV === 'development',
      transport: this.transporter,
      views: {
        root: path.join(__dirname, '../templates'),
        options: {
          extension: 'pug'
        }
      }
    });
  }

  /**
   * Send invitation email with secure token
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    try {
      const settings = getEmailSettings();
      const invitationUrl = `${settings.frontendUrl}/invite/${data.invitationToken}`;
      
      await this.emailTemplate.send({
        template: 'invitation',
        message: {
          to: data.email,
          subject: `You're invited to join ${data.organizationName} on UBOS`,
          replyTo: settings.supportEmail
        },
        locals: {
          inviterName: data.inviterName,
          organizationName: data.organizationName,
          roleName: data.roleName,
          invitationUrl,
          expiresAt: data.expiresAt.toLocaleDateString(),
          currentYear: new Date().getFullYear()
        }
      });

      console.log(`Invitation email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send generic email using template
   */
  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      await this.emailTemplate.send({
        template: emailData.template,
        message: {
          to: emailData.to,
          subject: emailData.subject,
          from: emailData.from,
          replyTo: emailData.replyTo
        },
        locals: emailData.data || {}
      });

      console.log(`Email sent to ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }

  /**
   * Get email service status
   */
  getStatus() {
    return {
      configured: !!(process.env.MAILTRAP_USER || process.env.AWS_SES_USER),
      environment: process.env.NODE_ENV || 'development',
      preview: process.env.NODE_ENV === 'development'
    };
  }
}

// Singleton instance
export const emailService = new EmailService();

// Initialize connection verification
if (process.env.NODE_ENV !== 'test') {
  emailService.verifyConnection();
}
