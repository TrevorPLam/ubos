# tasks/infrastructure/P0-ACC.md – Accessibility Compliance (WCAG 2.2 AA)

This file covers automated accessibility auditing of all 56 UI components and nine domain pages using Playwright + axe-core, keyboard‑only navigation auditing, screen reader compatibility testing with NVDA and VoiceOver for core CRUD flows, color contrast compliance verification against WCAG 2.2 thresholds, and publishing an accessibility statement at `/accessibility` referencing WCAG 2.2 AA conformance. Every finding is backed by live research conducted on 2026‑05‑06.

> **Follow all rules in `../CROSS-CUTTING-RULES.md`.**

---

## Research Roundup — P0‑ACC (2026‑05‑06)

### 1. Automated Accessibility Testing — axe-core + Playwright Integration

The `@axe-core/playwright` package (latest: **4.11.3**) provides the canonical integration for automated WCAG 2.2 AA auditing within Playwright end‑to‑end tests. Axe-core is the "free, open-source, de facto standard" accessibility testing engine, developed by Deque Systems, that checks HTML against WCAG 2.0, 2.1, and 2.2 rules and returns violations with severity levels, affected elements, and fix recommendations.

**The testing pattern** is established across multiple 2026 sources:
1. Navigate to a page using Playwright
2. Run an axe-core scan using `AxeBuilder` (the fluent API pattern)
3. Assert zero violations using standard Playwright `expect`

The `AxeBuilder` class provides a chainable API for configuring and executing accessibility scans.

**What automated testing catches**: Approximately 30–40% of real‑world accessibility issues. Tools catch the "obvious, measurable failures" — missing labels, broken contrast ratios, improper heading structure, missing ARIA attributes. The remaining issues require human judgment about intent, context, keyboard navigation, and screen reader experience.

**Automated checkers alone are not sufficient** — the 56 criteria in WCAG 2.2 Level AA require both automated scanning and manual testing. The key WCAG 2.2 criteria that automated tools **cannot** detect include: Focus Appearance (2.4.11), Focus Not Obscured (2.4.12), Dragging Movements (2.5.7), Consistent Help (3.2.6), and Target Size Minimum (2.5.8). These require human judgment about intent and context.

### 2. WCAG 2.2 AA — Key Requirements Overview

WCAG 2.2 Level AA requires **56 total criteria**: 32 from Level A plus 24 from Level AA. The most impactful WCAG 2.2 additions for developers:

- **2.4.11 Focus Appearance (AA)**: Focus indicators must meet minimum size and contrast ratio. No more `outline: none` without a custom replacement that actually passes
- **2.4.12 Focus Not Obscured (AA)**: Sticky headers and cookie banners must not fully hide the focused element
- **2.5.7 Dragging Movements (AA)**: Any drag-and-drop interaction must have a pointer alternative (click, tap, keyboard)
- **2.5.8 Target Size Minimum (AA)**: Interactive targets must be at least 24×24 CSS pixels. Tiny icon buttons are now a compliance issue
- **3.2.6 Consistent Help (A)**: If a contact mechanism appears on multiple pages, it must appear in the same relative position on each

None of these WCAG 2.2‑specific additions are detectable by automated scanners alone — they require human judgment.

### 3. Color Contrast Requirements

WCAG 2.2 Level AA contrast thresholds (2026‑05‑06 consensus):

| Element Type | Minimum Ratio | Applies To |
|---|---|---|
| Normal text | **4.5:1** | Text up to 18pt/24px (or 14pt/18.5px bold) |
| Large text | **3:1** | Text ≥ 18pt/24px (or 14pt/18.5px bold) |
| Non‑text UI components | **3:1** | Form controls, focus indicators, borders, icons |
| Meaningful graphics | **3:1** | Informative icons, lines in charts, pie slices |

For dark‑theme glassmorphism effects (used in UBOS), the contrast between semi‑transparent backgrounds and text must still meet these thresholds. "Color contrast should be tested for both light and dark themes — often the same design that passes in light mode fails in dark mode."

### 4. Keyboard‑Only Navigation Testing

The consensus testing methodology involves Tab, Shift+Tab, Enter, and Escape key navigation through the entire application. The checklist approach: "Test keyboard navigation (tab through entire feature)" followed by "Test with VoiceOver (listen to complete flow)."

Key requirements for WCAG 2.2 AA keyboard accessibility:
- All functionality must be usable via keyboard alone (2.1.1)
- No "keyboard traps" where users cannot move focus out of a component
- Tab order must follow visual reading order (2.4.3)
- Focus indicator must be visible on all interactive elements (2.4.7)
- Focus indicator must be ≥ 2px thick and meet contrast minimums (2.4.11)

Automated tools cannot validate keyboard navigation effectively — this requires manual testing.

### 5. Screen Reader Testing

