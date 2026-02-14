# AGENT_SYSTEM.md - Constitutional Rules

This document defines the non-negotiable architectural rules that all agents must follow. No exceptions.

---

## A. Architectural Rules

### A1. Integration Pattern
**RULE**: All integrations use adapter pattern.
- No direct API calls in business logic
- All external services wrapped in adapters
- Adapters implement consistent interface
- Adapters are testable in isolation

### A2. Input Validation
**RULE**: All inputs validated with Zod.
- No manual validation logic
- All API endpoints use Zod schemas
- All form inputs use Zod validation
- Validation errors are structured and consistent

### A3. Route Architecture
**RULE**: All routes use middleware factory.
- No inline middleware in route handlers
- Middleware is composable and reusable
- Authentication/authorization via middleware
- Error handling via middleware

### A4. Environment Access
**RULE**: No direct environment access outside env schema.
- All env vars accessed through centralized schema
- No process.env direct access in components
- Environment validation at startup
- Type-safe environment configuration

### A5. Styling Constraints
**RULE**: No inline styles unless approved.
- Use CSS modules or styled-components
- No style tags in components
- Tailwind classes only in approved patterns
- CSS-in-JS only for dynamic styles

---

## B. Performance Requirements

### B1. Core Web Vitals
**RULE**: Lighthouse ≥ 95 mobile.
- Performance score minimum 95
- First Contentful Paint ≤ 1.8s
- Largest Contentful Paint ≤ 2.5s
- Cumulative Layout Shift ≤ 0.1

### B2. Bundle Size
**RULE**: JS bundle ≤ 150KB gzipped.
- No unoptimized dependencies
- Code splitting for routes
- Tree shaking enabled
- Dynamic imports for heavy components

### B3. Script Loading
**RULE**: No blocking scripts.
- All scripts async or defer
- Critical CSS inlined
- Non-critical CSS loaded asynchronously
- No render-blocking resources

### B4. Image Optimization
**RULE**: Images must use optimized loader.
- WebP format with fallbacks
- Responsive images with srcset
- Lazy loading for below-fold images
- Image compression and optimization

---

## C. Security Rules

### C1. Content Security Policy
**RULE**: CSP enforced.
- Strict CSP headers on all routes
- No unsafe-inline or unsafe-eval
- Whitelist approach for external resources
- Report-only mode in development

### C2. Input Sanitization
**RULE**: Sanitization required.
- All user inputs sanitized before storage
- HTML content sanitized before rendering
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding

### C3. Rate Limiting
**RULE**: Rate limiting required on all write routes.
- API endpoints rate limited
- Form submissions rate limited
- Authentication endpoints strict limits
- DDoS protection enabled

### C4. Secret Management
**RULE**: No secrets in client bundle.
- API keys server-side only
- No environment variables in client code
- Secure secret storage
- Rotation policies enforced

---

## D. Accessibility

### D1. WCAG Compliance
**RULE**: WCAG 2.2 AA minimum.
- All interactive elements keyboard accessible
- Screen reader compatibility
- Color contrast ratios met
- Focus indicators visible

### D2. Semantic HTML
**RULE**: Semantic HTML required.
- Use appropriate HTML5 semantic elements
- No div-only navigation
- Proper heading hierarchy
- Landmark elements implemented

### D3. Form Accessibility
**RULE**: Forms must have labels.
- All inputs have associated labels
- Error messages linked to inputs
- Fieldset and legend for grouped inputs
- ARIA labels where needed

### D4. Interactive Elements
**RULE**: No clickable divs.
- Use button elements for actions
- Use link elements for navigation
- Proper focus management
- Touch target sizes ≥ 44px

---

## E. Testing

### E1. Business Logic Coverage
**RULE**: All business logic tested.
- Unit tests for all utility functions
- Integration tests for API endpoints
- End-to-end tests for critical paths
- Property tests for complex algorithms

### E2. Environment Schema Testing
**RULE**: Env schema tested.
- Validation of all environment variables
- Error handling for missing variables
- Type safety verification
- Default value testing

### E3. Middleware Testing
**RULE**: Middleware tested.
- Authentication middleware tested
- Authorization middleware tested
- Error handling middleware tested
- Request validation middleware tested

### E4. Security Testing
**RULE**: No untested security logic.
- Input validation tested
- Authorization logic tested
- Rate limiting tested
- CSP headers tested

---

## Enforcement

### Violation Consequences
1. **Critical Violations** (Security, Performance): Immediate rollback required
2. **Architectural Violations**: Must be fixed before merge
3. **Style Violations**: Should be fixed, may block merge
4. **Accessibility Violations**: Must be fixed before production

### Validation Methods
- Automated CI checks for bundle size and performance
- Security scanning for vulnerabilities
- Accessibility testing in CI/CD
- Code review validation for architectural rules

### Appeals Process
- Document exceptions in `/ai/decisions/`
- Must include justification and alternatives considered
- Requires team lead approval
- Temporary exceptions must have expiration dates

---

## Metadata Headers

All critical files must include AI metadata headers:

```typescript
/**
 * @ai-pattern [Pattern Name]
 * @ai-security [Security Level]
 * @ai-performance [Performance Class]
 * @ai-tests [Testing Requirement]
 * @ai-reference [Reference Document]
 */
```

Required for:
- Adapters
- Middleware
- API routes
- Environment schemas
- Core utilities

---

**This document is law. No ambiguity allowed.**
