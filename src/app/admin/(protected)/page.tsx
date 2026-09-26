export const dynamic = "force-dynamic";

import DashboardPage from "@/features/dashboard/dashboard-page";
import {
  parseDashboardSearchParams,
  type RawDashboardSearchParams,
} from "@/features/dashboard/types";
import { getHouseholdOptions } from "@/server/queries/guests";
import { requireAdminSession } from "@/server/auth/admin";

type AdminDashboardPageProps = {
  searchParams?: Promise<RawDashboardSearchParams>;
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseDashboardSearchParams(resolvedSearchParams);
  const householdOptions = await getHouseholdOptions();

  return (
    <DashboardPage householdOptions={householdOptions} searchParams={filters} />
  );
}
