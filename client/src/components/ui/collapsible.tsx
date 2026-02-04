// AI-META-BEGIN
// AI-META: Radix UI component - collapsible.tsx
// OWNERSHIP: client/ui
// ENTRYPOINTS: imported by components
// DEPENDENCIES: @radix-ui, react
// DANGER: None - presentational
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: manual testing
// AI-META-END

"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
