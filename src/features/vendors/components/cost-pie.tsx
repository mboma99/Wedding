"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/domain/vendors";

export type CostSlice = {
  category: string;
  amount: number;
  color: string;
};

type TooltipPayload = { payload?: CostSlice };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const slice = payload?.[0]?.payload;

  if (!active || !slice) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-white/95 px-3 py-2 shadow-soft">
      <p className="text-sm font-semibold text-primary">{slice.category}</p>
      <p className="text-sm text-muted-foreground">{formatCurrency(slice.amount)}</p>
    </div>
  );
}

export function CostPie({ slices, total }: { slices: CostSlice[]; total: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
      <div className="relative h-[220px]">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              // Strict mode's double render leaves the sweep animation stuck at 0.
              isAnimationActive={false}
              innerRadius="62%"
              nameKey="category"
              outerRadius="92%"
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {slices.map((slice) => (
                <Cell fill={slice.color} key={slice.category} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold text-primary">{formatCurrency(total)}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {slices.map((slice) => (
          <li
            className="flex items-center justify-between gap-3 text-sm"
            key={slice.category}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.category}
            </span>
            <span className="font-medium text-primary">
              {formatCurrency(slice.amount)}
              <span className="ml-2 text-muted-foreground">
                {total > 0 ? Math.round((slice.amount / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
