import type { Metadata } from "next";

import { VendorsPage, type VendorsView } from "@/features/vendors/vendors-page";
import { requireAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Vendors | Traditional Wedding Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  const resolved = searchParams ? await searchParams : {};
  const view: VendorsView = resolved.view === "timeline" ? "timeline" : "vendors";

  return <VendorsPage view={view} />;
}