The three primary screen readers are NVDA (Windows, free), VoiceOver (macOS/iOS, built‑in), and JAWS (Windows, paid). The recommended testing methodology is structured, not free‑form: "Start with the speech viewer enabled (NVDA) or Caption Panel (VoiceOver) to see what is being announced. Follow structured testing checklists rather than free‑form exploration."

Key testing areas: correct reading order, accurate button labels, proper heading structure, ARIA landmarks for navigation, and status message announcements for dynamic content (toasts, loading states).

### 6. Accessibility Statement

An accessibility statement is a "public declaration that explains your organization's commitment to digital accessibility." The key components: conformance status (which standard and level), known accessibility issues or limitations, contact information for accessibility feedback, and a formal commitment to WCAG conformance.

The W3C provides a tool to generate accessibility statements. The standard format: "This website is [fully/partially/not] conformant with WCAG 2.2 Level AA." For partially conformant sites: list the non‑conformances.

### 7. EU Accessibility Act (EAA) Enforcement

The EAA became enforceable on **June 28, 2025** and applies to UBOS as a new digital product entering the EU market. Key enforcement facts:
- Applies to companies selling goods or services in the EU market, regardless of international location
- References EN 301 549, which incorporates WCAG 2.1 Level AA and is being updated to include WCAG 2.2
- New products and services must comply immediately; existing products have until June 28, 2030
- Consequences: "fines, legal complaints, reputational damage, and even product removal"

UBOS is a new product → must comply with WCAG 2.2 AA now.

---

## Task Definitions

### [ ] P0-ACC-1: Automated accessibility audit of all 56 UI components and 9 domain pages targeting WCAG 2.2 AA

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🔴 Critical
**Current State:** No automated accessibility testing exists in the UBOS test suite. P0‑FOUND‑3 established ESLint and Prettier, and P0‑MOB‑2 performed a manual responsive audit, but no WCAG compliance scanning is integrated. The Playwright E2E infrastructure exists (`tests/e2e/auth-crm.spec.mjs`) but has no accessibility assertions. The 56 shadcn/ui components and nine domain pages have never been scanned for accessibility violations.
**Size:** Medium

**Description:**
Build an automated accessibility audit test suite using Playwright and axe-core that scans all nine domain pages and key component states for WCAG 2.2 AA violations. The audit is a CI quality gate — builds fail if high‑impact accessibility issues are introduced.

**(a) Installation**: Install `@axe-core/playwright` (latest: 4.11.3 as of May 2026) as a dev dependency. Add to `pnpm-workspace.yaml` catalog.

**(b) Test fixture**: Create a reusable accessibility fixture in `tests/accessibility/a11y-fixture.ts`:
```typescript
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({
  a11yScan: async ({ page }, use) => {
    await use(async (options?: { exclude?: string[], disable?: string[] }) => {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      return scan;
    });
  },
});
```

**(c) Test file**: Create `tests/accessibility/axe-audit.spec.ts` that scans:
- **9 domain pages**: Dashboard (`/dashboard`), CRM (`/crm`), Projects (`/projects`), Documents (`/documents`), Finance (`/finance`), Assets (`/assets`), Portal (`/portal`), Analytics (`/analytics`), Settings (`/settings`)
- **Auth pages**: Sign In (`/signin`), Sign Up (`/signup`)
- **Key component states**: Dialog open (CRM lead creation modal), Drawer open (mobile sidebar), Dropdown menu open, Toast notification visible

For each page and component state: navigate, wait for it to be fully rendered, run `await new AxeBuilder({ page }).withTags([...]).analyze()`, assert `results.violations` is empty (or only contains pre‑approved exceptions).

**(d) Violation management**: For violations that cannot be immediately fixed (e.g., third‑party component issues), use the `disableRules()` method on `AxeBuilder` to suppress specific rules with documentation explaining why each rule is disabled. This prevents the CI from failing but tracks the exceptions.

**(e) CI integration**: Update `.github/workflows/ci.yml` to run `pnpm test -- tests/accessibility/` as a step in the test pipeline. If any accessibility test fails, the build fails.

**Research Findings (2026‑05‑06):**
- `@axe-core/playwright` v4.11.3 is latest
- Axe-core is the "de facto standard" for automated a11y testing
- Setup: `npm install -D @axe-core/playwright` → write scan → assert zero violations
- Automated tools catch ~30–40% of real‑world issues — the rest requires manual testing (keyboard, screen readers)
- WCAG 2.2 tags: `wcag22aa`

**Depends on:**
- `tasks/infrastructure/P0-MOB.md → P0-MOB-2` (responsive audit — some violation data)
- `tests/e2e/auth-crm.spec.mjs` (existing Playwright infrastructure)

