import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  neutral: "border-primary/10 bg-primary/10 text-primary",
  james: "border-james/10 bg-james/10 text-james",
  lisa: "border-lisa/10 bg-lisa/10 text-lisa",
  success: "border-emerald-500/10 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500/10 bg-amber-500/10 text-amber-700",
} as const;

type KpiCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  accent = "neutral",
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/85">
      <CardContent className="flex items-start justify-between gap-2 p-4 sm:gap-3 sm:p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-primary sm:text-4xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-12 sm:w-12 sm:rounded-2xl",
            accentStyles[accent],
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
