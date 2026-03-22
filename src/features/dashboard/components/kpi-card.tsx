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
  description: string;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
};

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "neutral",
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/85">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="space-y-1">
            <p className="text-4xl font-semibold tracking-tight text-primary">
              {value}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
            accentStyles[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