**Blocks:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-2` (keyboard audit builds on automated results)
- `tasks/infrastructure/P0-ACC.md → P0-ACC-4` (contrast verification)

**Related Files:**
- `tests/accessibility/axe-audit.spec.ts` (new)
- `tests/accessibility/a11y-fixture.ts` (new)
- `.github/workflows/ci.yml` (add a11y step)
- `apps/web/package.json` (add `@axe-core/playwright` devDep)

**Definition of Done**
- [ ] `@axe-core/playwright` ^4.11.3 installed as devDependency
- [ ] `tests/accessibility/axe‑audit.spec.ts` created scanning all nine domain pages, auth pages, and key component states
- [ ] Reusable `AxeBuilder` fixture created for consistent scanning across all tests
- [ ] All scans target `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` tags
- [ ] Exceptions documented with `disableRules()` for known non‑fixable violations
- [ ] Accessibility tests run in CI and fail the build on new violations
- [ ] At least one run completed: all pages scanned, violations documented as GitHub issues with `a11y` label
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- AI‑assisted accessibility auditing (Claude + axe-core, 70–80% coverage) — can be added later
- `@axe-core/watcher` for centralized violation tracking — separate service
- Manual remediation of all violations (Phase 1 follow‑up)
- Testing dynamic component states beyond the initial set

**Rules to Follow**
- Every page must be scanned in its fully‑rendered state — wait for animations, lazy‑loaded content, and modals.
- Do not disable rules without documenting the reason in a code comment.
- Accessibility tests must be part of the CI pipeline, not a manual audit run.
- The `disableRules()` list is technical debt — each entry must have a tracking issue.

**Verification**
```bash
# Run accessibility tests
pnpm test -- tests/accessibility/axe-audit.spec.ts

# Expected: all tests pass (zero violations, or documented exceptions)

# Run in CI
# Verify accessibility tests pass in GitHub Actions

pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a developer, I want accessibility violations caught on every PR so that I can fix them before they reach production and create legal risk.

---

#### Subtasks

- [ ] P0-ACC-1.0.25 (AGENT): Read the existing Playwright test infrastructure (`tests/e2e/auth-crm.spec.mjs`, `playwright.config.mjs`). Research `@axe-core/playwright` v4.11.3 API and the `AxeBuilder` pattern.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ACC-1.0.5 (AGENT): Research WCAG 2.2 tags for axe-core (`wcag22aa`), the `disableRules()` API, and CI integration patterns.
  **Verification:** API patterns documented.

- [ ] P0-ACC-1.1 (AGENT): Install `@axe-core/playwright` ^4.11.3, add to `pnpm-workspace.yaml` catalog.
  **File(s):** `apps/web/package.json`, `pnpm-workspace.yaml`
  **Verification:** `pnpm ls @axe-core/playwright` shows installed.

- [ ] P0-ACC-1.2 (AGENT): Create `tests/accessibility/a11y-fixture.ts` with reusable `AxeBuilder` fixture.
  **File(s):** `tests/accessibility/a11y-fixture.ts` (new)
  **Verification:** Fixture compiles and exports `AxeBuilder` instances.

- [ ] P0-ACC-1.3 (AGENT): Create `tests/accessibility/axe‑audit.spec.ts` with scans for all nine domain pages and auth pages.
  **File(s):** `tests/accessibility/axe‑audit.spec.ts` (new)
  **Verification:** All pages scanned; violations documented.

- [ ] P0-ACC-1.4 (AGENT): Add component state scans (Dialog, Drawer, DropdownMenu, Toast) to the audit.
  **File(s):** `tests/accessibility/axe‑audit.spec.ts`
  **Verification:** Component state scans functional.

- [ ] P0-ACC-1.5 (AGENT): Document exceptions with `disableRules()` and create tracking issues.
  **Verification:** Each exception has a `disableRules()` call and a GitHub issue.

- [ ] P0-ACC-1.6 (AGENT): Add accessibility tests to CI workflow.
  **File(s):** `.github/workflows/ci.yml`
  **Verification:** CI runs a11y tests on every PR/push.

- [ ] P0-ACC-1.7 (HUMAN): Review violation report, prioritize fixes, approve.
  **Verification:** Approved.

---

### [ ] P0-ACC-2: Keyboard‑only navigation audit (Tab, Enter, Escape, arrow keys)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟠 High
**Current State:** P0‑MOB‑2 performed a responsive audit but did not test keyboard navigation. P0‑SHELL‑7 verified sidebar and header keyboard accessibility at a basic level, but no systematic keyboard audit has been performed across all nine domain pages. Core CRUD flows (CRM lead creation, task management, document upload) have never been tested for keyboard‑only operability.
**Size:** Small

**Description:**
Conduct a manual keyboard‑only navigation audit of all nine domain pages, focusing on core CRUD flows. The audit uses a structured checklist methodology rather than free‑form exploration: "Test keyboard navigation (tab through entire feature)" → "Test with VoiceOver (listen to complete flow)."

**Test procedure** (to be documented in `docs/testing/accessibility.md`):

