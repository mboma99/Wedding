import Link from "next/link";
import { GuestSide } from "@/domain/enums";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuestListFilters } from "@/features/guests/components/guest-list-filters";
import { GuestListPagination } from "@/features/guests/components/guest-list-pagination";
import { GuestTable } from "@/features/guests/components/guest-table";
import { type GuestListSearchParams } from "@/features/guests/types";
import { getGuestList, getHouseholdOptions } from "@/server/queries/guests";

function GuestListUnavailableState() {
  return (
    <main className="container py-8 sm:py-12">
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle>The guest list couldn&apos;t load.</CardTitle>
          <CardDescription>
            We couldn&apos;t reach the guest database. Check your connection and
            refresh the page.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export async function GuestListPage({
  searchParams,
}: {
  searchParams: GuestListSearchParams;
}) {
  try {
    const [guestList, householdOptions] = await Promise.all([
      getGuestList(searchParams),
      getHouseholdOptions(),
    ]);

    return (
      <main className="container space-y-4 py-6 sm:space-y-5 sm:py-8">
        <PageHeader
          actions={
            <Button asChild className="w-full sm:w-auto">
              <Link href="/admin/guests/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add guest
              </Link>
            </Button>
          }
          meta={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <span className="font-semibold text-primary">{guestList.totalGuests}</span>{" "}
                {guestList.totalGuests === 1 ? "guest" : "guests"}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-sm bg-james" />
                {guestList.sideTotals[GuestSide.JAMES]} James
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-sm bg-lisa" />
                {guestList.sideTotals[GuestSide.LISA]} Lisa
              </span>
            </span>
          }
          title="Guests"
        />

        <GuestListFilters filters={searchParams} />

        <GuestTable guests={guestList.guests} householdOptions={householdOptions} />

        <GuestListPagination
          filters={searchParams}
          page={guestList.page}
          totalPages={guestList.totalPages}
          pageStart={guestList.pageStart}
          pageEnd={guestList.pageEnd}
          totalGuests={guestList.totalGuests}
        />
      </main>
    );
  } catch {
    return <GuestListUnavailableState />;
  }
}
