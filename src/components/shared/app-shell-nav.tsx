import Link from "next/link";

import { logoutAdminAction } from "@/server/actions/admin-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/vendors", label: "Vendors" },
] as const;

type AppShellNavProps = {
  currentPath: (typeof navigationItems)[number]["href"];
};

export function AppShellNav({ currentPath }: AppShellNavProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Badge variant="outline" className="hidden w-fit bg-white/80 sm:inline-flex">
        Traditional wedding
      </Badge>
      <div className="flex flex-row items-center gap-2 sm:flex-wrap sm:gap-3">
        <nav className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-white/85 p-1 shadow-sm">
          {navigationItems.map((item) => {
            const isActive = item.href === currentPath;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAdminAction} className="shrink-0">
          <Button size="sm" type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
