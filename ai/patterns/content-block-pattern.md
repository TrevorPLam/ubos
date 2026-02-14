# Content Block Pattern

## Problem It Solves

Monolithic page components become unmanageable, content editors need flexibility, and marketing teams require the ability to compose pages from reusable blocks without developer intervention.

## When to Use

- Landing pages with multiple sections
- Blog posts with varied content types
- Marketing pages with dynamic layouts
- Product pages with configurable sections
- Documentation pages with mixed content types

## When NOT to Use

- Simple static pages
- Forms with fixed structure
- Highly interactive applications
- Pages requiring real-time data updates
- Components with complex state management

## Required Constraints

- All blocks must be self-contained and reusable
- All blocks must accept consistent props interface
- All blocks must include proper validation
- All blocks must be responsive and accessible
- All blocks must include loading states
- All blocks must support preview mode

## Example Implementation

```typescript
/**
 * @ai-pattern Content Block
 * @ai-security Input Validated
 * @ai-performance Client Optimized
 * @ai-tests Required
 * @ai-reference /ai/patterns/content-block-pattern.md
 */

import { z } from 'zod';
import { ReactNode } from 'react';

// Base block interface
interface BaseBlock {
  id: string;
  type: string;
  settings?: Record<string, any>;
}

// Block registry type
type BlockRegistry = Record<string, React.ComponentType<any>>;

// Content block schemas
const HeroBlockSchema = z.object({
  id: z.string(),
  type: z.literal('hero'),
  settings: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    backgroundImage: z.string().url().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().url().optional(),
    alignment: z.enum(['left', 'center', 'right']).default('center'),
  }),
});

const TextBlockSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  settings: z.object({
    content: z.string().min(1),
    fontSize: z.enum(['sm', 'base', 'lg', 'xl']).default('base'),
    alignment: z.enum(['left', 'center', 'right']).default('left'),
    maxWidth: z.enum(['sm', 'md', 'lg', 'xl', 'full']).default('lg'),
  }),
});

const FeatureGridBlockSchema = z.object({
  id: z.string(),
  type: z.literal('feature-grid'),
  settings: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    columns: z.number().min(1).max(4).default(3),
    features: z.array(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      icon: z.string().optional(),
      image: z.string().url().optional(),
    })),
  }),
});

const TestimonialBlockSchema = z.object({
  id: z.string(),
  type: z.literal('testimonial'),
  settings: z.object({
    quote: z.string().min(1),
    author: z.string().min(1),
    role: z.string().optional(),
    company: z.string().optional(),
    avatar: z.string().url().optional(),
    rating: z.number().min(1).max(5).default(5),
  }),
});

// Content block union
const ContentBlockSchema = z.discriminatedUnion('type', [
  HeroBlockSchema,
  TextBlockSchema,
  FeatureGridBlockSchema,
  TestimonialBlockSchema,
]);

// Block components
function HeroBlock({ settings }: z.infer<typeof HeroBlockSchema>) {
  return (
    <section className="relative bg-gray-900 text-white py-20">
      {settings.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>
      )}
      
      <div className="relative max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          {settings.title}
        </h1>
        
        {settings.subtitle && (
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            {settings.subtitle}
          </p>
        )}
        
        {settings.ctaText && settings.ctaLink && (
          <a
            href={settings.ctaLink}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            {settings.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ settings }: z.infer<typeof TextBlockSchema>) {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  return (
    <section className="py-12">
      <div className={`mx-auto px-4 ${maxWidthClasses[settings.maxWidth]}`}>
        <div
          className={`prose prose-gray max-w-none ${sizeClasses[settings.fontSize]} ${alignmentClasses[settings.alignment]}`}
          dangerouslySetInnerHTML={{ __html: settings.content }}
        />
      </div>
    </section>
  );
}

function FeatureGridBlock({ settings }: z.infer<typeof FeatureGridBlockSchema>) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {(settings.title || settings.subtitle) && (
          <div className="text-center mb-12">
            {settings.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {settings.title}
              </h2>
            )}
            {settings.subtitle && (
              <p className="text-xl text-gray-600">
                {settings.subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className={`grid ${gridClasses[settings.columns]} gap-8`}>
          {settings.features.map((feature, index) => (
            <div key={index} className="text-center">
              {feature.icon && (
                <div className="text-4xl mb-4">{feature.icon}</div>
              )}
              {feature.image && (
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-16 h-16 mx-auto mb-4 object-cover rounded"
                />
              )}
              <h3 className="text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialBlock({ settings }: z.infer<typeof TestimonialBlockSchema>) {
  return (
    <section className="py-16 bg-blue-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <blockquote className="text-2xl font-medium text-gray-900 mb-8 italic">
          "{settings.quote}"
        </blockquote>
        
        <div className="flex items-center justify-center gap-4">
          {settings.avatar && (
            <img
              src={settings.avatar}
              alt={settings.author}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          
          <div className="text-left">
            <div className="font-semibold">{settings.author}</div>
            {settings.role && (
              <div className="text-sm text-gray-600">{settings.role}</div>
            )}
            {settings.company && (
              <div className="text-sm text-gray-600">{settings.company}</div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center mt-4">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-xl ${
                i < settings.rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Block registry
const blockRegistry: BlockRegistry = {
  hero: HeroBlock,
  text: TextBlock,
  'feature-grid': FeatureGridBlock,
  testimonial: TestimonialBlock,
};

// Content renderer component
interface ContentRendererProps {
  blocks: unknown[];
  preview?: boolean;
}

export function ContentRenderer({ blocks, preview = false }: ContentRendererProps) {
  const validatedBlocks = blocks.map(block => {
    try {
      return ContentBlockSchema.parse(block);
    } catch (error) {
      console.error('Invalid block configuration:', error);
      return null;
    }
  }).filter(Boolean);

  if (validatedBlocks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No content blocks configured
      </div>
    );
  }

  return (
    <div className={preview ? 'border-2 border-dashed border-gray-300' : ''}>
      {validatedBlocks.map((block) => {
        const BlockComponent = blockRegistry[block.type];
        if (!BlockComponent) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return (
          <div key={block.id} data-block-type={block.type}>
            <BlockComponent settings={block.settings} />
          </div>
        );
      })}
    </div>
  );
}

// Page component using content blocks
export default function LandingPage() {
  const pageData = {
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        settings: {
          title: 'Welcome to Our Platform',
          subtitle: 'Build amazing things with our tools',
          ctaText: 'Get Started',
          ctaLink: '/signup',
          alignment: 'center',
        },
      },
      {
        id: 'features-1',
        type: 'feature-grid',
        settings: {
          title: 'Powerful Features',
          subtitle: 'Everything you need to succeed',
          columns: 3,
          features: [
            {
              title: 'Fast Performance',
              description: 'Lightning-fast load times and smooth interactions',
              icon: '⚡',
            },
            {
              title: 'Secure',
              description: 'Enterprise-grade security for your peace of mind',
              icon: '🔒',
            },
            {
              title: 'Easy to Use',
              description: 'Intuitive interface that gets out of your way',
              icon: '🎯',
            },
          ],
        },
      },
      {
        id: 'testimonial-1',
        type: 'testimonial',
        settings: {
          quote: 'This platform completely transformed how we work',
          author: 'Jane Doe',
          role: 'CEO',
          company: 'Tech Corp',
          rating: 5,
        },
      },
    ],
  };

  return <ContentRenderer blocks={pageData.blocks} />;
}
```

## Anti-Pattern Example

```typescript
// BAD: Monolithic page component
export default function LandingPage() {
  return (
    <div>
      {/* Hero section hardcoded */}
      <section className="hero">
        <h1>Welcome</h1>
        <p>Subtitle here</p>
        <button>Get Started</button>
      </section>
      
      {/* Features hardcoded */}
      <section className="features">
        <div className="feature">
          <h3>Feature 1</h3>
          <p>Description</p>
        </div>
        {/* More hardcoded features... */}
      </section>
      
      {/* Testimonial hardcoded */}
      <section className="testimonial">
        <blockquote>Quote here</blockquote>
        <cite>Author</cite>
      </section>
    </div>
  );
}
```

## Testing Requirements

- Unit test each block component with various settings
- Test block validation with invalid data
- Test content renderer with mixed valid/invalid blocks
- Test responsive behavior of blocks
- Test accessibility of each block type
- Integration test with CMS data

## Performance Implications

- Component-based architecture enables code splitting
- Lazy loading of block components
- Efficient re-rendering with proper keys
- Optimized bundle size with tree shaking

## Security Implications

- Input validation prevents XSS in content
- Sanitization of HTML content
- URL validation for links and images
- Proper escaping of user-generated content
