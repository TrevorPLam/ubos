// AI-META-BEGIN
// AI-META: Radix UI component - skeleton.tsx
// OWNERSHIP: client/ui
// ENTRYPOINTS: imported by components
// DEPENDENCIES: @radix-ui, react
// DANGER: None - presentational
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: manual testing
// AI-META-END

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
