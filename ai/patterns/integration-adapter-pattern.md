# Integration Adapter Pattern

## Problem It Solves

Direct API calls scattered throughout business logic create tight coupling, make testing difficult, and prevent consistent error handling across different external services.

## When to Use

- Integrating with third-party APIs (payment gateways, email services, CRMs)
- Connecting to external databases or services
- Wrapping legacy systems
- Implementing retry logic and error handling for external calls
- Needing to mock external services in tests

## When NOT to Use

- Simple internal function calls
- Database queries within the same application
- Pure utility functions without external dependencies
- When the integration is trivial and unlikely to change

## Required Constraints

- All adapters must implement a common interface
- No direct HTTP calls outside adapters
- Adapters must handle their own error transformation
- Adapters must be testable in isolation
- Configuration must be injected, not hardcoded
- All adapters must include circuit breaker pattern

## Example Implementation

```typescript
/**
 * @ai-pattern Integration Adapter
 * @ai-security Input Validated
 * @ai-performance Server Only
 * @ai-tests Required
 * @ai-reference /ai/patterns/integration-adapter-pattern.md
 */

// Common adapter interface
interface IAdapter<TConfig, TRequest, TResponse> {
  configure(config: TConfig): void;
  execute(request: TRequest): Promise<TResponse>;
  healthCheck(): Promise<boolean>;
}

// Email service adapter example
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  baseUrl: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResponse {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
}

class EmailAdapter implements IAdapter<EmailConfig, EmailRequest, EmailResponse> {
  private config: EmailConfig;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
  }

  configure(config: EmailConfig): void {
    // Validate configuration
    const configSchema = z.object({
      apiKey: z.string().min(1),
      fromEmail: z.string().email(),
      baseUrl: z.string().url(),
    });
    
    this.config = configSchema.parse(config);
  }

  async execute(request: EmailRequest): Promise<EmailResponse> {
    return this.circuitBreaker.execute(async () => {
      // Validate request
      const requestSchema = z.object({
        to: z.string().email(),
        subject: z.string().min(1).max(200),
        html: z.string().min(1),
        text: z.string().optional(),
      });

      const validatedRequest = requestSchema.parse(request);

      // Make external API call
      const response = await fetch(`${this.config.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.fromEmail,
          to: validatedRequest.to,
          subject: validatedRequest.subject,
          html: validatedRequest.html,
          text: validatedRequest.text,
        }),
      });

      if (!response.ok) {
        throw new AdapterError(`Email service error: ${response.status}`, {
          status: response.status,
          service: 'email',
        });
      }

      const data = await response.json();
      
      return {
        messageId: data.id,
        status: data.status,
      };
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Usage in business logic
class NotificationService {
  private emailAdapter: EmailAdapter;

  constructor(emailAdapter: EmailAdapter) {
    this.emailAdapter = emailAdapter;
  }

  async sendWelcomeEmail(userEmail: string): Promise<void> {
    await this.emailAdapter.execute({
      to: userEmail,
      subject: 'Welcome to our platform!',
      html: '<h1>Welcome!</h1><p>Thanks for joining us.</p>',
    });
  }
}
```

## Anti-Pattern Example

```typescript
// BAD: Direct API calls in business logic
class NotificationService {
  async sendWelcomeEmail(userEmail: string): Promise<void> {
    // Direct API call - violates adapter pattern
    const response = await fetch('https://api.emailservice.com/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`, // Direct env access
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@company.com',
        to: userEmail,
        subject: 'Welcome!',
        html: '<h1>Welcome!</h1>',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email'); // Poor error handling
    }
  }
}
```

## Testing Requirements

- Unit test adapter in isolation with mocked external service
- Test error scenarios (network failures, API errors)
- Test circuit breaker behavior
- Test configuration validation
- Integration test with real service (in staging environment)

## Performance Implications

- Adds a small abstraction layer overhead
- Circuit breaker prevents cascading failures
- Enables connection pooling and request batching
- Allows for caching strategies at adapter level

## Security Implications

- Centralizes credential management
- Enables input/output sanitization
- Prevents API keys from leaking to client code
- Allows for audit logging at integration boundary
