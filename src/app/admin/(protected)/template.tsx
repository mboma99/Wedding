import type { ReactNode } from "react";

/**
 * Re-mounts on every admin navigation (unlike the layout, which keeps the
 * top bar in place), so each page's sections cascade in. See .page-enter.
 */
export default function AdminPageTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
