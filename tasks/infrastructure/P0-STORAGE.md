# tasks/infrastructure/P0-STORAGE.md – File Storage (Cloudflare R2)

This file covers R2 bucket and binding configuration for local and production environments, a presigned‑URL operations wrapper using `aws4fetch` for generating time‑limited upload/download URLs, and the virus scanning design spike replacing ClamAV via Inngest with a research‑first approach evaluating third‑party scanning APIs and Cloudflare WAF malicious upload detection. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑STORAGE (2026‑05‑06)

### 1. Cloudflare R2 Presigned URLs — The `aws4fetch` Approach

The canonical approach for Cloudflare Workers to generate presigned URLs for R2 uses the `aws4fetch` npm package, **not** the official AWS SDK. The AWS SDK requires Node.js APIs unavailable in the Workers runtime, whereas `aws4fetch` is purpose‑built for Workers using only `fetch` and `SubtleCrypto` Web APIs.

**Key API pattern** (confirmed by Cloudflare's official R2 docs and the 2026‑01‑14 community guide):

```typescript
import { AwsClient } from 'aws4fetch';

const client = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto',  // R2 uses 'auto'
});

const objectUrl = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${key}`;
const signedRequest = await client.sign(
  new Request(objectUrl, { method: 'PUT' }),
  { aws: { signQuery: true } }
);
return signedRequest.url;  // the presigned URL
```

**Critical Content‑Type Trap**: When using `signQuery: true` with `aws4fetch`, only the `host` header is signed. If you try to include `Content-Type` in the signed headers, browser uploads will fail because the browser sends unsigned headers. Do **not** sign Content‑Type and do **not** send it manually from the browser. R2 will still store the file with the correct content type — it just won't validate it against the signature.

**Best practices for presigned URLs** (confirmed by Cloudflare R2 docs):
- Restrict `Content-Type` at signing time by specifying it in the `PutObjectCommand` (enforced by the signature)
- Configure CORS rules on the bucket for browser‑based access
- Set expiry from 1 second to 7 days (604,800 seconds)
- Presigned URLs are generated client‑side with no communication to R2, requiring only R2 API credentials and an AWS Signature V4 implementation

### 2. R2 Workers API Binding

When an R2 bucket is bound to a Worker via `wrangler.jsonc`, it is available as `env.MY_BUCKET` with the following methods:

| Method | Description |
|---|---|
| `put(key, value, options?)` | Stores value and metadata. Strongly consistent — once resolved, all subsequent reads see the new key globally |
| `get(key, options?)` | Retrieves `R2ObjectBody` with metadata and body as `ReadableStream` |
| `head(key)` | Retrieves metadata only, `null` if key doesn't exist |
| `delete(key | string[])` | Deletes up to 1000 keys per call. Strongly consistent |
| `list(options?)` | Returns up to 1000 entries lexicographically ordered |
| `createMultipartUpload(key)` | Creates a multipart upload for large files |

R2 writes are **strongly consistent**. Once the Promise resolves, all subsequent read operations will see the key globally.

### 3. CORS Configuration — The Most Critical Step

**Without CORS, browser‑based presigned URL uploads will fail even though the presigned URL itself is valid.** This is the most common source of upload failures and is emphasized across all community and official sources.

The CORS policy must be applied to the R2 bucket:

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://ubos.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}
```

For development, you can use `"AllowedOrigins": ["*"]` temporarily — but lock it down in production.

**Critical optimization**: Set `ExposeHeaders` to include `ETag` so the browser JavaScript can read the response header, which contains the object's hash and is useful for verifying upload integrity. Set `MaxAgeSeconds` to cache the preflight response and reduce the number of preflight requests.

### 4. Local R2 Development

When running `wrangler dev` or `vite dev` with the Cloudflare Vite plugin, **Miniflare automatically creates local versions of R2 buckets**. Data is stored in the `.wrangler/state/` folder in the project directory. Local buckets are initially empty — populate them using `wrangler r2 object put <BUCKET>/<KEY> --file=<PATH> --local`.

**Local Explorer** (Wrangler 4.82.1+, Cloudflare Vite plugin 1.32.0+) provides a visual interface for inspecting locally simulated resources including R2. Press `e` in the terminal during local development or navigate to `/cdn-cgi/explorer` on the local dev server.

**Development mode options**: `wrangler dev --local` runs everything locally with simulated services. `wrangler dev --remote` uploads code to Cloudflare and uses real remote bindings — useful for testing presigned URLs against a real R2 bucket but slower for iteration.

### 5. Virus Scanning Approaches (Design Spike for P0‑STORAGE‑3)

The TASKS.md originally specified "ClamAV via Inngest" for virus scanning. Research reveals 2026‑appropriate alternatives that should be evaluated in the design spike:

**(a) Cloudflare WAF Malicious Uploads Detection**: Cloudflare's Web Application Firewall now includes built‑in **malicious uploads detection** that inspects incoming uploads and checks for malicious signatures using heuristics — without relying on the request's `Content-Type` header (which can be manipulated). This is a server‑side, no‑code approach that runs at the Cloudflare edge. However, it's a premium feature requiring a WAF subscription.

**(b) Container‑based ClamAV**: Deploy ClamAV as a separate container (or Workers‑adjacent service) and stream files from R2 directly into the ClamAV daemon. Files up to 200 MB can be scanned without writing to disk. If a virus is detected, the file is deleted from R2 immediately. This requires a persistent compute resource outside of Workers (Workers have strict CPU limits unsuitable for ClamAV).

**(c) Third‑party scanning APIs**: Products like `attachmentAV` and `bucketAV` support Cloudflare R2 specifically as a scanning target. These are commercial SaaS products with API integration.

**(d) EICAR test file**: For validating scanning implementations, the EICAR anti‑malware test file is the standard approach. Downloads are available in multiple formats (including ZIP) to test different scanning scenarios.

The design spike (`/docs/research/virus-scanning.md`) must evaluate all four options and produce a decision with rationale, cost implications, and implementation complexity estimates.

### 6. Object Lifecycle Rules

R2 supports lifecycle rules that automatically expire (delete) or transition objects between storage classes after specified periods. Key facts:
- Objects are typically removed within 24 hours of the `x-amz-expiration` value
- Buckets have a default lifecycle rule to expire multipart uploads seven days after initiation
- Lifecycle rules are bucket‑level and can be managed via Dashboard, Wrangler CLI, or S3 API
- Maximum of 1000 lifecycle rules per bucket
- Useful for: automatic cleanup of expired presigned‑URL uploads, temporary file deletion, storage class transitions

---

## Task Definitions

### [ ] P0-STORAGE-1: Configure R2 bucket and bindings for local/production environments

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** P0‑SHELL‑2 created `apps/web/wrangler.jsonc` with placeholder R2 bucket bindings. However, the actual R2 bucket may not exist yet in the Cloudflare dashboard. The local environment expects an R2 binding but no bucket has been created in the Cloudflare account. CORS rules are not configured. The `@cloudflare/vite-plugin` is configured but there is no explicit R2 binding in the Vite plugin config. No API tokens for R2 (Access Key ID + Secret Access Key) have been generated.
**Size:** Medium

**Description:**
Configure R2 for both local development and production environments. This involves four components:

**(a) Cloudflare Dashboard — Create R2 bucket**: Create a bucket named `ubos-files` (or similar) in the Cloudflare R2 dashboard. Choose a data location appropriate for your primary user base. Note the bucket name for the binding configuration.

**(b) Wrangler configuration**: Update `apps/web/wrangler.jsonc` with the R2 bucket binding. The binding must appear in both the top‑level `r2_buckets` array and the per‑environment `env.production.r2_buckets` section. Use the binding name `UBOS_FILES` (JavaScript variable name) mapping to the bucket name created in step (a). Include local development configuration so Miniflare simulates the bucket locally.

```jsonc
{
  "r2_buckets": [
    {
      "binding": "UBOS_FILES",
      "bucket_name": "ubos-files"
    }
  ],
  "env": {
    "production": {
      "r2_buckets": [
        {
          "binding": "UBOS_FILES",
          "bucket_name": "ubos-files-production"
        }
      ]
    }
  }
}
```

**(c) R2 API Tokens**: Generate R2 API tokens from the Cloudflare Dashboard (R2 → Manage R2 API Tokens). Create a token with "Object Read & Write" permissions. Store the Access Key ID and Secret Access Key as secrets via `wrangler secret put R2_ACCESS_KEY_ID` and `wrangler secret put R2_SECRET_ACCESS_KEY`. Store the Account ID via `wrangler secret put R2_ACCOUNT_ID`. These are required for presigned URL generation. Do **not** store these in `wrangler.jsonc` vars — they must be secrets.

**(d) CORS Configuration**: Apply CORS rules to the R2 bucket to allow browser‑based presigned URL uploads. Create a CORS policy JSON file and apply it via the AWS CLI or Cloudflare dashboard. Allow origins: `https://ubos.app` and `http://localhost:3000` (development). Allow methods: `GET`, `PUT`, `HEAD`, `DELETE`. Allow all headers (`*`). Expose `ETag` header. Set `MaxAgeSeconds: 3600`. For development, `AllowedOrigins: ["*"]` is acceptable temporarily but must be locked down in production.

**Research Findings (2026‑05‑06):**
- R2 bucket bindings in `wrangler.jsonc` use `r2_buckets` array with `binding` (JS variable name) and `bucket_name`
- R2 API tokens are separate from Workers — managed in Cloudflare Dashboard → R2 → Manage R2 API Tokens
- Without a CORS policy, browser‑based uploads using presigned URLs will fail, even though the presigned URL itself is valid
- Local development: Miniflare simulates R2 automatically; Local Explorer (Wrangler 4.82.1+) provides visual inspection
- Local data is stored in `.wrangler/state/v3/r2/`

**Depends on:**
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-2` (wrangler.jsonc exists)

**Blocks:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (presigned URL operations wrapper)
- `tasks/infrastructure/P0-SEC.md → P0-SEC-5` (file upload security)

**Related Files:**
- `apps/web/wrangler.jsonc` (update R2 bindings)
- `apps/web/src/server/storage/env.ts` (new — typed env interface for R2 bindings)

**Definition of Done**
- [ ] R2 bucket `ubos-files` created in Cloudflare dashboard (development/production)
- [ ] R2 binding `UBOS_FILES` configured in `wrangler.jsonc` for both default and production environments
- [ ] `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ACCOUNT_ID` stored as secrets via `wrangler secret put`
- [ ] CORS policy applied to bucket: `AllowedOrigins` restricted to production domain + localhost, `AllowedMethods` includes GET/PUT/HEAD/DELETE, `ExposeHeaders` includes ETag
- [ ] Local development: `wrangler dev` starts with R2 binding available, Miniflare simulates the bucket
- [ ] Local Explorer accessible at `/cdn-cgi/explorer` or via terminal `e` key
- [ ] `.env.example` updated with R2 environment variable descriptions
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- R2 bucket versioning (not needed for Phase 0)
- R2 lifecycle rules (handled later for automatic cleanup)
- Custom domain for R2 bucket (optional, Phase 2)
- `wrangler r2 bucket create` via CLI (OK to use Dashboard; CLI is alternative)

**Rules to Follow**
- Never store R2 credentials in `wrangler.jsonc` vars — always use `wrangler secret put`.
- The binding name (`UBOS_FILES`) must be a valid JavaScript identifier (uppercase with underscores).
- CORS `AllowedOrigins` must never be `*` in production buckets containing private data.
- Secrets must be set for each environment separately (`wrangler secret put --env production R2_ACCESS_KEY_ID`).

**Verification**
```bash
# Verify R2 binding exists in wrangler.jsonc
cat apps/web/wrangler.jsonc | grep -A 4 "r2_buckets"

# Verify secrets are set
wrangler secret list --env production | grep R2_

# Verify local R2 simulation works
cd apps/web && wrangler dev --local
# In another terminal: test R2 via Worker API
curl -X PUT http://localhost:8787/test-key -d "test" 
# Check .wrangler/state/v3/r2/ for local data

# Verify CORS is applied
aws s3api get-bucket-cors --bucket ubos-files \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (infrastructure task)

---

#### Subtasks

- [ ] P0-STORAGE-1.0.25 (AGENT): Read current `apps/web/wrangler.jsonc` and related configuration from P0‑SHELL‑2. Research R2 bucket creation, API token generation, and CORS configuration.
  **Verification:** Current configuration and R2 setup steps documented.

- [ ] P0-STORAGE-1.0.5 (AGENT): Research R2 bucket naming conventions, data location options, and CORS policy best practices for presigned URL uploads.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-STORAGE-1.1 (AGENT): Create R2 bucket in Cloudflare Dashboard (or via `wrangler r2 bucket create` CLI).
  **Verification:** Bucket visible in Cloudflare Dashboard.

- [ ] P0-STORAGE-1.2 (AGENT): Generate R2 API tokens (Access Key ID + Secret Access Key) and store as secrets via `wrangler secret put`.
  **Verification:** Secrets visible via `wrangler secret list`.

- [ ] P0-STORAGE-1.3 (AGENT): Update `wrangler.jsonc` with R2 bucket binding for default and production environments.
  **File(s):** `apps/web/wrangler.jsonc`
  **Verification:** `UBOS_FILES` binding present in both environment sections.

- [ ] P0-STORAGE-1.4 (AGENT): Create and apply CORS policy to R2 bucket.
  **File(s):** `apps/web/scripts/r2-cors-policy.json` (new — reference file)
  **Verification:** CORS policy applied; `AllowedOrigins` contains `https://ubos.app`.

- [ ] P0-STORAGE-1.5 (AGENT): Verify local development: start `wrangler dev --local`, confirm R2 binding available, test with Local Explorer.
  **Verification:** Miniflare simulates R2; `.wrangler/state/v3/r2/` directory exists.

- [ ] P0-STORAGE-1.6 (HUMAN): Verify R2 bucket accessible, CORS configured, and presigned URL test upload works from browser. Approve.
  **Verification:** Approved.

---

### [ ] P0-STORAGE-2: Build R2 presigned URL operations wrapper

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No R2 operations wrapper exists. The application has no ability to generate presigned upload URLs for browser‑direct uploads, presigned download URLs for private file access, or perform direct R2 operations (put/get/delete/list) from server‑side code. The R2 bucket binding exists (P0‑STORAGE‑1) but is not consumed by any application code.
**Size:** Large

**Description:**
Build a comprehensive R2 operations wrapper at `apps/web/src/server/storage/r2.ts` that provides the following capabilities:

**(a) Presigned upload URL generation**: `generatePresignedUploadUrl(key, contentType?, expiresIn?)` — generates a time‑limited PUT presigned URL allowing the browser to upload directly to R2. The `key` is a UUID‑based storage key generated server‑side (not user‑supplied, per P0‑SEC‑5 filename sanitization). The `contentType` is optional — if provided, restricts uploads to that type. Default expiry: 3600 seconds (1 hour). Maximum: 604800 seconds (7 days). The function returns `{ uploadUrl, key }`.

**Critical implementation note**: Use `aws4fetch`'s `AwsClient` with `signQuery: true`. Do **not** include `Content-Type` in the signed request headers when using `signQuery: true` — `aws4fetch` only signs the host header in this mode, and including other headers causes browser uploads to fail with 403. Instead, let the browser handle Content‑Type automatically.

**(b) Presigned download URL generation**: `generatePresignedDownloadUrl(key, expiresIn?)` — generates a time‑limited GET presigned URL. For files stored in a private bucket, this provides temporary access without exposing credentials. Default expiry: 3600 seconds.

**(c) Direct operations (server‑side)**: `putObject(key, body, options?)`, `getObject(key)`, `headObject(key)`, `deleteObject(key)`, `listObjects(prefix?, limit?)` — wrapper functions around the R2 Workers API binding (`env.UBOS_FILES`). These are used for server‑side operations (virus scanning, metadata management, cleanup). The R2 Workers API is strongly consistent — once `put` resolves, all subsequent reads see the key globally.

**(d) Public URL generation**: `getPublicUrl(key)` — returns the public HTTPS URL for objects in a public bucket with a custom domain configured. If no custom domain exists, returns the R2 endpoint URL.

**(e) File size and type validation**: `validateUploadParams(filename, contentType, size)` — validates file size (max 50 MB default, configurable via `MAX_UPLOAD_SIZE_MB` env var), allowed content types (configurable via `ALLOWED_UPLOAD_MIME_TYPES`), and filename sanitization (delegates to `sanitizeFilename` from P0‑SEC‑5). This is called before generating a presigned upload URL.

**(f) Size limits**: Maximum file size of 50 MB for presigned uploads (configurable via `MAX_UPLOAD_SIZE_MB`). For files larger than 50 MB, multipart upload must be used — return a clear error directing the client. Multipart upload support is deferred to Phase 2.

**Security integration**: All presigned URL generation must validate user authentication and tenant context. Presigned upload keys must be tenant‑scoped (`{tenantId}/{uuid}`) to prevent cross‑tenant upload collisions.

**Research Findings (2026‑05‑06):**
- `aws4fetch` is the correct library for Workers; AWS SDK does not work due to Node.js API requirements
- Content‑Type trap: When using `signQuery: true`, only the `host` header is signed — do not sign or send Content‑Type from browser
- R2 strongly consistent writes: once `put()` resolves, all subsequent reads see the key globally
- Presigned URLs expire in 1 second to 7 days (604,800 seconds)
- Best practice: restrict Content‑Type in the signature to prevent abuse; configure CORS on the bucket
- User‑supplied filenames must never be used as R2 keys directly — generate UUID‑based keys server‑side and store original filename as metadata

**Depends on:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-1` (R2 bucket and bindings)
- `tasks/infrastructure/P0-SEC.md → P0-SEC-5` (file upload security — filename sanitization and CVE mitigation)

**Blocks:**
- `tasks/infrastructure/P1-DOCS.md → P1-DOCS-TRPC-2` (document upload procedures use this wrapper)
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-3` (virus scanning integrates with upload flow)

**Related Files:**
- `apps/web/src/server/storage/r2.ts` (new)
- `apps/web/src/server/storage/types.ts` (new — type definitions for storage operations)
- `apps/web/src/server/storage/validation.ts` (reference — from P0‑SEC‑5)
- `apps/web/package.json` (add `aws4fetch` dependency)
- `pnpm-workspace.yaml` (add to catalog)

**Definition of Done**
- [ ] `aws4fetch` installed as dependency and added to `pnpm-workspace.yaml` catalog
- [ ] `apps/web/src/server/storage/r2.ts` created with all six functions: `generatePresignedUploadUrl`, `generatePresignedDownloadUrl`, `putObject`, `getObject`, `headObject`, `deleteObject`, `listObjects`, `getPublicUrl`
- [ ] Presigned URL generation uses `AwsClient` with `signQuery: true`, correct `region: 'auto'`, and `service: 's3'`
- [ ] Browser upload flow tested: GET `/api/storage/upload-url` → PUT to presigned URL → file appears in R2
- [ ] Download presigned URL tested: GET presigned URL in browser → file downloaded
- [ ] Server‑side operations (`putObject`, `getObject`, `deleteObject`) tested via the R2 Workers API binding
- [ ] File validation (`validateUploadParams`) rejects files > max size, wrong content type, unsafe filenames
- [ ] Tenant‑scoped keys: upload keys are prefixed with `{tenantId}/`
- [ ] All functions have proper TypeScript types and JSDoc comments
- [ ] Unit tests: presigned URL generation, file validation, tenant scoping
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Multipart upload support for files > 50 MB (Phase 2)
- R2 object tagging and metadata management
- Bucket‑level operations (CORS lifecycle rules management via code)
- Public bucket configuration (deferred; private bucket with presigned URLs for Phase 0)

**Rules to Follow**
- Never include R2 credentials (Access Key / Secret) in response bodies or logs.
- Always generate server‑side keys using `crypto.randomUUID()` — never trust user‑supplied filenames for storage keys.
- Presigned upload URLs must be scoped to a single object key; do not use wildcard keys.
- The `Content-Type` parameter in presigned upload URIs restricts uploads to that type — use it to prevent users from uploading arbitrary file types.
- R2 Workers API binding is strongly consistent — but presigned URL uploads may have slight propagation delay.
- All storage operations must be authenticated (via tRPC procedures wrapping these functions).

**Verification**
```bash
# Test presigned upload URL generation
curl http://localhost:3000/api/storage/upload-url \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf", "contentType": "application/pdf"}'
# Expected: { uploadUrl: "https://...", key: "org_abc/uuid" }

# Test browser upload using presigned URL
curl -X PUT "<uploadUrl>" --data-binary "@test.pdf" -H "Content-Type: application/pdf"
# Expected: 200 OK

# Test presigned download URL generation
curl http://localhost:3000/api/storage/download-url \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"key": "org_abc/uuid"}'
# Expected: { downloadUrl: "https://..." }

# Verify file appears in R2 bucket (via Wrangler)
wrangler r2 object get ubos-files/org_abc/uuid

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user, I can upload a file by requesting an upload URL from the API and then uploading directly to R2 without my file ever reaching the application server.
- Deep Module: The `r2.ts` module encapsulates all R2 interaction complexity (S3 signing, CORS considerations, content-type traps) behind simple Promise‑based functions, hiding the nuances of `signQuery: true` behavior and bucket binding from the application layer.

---

#### Subtasks

- [ ] P0-STORAGE-2.0.25 (AGENT): Read P0‑STORAGE‑1 output (R2 bucket, bindings, secrets). Research `aws4fetch` API, R2 Workers API binding methods, and presigned URL best practices.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-STORAGE-2.0.5 (AGENT): Research the Content‑Type trap with `signQuery: true` and browser upload behavior. Design the R2 operations wrapper API.
  **Verification:** API design documented.

- [ ] P0-STORAGE-2.1 (AGENT): Install `aws4fetch` dependency and add to catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls aws4fetch` shows installed.

- [ ] P0-STORAGE-2.2 (AGENT): Create `apps/web/src/server/storage/types.ts` with TypeScript interfaces for storage operations.
  **File(s):** `apps/web/src/server/storage/types.ts` (new)
  **Verification:** Types compile and are exported.

- [ ] P0-STORAGE-2.3 (AGENT): Create `apps/web/src/server/storage/r2.ts` with presigned URL generation functions (`generatePresignedUploadUrl`, `generatePresignedDownloadUrl`).
  **File(s):** `apps/web/src/server/storage/r2.ts` (new)
  **Verification:** Presigned URLs generated and testable with curl.

- [ ] P0-STORAGE-2.4 (AGENT): Add server‑side operations (`putObject`, `getObject`, `headObject`, `deleteObject`, `listObjects`) using R2 Workers API binding.
  **File(s):** `apps/web/src/server/storage/r2.ts`
  **Verification:** Server‑side operations work via Worker binding.

- [ ] P0-STORAGE-2.5 (AGENT): Add file size, type validation, and tenant‑scoped key generation.
  **File(s):** `apps/web/src/server/storage/r2.ts`
  **Verification:** Validation rejects oversized files and wrong types; keys are tenant‑scoped.

- [ ] P0-STORAGE-2.6 (AGENT): Write unit tests for presigned URL generation, validation, and tenant scoping.
  **File(s):** `apps/web/src/server/storage/r2.test.ts` (new)
  **Verification:** Tests pass.

- [ ] P0-STORAGE-2.7 (HUMAN): Test full upload/download flow from browser, verify tenant scoping, approve.
  **Verification:** Approved.

---

### [ ] P0-STORAGE-3: Replace "ClamAV via Inngest" with design spike; evaluate third‑party scanning API or container approach for virus scanning

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** The TASKS.md P0‑STORAGE‑3 originally specified "ClamAV via Inngest" for virus scanning, but this approach has both architectural and practical constraints: Cloudflare Workers cannot run ClamAV binaries (no native code execution), Inngest functions run on Workers infrastructure (same limitation), and ClamAV requires persistent compute. A design spike is needed to evaluate 2026‑appropriate alternatives before implementation.
**Size:** Large

**Description:**
Conduct a design spike to evaluate virus scanning approaches for user‑uploaded files in R2. The deliverable is a research document (`docs/research/virus-scanning.md`) that evaluates four candidate approaches and produces a decision with rationale. The implementation phase (building the chosen approach) will be a follow‑up task.

**Candidate approaches to evaluate:**

**(a) Cloudflare WAF Malicious Uploads Detection**: Cloudflare's Web Application Firewall now includes built‑in malicious uploads detection that inspects incoming uploads at the edge and checks for malicious signatures using heuristics, without relying on the request's `Content-Type` header. Runs automatically for traffic passing through Cloudflare's proxy. **Pros**: No application code changes needed, no additional infrastructure. **Cons**: Premium feature (requires WAF subscription), limited to traffic passing through Cloudflare's proxy, heuristics‑based (may miss certain threats), no custom virus definition updates.

**(b) Third‑party scanning API (attachmentAV, bucketAV)**: Commercial SaaS products that integrate with R2. Scan files stored in R2 by subscribing to upload notifications or calling their API. **Pros**: Purpose‑built for R2, managed service, no infrastructure to maintain. **Cons**: Third‑party dependency, cost per scan, privacy concerns (files may pass through external infrastructure), API latency.

**(c) Container‑based ClamAV separate from Workers**: Deploy ClamAV as a Docker container (on Fly.io, Railway, or similar) with an HTTP API. The Worker sends a scan request to the container, which streams the file from R2, runs ClamAV, and returns the result. Files up to 200 MB can be scanned without writing to disk. If a virus is detected, the container signals the Worker to delete the file from R2 immediately. **Pros**: Open source, no per‑scan costs, file data stays in our infrastructure. **Cons**: Operational overhead (maintaining container, updating virus definitions), latency (container cold start), 200 MB file size limit for streaming scan.

**(d) Hybrid approach (WAF + container fallback)**: Use Cloudflare WAF for initial filtering at the edge (catches known threats immediately) and a container‑based ClamAV for deep scanning of files that pass WAF. Files are initially uploaded to a quarantine prefix in R2, scanned by ClamAV (triggered by R2 event notification → Inngest → container API call), and moved to the main prefix only after passing scan.

**Evaluation criteria for the design spike:**
- Security effectiveness (breadth of threat coverage, false positive/negative rates)
- Implementation complexity (effort to build and maintain)
- Cost (per‑scan costs, infrastructure costs)
- Latency (impact on user experience — scan before or after upload?)
- Privacy (does file data leave our infrastructure?)
- Operational overhead (maintenance, updates, monitoring)

**Research Findings (2026‑05‑06):**
- Cloudflare WAF malicious uploads detection is available as a 2026 feature
- ClamAV streaming from R2 works for files up to 200 MB with careful handling of `StreamMaxLength` limit
- Multiple commercial R2‑compatible scanning solutions exist (attachmentAV, bucketAV)
- EICAR anti‑malware test file is available for validating implementations
- Virus scanning is a CPU‑intensive operation incompatible with Cloudflare Workers' CPU limits — must run in a separate environment

**Depends on:**
- `tasks/infrastructure/P0-STORAGE.md → P0-STORAGE-2` (R2 operations wrapper for file access during scanning)

**Blocks:**
- `tasks/infrastructure/P1-DOCS-JOBS.md → P1-DOCS-JOBS-1` (virus scanning Inngest function)

**Related Files:**
- `docs/research/virus-scanning.md` (new — design spike deliverable)

**Definition of Done**
- [ ] `docs/research/virus-scanning.md` created with comprehensive evaluation of all four candidate approaches
- [ ] Each approach evaluated against all six criteria (security, complexity, cost, latency, privacy, operations)
- [ ] Decision matrix or weighted scoring table included comparing all approaches
- [ ] Clear recommendation with rationale for the chosen approach
- [ ] Implementation plan: estimated effort, required infrastructure, potential blockers
- [ ] Decision documented for future reference when P1‑DOCS‑JOBS‑1 is implemented
- [ ] `pnpm run typecheck` passes (docs only — no code change)

**Out of Scope**
- Actually implementing the chosen virus scanning approach (follow‑up task after design spike)
- Pricing analysis with exact dollar amounts (estimate ranges only)
- Malware signature update mechanisms (implementation detail)

**Rules to Follow**
- The design spike must be objective and thorough — all four approaches must be evaluated, even if the recommendation seems obvious.
- Cost estimates must account for UBOS's phase: currently low traffic, scaling over time.
- Privacy considerations are critical — any approach that sends file data to a third party must be flagged as a potential compliance concern.

**Verification**
```bash
ls docs/research/virus-scanning.md
# Manual: review document for completeness, objectivity, and clear recommendation
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- N/A (research spike — no implementation)

---

#### Subtasks

- [ ] P0-STORAGE-3.0.25 (AGENT): Research all four virus scanning approaches: Cloudflare WAF malicious uploads detection, third‑party scanning APIs (attachmentAV, bucketAV), container‑based ClamAV, and hybrid approach.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-STORAGE-3.0.5 (AGENT): Research ClamAV streaming from R2 implementation patterns, Workers CPU limits for scanning, and cloud‑based antivirus pricing.
  **Verification:** Technical constraints and cost estimates documented.

- [ ] P0-STORAGE-3.1 (AGENT): Evaluate each approach against all six criteria: security effectiveness, implementation complexity, cost, latency, privacy, operational overhead.
  **Verification:** Evaluation matrix populated.

- [ ] P0-STORAGE-3.2 (AGENT): Write `docs/research/virus-scanning.md` with evaluations, decision matrix, recommendation, and implementation plan.
  **File(s):** `docs/research/virus-scanning.md` (new)
  **Verification:** Document covers all required sections.

- [ ] P0-STORAGE-3.3 (HUMAN): Review design spike, validate recommendation against business requirements, approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑STORAGE group are covered.*

---