**(a) Keyboard Navigation Checklist** — for every page and CRUD flow:
1. **Tab through all interactive elements** (links, buttons, inputs, dropdowns) in visual reading order. Verify that every element receives visible focus (2.4.7 Focus Visible) and the focus indicator is ≥ 2px with adequate contrast (2.4.11 Focus Appearance).
2. **Verify no keyboard traps** — navigate into every modal, dropdown, and popover using the keyboard, then navigate out using Escape or Tab. "Prevent 'keyboard traps' where users cannot move focus out of a component."
3. **Verify all functionality is operable** — every action that can be performed with a mouse can be performed with the keyboard (2.1.1 Keyboard). This includes:
   - Opening/closing modals and drawers
   - Selecting items in dropdowns
   - Submitting forms
   - Triggering buttons
   - Drag‑and‑drop alternatives (2.5.7 Dragging Movements)
4. **Verify logical focus order** — Tab order must follow visual reading order (2.4.3). The focus must not jump to hidden or off‑screen elements.
5. **Verify skip links** — Skip‑to‑content links must appear on the first Tab press (if implemented).
6. **Verify sticky elements don't obscure focus** — Sticky headers, cookie banners, and fixed‑position elements must not fully hide focused elements (2.4.12 Focus Not Obscured).

**(b) Target CRUD flows for keyboard testing**:
- CRM: Create a lead (Tab through modal fields, Enter to submit), update a lead (Tab through drawer, change stage), delete a lead (Tab to delete button, confirm in dialog)
- Projects: Navigate tab strip (Projects/My Week/Board), open project detail drawer, Tab through task list
- Documents: Navigate folder tree, Tab to file table, open file preview
- Finance: Tab through AP approvals queue, approve/reject buttons
- Settings: Tab through Users & Permissions table, role dropdowns

**(c) Target size verification**: Verify all interactive targets in keyboard‑critical flows are at least 24×24 CSS pixels (2.5.8 Target Size Minimum). This is a WCAG 2.2 AA requirement that has been enforceable since the standard's adoption.

**(d) Documentation**: Document the audit checklist, findings, and pass/fail status for each page and flow in `docs/testing/accessibility.md`. Log critical keyboard accessibility issues as GitHub issues labeled `a11y` and `keyboard`.

**Research Findings (2026‑05‑06):**
- Automated tools cannot catch keyboard navigation issues — "none of these are detectable by automated scanners alone; they require human judgment about intent and context"
- WCAG 2.2 added Focus Appearance (2.4.11) and Focus Not Obscured (2.4.12) — both require manual keyboard testing
- Target Size Minimum (2.5.8): interactive targets must be ≥ 24×24 CSS pixels
- "Test keyboard navigation (Tab, Shift+Tab, Enter, Esc) to ensure operability without a mouse"

**Depends on:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-1` (automated audit identifies some structural issues)

**Blocks:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-3` (screen reader testing builds on keyboard navigation)

**Related Files:**
- `docs/testing/accessibility.md` (new)

**Definition of Done**
- [ ] `docs/testing/accessibility.md` created with keyboard navigation checklist, test procedure, and findings table
- [ ] All nine domain pages tested for keyboard‑only operability
- [ ] Core CRUD flows tested: CRM lead create/update/delete, project navigation, document navigation, finance approvals, settings management
- [ ] All keyboard traps identified and logged as GitHub issues with `a11y` and `keyboard` labels
- [ ] Focus order verified for at least five key page flows
- [ ] Target size (24×24px) verified for all interactive elements in tested flows
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Automated keyboard navigation testing (not yet feasible — requires human judgment)
- Keyboard testing for future Phase 1+ features
- Screen reader testing (P0‑ACC‑3)

**Rules to Follow**
- The audit must be manual — keyboard navigation cannot be reliably automated.
- Every keyboard trap is a Critical finding.
- Focus order violations are High priority.
- Target size violations are Medium priority (affects usability but not complete blockage).

