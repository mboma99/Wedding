import type { Metadata } from "next";

import { GuestListPage } from "@/features/guests/guest-list-page";
import {
  parseGuestListSearchParams,
  type RawGuestListSearchParams,
} from "@/features/guests/types";

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
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseGuestListSearchParams(resolvedSearchParams);

  return <GuestListPage searchParams={filters} />;
}
