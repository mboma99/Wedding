import Link from "next/link";

export type BarListItem = {
  key: string;
  label: string;
  count: number;
  href?: string;
};

/**
 * Horizontal bars for a single measure across a few categories. One hue: the
 * row label already names each bar, so per-category colours would add noise.
 */
export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const row = (
          <>
            <span className="w-28 shrink-0 truncate text-sm text-muted-foreground">
              {item.label}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-primary/75"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-semibold text-primary">
              {item.count}
            </span>
          </>
        );
        const className = "-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5";

        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                className={`${className} transition-colors hover:bg-muted/60`}
                href={item.href}
                title={`${item.label}: ${item.count}`}
              >
                {row}
              </Link>
            ) : (
              <div className={className}>{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
