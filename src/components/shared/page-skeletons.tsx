import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading states for the admin pages, shaped like the page that is on its way
 * so the switch feels instant and nothing jumps when the real page arrives.
 */
function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main aria-busy="true" className={cn("container space-y-6 py-6 sm:space-y-8 sm:py-8", className)}>
      <span className="sr-only" role="status">
        Loading…
      </span>
      {children}
    </main>
  );
}

function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 sm:h-10" />
        <Skeleton className="h-4 w-40" />
      </div>
      {action ? <Skeleton className="h-11 w-full rounded-full sm:w-36" /> : null}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </Card>
  );
}

function BlockSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn("space-y-4 p-5 sm:p-6", className)}>
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} key={i} />
      ))}
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div className={i === 0 ? "col-span-2 lg:col-span-1" : undefined} key={i}>
            <StatCardSkeleton />
          </div>
        ))}
      </section>
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        <BlockSkeleton lines={6} />
        <BlockSkeleton lines={4} />
      </section>
    </PageShell>
  );
}

export function GuestListSkeleton() {
  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <HeaderSkeleton />
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-[var(--control-radius)]" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <Card className="divide-y divide-border/70 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="flex items-start gap-3 p-4 sm:items-center sm:p-5" key={i}>
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </Card>
    </PageShell>
  );
}

export function GuestFormSkeleton() {
  return (
    <PageShell className="max-w-4xl space-y-5 sm:space-y-6">
      <Skeleton className="h-4 w-20" />
      <HeaderSkeleton action={false} />
      {[4, 3, 4].map((fields, i) => (
        <Card className="space-y-5 p-5 sm:p-6" key={i}>
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          {Array.from({ length: fields }, (_, j) => (
            <div className="space-y-2" key={j}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-[var(--control-radius)]" />
            </div>
          ))}
        </Card>
      ))}
    </PageShell>
  );
}

export function VendorsSkeleton() {
  return (
    <PageShell className="sm:py-10">
      <HeaderSkeleton />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <BlockSkeleton lines={5} />
        <BlockSkeleton lines={5} />
      </section>
      <BlockSkeleton lines={6} />
    </PageShell>
  );
}

export function FloorPlanSkeleton() {
  return (
    <PageShell className="sm:py-10">
      <HeaderSkeleton />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden p-4">
          <Skeleton className="aspect-[4/5] w-full rounded-lg sm:aspect-[5/4]" />
        </Card>
        <div className="space-y-4">
          <BlockSkeleton lines={4} />
          <BlockSkeleton lines={3} />
        </div>
      </div>
    </PageShell>
  );
}
