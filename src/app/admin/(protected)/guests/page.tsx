import type { Metadata } from "next";

import { GuestListPage } from "@/features/guests/guest-list-page";
import {
  parseGuestListSearchParams,
  type RawGuestListSearchParams,
} from "@/features/guests/types";
import { requireAdminSession } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Guests | Traditional Wedding Admin",
  description: "Search and manage guests for the traditional wedding guest list.",
};

export const dynamic = "force-dynamic";

type AdminGuestsPageProps = {
  searchParams?: Promise<RawGuestListSearchParams>;
};

export default async function AdminGuestsPage({
  searchParams,
}: AdminGuestsPageProps) {
  // Check the login before loading anything: the layout's check runs at the
  // same time as the page, so on its own it lets logged-out visits (and bots
  // probing /admin) trigger database reads before the redirect.
  await requireAdminSession();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseGuestListSearchParams(resolvedSearchParams);

  return <GuestListPage searchParams={filters} />;
}
