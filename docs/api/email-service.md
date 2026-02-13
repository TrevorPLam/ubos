# Email Service Documentation

## Overview

The UBOS Email Service implements 2026 best practices for transactional email delivery with comprehensive template management, multi-provider support, and security-first design.

**Features:**
- Template-based email rendering with Pug
- Development preview with automatic browser opening
- Multi-provider support (Mailtrap for dev, AWS SES for production)
- Security and deliverability optimization
- Comprehensive error handling and logging
- Environment-based configuration management

---

## Architecture

### Service Components

```
server/
├── services/
│   └── email.ts              # Core email service
├── config/
│   └── email.ts              # Configuration management
└── templates/
    ├── invitation.pug         # Invitation email template
    └── styles/
        └── email.css          # Email client-compatible CSS
```

### Email Providers

| Environment | Provider | Purpose | Configuration |
|-------------|-----------|---------|---------------|
| Development | Mailtrap | Email testing and preview | `MAILTRAP_*` environment variables |
| Production | AWS SES | High-volume delivery | `AWS_SES_*` environment variables |

---

## Configuration

### Environment Variables

#### Development (Mailtrap)
```bash
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your-mailtrap-user
MAILTRAP_PASS=your-mailtrap-password
```

#### Production (AWS SES)
```bash
AWS_SES_HOST=email-smtp.us-east-1.amazonaws.com
AWS_SES_PORT=587
AWS_SES_USER=your-aws-ses-smtp-user
AWS_SES_PASS=your-aws-ses-smtp-password
```

#### General Settings
```bash
NODE_ENV=development|production
FRONTEND_URL=http://localhost:5173
FROM_EMAIL=noreply@ubos.pro
SUPPORT_EMAIL=support@ubos.pro
```

---

## Usage

### Sending Invitation Emails

```typescript
import { emailService } from '../services/email';

await emailService.sendInvitationEmail({
  email: 'user@example.com',
  inviterName: 'John Doe',
  organizationName: 'Acme Corp',
  roleName: 'Team Member',
  invitationToken: 'uuid-v4-token',
  expiresAt: new Date('2026-02-20')
});
```

### Sending Generic Template Emails

```typescript
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to UBOS',
  template: 'welcome',
  data: {
    userName: 'John Doe',
    organizationName: 'Acme Corp'
  }
});
```

---

## Templates

### Template Structure

Email templates use Pug for server-side rendering with embedded CSS for maximum client compatibility.

#### Template Variables
- `{{variable}}` - Basic variable interpolation
- Conditionals and loops supported via Pug syntax

#### CSS Best Practices
- Inline CSS for email client compatibility
- Responsive design with media queries
- Outlook-specific fixes via MSO properties
- Fallback styles for older clients

### Creating New Templates

1. Create `.pug` file in `server/templates/`
2. Use existing templates as reference
3. Test with `preview-email` in development
4. Add responsive CSS as needed

---

## Security Features

### Deliverability Optimization
- SPF, DKIM, and DMARC alignment
- Proper email headers and formatting
- Bounce and complaint handling
- Rate limiting per provider

### Data Protection
- No sensitive data in templates
- Secure token generation and handling
- Environment-based credential management
- Audit logging for all email sends

---

## Development Workflow

### Local Development
1. Set up Mailtrap account and credentials
2. Configure environment variables
3. Templates automatically preview in browser
4. Console logging for email sends

### Testing
```typescript
// Verify email configuration
const isValid = await emailService.verifyConnection();

// Get service status
const status = emailService.getStatus();
```

### Production Deployment
1. Configure AWS SES with verified domains
2. Set production environment variables
3. Test email delivery with sample sends
4. Monitor bounce/complaint rates

---

## Error Handling

### Common Error Scenarios

| Error Type | Cause | Resolution |
|------------|--------|------------|
| Configuration missing | Environment variables not set | Verify `.env` file setup |
| Authentication failed | Invalid SMTP credentials | Check provider credentials |
| Template not found | Missing template file | Verify template path and name |
| Rendering failed | Invalid template syntax | Check Pug template syntax |

### Error Response Format

```typescript
{
  message: "Email delivery failed",
  details: "SMTP authentication failed"
}
```

---

## Monitoring and Analytics

### Email Metrics
- Send success/failure rates
- Delivery times by provider
- Bounce and complaint tracking
- Template rendering performance

### Logging
- All email sends logged with context
- Error details with stack traces
- Performance metrics for optimization

---

## Best Practices

### Template Design
- Keep email width under 600px
- Use web-safe fonts
- Optimize images for email clients
- Include plain text fallback

### Content Guidelines
- Personalize with recipient data
- Clear call-to-action buttons
- Mobile-first responsive design
- Accessibility compliance (WCAG)

### Performance
- Cache compiled templates
- Batch sends where possible
- Monitor provider rate limits
- Implement retry logic for failures

---

## Troubleshooting

### Common Issues

**Emails not sending in development**
- Verify Mailtrap credentials
- Check environment variables
- Ensure `NODE_ENV=development`

**Templates not rendering**
- Check Pug syntax errors
- Verify template file paths
- Review CSS for compatibility issues

**Delivery failures in production**
- Verify AWS SES configuration
- Check domain verification status
- Monitor sending reputation

### Debug Mode

Enable detailed logging:
```bash
DEBUG=email:* npm run dev
```

---

## Integration Examples

### With Invitation API
```typescript
// In invitation creation endpoint
await emailService.sendInvitationEmail({
  email: validatedData.email,
  inviterName: user.firstName,
  organizationName: org.name,
  roleName: role.name,
  invitationToken: token,
  expiresAt: expiresAt
});
```

### With Notification System
```typescript
// For user notifications
await emailService.sendEmail({
  to: user.email,
  subject: 'New Project Assignment',
  template: 'project-assignment',
  data: {
    projectName: project.name,
    dueDate: project.dueDate,
    assignerName: assigner.name
  }
});
```

---

## Dependencies

### Required Packages
- `nodemailer` - Email transport
- `email-templates` - Template rendering
- `pug` - Template engine
- `preview-email` - Development previews

### Development Dependencies
- `@types/nodemailer` - TypeScript definitions

---

## Version History

### v1.0.0 (2026-02-13)
- Initial implementation with 2026 best practices
- Multi-provider support (Mailtrap/AWS SES)
- Template system with Pug
- Comprehensive error handling
- Development preview functionality
