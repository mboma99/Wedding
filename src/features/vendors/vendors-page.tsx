import Link from "next/link";
import { Banknote, PiggyBank, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import {
  formatCurrency,
  FundingSource,
} from "@/domain/vendors";
import { CostPie, type CostSlice } from "@/features/vendors/components/cost-pie";
import { Deadlines } from "@/features/vendors/components/deadlines";
import { FundingLegend, SourceDot } from "@/features/vendors/components/source-chip";
import { AddVendorButton } from "@/features/vendors/components/vendor-form";
import { SavingsEditor } from "@/features/vendors/components/savings-editor";
import { Timeline } from "@/features/vendors/components/timeline";
import {
  TimelineChart,
  type TimelinePoint,
} from "@/features/vendors/components/timeline-chart";
import { VendorCard } from "@/features/vendors/components/vendor-card";
import { getVendorBoard } from "@/server/queries/vendors";

export type VendorsView = "vendors" | "timeline";

function PotCard({
  name,
  source,
  saved,
  allocated,
  jointShare,
  paid,
  stillHeld,
}: {
  name: string;
  source: FundingSource;
  saved: number;
  allocated: number;
  jointShare: number;
  paid: number;
  stillHeld: number;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-white p-4">
      <div className="flex items-center gap-2">
        <SourceDot source={source} />
        <p className="font-semibold text-primary">{name}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-primary">
        {formatCurrency(allocated)}
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Paid out</dt>
          <dd className="font-medium text-primary">{formatCurrency(paid)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Still held</dt>
          <dd className="font-medium text-primary">{formatCurrency(stillHeld)}</dd>
        </div>
        {jointShare > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">of which joint</dt>
            <dd className="text-muted-foreground">{formatCurrency(jointShare)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Recorded balance</dt>
          <dd className="text-muted-foreground">{formatCurrency(saved)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Validated categorical palette (light surface); amber is always label-backed. */
const categoryColors: Record<string, string> = {
  Venue: "#3b82f6",
  Food: "#ec4899",
  "Décor": "#f59e0b",
  Misc: "#8b5cf6",
};

const fallbackColor = "#64748b";

export async function VendorsPage({ view }: { view: VendorsView }) {
  try {
    const board = await getVendorBoard();
    const { totals, pots } = board;
    const allVendors = board.groups.flatMap((group) => group.vendors);
    const timelinePoints: TimelinePoint[] = board.timeline.map((month) => ({
      month: month.month,
      label: month.label,
      short: month.short,
      ...month.bySource,
    }));
    const costSlices: CostSlice[] = board.groups.map((group) => ({
      category: group.category,
      amount: group.totalCost,
      color: categoryColors[group.category] ?? fallbackColor,
    }));
    const lisa = pots[0];
    const james = pots[1];

    return (
      <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
        <PageHeader
          meta={
            <div className="space-y-2">
              <p>
                {allVendors.length} {allVendors.length === 1 ? "vendor" : "vendors"} ·{" "}
                {formatCurrency(totals.totalCost)} in total
              </p>
              <FundingLegend />
            </div>
          }
          title="Vendors"
        />

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Total cost"
            value={formatCurrency(totals.totalCost)}
            icon={Wallet}
            accent="neutral"
          />
          <KpiCard
            title="Paid"
            value={formatCurrency(totals.paid)}
            icon={Banknote}
            accent="success"
          />
          <KpiCard
            title="Set aside"
            value={formatCurrency(totals.setAside)}
            icon={PiggyBank}
            accent="neutral"
          />
          <KpiCard
            title="To find"
            value={formatCurrency(totals.stillToFind)}
            icon={Wallet}
            accent="warning"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <Deadlines vendors={allVendors} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CostPie slices={costSlices} total={totals.totalCost} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Savings</CardTitle>
            <SavingsEditor james={james.saved} lisa={lisa.saved} />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <PotCard
              allocated={lisa.allocated}
              jointShare={lisa.jointShare}
              name="Lisa"
              paid={lisa.paid}
              saved={lisa.saved}
              source={FundingSource.LISA}
              stillHeld={lisa.stillHeld}
            />
            <PotCard
              allocated={james.allocated}
              jointShare={james.jointShare}
              name="James"
              paid={james.paid}
              saved={james.saved}
              source={FundingSource.JAMES}
              stillHeld={james.stillHeld}
            />
            <div className="rounded-xl border border-border/80 bg-white p-4">
              <div className="flex items-center gap-2">
                <SourceDot source={FundingSource.JOINT} />
                <p className="font-semibold text-primary">Joint</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {formatCurrency(board.joint.allocated)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">allocated</p>
              {board.unassigned > 0 ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <SourceDot source={FundingSource.UNASSIGNED} />
                  {formatCurrency(board.unassigned)} unassigned
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-lg bg-muted/70 p-1" role="tablist">
          {(
            [
              { key: "vendors", label: "By vendor", href: "/admin/vendors" },
              { key: "timeline", label: "Timeline", href: "/admin/vendors?view=timeline" },
            ] as const
          ).map((tab) => (
            <Link
              aria-selected={view === tab.key}
              className={
                view === tab.key
                  ? "rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-primary shadow-sm"
                  : "rounded-md px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              }
              role="tab"
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <AddVendorButton />
        </div>

        {view === "timeline" ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payments by month</CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineChart points={timelinePoints} />
              </CardContent>
            </Card>
            <Timeline months={board.timeline} />
          </div>
        ) : (
          board.groups.map((group) => (
            <Card key={group.category}>
              <CardHeader className="gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <CardTitle>{group.category}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(group.totalCost)} ·{" "}
                    {formatCurrency(group.stillToFind)} to find
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {group.vendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}

                {group.sharedLineItems.length ? (
                  <details className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      Not split between vendors ({group.sharedLineItems.length})
                    </summary>
                    <ul className="mt-3 space-y-2.5">
                      {group.sharedLineItems.map((item, index) => (
                        <li
                          className="flex items-baseline justify-between gap-3 text-sm"
                          key={`${item.description}-${index}`}
                        >
                          <span className="whitespace-pre-line text-muted-foreground">
                            {item.description || "Item"}
                          </span>
                          <span className="shrink-0 font-medium text-primary">
                            {formatCurrency(item.price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    );
  } catch {
    return (
      <main className="container py-8 sm:py-12">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>Vendors couldn&apos;t load.</CardTitle>
            <CardDescription>
              We couldn&apos;t reach the database. Check your connection and refresh
              the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }
}
