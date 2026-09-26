import * as React from "react";

import { cn } from "@/lib/utils";

/** Native select styled to match Input, so every admin dropdown looks alike. */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[var(--control-radius)] border border-border bg-white/80 px-4 py-2 text-base text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:text-sm",
        className,
      )}
      {...props}
    />
  ),
);

Select.displayName = "Select";

export { Select };
