import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-primary/10 bg-primary/10 text-primary",
        outline: "border-border bg-white/80 text-foreground",
        james: "border-james/15 bg-james/10 text-james",
        lisa: "border-lisa/15 bg-lisa/10 text-lisa",
        success: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700",
        warning: "border-amber-500/15 bg-amber-500/10 text-amber-700",
        danger: "border-rose-500/15 bg-rose-500/10 text-rose-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

