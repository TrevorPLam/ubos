# Lighthouse Budget

## Purpose

Machine-readable performance budget that enforces Lighthouse scores ≥ 95 across all metrics. This budget is integrated into CI/CD pipelines to prevent performance regressions.

## Performance Budget Configuration

### Lighthouse Score Requirements
```json
{
  "lighthouse": {
    "performance": 95,
    "accessibility": 95,
    "best-practices": 95,
    "seo": 95,
    "pwa": 80
  }
}
```

### Core Web Vitals Budget
```json
{
  "coreWebVitals": {
    "largestContentfulPaint": 2500,
    "firstInputDelay": 100,
    "cumulativeLayoutShift": 0.1,
    "firstContentfulPaint": 1800,
    "speedIndex": 3400,
    "timeToInteractive": 3800
  }
}
```

### Resource Size Budgets
```json
{
  "resourceSizes": {
    "script": 150000,
    "stylesheet": 50000,
    "image": 1000000,
    "font": 200000,
    "total": 1500000
  }
}
```

## Budget Categories

### Performance Budget (Score: 95)
**Weight**: 40% of overall score
**Critical Metrics**:
- First Contentful Paint: ≤ 1.8s
- Speed Index: ≤ 3.4s
- Largest Contentful Paint: ≤ 2.5s
- Time to Interactive: ≤ 3.8s
- Total Blocking Time: ≤ 200ms
- Cumulative Layout Shift: ≤ 0.1

**Failure Actions**:
- Block deployment if score < 90
- Warning if score 90-94
- Pass if score ≥ 95

### Accessibility Budget (Score: 95)
**Weight**: 25% of overall score
**Critical Requirements**:
- Color contrast: 4.5:1 minimum
- Alt text: All images described
- Form labels: All inputs labeled
- Keyboard navigation: All elements accessible
- ARIA labels: Custom components accessible

**Failure Actions**:
- Block deployment if score < 90
- Warning if score 90-94
- Pass if score ≥ 95

### Best Practices Budget (Score: 95)
**Weight**: 20% of overall score
**Critical Requirements**:
- HTTPS: All resources secure
- No console errors: Clean JavaScript execution
- Modern JavaScript: ES6+ features
- Image optimization: Proper formats and sizing
- No deprecated APIs: Current web standards

**Failure Actions**:
- Block deployment if score < 90
- Warning if score 90-94
- Pass if score ≥ 95

### SEO Budget (Score: 95)
**Weight**: 15% of overall score
**Critical Requirements**:
- Meta description: Descriptive and unique
- Heading hierarchy: Proper H1-H6 structure
- Structured data: Schema.org markup
- Mobile friendly: Responsive design
- Crawlable: Search engine accessible

**Failure Actions**:
- Block deployment if score < 90
- Warning if score 90-94
- Pass if score ≥ 95

## Resource-Specific Budgets

### JavaScript Budget
**Total Size**: 150KB gzipped
**Breakdown**:
- Core bundle: 100KB
- Vendor bundle: 50KB
- Route chunks: 25KB each
- Component chunks: 10KB each

**Performance Impact**:
- 100KB = +1s to Time to Interactive
- 150KB = +1.5s to Time to Interactive
- 200KB = +2s to Time to Interactive

### CSS Budget
**Total Size**: 50KB gzipped
**Breakdown**:
- Critical CSS: 20KB (inline)
- Non-critical CSS: 30KB (deferred)
- Component CSS: 5KB each

**Performance Impact**:
- 50KB = +200ms to First Contentful Paint
- 100KB = +400ms to First Contentful Paint
- 150KB = +600ms to First Contentful Paint

### Image Budget
**Total Size**: 1MB per page
**Breakdown**:
- Hero image: 500KB
- Content images: 200KB each
- Thumbnails: 50KB each
- Icons: 10KB each

**Optimization Requirements**:
- WebP format with fallbacks
- Responsive images with srcset
- Lazy loading for below-fold
- Compression quality 80-85%

### Font Budget
**Total Size**: 200KB total
**Breakdown**:
- Primary font: 100KB
- Secondary font: 50KB
- Icon font: 50KB