**Verification**
```bash
# Manual audit — no automated commands
# 1. Start the application
# 2. For each page and flow, follow the keyboard checklist
# 3. Document findings in docs/testing/accessibility.md
# 4. Log issues to GitHub

ls docs/testing/accessibility.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a keyboard‑only user, I can navigate every page, complete every CRUD operation, and never get trapped in a component I cannot exit.

---

#### Subtasks

- [ ] P0-ACC-2.0.25 (AGENT): Research WCAG 2.2 keyboard accessibility requirements (2.1.1, 2.4.3, 2.4.7, 2.4.11, 2.4.12, 2.5.7, 2.5.8). Build the audit checklist.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ACC-2.1 (AGENT): Create `docs/testing/accessibility.md` with keyboard navigation checklist, testing procedure, and findings template.
  **File(s):** `docs/testing/accessibility.md` (new)
  **Verification:** Document covers all required sections.

- [ ] P0-ACC-2.2 (AGENT): Audit keyboard navigation on Dashboard, CRM (lead CRUD), and Projects pages. Log findings.
  **Verification:** Findings documented; issues logged to GitHub.

- [ ] P0-ACC-2.3 (AGENT): Audit keyboard navigation on Documents, Finance, Assets, Portal, Analytics, and Settings pages. Log findings.
  **Verification:** Findings documented for all remaining pages.

- [ ] P0-ACC-2.4 (AGENT): Verify target sizes (24×24 CSS pixels) for interactive elements in all tested flows.
  **Verification:** Target size violations logged.

- [ ] P0-ACC-2.5 (HUMAN): Review audit findings, prioritize keyboard accessibility issues, approve.
  **Verification:** Approved.

---

### [ ] P0-ACC-3: Screen reader compatibility testing (NVDA/VoiceOver) for core CRUD flows

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No screen reader testing has been performed on any UBOS page. The 56 shadcn/ui components have built‑in ARIA support from Radix UI, but the composition of components on pages may not produce a coherent screen reader experience. Reading order, button label clarity, heading structure, and dynamic content announcements (toasts, loading states) have never been verified with a real screen reader.
**Size:** Small

**Description:**
Conduct structured screen reader testing for core CRUD flows using NVDA (Windows, free) and VoiceOver (macOS/iOS, built‑in). The testing follows a structured checklist methodology: "Start with the speech viewer enabled (NVDA) or Caption Panel (VoiceOver) to see what is being announced. Follow structured testing checklists rather than free‑form exploration."

**Test procedure** (documented in `docs/testing/accessibility.md`, extending the keyboard audit):

**(a) Screen reader testing checklist** — for each core CRUD flow:
1. **Correct reading order**: Content must be announced in the same order as visually presented. Headings, paragraphs, and landmarks must follow expected hierarchy.
2. **Accurate button labels**: Every interactive element must announce a meaningful name, role, and state. "Click here" or unlabeled icon buttons are failures.
3. **Proper heading structure**: Headings must use semantic `<h1>`–`<h6>` hierarchy. Verified by navigating via heading shortcuts (NVDA: `H` key, VoiceOver: `VO+Command+H`).
4. **ARIA landmarks**: Pages must use appropriate landmarks (`main`, `nav`, `banner`, `search`). Checked via landmark navigation (NVDA: `D` key, VoiceOver: `VO+U` → landmarks rotor).
5. **Dynamic content announcements**: Loading spinners, toast notifications, error messages, and success feedback must be announced to screen readers without moving focus. Use `role="status"` or `aria-live` for status messages.
6. **Modal and dialog announcements**: When a modal opens, focus must move to the modal and its title must be announced. When closed, focus must return to the triggering element.

**(b) Core CRUD flows to test**:
- CRM: Sign in → navigate to CRM → create a lead (fill form, submit) → hear success toast → edit lead → delete lead → hear confirmation
- Projects: Navigate to Projects → open project → Tab through task list → hear completion status
- Sign‑up flow: Navigate to sign‑up → fill form → hear validation errors → successful sign‑up announcement
- Settings: Navigate to Users & Permissions → hear table announcement → change role → hear success

**(c) Tools**: NVDA on Windows (primary), VoiceOver on macOS (secondary). Enable the speech viewer in NVDA and the Caption Panel in VoiceOver to capture exactly what is announced. Document findings with the exact screen reader output.

**Research Findings (2026‑05‑06):**
- "Screen Reader Testing Test with VoiceOver, NVDA, or JAWS to ensure: Correct reading order, Accurate button labels, Proper heading structure"
- "By combining simple keyboard navigation checks, automated scans and screen‑reader testing, you can quickly gauge how well your site meets WCAG conformance"
- Screen reader testing is manual — "screen reader testing and user experience evaluation must be performed manually"
- Structured checklists produce better results than free‑form exploration

**Depends on:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-2` (keyboard navigation audit — screen reader testing builds on it)

**Blocks:** [N/A]

**Related Files:**
- `docs/testing/accessibility.md` (extend with screen reader section)

**Definition of Done**
- [ ] `docs/testing/accessibility.md` extended with screen reader testing checklist, procedure, and findings
- [ ] All core CRUD flows tested with NVDA (or VoiceOver)
- [ ] Reading order verified for CRM lead creation, project navigation, and sign‑up flows
- [ ] Button labels verified accurate for all tested interactive elements
- [ ] Heading structure verified on Dashboard, CRM, and Settings pages
- [ ] Dynamic content announcements verified (toasts, loading spinners, error messages)
- [ ] Modal focus management tested (open, close, focus return)
- [ ] All screen reader issues logged as GitHub issues with `a11y` and `screen-reader` labels
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- JAWS testing on Windows (commercial software — deferred to Phase 2)
- TalkBack testing on Android (deferred to Phase 2)
- Dragon NaturallySpeaking voice control testing (deferred)
- Testing all 56 components individually with screen readers

