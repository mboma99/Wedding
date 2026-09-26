import Link from "next/link";
import {
  CheckCheck,
  ChevronRight,
  Clock3,
  Home,
  MailCheck,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";

import { AppShellNav } from "@/components/shared/app-shell-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import {
  buildDashboardHouseholdKey,
  parseDashboardHouseholdFilter,
  type DashboardSearchParams,
} from "@/features/dashboard/types";
import { sideLabels, type HouseholdOption } from "@/features/guests/types";
import { cn } from "@/lib/utils";
import { getDashboardSummary } from "@/server/queries/dashboard";

function SideHighlight({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "james" | "lisa";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-5",
        tone === "james"
          ? "border-james/15 bg-james/10"
          : "border-lisa/15 bg-lisa/10",
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          tone === "james" ? "text-james" : "text-lisa",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-primary sm:mt-3 sm:text-3xl">{value}</p>
    </div>
  );
}

function DashboardUnavailableState() {
  return (
    <main className="container py-8 sm:py-12">
      <Card className="border-amber-200 bg-white/90">
        <CardHeader>
          <Badge variant="warning" className="w-fit">
            Dashboard unavailable
          </Badge>
          <CardTitle className="mt-4">The dashboard could not load summary data.</CardTitle>
          <CardDescription>
            Check the database connection, run Prisma migrations, and seed the
            guest list before continuing with Phase 2 verification.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

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
    const jamesGuests =
      summary.sideBreakdown.find((item) => item.key === "JAMES")?.count ?? 0;
    const lisaGuests =
      summary.sideBreakdown.find((item) => item.key === "LISA")?.count ?? 0;
    const activeHouseholdLabel = householdFilter
      ? `${householdFilter.householdName} • ${sideLabels[householdFilter.side]}`
      : null;

    return (
      <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-white/80 bg-white/85">
            <CardContent className="space-y-4 p-4 sm:space-y-8 sm:p-8">
              <div className="space-y-4">
                <AppShellNav currentPath="/admin" />
                <div className="space-y-3">
                  <h1 className="font-serif text-2xl leading-tight text-primary sm:text-6xl sm:leading-none">
                    Guest overview
                  </h1>
                </div>
                <form action="/admin" method="get" className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Household filter
                    </span>
                    <select
                      className="flex h-12 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                      defaultValue={searchParams.household}
                      name="household"
                    >
                      <option value="">All households</option>
                      {householdOptions.map((household) => (
                        <option
                          key={buildDashboardHouseholdKey(household)}
                          value={buildDashboardHouseholdKey(household)}
                        >
                          {household.householdName} • {sideLabels[household.side]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-row gap-2 sm:gap-3">
                    <Button className="flex-1 sm:w-fit sm:flex-none" type="submit" variant="outline">
                      Apply filter
                    </Button>
                    <Button asChild className="shrink-0 sm:w-fit" variant="ghost">
                      <Link href="/admin">Clear</Link>
                    </Button>
                  </div>
                </form>
                {activeHouseholdLabel ? (
                  <Badge variant="outline" className="w-fit bg-white/80">
                    Household: {activeHouseholdLabel}
                  </Badge>
                ) : null}
                <form action="/admin/guests" method="get" className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Quick guest search
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-12 pl-10"
                        name="q"
                        placeholder="Search by name, household, relation, phone, or email"
                      />
                    </div>
                  </label>
                  <input type="hidden" name="page" value="1" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Button className="w-full sm:w-fit" type="submit">
                      Search guest list
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button asChild className="w-full sm:w-fit" variant="outline">
                      <Link href="/admin/guests">Open full list</Link>
                    </Button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <SideHighlight label="James side" value={jamesGuests} tone="james" />
                <SideHighlight label="Lisa side" value={lisaGuests} tone="lisa" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/80 bg-white/85">
            <CardHeader>
              <Badge variant="success" className="w-fit">
                RSVP momentum
              </Badge>
              <CardTitle className="mt-4">
                {summary.totals.responseRate}% of guests have responded.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Response rate</span>
                  <span>{summary.totals.responseRate}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-james to-lisa"
                    style={{ width: `${summary.totals.responseRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] border border-border/80 bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Invitations out</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">
                    {summary.totals.invitationsOut}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/80 bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">
                    {summary.totals.deliveredInvitations}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Total guests"
            value={summary.totals.totalGuests.toString()}
            icon={Users}
            accent="neutral"
          />
          <KpiCard
            title="Households"
            value={summary.totals.households.toString()}
            icon={Home}
            accent="james"
          />
          <KpiCard
            title="Attending"
            value={summary.totals.attending.toString()}
            icon={CheckCheck}
            accent="success"
          />
          <KpiCard
            title="Pending RSVP"
            value={summary.totals.pending.toString()}
            icon={Clock3}
            accent="warning"
          />
        </section>

        <DashboardCharts
          sideData={summary.sideBreakdown}
          groupData={summary.groupBreakdown}
          rsvpData={summary.rsvpBreakdown}
        />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/80 bg-white/85">
            <CardHeader>
              <CardTitle>Invitation progress</CardTitle>
              <CardDescription>
                Sending status across the full traditional wedding guest list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.inviteBreakdown.map((item) => {
                const denominator = Math.max(summary.totals.totalGuests, 1);
                const width = Math.max((item.count / denominator) * 100, item.count > 0 ? 8 : 0);

                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-semibold text-primary">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/85">
            <CardHeader>
              <CardTitle>Planning notes</CardTitle>
              <CardDescription>
                Quick operational reads for the current dashboard state.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-james/15 bg-james/10 p-5">
                <MailCheck className="h-5 w-5 text-james" />
                <p className="mt-4 text-sm font-medium text-james">Invitations sent</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summary.totals.invitationsOut} guests have already received an
                  invitation touchpoint.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-500/15 bg-emerald-500/10 p-5">
                <CheckCheck className="h-5 w-5 text-emerald-700" />
                <p className="mt-4 text-sm font-medium text-emerald-700">
                  Responses captured
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summary.totals.responsesReceived} guests have already confirmed
                  their attendance decision.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-amber-500/15 bg-amber-500/10 p-5">
                <TriangleAlert className="h-5 w-5 text-amber-700" />
                <p className="mt-4 text-sm font-medium text-amber-700">
                  Follow-up needed
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summary.totals.pending} guests are still pending RSVP and may
                  need reminders.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  } catch {
    return <DashboardUnavailableState />;
  }
}
