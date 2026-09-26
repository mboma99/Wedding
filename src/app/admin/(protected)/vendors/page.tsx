import type { Metadata } from "next";

import { VendorsPage, type VendorsView } from "@/features/vendors/vendors-page";

export const metadata: Metadata = {
  title: "Vendors | Traditional Wedding Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const view: VendorsView = resolved.view === "timeline" ? "timeline" : "vendors";

  return <VendorsPage view={view} />;
}
