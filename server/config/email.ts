// AI-META-BEGIN
// AI-META: Email configuration management
// OWNERSHIP: server/config
// ENTRYPOINTS: email service initialization
// DEPENDENCIES: environment variables
// DANGER: Email credentials exposure
// CHANGE-SAFETY: Review environment variable handling
// TESTS: configuration validation tests
// AI-META-END

/**
 * Email configuration with environment-based provider selection
 * 
 * Security considerations:
 * - Never commit actual credentials to version control
 * - Use environment-specific configurations
 * - Validate required environment variables
 */

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailSettings {
  fromEmail: string;
  supportEmail: string;
  frontendUrl: string;
}

/**
 * Get email configuration based on environment
 */
export function getEmailConfig(): EmailConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // AWS SES for production
    const requiredVars = ['AWS_SES_HOST', 'AWS_SES_USER', 'AWS_SES_PASS'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required AWS SES environment variables: ${missing.join(', ')}`);
    }
    
    return {
      host: process.env.AWS_SES_HOST!,
      port: parseInt(process.env.AWS_SES_PORT || '587'),
      secure: true,
      auth: {
        user: process.env.AWS_SES_USER!,
        pass: process.env.AWS_SES_PASS!
      }
    };
  } else {
    // Mailtrap for development
    const requiredVars = ['MAILTRAP_HOST', 'MAILTRAP_USER', 'MAILTRAP_PASS'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.warn(`Missing Mailtrap environment variables: ${missing.join(', ')}`);
      console.warn('Emails will be logged to console only');
      
      // Return mock config for development without credentials
      return {
        host: 'localhost',
        port: 1025,
        secure: false,
        auth: {
          user: 'mock',
          pass: 'mock'
        }
      };
    }
    
    return {
      host: process.env.MAILTRAP_HOST!,
      port: parseInt(process.env.MAILTRAP_PORT || '2525'),
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER!,
        pass: process.env.MAILTRAP_PASS!
      }
    };
  }
}

/**
 * Get email settings
 */
export function getEmailSettings(): EmailSettings {
  return {
    fromEmail: process.env.FROM_EMAIL || 'noreply@ubos.pro',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@ubos.pro',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  };
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): boolean {
  try {
    getEmailConfig();
    getEmailSettings();
    return true;
  } catch {
    return false;
  }
}
