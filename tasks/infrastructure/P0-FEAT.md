# tasks/infrastructure/P0-FEAT.md – Feature Flag Infrastructure

This file covers PostHog integration for feature flag management with SSR bootstrapping for immediate flag availability, a `<FeatureFlag>` wrapper component for conditional UI rendering, and per‑organization feature flag targeting for beta and early‑access features using group analytics. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑FEAT (2026‑05‑06)

### 1. PostHog as Feature Flag Provider — 2026 State

PostHog in 2026 "has quietly become the most complete product platform for SaaS teams" — replacing Mixpanel for analytics, LaunchDarkly for feature flags, FullStory for session replay, Optimizely for A/B testing, and Sentry for errors, all within one open‑source platform with a generous free tier and self‑hostable option. 

**Key advantages for UBOS**: The same SDK (`posthog-js`) handles analytics, feature flags, experiments, session replay, and error tracking. Feature flags "came built in. No additional vendor. No separate billing. No new SDK." PostHog replaces 4–5 tools in one platform.

**Latest versions** (2026‑05‑06):
- `posthog-js`: **v1.363.5** (2026‑03‑25) — latest release includes tree‑shakeable ESM extension bundles for slim builds
- `@posthog/react`: current React SDK, provides `PostHogProvider`, `useFeatureFlagEnabled`, `useFeatureFlagVariantKey`, `useFeatureFlagPayload`, and `PostHogFeature` component 
- `posthog-node`: **≥ v5.17.0** recommended — required for Node.js ≥22, uses nested contexts for managing shared state across events 

### 2. Bootstrapping for SSR and Immediate Flag Availability

The critical problem: "Between initializing PostHog and fetching feature flags, feature flags are not always available immediately. This makes them unusable if you want to do something like redirecting a user to a different page based on a feature flag." Bootstrapping solves this by providing precomputed flag values at initialization. After the SDK fetches feature flags from PostHog, it will use those flag values instead of bootstrapped ones. 

**The bootstrapping flow** (three‑step pattern):
1. **Server‑side**: When receiving a frontend request, fetch all feature flags for the user via `posthog-node`'s `getAllFlags()` — "fetch all the feature flags for the user on the backend by calling `getAllFlags()`" 
2. **Pass to frontend**: Return the frontend request with the flag values in the response. The `distinctID` must be included and must match between server and client
3. **Client‑side bootstrap**: Initialize PostHog with the `bootstrap` key containing `featureFlags`, `distinctID`, `isIdentifiedID: true`, and optionally `sessionID`

**The bootstrap object structure**:
```typescript
posthog.init('<ph_project_token>', {
  api_host: 'https://us.i.posthog.com',
  bootstrap: {
    distinctID: 'distinct_id_of_your_user',
    isIdentifiedID: true,
    featureFlags: {
      'flag-1': true,
      'variant-flag': 'control',
    },
  },
});
```

**Distinct ID stability**: "To guarantee consistency across platforms for Experiments, evaluate flags on your server and distribute results to clients via bootstrap or your own API response – one evaluation, one authoritative result." If the distinct ID changes between server‑side evaluation and client‑side bootstrapping, the hash input changes, causing flag values to flip — bootstrapped values match the server while fetched values may differ. 

**For SPAs (like UBOS with TanStack Start)**: In environments where `posthog.init` only runs once during a session, PostHog recommends two approaches: server‑side pre‑evaluation (evaluate flags before the app renders, pass values into bootstrap), or client‑side pre‑evaluation (evaluate the flag in an earlier page/state). 

### 3. React SDK — Hooks and Component API

`@posthog/react` provides both hook‑based and component‑based APIs for feature flags:

| API | Type | Description |
|---|---|---|
| `useFeatureFlagEnabled('flag-key')` | Hook | Returns `boolean` for on/off flags. Handles loading states — will re‑render when flag values are received. A `$feature_flag_called` event is sent automatically |
| `useFeatureFlagVariantKey('flag-key')` | Hook | Returns the variant key string for multivariate flags (e.g., `'control'`, `'variant-a'`, `'variant-b'`) |
| `useFeatureFlagPayload('flag-key')` | Hook | Returns JSON payload associated with a flag variant. Does NOT send `$feature_flag_called` — always pair with `useFeatureFlagEnabled` or `useFeatureFlagVariantKey` |
| `usePostHog()` | Hook | Returns the PostHog instance for custom operations (identify, capture, override flags, etc.) |
| `<PostHogFeature>` | Component | Declarative wrapper: renders children only when flag matches. Supports `match={true}` for boolean flags, `match="variant-key"` for multivariate, and `fallback` for unmatched cases |

