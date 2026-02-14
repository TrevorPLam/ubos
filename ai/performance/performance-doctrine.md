# Performance Doctrine

## Purpose

Non-negotiable performance standards that ensure optimal user experience and search engine rankings. These rules are enforced through automated testing and monitoring.

## Core Web Vitals Thresholds

### Largest Contentful Paint (LCP)
**Target**: ≤ 2.5 seconds
**Warning**: 2.5s - 4.0s
**Failure**: > 4.0s

**Measurement**: Largest image or text block visible in viewport
**Impact**: 25% of overall performance score
**Optimization Priority**: Highest

### First Input Delay (FID)
**Target**: ≤ 100 milliseconds
**Warning**: 100ms - 300ms
**Failure**: > 300ms

**Measurement**: Time from first user interaction to browser response
**Impact**: User perceived responsiveness
**Optimization Priority**: High

### Cumulative Layout Shift (CLS)
**Target**: ≤ 0.1
**Warning**: 0.1 - 0.25
**Failure**: > 0.25

**Measurement**: Unexpected layout movement during page load
**Impact**: User experience and conversion rates
**Optimization Priority**: Medium

## Script Loading Policy

### Loading Strategy
**Critical Scripts**:
- Inline critical CSS (above-the-fold styles)
- Preload critical fonts
- Defer non-critical JavaScript
- Async load third-party scripts

**Script Order**:
1. **Critical CSS** (inline, head)
2. **Critical Fonts** (preload, head)
3. **Core JavaScript** (defer, head)
4. **Third-party Scripts** (async, body end)
5. **Analytics** (async, body end)

### Bundle Size Limits
**JavaScript Bundle**: ≤ 150KB gzipped
**CSS Bundle**: ≤ 50KB gzipped
**Font Files**: ≤ 200KB total
**Images**: ≤ 1MB per image, WebP format

**Code Splitting Requirements**:
- Route-based splitting for all pages
- Component-based splitting for heavy components
- Vendor chunk separation
- Dynamic imports for optional features

## Server vs Client Component Guidelines

### Server Components (Preferred)
**Use When**:
- Static content rendering
- Data fetching without user interaction
- SEO-critical content
- Heavy computations
- Database operations

**Benefits**:
- Faster initial page load
- Better SEO performance
- Reduced client-side JavaScript
- Improved Core Web Vitals

### Client Components (Limited Use)
**Use When**:
- Interactive elements (forms, buttons)
- State management
- Browser APIs required
- Real-time updates
- User input handling

**Restrictions**:
- Minimize client-side state
- Avoid heavy client-side computations
- Use server actions for data mutations
- Implement proper loading states

## Caching Rules

### Browser Caching
**Static Assets**:
- CSS/JS: 1 year with cache busting
- Images: 6 months with cache busting
- Fonts: 1 year with cache busting
- HTML: No cache or short cache (1 hour)

**Cache Headers**:
```http
Cache-Control: public, max-age=31536000, immutable
ETag: "unique-identifier"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

### CDN Caching
**Edge Caching**:
- Static assets: 1 year
- API responses: 5 minutes
- HTML pages: 1 hour
- Images: 6 months

**Cache Invalidation**:
- Automatic on deployment
- Manual for urgent updates
- Version-based for assets
- Time-based for content

## Edge Runtime Preference

### Edge Functions Use Cases
**Ideal for**:
- Geolocation-based content
- A/B testing routing
- Personalization logic
- Rate limiting
- Request transformation

**Performance Benefits**:
- Reduced latency (global distribution)
- Lower server load
- Better scalability
- Improved user experience

### Limitations
**Avoid for**:
- Heavy computations
- Large file processing
- Long-running operations
- Database-intensive tasks
- Complex business logic

## Third-Party Script Restrictions

### Allowed Third-Party Scripts
**Essential Only**:
- Analytics (Google Analytics 4)
- Tag management (Google Tag Manager)
- Customer support (Intercom, Zendesk)
- Payment processing (Stripe, PayPal)
- Marketing automation (HubSpot, Marketo)

### Script Loading Requirements
**Performance Standards**:
- Async loading for all non-critical scripts
- Defer loading for below-the-fold scripts
- Consent management for tracking scripts
- Fallback for failed script loads
- Script timeout handling (10 seconds)

**Monitoring**:
- Track script load times
- Monitor script failures
- Measure script impact on Core Web Vitals
- Audit script dependencies regularly

## Image Strategy

### Image Optimization
**Format Requirements**:
- **WebP**: Primary format (modern browsers)
- **AVIF**: Secondary format (supported browsers)
- **JPEG**: Fallback format (legacy browsers)
- **PNG**: Only for transparency

**Compression Standards**:
- **Quality**: 80-85% for JPEG
- **Lossless**: For PNG when needed
- **Progressive**: Loading for large images
- **Responsive**: Multiple sizes for different screens

### Responsive Images
**srcset Implementation**:
```html
<img
  src="image-800w.webp"
  srcset="
    image-400w.webp 400w,
    image-800w.webp 800w,
    image-1200w.webp 1200w,
    image-1600w.webp 1600w
  "
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  alt="Descriptive alt text"
  loading="lazy"
  decoding="async"
