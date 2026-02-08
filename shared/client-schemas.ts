// AI-META-BEGIN
// AI-META: Shared module - client-schemas.ts
// OWNERSHIP: shared
// ENTRYPOINTS: client and server
// DEPENDENCIES: zod, shared/schema.ts
// DANGER: Breaking changes affect both sides
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run check
// AI-META-END

/**
 * Client Companies CRUD API - Validation Schemas
 *
 * This file defines Zod validation schemas for Client Companies API endpoints:
 * - Query parameter validation (pagination, filtering, search)
 * - Request body validation (create, update)
 * - TypeScript types derived from schemas
 *
 * These schemas are used by:
 * - Server: Request validation in API routes
 * - Client: Type safety for API calls
 */

import { z } from "zod";
import { insertClientCompanySchema } from "./schema";

// ==================== PAGINATION SCHEMAS ====================

/**
 * Pagination query parameters
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 50, min: 1, max: 100)
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ==================== FILTER SCHEMAS ====================

/**
 * Client company filter query parameters
 * - search: Text search across name, website, industry, city, country
 * - industry: Filter by exact industry match
 * - city: Filter by exact city match
 * - state: Filter by exact state match
 * - country: Filter by exact country match
 */
export const clientFilterQuerySchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Combined pagination and filter schema for GET /api/clients
 */
export const clientListQuerySchema = paginationQuerySchema.merge(clientFilterQuerySchema);

// ==================== UPDATE SCHEMA ====================

/**
 * Update client company schema
 * - All fields from insertClientCompanySchema are optional
 * - organizationId is omitted (cannot be changed)
 */
export const updateClientCompanySchema = z.object({
  name: z.string().max(255).optional(),
  website: z.string().nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zipCode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ==================== RESPONSE SCHEMAS ====================

/**
 * Pagination metadata included in list responses
 */
export const paginationMetadataSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

/**
 * Paginated response wrapper
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: paginationMetadataSchema,
  });

// ==================== TYPESCRIPT TYPES ====================

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ClientFilterQuery = z.infer<typeof clientFilterQuerySchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type UpdateClientCompany = z.infer<typeof updateClientCompanySchema>;
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;

/**
 * Generic paginated result type
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Pagination options for storage layer
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Filter options for storage layer
 */
export interface FilterOptions {
  search?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Client company with related entities
 */
export interface ClientCompanyWithRelations {
  id: string;
  organizationId: string;
  name: string;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: any[]; // Contact[]
  deals: any[]; // Deal[]
  engagements: any[]; // Engagement[]
  activeEngagementsCount: number;
  totalDealsValue: string; // Decimal as string
}

/**
 * Dependency check result for cascade delete validation
 */
export interface DependencyCheckResult {
  hasDependencies: boolean;
  dependencies: {
    contacts: number;
    deals: number;
    engagements: number;
    contracts: number;
    proposals: number;
    invoices: number;
  };
}

/**
 * Client company statistics for dashboard
 */
export interface ClientCompanyStats {
  total: number;
  recentlyAdded: number; // Last 30 days
  byIndustry: Record<string, number>;
  byCountry: Record<string, number>;
  withActiveEngagements: number;
  withoutContacts: number;
}
