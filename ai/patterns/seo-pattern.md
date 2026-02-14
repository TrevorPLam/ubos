# SEO Pattern

## Problem It Solves

Without consistent SEO implementation, pages have poor search engine visibility, inconsistent meta tags, and missing structured data that impacts organic traffic and click-through rates.

## When to Use

- All public-facing pages
- Blog posts and articles
- Product pages
- Landing pages
- Marketing pages
- Documentation pages

## When NOT to Use

- Admin dashboard pages
- Internal tools
- Authentication pages
- Error pages
- Pages behind authentication

## Required Constraints

- All pages must have unique titles and descriptions
- All pages must include structured data
- All pages must have proper heading hierarchy
- All pages must include Open Graph and Twitter cards
- All pages must have proper canonical URLs
- All pages must include hreflang for internationalization

## Example Implementation

```typescript
/**
 * @ai-pattern SEO Pattern
 * @ai-security Input Validated
 * @ai-performance Client Optimized
 * @ai-tests Required
 * @ai-reference /ai/patterns/seo-pattern.md
 */

import { Metadata } from 'next';
import { z } from 'zod';

// SEO metadata schema
const SEODataSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  keywords: z.array(z.string()).optional(),
  canonical: z.string().url().optional(),
  ogImage: z.string().url().optional(),
  ogType: z.enum(['website', 'article', 'product']).default('website'),
  noindex: z.boolean().default(false),
  structuredData: z.any().optional(),
  hreflang: z.record(z.string(), z.string()).optional(),
});

// SEO metadata generator
function generateSEO(data: z.infer<typeof SEODataSchema>): Metadata {
  const validated = SEODataSchema.parse(data);
  
  const baseMetadata: Metadata = {
    title: validated.title,
    description: validated.description,
    keywords: validated.keywords?.join(', '),
    robots: {
      index: !validated.noindex,
      follow: !validated.noindex,
    },
    openGraph: {
      title: validated.title,
      description: validated.description,
      type: validated.ogType,
      url: validated.canonical,
      images: validated.ogImage ? [{ url: validated.ogImage }] : undefined,
      siteName: 'Your Company Name',
    },
    twitter: {
      card: 'summary_large_image',
      title: validated.title,
      description: validated.description,
      images: validated.ogImage ? [validated.ogImage] : undefined,
    },
    alternates: {
      canonical: validated.canonical,
      languages: validated.hreflang,
    },
  };

  // Add structured data
  if (validated.structuredData) {
    return {
      ...baseMetadata,
      other: {
        'application/ld+json': JSON.stringify(validated.structuredData),
      },
    };
  }

  return baseMetadata;
}

// Page component with SEO
interface PageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Fetch page data
  const page = await getPageBySlug(params.slug);
  
  if (!page) {
    return generateSEO({
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
      noindex: true,
    });
  }

  // Generate structured data for article
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.excerpt,
    author: {
      '@type': 'Person',
      name: page.author.name,
    },
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
    image: page.featuredImage,
    publisher: {
      '@type': 'Organization',
      name: 'Your Company Name',
      logo: {
        '@type': 'ImageObject',
        url: 'https://yourcompany.com/logo.png',
      },
    },
  };

  return generateSEO({
    title: page.title,
    description: page.excerpt,
    keywords: page.tags,
    canonical: `https://yourcompany.com/blog/${page.slug}`,
    ogImage: page.featuredImage,
    ogType: 'article',
    structuredData,
    hreflang: page.translations?.reduce((acc, translation) => {
      acc[translation.locale] = `https://yourcompany.com/blog/${translation.slug}`;
      return acc;
    }, {} as Record<string, string>),
  });
}

export default function BlogPostPage({ params }: PageProps) {
  const page = await getPageBySlug(params.slug);
  
  if (!page) {
    notFound();
  }

  return (
    <>
      {/* Structured data script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: page.title,
            description: page.excerpt,
            author: {
              '@type': 'Person',
              name: page.author.name,
            },
            datePublished: page.publishedAt,
            dateModified: page.updatedAt,
            image: page.featuredImage,
            publisher: {
              '@type': 'Organization',
              name: 'Your Company Name',
              logo: {
                '@type': 'ImageObject',
                url: 'https://yourcompany.com/logo.png',
              },
            },
          }),
        }}
      />
      
      <article className="prose prose-lg max-w-none">
        <header>
          <h1>{page.title}</h1>
          <p className="text-gray-600">{page.excerpt}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>By {page.author.name}</span>
            <span>•</span>
            <time dateTime={page.publishedAt}>
              {new Date(page.publishedAt).toLocaleDateString()}
            </time>
          </div>
        </header>
        
        {/* Proper heading hierarchy */}
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
        
        <footer>
          <div className="flex flex-wrap gap-2 mt-8">
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </footer>
      </article>
    </>
  );
}

// SEO utility functions
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  availability: 'InStock' | 'OutOfStock';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
    },
  };
}
```

## Anti-Pattern Example

```typescript
// BAD: Missing SEO implementation
export default function BlogPostPage({ params }: PageProps) {
  const page = await getPageBySlug(params.slug);
  
  return (
    <div>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}

// Missing:
// - No metadata generation
// - No structured data
// - No Open Graph tags
// - No canonical URL
// - No proper heading hierarchy
// - No breadcrumb schema
```

## Testing Requirements

- Test metadata generation with various inputs
- Test structured data validation
- Test canonical URL generation
- Test hreflang implementation
- Test heading hierarchy in rendered content
- Integration test with SEO tools (Lighthouse, Google Rich Results Test)

## Performance Implications

- Additional metadata generation has minimal overhead
- Structured data scripts add small payload
- Proper image optimization for OG images
- Efficient crawling with proper meta tags

## Security Implications

- Sanitize all user-generated content in metadata
- Validate URLs to prevent XSS in canonical/hreflang
- Escape HTML in structured data
- Prevent injection attacks in user-generated content