**Rules to Follow**
- Test with the speech viewer/caption panel enabled to capture exact output.
- Use structured navigation keys (headings by H key, landmarks by D key) — not just Tab.
- Every unlabeled button or link is a Critical screen reader finding.
- Dynamic content must be tested — toasts and loading states are frequently missed.

**Verification**
```bash
# Manual testing with NVDA or VoiceOver
# 1. Start application
# 2. Enable speech viewer (NVDA) or Caption Panel (VoiceOver)
# 3. For each flow, step through with screen reader commands
# 4. Document exact screen reader output and issues

ls docs/testing/accessibility.md
# Should contain screen reader section with checklist and findings
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a blind user, I want all CRUD operations accessible via my screen reader so that I can manage CRM leads, navigate projects, and use all platform features independently.

---

#### Subtasks

- [ ] P0-ACC-3.0.25 (AGENT): Research screen reader testing best practices for NVDA and VoiceOver. Build the testing checklist.
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ACC-3.1 (AGENT): Extend `docs/testing/accessibility.md` with screen reader testing section.
  **File(s):** `docs/testing/accessibility.md`
  **Verification:** Document includes screen reader checklist and test procedure.

- [ ] P0-ACC-3.2 (AGENT): Test reading order, button labels, and heading structure on CRM, Dashboard, and Settings pages.
  **Verification:** Findings documented; issues logged.

- [ ] P0-ACC-3.3 (AGENT): Test dynamic content announcements (toasts, loading spinners, error messages, modal focus management).
  **Verification:** Dynamic content announcement findings documented.

- [ ] P0-ACC-3.4 (HUMAN): Review screen reader findings, prioritize issues, approve.
  **Verification:** Approved.

---

### [ ] P0-ACC-4: Color contrast compliance verification against WCAG 2.2 thresholds (4.5:1 normal text, 3:1 large text)

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** P0‑SHELL‑3 verified that Tailwind CSS v4 custom design tokens and dark theme are correctly configured. However, the actual contrast ratios of text, icons, and UI components against the dark background and glassmorphism effects have never been quantitatively measured. The dark theme uses an electric blue accent on a near‑black background — this combination must be verified for both light and dark modes. Non‑text contrast (UI component borders, input outlines, focus indicators) must also meet the 3:1 minimum.
**Size:** Small

**Description:**
Conduct a comprehensive color contrast audit of the UBOS user interface against WCAG 2.2 Level AA thresholds: 4.5:1 for normal text, 3:1 for large text and non‑text UI components.

**(a) Automated audit via axe-core**: The `@axe-core/playwright` scans from P0‑ACC‑1 already flag contrast violations. Extract all color contrast violations from the automated audit results and categorize them by severity, component, and page.

**(b) Manual verification**: Automated tools cannot detect all contrast issues, particularly for:
- **Glassmorphism effects**: Semi‑transparent backgrounds with text overlay — measure the effective contrast where the text sits over varying background content
- **Hover and focus states**: Button hover color changes, input focus rings, dropdown item hover states
- **Graph and chart elements**: Recharts components used in the Analytics page — line colors, bar colors, tooltip text
- **Status badges**: The "Hot", "Active", "Approved", "Pending", "At Risk" badges across CRM and other modules
- **Success/error/destructive colors**: Toast notifications, form validation messages, destructive action buttons

**(c) Contrast measurement tool**: Use the axe DevTools browser extension (free) or the Chrome DevTools contrast checker to manually measure contrast for suspicious color combinations identified in step (b). Document the exact foreground and background hex values, the measured ratio, and whether it passes or fails the appropriate WCAG threshold.

**(d) Dark theme verification**: "Color contrast should be tested for both light and dark themes — often the same design that passes in light mode fails in dark mode." Verify that all UBOS color combinations pass in dark mode and, if a light theme is available or under consideration, in light mode as well.

**(e) Documentation**: Extend `docs/testing/accessibility.md` with color contrast findings. Include:
- A table of failed color combinations with hex values, measured ratios, required thresholds, and suggested fixes
- Glassmorphism‑specific contrast notes
- Dark theme contrast exceptions (if any)
- Link to axe-core automated contrast violations

**Research Findings (2026‑05‑06):**
- Normal text: ≥ 4.5:1. Large text (≥ 18pt/24px or 14pt/18.5px bold): ≥ 3:1
- Non‑text UI components (borders, icons, form controls): ≥ 3:1
- "Color contrast is the number one accessibility issue"
- WCAG 2.2 added non‑text contrast requirements (1.4.11) — previously only text was covered

**Depends on:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-1` (axe-core automated contrast violations)

**Blocks:**
- `tasks/infrastructure/P1-ACC-REMEDIATE.md → P1-ACC-REMEDIATE` (remediation of accessibility issues)