/>
```

**Lazy Loading**:
- Below-the-fold images: `loading="lazy"`
- Above-the-fold images: `loading="eager"`
- Critical images: Preload in head
- Background images: CSS lazy loading

## Animation Performance Limits

### Animation Guidelines
**Performance Budget**:
- **60 FPS**: Target for all animations
- **16ms**: Maximum frame time
- **GPU Acceleration**: Use transform/opacity
- **Avoid**: Layout thrashing animations

**Preferred Properties**:
- `transform`: translate, scale, rotate
- `opacity`: Fade in/out effects
- `filter`: Blur, brightness (cautiously)
- `will-change`: Optimize for known animations

**Avoid Properties**:
- `width`, `height`: Layout changes
- `left`, `top`: Repaints
- `margin`, `padding`: Layout changes
- `box-shadow`: Expensive repaints

### Animation Techniques
**CSS Animations**:
- Use `@keyframes` for simple animations
- Implement `animation-fill-mode` for smooth transitions
- Use `animation-timing-function` for natural motion
- Apply `animation-play-state` for control

**JavaScript Animations**:
- Use `requestAnimationFrame` for smooth updates
- Implement proper cleanup in useEffect
- Use `IntersectionObserver` for scroll-triggered animations
- Debounce resize and scroll events

## Performance Monitoring

### Real User Monitoring (RUM)
**Metrics to Track**:
- Core Web Vitals (LCP, FID, CLS)
- Page load time by device
- Conversion rate by performance
- User engagement by load time
- Error rates by performance tier

**Alerting Thresholds**:
- LCP > 3.0s: Alert team
- FID > 200ms: Alert team
- CLS > 0.2: Alert team
- Error rate > 1%: Alert team
- Conversion drop > 10%: Alert team

### Synthetic Monitoring
**Testing Schedule**:
- **Production**: Every 5 minutes
- **Staging**: Every 15 minutes
- **Development**: On demand
- **Performance Budget**: Every deployment

**Test Locations**:
- North America (US East, US West)
- Europe (UK, Germany)
- Asia (Singapore, Japan)
- Mobile networks (3G, 4G, 5G)

## Performance Budget Enforcement

### Budget Categories
**JavaScript**: 150KB gzipped
- Core bundle: 100KB
- Vendor bundle: 50KB
- Route chunks: 25KB each

**CSS**: 50KB gzipped
- Critical CSS: 20KB
- Non-critical CSS: 30KB
- Component CSS: 5KB each

**Images**: 2MB total per page
- Hero image: 500KB
- Content images: 200KB each
- Thumbnails: 50KB each

**Fonts**: 200KB total
- Primary font: 100KB
- Secondary font: 50KB
- Icon font: 50KB

### Enforcement Tools
**Build-time Checks**:
- Webpack Bundle Analyzer
- Lighthouse CI integration
- Performance budget plugins
- Image optimization pipelines

**Runtime Monitoring**:
- Real User Monitoring
- Performance Observer API
- Custom performance metrics
- Third-party monitoring tools

## Implementation Checklist

### Pre-Development
- [ ] Performance budgets defined
- [ ] Monitoring tools configured
- [ ] Image optimization pipeline set up
- [ ] CDN configuration verified
- [ ] Caching strategy documented
- [ ] Third-party script audit completed

### During Development
- [ ] Core Web Vitals monitored locally
- [ ] Bundle size tracked per feature
- [ ] Image optimization verified
- [ ] Animation performance tested
- [ ] Mobile performance validated
- [ ] Loading states implemented

### Pre-Deployment
- [ ] Performance budget validation
- [ ] Lighthouse score ≥ 95
- [ ] Bundle size within limits
- [ ] Image optimization verified
- [ ] Caching headers configured
- [ ] Monitoring alerts set up

### Post-Deployment
- [ ] Real User Monitoring active
- [ ] Performance alerts configured
- [ ] User experience tracking
- [ ] Conversion rate monitoring
- [ ] Error rate tracking
- [ ] Performance regression detection
