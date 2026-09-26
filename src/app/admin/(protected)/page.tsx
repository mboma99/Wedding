export const dynamic = "force-dynamic";

import DashboardPage from "@/features/dashboard/dashboard-page";
import {
  parseDashboardSearchParams,
  type RawDashboardSearchParams,
} from "@/features/dashboard/types";
import { getHouseholdOptions } from "@/server/queries/guests";

type AdminDashboardPageProps = {
  searchParams?: Promise<RawDashboardSearchParams>;
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseDashboardSearchParams(resolvedSearchParams);
  const householdOptions = await getHouseholdOptions();

  return (
    <DashboardPage householdOptions={householdOptions} searchParams={filters} />
  );
}