**The `<PostHogFeature>` component pattern** (from official docs):
```tsx
<PostHogFeature flag='show-welcome-message' match={true}>
  <div>Hello</div>
  <p>Thanks for trying out our feature flags.</p>
</PostHogFeature>
```
With fallback: `fallback={<div>Old experience</div>}`. With payload: `<PostHogFeature flag='...' match={true}>{(payload) => <div>{payload.title}</div>}</PostHogFeature>`. 

**Flag payloads**: "After a feature flag is installed, JSON payloads let you make changes to your product or website without subsequent deployments. This includes text, visuals, or even entire blocks of code." 

**Loading state handling**: On the very first render the flag is `undefined`, then flips to `true` or `false`, causing a visible flicker. Bootstrapping (server‑side evaluation → bootstrap values) is the recommended fix. 

**Developer overrides**: `posthog.featureFlags.overrideFeatureFlags({ flags: { 'my-flag': true } })` — useful for local testing. Overrides are temporary and cleared on page reload. 

### 4. Per‑Organization Targeting via Group Properties

PostHog supports "group properties" for feature flag targeting: "Choose specific people, or allow access by user or group property (like organization or multi‑seat account)." PostHog remembers what properties were set for a user, and if you don't send new ones, will reuse old ones — making things easier for developers.

**Targeting can be based on**: Person properties (e.g., email, country), cohort membership, and group properties (for group‑based flags). 

**Implementation pattern for UBOS per‑organization targeting**:
1. Identify the user with their distinct ID (user ID + org ID)
2. Set group properties: `posthog.groups('organization', orgId, { name: orgName, plan: 'pro' })`
3. In the PostHog dashboard, create a feature flag targeting the group property — e.g., "organization plan = pro"
4. When the user switches organizations, call `posthog.groups()` again with the new org context

**Local evaluation compatibility**: Group‑based flags that use group properties and group aggregation are evaluated server‑side and cannot use local evaluation. The `evaluation_runtime` field on the flag model restricts where the flag can evaluate (server/client/all). 

### 5. Free Tier and Pricing

PostHog's free tier is generous for early‑stage UBOS: **1 million feature flag requests per month** included at no cost. Additional requests cost $0.0001 per request, with volume discounts. One million analytics events per month, 5,000 session replays, and feature flags are all included at no cost. 

For comparison: A Series B startup tracking 50 million events per month might pay $8,000‑15,000/year with PostHog versus $60,000‑120,000/year with Amplitude. 

### 6. Integration with Workers Runtime

PostHog's client‑side SDK (`posthog-js`) uses `fetch` for all API calls — this is compatible with the browser at runtime. The server‑side SDK (`posthog-node`) requires Node.js ≥22 (confirmed: `@posthog/posthog-node` requires Node >22.22). For UBOS on Cloudflare Workers, the server‑side SDK cannot be used directly in the Worker because of the Node.js dependency. However, feature flags can be evaluated entirely client‑side, with optional bootstrapping from the server via a dedicated endpoint that runs `posthog-node` (e.g., a separate Worker with `nodejs_compat`, or an API route running on Node.js infrastructure).

**Alternative**: The PostHog REST API can be used directly from Workers to fetch flag evaluations — the `/decide` endpoint returns flag evaluations for a given distinct ID and properties. This approach avoids the Node.js SDK dependency entirely.

---

## Task Definitions

### [ ] P0-FEAT-1: Integrate PostHog (or open‑source alternative) for feature flag management — SDK installation, provider, and SSR bootstrapping

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No feature flag infrastructure exists in the UBOS codebase. Feature releases are binary: either deployed or not. There is no capability for: gradual rollouts, beta features for specific organizations, A/B testing, instant rollbacks without deployment, or conditional UI rendering based on per‑organization configuration. No PostHog or any feature flag SDK is installed.
**Size:** Medium

**Description:**
Integrate PostHog as the feature flag provider for UBOS. PostHog was chosen because it provides "analytics, feature flags, experiments, session replay, and error tracking — all in one open‑source platform with a generous free tier" — replacing what would otherwise require 4–5 separate vendor subscriptions. The integration has four components:

