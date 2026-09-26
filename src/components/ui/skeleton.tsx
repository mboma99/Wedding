import { cn } from "@/lib/utils";

/**
 * A grey placeholder in the shape of content that is still loading. The pulse
 * is dropped for people who ask their device to reduce motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />;
}
