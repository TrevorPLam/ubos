# Design Guidelines: Unified Business Operations Suite (UBOS)

## Design Approach

**Selected Approach:** Design System with Linear + Stripe + Notion inspiration

**Rationale:** Enterprise SaaS platforms require exceptional clarity, information density, and workflow efficiency. This approach prioritizes:
- Data-dense layouts without visual clutter
- Consistent, predictable patterns for complex workflows
- Professional aesthetic that builds trust
- Fast cognitive load for daily users

**Key Design Principles:**
1. **Hierarchy through density** - Use spacing and typography weight to create clear information hierarchy
2. **Action clarity** - Every action should be obvious and confidence-inspiring
3. **Contextual awareness** - Always show where users are in complex workflows
4. **Progressive disclosure** - Reveal complexity only when needed

---

## Core Design Elements

### Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts) - body text, UI elements, data tables
- Monospace: JetBrains Mono - for IDs, codes, technical data

**Hierarchy:**
- Page Titles: text-2xl font-semibold (32px)
- Section Headers: text-lg font-semibold (18px)
- Card Headers: text-base font-medium (16px)
- Body Text: text-sm (14px) - default for most UI
- Helper Text: text-xs (12px) - captions, metadata
- Table Data: text-sm font-normal, numbers font-mono

**Line Heights:**
- Headings: leading-tight
- Body: leading-normal
- Dense data: leading-snug

---

### Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section margins: mb-6, mb-8
- Dense layouts: gap-2, gap-3
- Breathing room: gap-4, gap-6, gap-8
- Card padding: p-6
- Modal/Dialog: p-8

**Grid Structures:**
- Main app shell: Sidebar (fixed 240px) + Main content (flex-1)
- Dashboard widgets: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width responsive tables
- Forms: max-w-2xl for single-column, max-w-4xl for two-column
- Split views: 60/40 or 50/50 flex layouts for detail panels

**Containers:**
- Content areas: max-w-7xl mx-auto px-6
- Forms: max-w-2xl
- Modals: max-w-lg to max-w-4xl depending on complexity

---

## Component Library

### Navigation
**Primary Sidebar:**
- Fixed left, full height, 240px width
- Logo at top (h-16, p-4)
- Navigation items with icons (Heroicons), text-sm, py-2 px-3
- Active state: font-medium with visual indicator (left border, 3px)
- Organization switcher at bottom
- Collapsible on mobile

**Top Bar:**
- Fixed, h-16, shadow-sm
- Breadcrumbs (left) - text-sm with chevron separators
- Global search (center) - min-w-96
- User menu, notifications (right)

### Data Display

**Tables:**
- Dense row height (h-12)
- Sticky header with sort indicators
- Alternating row treatment for scannability
- Actions column (right-aligned, w-24)
- Row hover state for interactivity
- Batch selection checkboxes (left column)
- Empty states with illustrations + CTA

**Cards:**
- Rounded corners (rounded-lg)
- Border treatment for separation
- Header (p-4 with border-b)
- Body (p-6)
- Footer for actions (p-4 with border-t)
- Hover elevation for clickable cards

**Lists:**
- Compact item height (min-h-14)
- Avatar/icon (left, 40px)
- Primary text + metadata stack
- Status badges (right)
- Dividers between items

**Status Indicators:**
- Badges: inline-flex rounded-full px-3 py-1 text-xs font-medium
- Dots: w-2 h-2 rounded-full for pipeline stages
- Progress bars: h-2 rounded-full for completion tracking

### Forms

**Input Fields:**
- Standard height: h-10
- Label: text-sm font-medium mb-1
- Helper text below: text-xs
- Error states with icon + message
- Required field indicator (*)

**Layout Patterns:**
- Single column for simple forms
- Two-column grid for related fields (grid-cols-2 gap-4)
- Fieldset grouping with subtle background treatment
- Form sections with headers (text-base font-semibold mb-4)

**Special Inputs:**
- Date pickers: integrated calendar dropdown
- File upload: Drag-and-drop zone (border-2 border-dashed, min-h-32)
- Rich text: Toolbar + content area
- Multi-select: Tag-style chips with remove button

### Workflows & Processes

**Pipeline Views:**
- Horizontal stage cards (kanban-style)
- Each stage: min-w-80, flex-shrink-0
- Draggable items within stages
- Stage headers with count badges
- "Add" button per stage

**Detail Panels:**
- Slide-in from right (w-96 to w-1/2)
- Fixed header with title + close
- Scrollable content area
- Sticky footer for actions

**Multi-Step Processes:**
- Horizontal stepper at top
- Step indicator: circles connected by lines
- Current step highlighted
- Previous steps clickable
- Actions: "Back" + "Continue" at bottom

### Overlays

**Modals:**
- Centered overlay with backdrop
- Max widths: sm (448px), md (512px), lg (640px), xl (768px)
- Header: text-lg font-semibold p-6
- Scrollable body: p-6
- Footer with actions: p-6, right-aligned buttons

**Notifications/Toast:**
- Top-right stack, w-96
- Auto-dismiss (5s) with progress bar
- Types: success, error, warning, info
- Dismissible with X button

**Dropdown Menus:**
- Shadow-lg for elevation
- rounded-lg border
- py-1 with items py-2 px-4
- Dividers for grouping
- Icons (left) for context

### Client Portal

**Simplified UI:**
- Lighter navigation (top bar only, no sidebar)
- Card-based layout for engagement overview
- Limited actions (view documents, messages, invoices)
- Clear "Contact Support" CTA
- Mobile-first responsive design

---

## Engagement-Centric UI

**Engagement Hub:**
- Hero area: Engagement name, client, status (h-32, p-8)
- Tab navigation: Overview | Project | Documents | Messages | Financials
- Overview: Grid of summary cards (3-column)
- Timeline view: Vertical activity feed with timestamps
- Quick actions toolbar (sticky top)

**Document Management:**
- Tree view navigation (left, w-64)
- File grid/list toggle
- Preview panel (right)
- Upload zone prominent at top
- Version history accessible per file

**Communications:**
- Thread list (left, w-80) like email client
- Message pane (center, flex-1)
- Participant sidebar (right, w-64, collapsible)
- Rich compose area at bottom
- Attachments inline with messages

---

## Images & Visual Assets

**Icon Library:** Heroicons (outline for nav, solid for status)

**Illustrations:**
- Empty states: Simple, friendly illustrations (404, no data)
- Onboarding: Step-by-step visuals
- Source: unDraw or similar

**Logo Placement:**
- Sidebar top: 32px height, left-aligned
- Client portal header: 40px height, centered
- Login page: 48px height, centered above form

**No hero images** - This is an application, not a marketing site.

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (condensed sidebar)
- Desktop: > 1024px (full layout)

**Mobile Adaptations:**
- Sidebar → Hamburger menu
- Tables → Stacked cards
- Multi-column grids → Single column
- Split views → Full-screen transitions