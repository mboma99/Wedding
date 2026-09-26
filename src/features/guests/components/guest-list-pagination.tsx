import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildGuestListHref, type GuestListSearchParams } from "@/features/guests/types";

type GuestListPaginationProps = {
  filters: GuestListSearchParams;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalGuests: number;
};

export function GuestListPagination({
  filters,
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalGuests,
}: GuestListPaginationProps) {
  return (
    <nav
      aria-label="Guest list pages"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-primary">{pageStart}</span> to{" "}
        <span className="font-semibold text-primary">{pageEnd}</span> of{" "}
        <span className="font-semibold text-primary">{totalGuests}</span> guests
      </p>
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={`flex-1 sm:w-auto sm:flex-none ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Link href={buildGuestListHref(filters, { page: Math.max(1, page - 1) })}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Link>
        </Button>
        <div className="shrink-0 px-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
          Page {page} of {totalPages}
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={`flex-1 sm:w-auto sm:flex-none ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Link
            href={buildGuestListHref(filters, {
              page: Math.min(totalPages, page + 1),
            })}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </nav>
  );
}