**Related Files:**
- `docs/testing/accessibility.md` (extend with contrast section)
- `apps/web/src/styles.css` (reference — custom design tokens)

**Definition of Done**
- [ ] `docs/testing/accessibility.md` extended with color contrast findings section
- [ ] All contrast violations from axe-core automated audit categorized and documented
- [ ] Manual verification performed for glassmorphism effects, hover states, graphs/charts, status badges, and action colors
- [ ] Both dark theme and light theme (if applicable) verified
- [ ] Contrast findings table includes: element, foreground hex, background hex, measured ratio, required threshold, pass/fail, suggested fix
- [ ] All contrast failures logged as GitHub issues with `a11y` and `contrast` labels
- [ ] `pnpm run typecheck` passes (docs only)

**Out of Scope**
- Continuous contrast monitoring (can be added as a regression test)
- Automated contrast checking for all possible state combinations (focused/unfocused × hover/active × disabled)
- Contrast for email templates (separate audit)

**Rules to Follow**
- Every text contrast failure is a High priority accessibility issue.
- Non‑text contrast failures are Medium priority (important but less user‑impacting than unreadable text).
- Design tokens in `styles.css` should be adjusted at the source, not overridden per‑component.
- No color‑only communication — any information conveyed through color (status badges, chart elements) must have a text alternative.

**Verification**
```bash
# Extract contrast violations from axe-core audit
grep -A 5 "color-contrast" tests/accessibility/axe-audit-results.json

# Manual: use Chrome DevTools → Elements → Styles → contrast checker
# For each suspicious element, measure foreground/background ratio

ls docs/testing/accessibility.md
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user with low vision, I can read all text and distinguish all UI components in both light and dark themes because the contrast ratios meet WCAG 2.2 AA minimums.

---

#### Subtasks

- [ ] P0-ACC-4.0.25 (AGENT): Research WCAG 2.2 contrast requirements (1.4.3, 1.4.11) and measurement tools (axe DevTools, Chrome DevTools contrast checker).
  **Verification:** Research documented (see Research Roundup above).

- [ ] P0-ACC-4.1 (AGENT): Extract and categorize all contrast violations from P0‑ACC‑1 automated audit results.
  **Verification:** Contrast violations categorized by severity, page, and component.

- [ ] P0-ACC-4.2 (AGENT): Manually verify contrast for glassmorphism effects, hover/focus states, graphs/charts, status badges, and action colors.
  **Verification:** Manual measurements documented with hex values and ratios.

- [ ] P0-ACC-4.3 (AGENT): Extend `docs/testing/accessibility.md` with contrast findings table, glassmorphism notes, and dark theme exceptions.
  **File(s):** `docs/testing/accessibility.md`
  **Verification:** Document includes all required sections.

- [ ] P0-ACC-4.4 (AGENT): Log all contrast failures as GitHub issues with `a11y` and `contrast` labels.
  **Verification:** Issues created with hex values, ratios, and suggested fixes.

- [ ] P0-ACC-4.5 (HUMAN): Review contrast findings, prioritize fixes in design tokens, approve.
  **Verification:** Approved.

---

### [ ] P0-ACC-5: Publish accessibility statement at `/accessibility` referencing WCAG 2.2 AA conformance

**Status:** ⏳ Not Started
**Actor:** AGENT
**Priority:** 🟡 Medium
**Current State:** No accessibility statement exists in the UBOS application. There is no public declaration of the platform's commitment to digital accessibility, no documentation of conformance status, no list of known accessibility limitations, and no contact mechanism for users to report accessibility issues. This is a compliance gap under the EU Accessibility Act (enforceable since June 28, 2025).
**Size:** Small

**Description:**
Create a dedicated `/accessibility` page in the UBOS application that serves as the official accessibility statement, following the W3C accessibility statement template.

**(a) Content of the accessibility statement**: The page must include:
1. **Conformance status**: "This website is partially conformant with WCAG 2.2 Level AA. Partially conformant means that some parts of the content do not fully conform to the accessibility standard."
2. **Known accessibility issues**: A list of known limitations, organized by impact. Reference the GitHub issues from P0‑ACC‑1 through P0‑ACC‑4. Be honest about what is not yet accessible — transparency is expected under the EAA.
3. **Measures taken**: Summary of the accessibility efforts implemented:
   - Automated accessibility testing on every code change (axe-core + Playwright in CI)
   - Manual keyboard and screen reader testing of core CRUD flows
   - Color contrast verification against WCAG 2.2 AA thresholds
   - WCAG 2.2 AA as the design standard for all new features
4. **Feedback and contact**: An email address or form for users to report accessibility issues (e.g., `accessibility@ubos.app`). Include a statement: "We welcome your feedback on the accessibility of UBOS. Please let us know if you encounter accessibility barriers."
5. **Assessment approach**: How conformance was evaluated (automated testing with axe-core, manual keyboard navigation audit, screen reader testing with NVDA and VoiceOver).
6. **Date**: The date the statement was last updated (2026‑05‑06 or the date of publication).

**(b) Route**: Create `apps/web/src/routes/accessibility.tsx` using TanStack Router's file‑based routing. The page should:
- Be publicly accessible (no authentication required)
- Use the same dark theme as the rest of the application
- Be linked from the sign‑in page and application footer (when implemented)

**(c) Footer link**: If a global footer exists, add an "Accessibility" link. If not, add a link from the sign‑in page. The accessibility statement must be discoverable — it's a compliance requirement, not just a nice‑to‑have.

**(d) CI integration**: Add a CI check (or manual process reminder) that the accessibility statement date must be updated whenever accessibility issues are resolved or new ones are documented.

**Research Findings (2026‑05‑06):**
- W3C provides an accessibility statement generator tool
- Standard format: conformance status, known issues, feedback mechanism, date of statement
- EU Accessibility Act enforcement began June 28, 2025 — accessibility statements are an expected compliance artifact
- "This website is [fully/partially/not] conformant with WCAG 2.2 Level AA"

**Depends on:**
- `tasks/infrastructure/P0-ACC.md → P0-ACC-1` (automated audit — provides violation data for known issues)
- `tasks/infrastructure/P0-ACC.md → P0-ACC-2` (keyboard audit — provides conformance data)

**Blocks:** [N/A]

**Related Files:**
- `apps/web/src/routes/accessibility.tsx` (new)
- `apps/web/src/routes/__root.tsx` (add footer link if applicable)

**Definition of Done**
- [ ] `apps/web/src/routes/accessibility.tsx` created with full accessibility statement
- [ ] Conformance status declared: "partially conformant with WCAG 2.2 Level AA"
- [ ] Known accessibility issues listed with honest descriptions and links to tracking issues
- [ ] Feedback contact (`accessibility@ubos.app`) listed
- [ ] Assessment approach described (axe-core, manual keyboard audit, screen reader testing)
- [ ] Statement date included (publication date)
- [ ] Page is publicly accessible at `/accessibility` (no auth required)
- [ ] Link to accessibility statement discoverable from sign‑in page or footer
- [ ] `pnpm run typecheck` passes

**Out of Scope**
- Full VPAT (Voluntary Product Accessibility Template) — a separate, more detailed compliance document
- Accessibility statement for mobile apps (separate from web application)
- Automated statement date updates (manual process for Phase 0)

**Rules to Follow**
- Be honest about conformance status — overstating accessibility creates legal risk.
- The statement must be date‑stamped and updated when issues are resolved.
- The feedback mechanism must be functional — if `accessibility@ubos.app` is listed, it must be monitored.
- The page itself must be accessible (pass axe-core scan).

**Verification**
```bash
# Verify page is accessible
curl http://localhost:3000/accessibility
# Expected: 200 OK, no auth required

