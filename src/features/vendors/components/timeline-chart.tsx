"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
  fundingChartColors,
  fundingSourceLabels,
  fundingSourceOrder,
  type FundingSource,
} from "@/domain/vendors";

export type TimelinePoint = {
  month: string;
  label: string;
  short: string;
} & Partial<Record<FundingSource, number>>;

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: { name?: string; value?: number; dataKey?: string }[];
};

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const rows = payload.filter((row) => (row.value ?? 0) > 0);
  const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-white/95 px-3 py-2 shadow-soft">
      <p className="text-sm font-semibold text-primary">
        {(payload[0] as { payload?: TimelinePoint })?.payload?.label}
      </p>
      {rows.map((row) => (
        <p className="text-sm text-muted-foreground" key={row.dataKey}>
          {fundingSourceLabels[row.dataKey as FundingSource]}{" "}
          {formatCurrency(row.value ?? 0)}
        </p>
      ))}
      <p className="mt-1 text-sm font-medium text-primary">
        {formatCurrency(total)}
      </p>
    </div>
  );
}

export function TimelineChart({ points }: { points: TimelinePoint[] }) {
  return (
    <div className="space-y-3">
      <div className="h-[260px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="short"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => `£${value >= 1000 ? `${value / 1000}k` : value}`}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
            {fundingSourceOrder.map((source, index) => (
              <Bar
                dataKey={source}
                fill={fundingChartColors[source]}
                isAnimationActive={false}
                key={source}
                radius={index === fundingSourceOrder.length - 1 ? [4, 4, 0, 0] : undefined}
                stackId="funding"
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {fundingSourceOrder.map((source) => (
          <li className="flex items-center gap-2 text-sm text-muted-foreground" key={source}>
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: fundingChartColors[source] }}
            />
            {fundingSourceLabels[source]}
          </li>
        ))}
      </ul>
    </div>
  );
}
