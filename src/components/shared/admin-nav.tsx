"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { logoutAdminAction } from "@/server/actions/admin-auth";

const navigationItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/floor-plan", label: "Floor plan" },
] as const;

function isActive(pathname: string, href: string) {
  // Dashboard is the admin root, so it only matches exactly; the others also
  // own their sub-pages (a guest edit page still lights up "Guests").
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5 sm:flex-nowrap sm:py-3">
        <Link
          className="font-serif text-lg leading-none text-primary"
          href="/admin"
        >
          James &amp; Lisa
        </Link>

        <nav
          aria-label="Admin"
          className="segmented order-last grid w-full grid-cols-4 gap-1 rounded-[var(--segment-radius)] bg-muted/70 p-1 sm:order-none sm:w-[28rem]"
          style={{ "--segments": navigationItems.length } as CSSProperties}
        >
          {navigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-[calc(var(--segment-radius)_-_4px)] px-1 py-1.5 text-center text-[0.8125rem] font-medium transition-colors sm:px-3 sm:text-sm",
                  active ? "text-primary" : "text-muted-foreground hover:text-primary",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <span aria-hidden className="segmented-thumb" />
        </nav>

        <form action={logoutAdminAction} className="ml-auto">
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="submit"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
