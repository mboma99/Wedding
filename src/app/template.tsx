import type { ReactNode } from "react";

/** A quick fade whenever the visitor moves between top-level sections. */
export default function RootTemplate({ children }: { children: ReactNode }) {
  return <div className="fade-enter">{children}</div>;
}
