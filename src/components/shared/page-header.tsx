import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  /** Short supporting line under the title: a count, a status, a legend. */
  meta?: ReactNode;
  /** Primary action(s), aligned right on wide screens. */
  actions?: ReactNode;
  back?: { href: string; label: string };
};

export function PageHeader({ title, meta, actions, back }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {back ? (
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          href={back.href}
        >
          <ChevronLeft className="h-4 w-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-primary sm:text-4xl">
            {title}
          </h1>
          {meta ? (
            <div className="text-sm text-muted-foreground">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
