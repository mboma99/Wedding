import Link from "next/link";
import { GuestSide } from "@prisma/client";
import { UserPlus, Users } from "lucide-react";

import { AppShellNav } from "@/components/shared/app-shell-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuestListFilters } from "@/features/guests/components/guest-list-filters";
import { GuestListPagination } from "@/features/guests/components/guest-list-pagination";
import { GuestTable } from "@/features/guests/components/guest-table";
import { type GuestListSearchParams } from "@/features/guests/types";
import { getGuestList } from "@/server/queries/guests";

function GuestListUnavailableState() {
  return (
    <main className="container py-8 sm:py-12">
      <Card className="border-amber-200 bg-white/90">
        <CardHeader>
          <Badge variant="warning" className="w-fit">
            Guest list unavailable
          </Badge>
          <CardTitle className="mt-4">The guest list could not be loaded.</CardTitle>
          <CardDescription>
            Check the database connection, then rerun Prisma sync and seed
            commands before continuing with Phase 3 verification.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "neutral" | "james" | "lisa";
}) {
  const tones = {
    neutral: "border-border/80 bg-muted/30",
    james: "border-james/15 bg-james/10",
    lisa: "border-lisa/15 bg-lisa/10",
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-5 ${tones[accent]}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export async function GuestListPage({
  searchParams,
}: {
  searchParams: GuestListSearchParams;
}) {
  try {
    const guestList = await getGuestList(searchParams);

    return (
      <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-white/80 bg-white/85">
            <CardContent className="space-y-6 p-5 sm:space-y-8 sm:p-8">
              <AppShellNav currentPath="/admin/guests" />
              <div className="space-y-3">
                <h1 className="font-serif text-3xl leading-tight text-primary sm:text-6xl sm:leading-none">
                  Guest list
                </h1>
                </div>
              <Button asChild className="w-full sm:w-fit">
                <Link href="/admin/guests/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add guest
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/80 bg-white/85">
            <CardContent className="space-y-5 p-5 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Directory summary
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {guestList.totalGuests === 0
                      ? "No matching guests for the current filters."
                      : `Showing ${guestList.pageStart}-${guestList.pageEnd} of ${guestList.totalGuests} matching guests.`}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryCard
                  label="James side"
                  value={guestList.sideTotals[GuestSide.JAMES]}
                  accent="james"
                />
                <SummaryCard
                  label="Lisa side"
                  value={guestList.sideTotals[GuestSide.LISA]}
                  accent="lisa"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <GuestListFilters filters={searchParams} />

        <GuestTable guests={guestList.guests} />

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