**Loading Strategy**:
- Preload critical fonts
- Display swap for non-critical
- Subset fonts for performance
- WOFF2 format only

## CI/CD Integration

### GitHub Actions Configuration
```yaml
name: Performance Budget
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### LHCI Configuration
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox --headless"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.95}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["warn", {"minScore": 0.95}],
        "categories:seo": ["warn", {"minScore": 0.95}],
        "categories:pwa": "off"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

## Monitoring and Alerting

### Performance Regression Detection
**Thresholds**:
- Performance score drop > 5 points: Alert
- Core Web Vitals degradation > 20%: Alert
- Bundle size increase > 10%: Alert
- Lighthouse score < 90: Block deployment

**Alert Channels**:
- Slack notifications for warnings
- Email alerts for failures
- GitHub status checks for CI/CD
- Dashboard for ongoing monitoring

### Budget Enforcement
**Pre-Deployment Checks**:
- Bundle size analysis
- Lighthouse score validation
- Core Web Vitals measurement
- Resource optimization verification

**Post-Deployment Monitoring**:
- Real User Monitoring (RUM)
- Performance budget tracking
- Regression detection
- Automated alerts for violations

## Budget Adjustment Process

### When to Adjust Budgets
**Valid Reasons**:
- New feature requirements
- Business priority changes
- Technology stack updates
- User behavior changes
- Competitive landscape shifts

**Approval Process**:
1. **Request**: Document justification for change
2. **Impact Analysis**: Assess performance implications
3. **Stakeholder Review**: Product, engineering, design approval
4. **Implementation**: Update budget and documentation
5. **Communication**: Notify team of changes
6. **Monitoring**: Track impact post-change

### Budget Categories
**Fixed Budgets** (Cannot be adjusted):
- Lighthouse minimum scores (95)
- Core Web Vitals thresholds
- Security requirements
- Accessibility standards

**Flexible Budgets** (Can be adjusted with approval):
- Bundle size limits
- Image optimization levels
- Third-party script allowances
- Performance monitoring frequency

## Performance Budget Examples

### E-commerce Landing Page
```json
{
  "pageType": "ecommerce-landing",
  "budget": {
    "performance": 95,
    "lighthouse": 95,
    "bundleSize": {
      "total": 200000,
      "javascript": 120000,
      "css": 40000,
      "images": 2000000
    }
  },
  "requirements": {
    "heroImage": true,
    "productGallery": true,
    "customerReviews": true,
    "relatedProducts": true
  }
}
```

### SaaS Dashboard
```json
{
  "pageType": "saas-dashboard",
  "budget": {
    "performance": 90,
    "lighthouse": 90,
    "bundleSize": {
      "total": 300000,
      "javascript": 200000,
      "css": 60000,
      "images": 500000
    }
  },
  "requirements": {
    "dataVisualization": true,
    "realTimeUpdates": true,
    "complexInteractions": true,
    "heavyComponents": true
  }
}
```

### Blog/Content Page
```json
{
  "pageType": "blog-content",
  "budget": {
    "performance": 98,
    "lighthouse": 98,
    "bundleSize": {
      "total": 100000,
      "javascript": 50000,
      "css": 30000,
      "images": 800000
    }
  },
  "requirements": {
    "contentFirst": true,
    "minimalJavaScript": true,
    "optimizedImages": true,
    "fastLoading": true
  }
}
```

## Budget Compliance Checklist

### Pre-Development
- [ ] Performance budget defined for page type
- [ ] Lighthouse targets established
- [ ] Resource size limits set
- [ ] Monitoring tools configured
- [ ] Team training completed

### During Development
- [ ] Bundle size monitored per feature
- [ ] Lighthouse scores tracked locally
- [ ] Image optimization verified
- [ ] Performance budget violations addressed
- [ ] Code reviews include performance checks

### Pre-Deployment
- [ ] Automated Lighthouse CI passing
- [ ] Bundle size within limits
- [ ] Core Web Vitals meeting targets
- [ ] Performance regression testing complete
- [ ] Budget compliance documented

### Post-Deployment
- [ ] Real User Monitoring active
- [ ] Performance budget tracking
- [ ] Regression detection enabled
- [ ] Alert system functioning
- [ ] Budget optimization ongoing
