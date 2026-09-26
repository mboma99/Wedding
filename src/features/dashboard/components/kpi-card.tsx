import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  neutral: "bg-primary/[0.07] text-primary",
  james: "bg-james/10 text-james",
  lisa: "bg-lisa/10 text-lisa",
  success: "bg-emerald-500/10 text-emerald-700",
  warning: "bg-amber-500/10 text-amber-700",
} as const;

type KpiCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
  /** Short context under the figure, e.g. "of 78 guests". */
  detail?: string;
  /** Makes the whole tile a link into the matching filtered list. */
  href?: string;
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  accent = "neutral",
  detail,
  href,
}: KpiCardProps) {
  const body = (
    <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            accentStyles[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            {value}
          </p>
          {detail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        {href ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
        ) : null}
      </div>
    </CardContent>
  );

  if (!href) {
    return <Card className="h-full">{body}</Card>;
  }

  return (
    <Link
      className="group block h-full rounded-[var(--card-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <Card className="h-full transition-colors group-hover:border-primary/25 group-hover:bg-white">
        {body}
      </Card>
    </Link>
  );
}
