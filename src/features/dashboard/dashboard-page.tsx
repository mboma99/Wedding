import Link from "next/link";
import {
  CheckCheck,
  ChevronRight,
  Clock3,
  Home,
  Percent,
  Search,
  Send,
  UserPlus,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  GroupType,
  GuestSide,
  InviteStatus,
  RsvpStatus,
} from "@/domain/enums";
import { BarList } from "@/features/dashboard/components/bar-list";
import { HouseholdFilter } from "@/features/dashboard/components/household-filter";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { StackedMeter } from "@/features/dashboard/components/stacked-meter";
import {
  parseDashboardHouseholdFilter,
  type DashboardBreakdownItem,
  type DashboardSearchParams,
} from "@/features/dashboard/types";
import {
  buildGuestListHref,
  sideLabels,
  type GuestListSearchParams,
  type HouseholdOption,
} from "@/features/guests/types";
import { getDashboardSummary } from "@/server/queries/dashboard";

const baseGuestListParams: GuestListSearchParams = {
  q: "",
  sortBy: "fullName",
  sortDirection: "asc",
  page: 1,
};

function DashboardUnavailableState() {
  return (
    <main className="container py-8 sm:py-12">
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle>The dashboard couldn&apos;t load.</CardTitle>
          <CardDescription>
            We couldn&apos;t reach the guest database. Check your connection and
            refresh the page.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function withHref(
  items: DashboardBreakdownItem[],
  buildHref: (key: string) => string,
) {
  return items.map((item) => ({ ...item, href: buildHref(item.key) }));
}

function countOf(items: DashboardBreakdownItem[], key: string) {
  return items.find((item) => item.key === key)?.count ?? 0;
}

type NextStep = {
  key: string;
  count: number;
  text: string;
  href: string;
};

export default async function DashboardPage({
  searchParams,
  householdOptions,
}: {
  searchParams: DashboardSearchParams;
  householdOptions: HouseholdOption[];
}) {
  try {
    const householdFilter = parseDashboardHouseholdFilter(searchParams.household);
    const summary = await getDashboardSummary(householdFilter);
    const { totals } = summary;

    // Drill-downs keep the household scope by searching for its name.
    const scope: GuestListSearchParams = {
      ...baseGuestListParams,
      q: householdFilter?.householdName ?? "",
    };
    const guestsHref = (overrides: Partial<GuestListSearchParams> = {}) =>
      buildGuestListHref(scope, overrides);

    const notSent = countOf(summary.inviteBreakdown, InviteStatus.NOT_SENT);
    const nextSteps: NextStep[] = [
      {
        key: "not-sent",
        count: notSent,
        text: notSent === 1 ? "invitation not sent yet" : "invitations not sent yet",
        href: guestsHref({ inviteStatus: InviteStatus.NOT_SENT }),
      },
      {
        key: "pending",
        count: totals.pending,
        text: totals.pending === 1 ? "guest hasn't replied" : "guests haven't replied",
        href: guestsHref({ rsvpStatus: RsvpStatus.PENDING }),
      },
    ].filter((step) => step.count > 0);

    return (
      <main className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
        <PageHeader
          actions={
            <>
              <HouseholdFilter
                householdOptions={householdOptions}
                value={searchParams.household}
              />
              <Button asChild className="w-full sm:w-auto">
                <Link href="/admin/guests/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add guest
                </Link>
              </Button>
            </>
          }
          meta={
            householdFilter ? (
              <>
                Showing the {householdFilter.householdName} household (
                {sideLabels[householdFilter.side]}) ·{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/admin">
                  Show everyone
                </Link>
              </>
            ) : (
              `${totals.totalGuests} guests on the list`
            )
          }
          title="Overview"
        />

        <section
          aria-label="Headline numbers"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5"
        >
          <div className="col-span-2 lg:col-span-1">
            <KpiCard
              accent="neutral"
              detail={`${totals.responsesReceived} of ${totals.totalGuests} replied`}
              icon={Percent}
              title="Response rate"
              value={`${totals.responseRate}%`}
            />
          </div>
          <KpiCard
            detail={`${countOf(summary.sideBreakdown, GuestSide.JAMES)} James · ${countOf(summary.sideBreakdown, GuestSide.LISA)} Lisa`}
            href={guestsHref()}
            icon={Users}
            title="Guests"
            value={totals.totalGuests.toString()}
          />
          <KpiCard
            accent="james"
            detail="One per household or single guest"
            icon={Home}
            title="Invitations"
            value={totals.households.toString()}
          />
          <KpiCard
            accent="success"
            detail={`${totals.attendanceRate}% of guests`}
            href={guestsHref({ rsvpStatus: RsvpStatus.ATTENDING })}
            icon={CheckCheck}
            title="Attending"
            value={totals.attending.toString()}
          />
          <KpiCard
            accent="warning"
            detail={`${totals.declined} declined`}
            href={guestsHref({ rsvpStatus: RsvpStatus.PENDING })}
            icon={Clock3}
            title="Awaiting reply"
            value={totals.pending.toString()}
          />
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Progress</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary">Replies</h3>
                <StackedMeter
                  label="RSVP replies"
                  segments={withHref(summary.rsvpBreakdown, (key) =>
                    guestsHref({ rsvpStatus: key as RsvpStatus }),
                  )}
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary">Invitations</h3>
                <StackedMeter
                  label="Invitation delivery"
                  segments={withHref(summary.inviteBreakdown, (key) =>
                    guestsHref({ inviteStatus: key as InviteStatus }),
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Next steps</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSteps.length ? (
                <ul className="divide-y divide-border/70">
                  {nextSteps.map((step) => (
                    <li key={step.key}>
                      <Link
                        className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
                        href={step.href}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                          {step.key === "not-sent" ? (
                            <Send className="h-4 w-4" />
                          ) : (
                            <Clock3 className="h-4 w-4" />
                          )}
                        </span>
                        <span className="flex-1 text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">{step.count}</span>{" "}
                          {step.text}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <CheckCheck className="h-4 w-4 text-emerald-700" />
                  Every invitation is out and every guest has replied.
                </p>
              )}

              <form action="/admin/guests" className="mt-4 border-t border-border/70 pt-4" method="get">
                <label className="sr-only" htmlFor="dashboard-search">
                  Find a guest
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    id="dashboard-search"
                    name="q"
                    placeholder="Name, phone or email"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Sides</CardTitle>
            </CardHeader>
            <CardContent>
              <StackedMeter
                label="Guests by side"
                layout="split"
                segments={withHref(summary.sideBreakdown, (key) =>
                  guestsHref({ side: key as GuestSide }),
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                items={withHref(summary.groupBreakdown, (key) =>
                  guestsHref({ groupType: key as GroupType }),
                )}
              />
            </CardContent>
          </Card>
        </section>
      </main>
    );
  } catch {
    return <DashboardUnavailableState />;
  }
}