# Verify page passes axe-core
pnpm test -- tests/accessibility/axe-audit.spec.ts
# Should include /accessibility in the scan

ls apps/web/src/routes/accessibility.tsx
pnpm run typecheck
```

**DDD / TDD / BDD / Deep Module notes**
- BDD: As a user with a disability, I want to find a public accessibility statement so that I can understand the platform's conformance status and report any barriers I encounter.

---

#### Subtasks

- [ ] P0-ACC-5.0.25 (AGENT): Read the W3C accessibility statement generator and existing accessibility statements from similar SaaS platforms for reference.
  **Verification:** Template format and required components documented.

- [ ] P0-ACC-5.0.5 (AGENT): Compile known accessibility issues from P0‑ACC‑1 through P0‑ACC‑4 for inclusion in the statement.
  **Verification:** Issues list compiled.

- [ ] P0-ACC-5.1 (AGENT): Create `apps/web/src/routes/accessibility.tsx` with full accessibility statement.
  **File(s):** `apps/web/src/routes/accessibility.tsx` (new)
  **Verification:** Page renders at `/accessibility` with all required content.

- [ ] P0-ACC-5.2 (AGENT): Add accessibility link to sign‑in page or application shell.
  **File(s):** `apps/web/src/routes/__root.tsx` or `apps/web/src/routes/signin.tsx`
  **Verification:** Link discoverable from public‑facing page.

- [ ] P0-ACC-5.3 (AGENT): Verify the accessibility page itself passes axe-core scan.
  **Verification:** Zero violations on `/accessibility` page.

- [ ] P0-ACC-5.4 (HUMAN): Review statement content, verify conformance claims are accurate, approve.
  **Verification:** Approved.

---

## Backlog Additions – 2026‑05‑06

*No backlog additions at this time. All tasks from TASKS.md P0‑ACC group are covered.*

---
