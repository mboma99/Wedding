"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  DashboardSkeleton,
  DaysSkeleton,
  FloorPlanSkeleton,
  GuestListSkeleton,
  VendorsSkeleton,
} from "@/components/shared/page-skeletons";

type AdminNavigation = {
  /** The tab that was just tapped, until its page arrives. */
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const AdminNavigationContext = createContext<AdminNavigation>({
  pendingHref: null,
  startNavigation: () => undefined,
});

export function useAdminNavigation() {
  return useContext(AdminNavigationContext);
}

const SKELETONS: Record<string, () => ReactNode> = {
  "/admin": DashboardSkeleton,
  "/admin/guests": GuestListSkeleton,
  "/admin/vendors": VendorsSkeleton,
  "/admin/floor-plan": FloorPlanSkeleton,
  "/admin/days": DaysSkeleton,
};

/**
 * Tapping a tab swaps to that page's loading shape straight away, in the
 * browser, instead of waiting for the server to answer first. The real page
 * replaces it as soon as it arrives.
 */
export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // The new page has arrived.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // If a navigation never completes (offline, cancelled), don't leave the
  // loading shape up for good.
  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 15000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const startNavigation = (href: string) => {
    if (href !== pathname) setPendingHref(href);
  };

  return (
    <AdminNavigationContext.Provider value={{ pendingHref, startNavigation }}>
      {children}
    </AdminNavigationContext.Provider>
  );
}

/** The page, or the loading shape of the page that was just tapped. */
export function AdminContent({ children }: { children: ReactNode }) {
  const { pendingHref } = useAdminNavigation();
  const Skeleton = pendingHref ? SKELETONS[pendingHref] : undefined;

  // The current page stays mounted underneath, so if the switch never
  // completes it comes back exactly as it was.
  return (
    <>
      <div hidden={Boolean(Skeleton)}>{children}</div>
      {Skeleton ? <Skeleton /> : null}
    </>
  );
}
