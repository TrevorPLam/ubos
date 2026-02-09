# CRM API

The CRM API provides endpoints for managing client companies, contacts, and deals within the UBOS platform.

## Documentation

- **[Client Companies API](./client-companies.md)** - Comprehensive documentation for client company endpoints

## Implemented Endpoints

### Client Companies
- GET /api/clients - List with pagination, search, and filters
- GET /api/clients/:id - Get single client with relations
- GET /api/clients/stats - Get aggregate statistics
- POST /api/clients - Create client
- PUT /api/clients/:id - Update client
- DELETE /api/clients/:id - Delete with cascade checks

### Contacts
- GET /api/contacts
- POST /api/contacts
- PATCH /api/contacts/:id
- DELETE /api/contacts/:id

### Deals
- GET /api/deals
- POST /api/deals
- PATCH /api/deals/:id
- DELETE /api/deals/:id

## Features

### Client Companies
- ✅ Pagination with metadata (page, limit, total, hasNext, hasPrev)
- ✅ Multi-field search (name, website, industry, city, country)
- ✅ Filtering by industry, city, state, country
- ✅ Organization-level isolation
- ✅ Relations (contacts, deals, engagements)
- ✅ Cascade delete checks
- ✅ Statistics endpoint for dashboard metrics
- ✅ Comprehensive error handling
- ✅ Input validation with Zod schemas

### Contacts & Deals
- ✅ Basic CRUD operations
- ✅ Organization-level isolation

## Gaps vs Plan
- Client profile read model
- Tags and custom fields
- Bulk operations
- Advanced relationship visualization
- Contacts and Deals pagination/filtering (currently basic CRUD only)
