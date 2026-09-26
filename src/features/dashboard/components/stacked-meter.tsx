import Link from "next/link";

import { cn } from "@/lib/utils";

export type MeterSegment = {
  key: string;
  label: string;
  count: number;
  color: string;
  href?: string;
};

function percentOf(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

/**
 * One horizontal bar split into labelled parts. Replaces the 2–3 slice donuts:
 * a single bar reads part-to-whole faster, and every part is named in text so
 * colour never carries the meaning alone.
 */
export function StackedMeter({
  segments,
  label,
  layout = "list",
}: {
  segments: MeterSegment[];
  /** Accessible name for the bar itself. */
  label: string;
  /** "list" stacks the legend rows; "split" puts one figure at each end. */
  layout?: "list" | "split";
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const visible = segments.filter((segment) => segment.count > 0);

  return (
    <div className="space-y-3">
      {layout === "split" ? (
        <div className="flex items-end justify-between gap-4">
          {segments.map((segment, index) => (
            <LegendFigure
              align={index === 0 ? "left" : "right"}
              key={segment.key}
              segment={segment}
              total={total}
            />
          ))}
        </div>
      ) : null}

      <div
        aria-label={label}
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
        role="img"
      >
        {visible.map((segment) => (
          <div
            className="h-full first:rounded-l-full last:rounded-r-full"
            key={segment.key}
            style={{
              backgroundColor: segment.color,
              width: `${(segment.count / total) * 100}%`,
            }}
            title={`${segment.label}: ${segment.count} (${percentOf(segment.count, total)}%)`}
          />
        ))}
      </div>

      {layout === "list" ? (
        <ul className="space-y-0.5">
          {segments.map((segment) => (
            <li key={segment.key}>
              <LegendRow segment={segment} total={total} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LegendRow({ segment, total }: { segment: MeterSegment; total: number }) {
  const content = (
    <>
      <span className="flex items-center gap-2.5 text-muted-foreground">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: segment.color }}
        />
        {segment.label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="font-semibold text-primary">{segment.count}</span>
        <span className="w-9 text-right text-xs text-muted-foreground">
          {percentOf(segment.count, total)}%
        </span>
      </span>
    </>
  );
  const className =
    "-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm";

  return segment.href ? (
    <Link className={cn(className, "transition-colors hover:bg-muted/60")} href={segment.href}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function LegendFigure({
  segment,
  total,
  align,
}: {
  segment: MeterSegment;
  total: number;
  align: "left" | "right";
}) {
  const content = (
    <>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: segment.color }}
        />
        {segment.label}
      </span>
      <span className="text-3xl font-semibold tracking-tight text-primary">
        {segment.count}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          {percentOf(segment.count, total)}%
        </span>
      </span>
    </>
  );
  const className = cn(
    "flex flex-col gap-1",
    align === "right" ? "items-end" : "items-start",
  );

  return segment.href ? (
    <Link className={cn(className, "rounded-md transition-opacity hover:opacity-75")} href={segment.href}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
