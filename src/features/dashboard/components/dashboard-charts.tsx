"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardBreakdownItem } from "@/features/dashboard/types";

type DashboardChartsProps = {
  sideData: DashboardBreakdownItem[];
  groupData: DashboardBreakdownItem[];
  rsvpData: DashboardBreakdownItem[];
};

type ChartTooltipPayload = {
  value?: number | string;
  payload?: DashboardBreakdownItem;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
};

function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const current = payload[0]?.payload;
  const value = typeof payload[0]?.value === "number" ? payload[0]?.value : 0;

  return (
    <div className="rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-soft">
      <p className="text-sm font-semibold text-primary">
        {current?.label ?? label ?? "Count"}
      </p>
      <p className="text-sm text-muted-foreground">{value} guests</p>
    </div>
  );
}

function BreakdownList({ data }: { data: DashboardBreakdownItem[] }) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </div>
          <span className="text-sm font-semibold text-primary">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/80 bg-muted/30 px-6 text-center">
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        Seed or create guests to populate side, RSVP, and group distribution
        charts.
      </p>
    </div>
  );
}

export function DashboardCharts({
  sideData,
  groupData,
  rsvpData,
}: DashboardChartsProps) {
  const hasData =
    sideData.some((item) => item.count > 0) ||
    groupData.some((item) => item.count > 0) ||
    rsvpData.some((item) => item.count > 0);

  if (!hasData) {
    return (
      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>Guest distribution</CardTitle>
          <CardDescription>
            The dashboard charts will appear once guest and invitation records
            exist in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NoChartData />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>Side split</CardTitle>
          <CardDescription>
            James guests are highlighted in blue and Lisa guests in pink.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sideData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={76}
                  outerRadius={108}
                  paddingAngle={3}
                >
                  {sideData.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <BreakdownList data={sideData} />
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>RSVP status</CardTitle>
          <CardDescription>
            Response progress across pending, attending, and declined guests.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rsvpData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={68}
                  outerRadius={108}
                  paddingAngle={3}
                >
                  {rsvpData.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <BreakdownList data={rsvpData} />
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/85 xl:col-span-2">
        <CardHeader>
          <CardTitle>Guest groups</CardTitle>
          <CardDescription>
            Family, friend, family friend, and other representation across the
            full invite list.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupData}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={76}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                />
                <Bar dataKey="count" radius={[0, 14, 14, 0]}>
                  {groupData.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <BreakdownList data={groupData} />
        </CardContent>
      </Card>
    </div>
  );
}