**(a) SDK Installation**: Install `posthog-js` (browser, v1.363.5) and `@posthog/react` (React bindings) as dependencies. Add to `pnpm-workspace.yaml` catalog. Create `apps/web/src/lib/feature-flags.ts` as the PostHog initialization module. For Vite‑based apps, use `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` environment variables (the browser needs the public token — it's public by design; the personal API key remains server‑only). 

**(b) PostHogProvider Configuration**: In `apps/web/src/routes/__root.tsx` (or a dedicated providers wrapper), wrap the application with `<PostHogProvider>` using the recommended 2026 defaults: `defaults: '2026-01-30'` (automatically configures recommended settings for new projects), `person_profiles: "identified_only"` (anonymous visitors don't create person profiles, keeping MAU billing lower), and `maskAllInputs: true` for session replay privacy compliance.

**(c) User Identification**: After successful authentication (in the sign‑in flow or root route), identify the user with PostHog via the `usePostHog()` hook. Call `posthog.identify(userId, { email, orgId, orgName, plan })`. Set group analytics: `posthog.groups('organization', orgId, { name: orgName, plan: orgPlan })`. On organization switch (P0‑AUTH‑3), call `posthog.groups()` with the new org context. On sign out, call `posthog.reset()` to detach the distinct ID and start a fresh anonymous session. 

**(d) SSR Bootstrapping for Flags**: Implement the server‑side bootstrapping pattern so feature flags are available immediately on page load (no flicker):

1. **Server endpoint**: Create a server function or API route that, when the page loads (during SSR), fetches all feature flags for the current user from PostHog. Since Workers cannot run `posthog-node` directly, use the PostHog REST API `/decide` endpoint (or the `local_evaluation` endpoint) to evaluate flags. Pass the distinct ID (tenant‑scoped user ID) and relevant properties (user email, org ID, org plan).
2. **Response injection**: Inject the flag values into the SSR response as a script tag or in the `__root.tsx` `loader` data. The flags are passed as a JSON object.
3. **Client bootstrap**: In the PostHog initialization, pass the pre‑evaluated flag values via the `bootstrap` option: `bootstrap: { distinctID, isIdentifiedID: true, featureFlags: preEvaluatedFlags }`. Include `distinctID` to ensure the client SDK uses the same ID that the server used for evaluation. 

**Alternative bootstrapping (if server‑side is too complex for initial integration)**: Use client‑side bootstrapping only — evaluate the flag in an earlier page or state than the one where you need the value, then store and reuse it immediately when required. For UBOS, the auth guard in `__root.tsx` is an ideal early evaluation point. Boostrap at initial load with `posthog.onFeatureFlags()` to wait for flags before rendering critical routes. 

**(f) PostHog account setup**: Create a PostHog Cloud account at posthog.com (free tier: 1M flag requests/month, 1M events/month). Create a project for UBOS. Copy the project token (public, starts with `phc_`) and the host URL (`https://us.i.posthog.com` or `https://eu.i.posthog.com`). Add to `.env`: `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST`. For production, consider the reverse proxy pattern to avoid ad‑blocker blocking — "around 30 percent of visitors run an ad blocker that blocks *.posthog.com." 

**Research Findings (2026‑05‑06):**
- PostHog free tier: 1M feature flag requests/month, 1M events/month — sufficient for Phase 0. 
- `posthog-js` v1.363.5 is latest (2026‑03‑25). 
- `@posthog/react` provides `PostHogProvider`, `useFeatureFlagEnabled`, `usePostHog`. 
- Bootstrapping: `getAllFlags()` on server → pass to client → `bootstrap: { featureFlags: {...} }` at init. 
- Distinct ID must be stable between server and client for consistent flag evaluation. 
- Group analytics: `posthog.groups('organization', orgId, { plan, name })` for per‑org targeting. 
- `person_profiles: "identified_only"` prevents MAU bill explosion from anonymous visitors. 
- Reverse proxy recommended for production to bypass ad blockers blocking `*.posthog.com`. 

**Depends on:**
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-3` (organization switching hook)
- `tasks/infrastructure/P0-SHELL.md → P0-SHELL-6` (root route for provider wrapping)

**Blocks:**
- `tasks/infrastructure/P0-FEAT.md → P0-FEAT-2` (FeatureFlag component)
- `tasks/infrastructure/P0-FEAT.md → P0-FEAT-3` (per‑organization targeting)

**Related Files:**
- `apps/web/src/lib/feature-flags.ts` (new)
- `apps/web/src/routes/__root.tsx` (wrap with PostHogProvider)
- `apps/web/src/pages/SignIn.tsx` (add identify call)
- `apps/web/package.json` (add `posthog-js` and `@posthog/react`)
- `pnpm-workspace.yaml` (add to catalog)
- `.env.example` (document PostHog env vars)

**Definition of Done**
- [ ] `posthog-js` ^1.363.5 and `@posthog/react` installed, added to `pnpm-workspace.yaml` catalog
- [ ] `apps/web/src/lib/feature‑flags.ts` created with: PostHog initialization, bootstrap handler, helper exports
- [ ] `PostHogProvider` wrapping the application in `__root.tsx` with `defaults: '2026-01-30'` and `person_profiles: "identified_only"`
- [ ] User identified after sign‑in: `posthog.identify(userId, { email, orgId, orgName, plan })`
- [ ] Group analytics configured: `posthog.groups('organization', orgId, props)` on sign‑in and org switch
- [ ] `posthog.reset()` called on sign‑out
- [ ] SSR bootstrapping implemented (or client‑side bootstrap with documented path to server‑side)
- [ ] PostHog project created: project token and host configured as environment variables
- [ ] All PostHog API keys in `.env` (public project token) and Cloudflare secrets (personal API key)
- [ ] Manual test: sign in → check PostHog Activity tab → user identified with properties → events captured
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Reverse proxy configuration for ad blocker bypass (Phase 1 enhancement)
- PostHog Error Tracking (Sentry is primary; PostHog can supplement)
- Session replay consent management UI
- PostHog self‑hosted deployment
- Warehouse sync (BigQuery, Snowflake data export)

**Rules to Follow**
- The public project token (`VITE_PUBLIC_POSTHOG_PROJECT_TOKEN`) is safe for client‑side use — it's designed to be public. The personal API key must remain server‑only (Cloudflare secret).
- Never identify a user before they have authenticated — use `person_profiles: "identified_only"` to align with this.
- Always call `posthog.reset()` on sign‑out to detach the session and start fresh for the next user.
- The bootstrap `distinctID` must match exactly between server and client — use the same ID derivation logic (e.g., `tenant_user_{userId}_{orgId}`).
- Server‑side flag evaluation via `/decide` API must include all relevant person and group properties for correct targeting.

**Verification**
```bash
# Verify installation
pnpm ls posthog-js @posthog/react

# Verify environment variables
grep POSTHOG .env.example

# Sign in and check PostHog Activity tab
# Expected: user identified with email, org properties
# Expected: $pageview events captured

# Check groups in PostHog
# PostHog Dashboard → Persons → select a user → Groups tab → organization group visible

# Verify bootstrapping
# Open browser console → type posthog.featureFlags.getFlags()
# Expected: flag values populated immediately (not undefined)

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a product manager, I can create a feature flag in PostHog to control who sees a new feature, and the flag value is available to the application on the very first page load.

---

#### Subtasks

- [ ] P0-FEAT-1.0.25 (AGENT): Read current `__root.tsx` and `SignIn.tsx` to understand auth flow and provider structure. Research `posthog-js`, `@posthog/react`, and SSR bootstrapping patterns.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-FEAT-1.0.5 (AGENT): Research PostHog group analytics and the `/decide` REST API for server‑side flag evaluation on Workers.
  **Verification:** API payload structure and Worker compatibility documented.

- [ ] P0-FEAT-1.1 (AGENT): Install `posthog-js` ^1.363.5 and `@posthog/react`, add to `pnpm-workspace.yaml` catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls posthog-js @posthog/react` shows installed.

- [ ] P0-FEAT-1.2 (AGENT): Create `apps/web/src/lib/feature‑flags.ts` with PostHog initialization, user identification, group analytics, and bootstrapping logic.
  **File(s):** `apps/web/src/lib/feature‑flags.ts` (new)
  **Verification:** Module compiles and exports initialization function.

- [ ] P0-FEAT-1.3 (AGENT): Wrap application with `PostHogProvider` in `__root.tsx`.
  **File(s):** `apps/web/src/routes/__root.tsx`
  **Verification:** Provider wraps the app; PostHog initialized in browser.

- [ ] P0-FEAT-1.4 (AGENT): Add user identification after sign‑in and reset on sign‑out.
  **File(s):** `apps/web/src/pages/SignIn.tsx` (or auth hook)
  **Verification:** User identified in PostHog; reset on logout.

- [ ] P0-FEAT-1.5 (AGENT): Configure group analytics for organization context on sign‑in and org switch.
  **File(s):** `apps/web/src/lib/feature‑flags.ts`, `apps/web/src/lib/auth/client.ts`
  **Verification:** Organization group visible in PostHog dashboard.

- [ ] P0-FEAT-1.6 (AGENT): Implement SSR bootstrapping (or client‑side bootstrap with documented path).
  **File(s):** `apps/web/src/lib/feature‑flags.ts`
  **Verification:** Flag values available on first render; no flicker.

- [ ] P0-FEAT-1.7 (HUMAN): Create PostHog project, configure environment variables, verify user identification and event capture. Approve.
  **Verification:** Approved.

---

### [ ] P0-FEAT-2: Build feature flag wrapper component for conditional UI rendering

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No utility component exists for conditional rendering based on feature flags. Each feature that needs flag‑gating must manually import and call `useFeatureFlagEnabled` with loading‑state handling. This creates boilerplate across every gated feature and risks inconsistent loading‑state behavior (flicker, flash of wrong content).
**Size:** Small

**Description:**
Create a reusable `<FeatureFlag>` wrapper component at `apps/web/src/components/FeatureFlag.tsx` that simplifies flag‑based conditional rendering. The component wraps PostHog's native `<PostHogFeature>` component or adds custom loading‑state handling on top of `useFeatureFlagEnabled`.

**(a) Wrapper component**: The component accepts:
- `flag: string` — the feature flag key
- `match?: boolean | string` — what value to match (default: `true` for boolean flags). Can be `"variant-a"` for multivariate flags
- `fallback?: ReactNode` — content to render when the flag doesn't match (or is loading)
- `children: ReactNode` — content to render when the flag matches

**(b) Implementation approach**: Two options:

**Option A — Wrap PostHog's `<PostHogFeature>`**: PostHog provides a built‑in `<PostHogFeature>` component that handles flag evaluation, loading states, and fallback internally. This is the simplest approach. 

**Option B — Custom component with `useFeatureFlagEnabled`**: For more control over loading states, use the hook directly. The flag is `undefined` on first render (loading), then transitions to `true`/`false`. The component handles: loading state (render nothing or a skeleton), flag false (render fallback), flag true (render children). Bootstrapping eliminates this loading flicker by providing flag values on initialization.

**Recommendation**: Use Option B with bootstrapping. The loading state is handled by the component (show fallback until bootstrapped flags are available). Combined with the SSR bootstrap from P0‑FEAT‑1, this eliminates flicker entirely.

**(c) TypeScript**: Fully typed component with generic support for payload types from multivariate flags. The component is exported as a named export from `apps/web/src/components/`.

**(d) Usage examples** in JSDoc comments:
```tsx
// Simple boolean flag
<FeatureFlag flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FeatureFlag>

// Multivariate flag with payload
<FeatureFlag flag="checkout-flow" match="variant-a">
  <CheckoutVariantA />
</FeatureFlag>
```

**(e) Documentation**: Add usage documentation in the component's JSDoc. Include example in the Storybook story (if Storybook is set up from P0‑DX‑6).

**Research Findings (2026‑05‑06):**
- PostHog provides `<PostHogFeature>` component: `<PostHogFeature flag='key' match={true}>`. 
- `useFeatureFlagEnabled` returns `boolean | undefined` — `undefined` during loading. 
- Bootstrapping eliminates the loading flicker by providing flag values at initialization. 

**Depends on:**
- `tasks/infrastructure/P0-FEAT.md → P0-FEAT-1` (PostHog SDK and provider)

**Blocks:**
- Phase 1 UI tasks that gate features behind flags

**Related Files:**
- `apps/web/src/components/FeatureFlag.tsx` (new)

**Definition of Done**
- [ ] `apps/web/src/components/FeatureFlag.tsx` created with `flag`, `match`, `fallback`, and `children` props
- [ ] Component handles loading state gracefully (renders fallback or nothing until flags loaded)
- [ ] Component supports both boolean flags and multivariate variant matching
- [ ] Fully typed with TypeScript
- [ ] JSDoc comments include usage examples
- [ ] Tested: create a flag in PostHog → wrap content with `<FeatureFlag>` → toggle flag → UI updates
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Visual loading skeleton component (can be passed as fallback)
- Flag evaluation logging (PostHog provides this automatically)
- Feature flag analytics dashboard (handled by PostHog dashboard)

**Rules to Follow**
- The component must never throw — missing flags should render the fallback.
- The `fallback` prop should default to `null` (render nothing), not an error state.
- Flag keys should be validated at the type level — use a string literal union type if practical.

**Verification**
```bash
# Create a test feature flag in PostHog dashboard
# Name: "test-feature", key: "test-feature", active: true, rollout: 100%

# Use the component in a page
<FeatureFlag flag="test-feature" fallback={<p>Feature off</p>}>
  <p>Feature on</p>
</FeatureFlag>

# Verify: "Feature on" renders
# Toggle flag off in PostHog → "Feature off" renders

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a developer, I can wrap any new feature with `<FeatureFlag flag="new-feature">` and control its visibility from the PostHog dashboard without a code deployment.
- Deep Module: The `FeatureFlag` component encapsulates the complexity of flag loading states, bootstrapped vs remote evaluation timing, and fallback rendering behind a declarative API, making feature gating a one‑component change.

---

#### Subtasks

- [ ] P0-FEAT-2.0.25 (AGENT): Read P0‑FEAT‑1 output (`feature-flags.ts`). Research PostHog's `<PostHogFeature>` component API and `useFeatureFlagEnabled` hook behavior.
  **Verification:** APIs understood.

- [ ] P0-FEAT-2.1 (AGENT): Create `apps/web/src/components/FeatureFlag.tsx` with both boolean and multivariate support.
  **File(s):** `apps/web/src/components/FeatureFlag.tsx` (new)
  **Verification:** Component compiles; renders children when flag matches.

- [ ] P0-FEAT-2.2 (AGENT): Test with a real PostHog flag: create flag, wrap content, toggle flag, verify rendering.
  **Verification:** Component responds to flag changes.

- [ ] P0-FEAT-2.3 (HUMAN): Review component API, test with real flags, approve.
  **Verification:** Approved.

---

### [ ] P0-FEAT-3: Configure per‑organization feature flag targeting for beta/early‑access

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** P0‑FEAT‑1 sets up PostHog with group analytics (`posthog.groups('organization', orgId, props)`), enabling per‑organization property identification. However, no PostHog feature flags are configured to target specific organizations. There is no mechanism for: enabling beta features for specific tenants, testing features on a subset of organizations before full rollout, or granting early access to features.
**Size:** Small

**Description:**
Configure the PostHog dashboard and application code to support per‑organization feature flag targeting. This enables beta and early‑access feature rollouts to specific organizations without affecting all users.

**(a) Organization group properties**: Ensure the group analytics setup from P0‑FEAT‑1 correctly sets the organization properties. Verify in the PostHog dashboard (Persons → select a user → Groups tab) that the organization group is present with properties like `name`, `plan`, `slug`.
- `posthog.groups('organization', orgId, { name: 'Acme Corp', slug: 'acme-corp', plan: 'pro' })`

**(b) Create a test beta feature flag**: In the PostHog dashboard (Feature Flags → New Feature Flag):
1. Key: `beta-crm-analytics`
2. Release condition: "Group properties" → "organization → plan equals pro"
3. Save and enable

**(c) Create a manual override flag**: For granting early access to specific organizations on request:
1. Key: `early-access-report-builder`
2. Release condition: "Group properties" → "organization → slug is one of org‑slug‑1, org‑slug‑2, org‑slug‑3"
3. Add or remove specific org slugs from the filter to grant/revoke access

**(d) Create a percentage‑based rollout flag**: For gradual rollout across all organizations:
1. Key: `staged-ui-refresh`
2. Release condition: "Percentage of traffic" → 10% → then "Group properties" → "organization → plan equals enterprise"
3. Increase percentage over time: 10% → 25% → 50% → 100%

**(e) Client‑side group synchronization**: When a user switches organizations (P0‑AUTH‑3), update the group context. The `useOrganization` hook should call `posthog.groups('organization', newOrgId, newProps)`. This ensures feature flag evaluations reflect the currently active organization.

**(f) Documentation**: Create `docs/product/feature-flags.md` documenting:
- How to create a new feature flag (step‑by‑step with PostHog dashboard screenshots)
- How to target specific organizations (group property filters)
- How to do percentage‑based rollouts
- How to use `<FeatureFlag>` in code
- How to test flags locally (`posthog.featureFlags.overrideFeatureFlags()`)
- Flag naming conventions: `domain-feature-name` (e.g., `crm-advanced-filters`, `finance-bulk-invoice`)

**Research Findings (2026‑05‑06):**
- PostHog group properties support targeting: "Choose specific people, or allow access by user or group property (like organization or multi‑seat account)." 
- Group properties persist: "posthog remembers what properties were set for a user, and if you don't send new ones, will reuse old ones." 
- Multi‑environment support: "Test flags in local development or staging by using the same flag key across PostHog projects." 
- Instant rollbacks: "Disable a feature without touching your codebase." 

**Depends on:**
- `tasks/infrastructure/P0-FEAT.md → P0-FEAT-1` (PostHog SDK, user identification, group analytics)
- `tasks/infrastructure/P0-FEAT.md → P0-FEAT-2` (FeatureFlag component)
- `tasks/infrastructure/P0-AUTH.md → P0-AUTH-3` (organization switching)

**Blocks:**
- Phase 1 feature rollout tasks that use per‑organization targeting

**Related Files:**
- `docs/product/feature-flags.md` (new)
- `apps/web/src/lib/feature-flags.ts` (verify group sync on org switch)
- `apps/web/src/lib/auth/client.ts` (add PostHog group update on org switch)

**Definition of Done**
- [ ] Three example feature flags created in PostHog dashboard: `beta-crm-analytics` (group property targeting), `early-access-report-builder` (manual whitelist targeting), `staged-ui-refresh` (percentage rollout)
- [ ] Organization group properties verified in PostHog dashboard for test users
- [ ] Group context updated on organization switch (via `useOrganization` hook)
- [ ] `docs/product/feature‑flags.md` created with: creation guide, targeting strategies, code usage, naming conventions
- [ ] `FeatureFlag` component used at least once with a real PostHog flag in the application
- [ ] Test: toggle `beta-crm-analytics` flag for a specific org → feature visible only for that org
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Automated flag cleanup (PostHog's built‑in flag analytics and usage dashboard handles monitoring)
- Feature flag A/B experiments (separate concern; uses same infrastructure)
- PostHog cohorts for behavioral targeting (separate PostHog feature)

**Rules to Follow**
- Flag keys must follow the naming convention: `domain-feature-name` with hyphens, lowercase.
- Never hard‑code flag keys in multiple places — define them as constants in `apps/web/src/lib/feature‑flags.ts`.
- Always provide a fallback UI when a flag is off — never show broken or empty UI.
- Test in staging with the same flag keys as production — PostHog supports multi‑environment with identical keys.
- Group properties are remembered by PostHog — always update them on org switch to avoid stale targeting.

**Verification**
```bash
# Create test flags in PostHog
# beta-crm-analytics: targeting organization plan = pro

# Test per-org targeting
# 1. Sign in as a pro‑plan org → feature visible
# 2. Sign in as a free‑plan org → feature hidden
# 3. Switch organization (pro → free) → feature hidden

# Verify docs exist
ls docs/product/feature-flags.md

# Verify override works for local testing
# In browser console:
posthog.featureFlags.overrideFeatureFlags({ 'beta-crm-analytics': true })

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a product manager, I can enable a beta feature for a specific organization without deploying code, so I can gather feedback before rolling it out to all users.

---

#### Subtasks

- [ ] P0-FEAT-3.0.25 (AGENT): Read P0‑FEAT‑1 output. Research PostHog group property targeting and per‑organization feature flag patterns.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-FEAT-3.1 (AGENT): Create three example feature flags in PostHog dashboard: group property targeting, manual whitelist, percentage rollout.
  **Verification:** Flags created and active in PostHog dashboard.

- [ ] P0-FEAT-3.2 (AGENT): Verify and fix group context update on organization switch in the auth hook.
  **File(s):** `apps/web/src/lib/auth/client.ts`, `apps/web/src/lib/feature‑flags.ts`
  **Verification:** Group properties update on org switch.

- [ ] P0-FEAT-3.3 (AGENT): Write `docs/product/feature‑flags.md` with creation guide, targeting strategies, naming conventions, and code usage examples.
  **File(s):** `docs/product/feature‑flags.md` (new)
  **Verification:** Document covers all required topics.

- [ ] P0-FEAT-3.4 (HUMAN): Verify per‑organization targeting works: pro org sees beta feature, free org doesn't. Approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑FEAT group are covered.*

---